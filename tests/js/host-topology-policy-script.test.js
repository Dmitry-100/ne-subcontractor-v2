"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.resolve(__dirname, "../../scripts/ci/check-host-topology-policy.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeExecutable(filePath, script) {
    fs.writeFileSync(filePath, script, { encoding: "utf8", mode: 0o755 });
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

test("host topology policy script: validates config and runs filtered integration test", () => {
    const tempDir = createTempDir("host-topology-policy-default-");
    try {
        const prodSettingsPath = path.join(tempDir, "appsettings.json");
        const devSettingsPath = path.join(tempDir, "appsettings.Development.json");
        const backgroundJobsSettingsPath = path.join(tempDir, "backgroundjobs.appsettings.json");
        const dotnetPath = path.join(tempDir, "dotnet");
        const dotnetLog = path.join(tempDir, "dotnet.log");
        const projectPath = path.join(tempDir, "Subcontractor.Tests.Integration.csproj");

        writeJson(prodSettingsPath, {
            WebHostTopology: {
                EnableEmbeddedWorkers: false,
                EnableDemoSeedWorker: false
            }
        });
        writeJson(devSettingsPath, {
            WebHostTopology: {
                EnableEmbeddedWorkers: false,
                EnableDemoSeedWorker: true
            }
        });
        writeJson(backgroundJobsSettingsPath, {
            SlaMonitoring: {
                WorkerEnabled: true
            },
            ContractorRating: {
                WorkerEnabled: true
            }
        });
        fs.writeFileSync(projectPath, "<Project />\n", "utf8");

        writeExecutable(
            dotnetPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" > "${dotnetLog}"
`
        );

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                SUBCONTRACTOR_TOPOLOGY_DOTNET_BIN: dotnetPath,
                SUBCONTRACTOR_TOPOLOGY_TEST_PROJECT_PATH: projectPath,
                SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_PATH: prodSettingsPath,
                SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_DEVELOPMENT_PATH: devSettingsPath,
                SUBCONTRACTOR_TOPOLOGY_BACKGROUND_JOBS_APPSETTINGS_PATH: backgroundJobsSettingsPath
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        const dotnetArgs = fs.readFileSync(dotnetLog, "utf8");
        assert.match(dotnetArgs, /test/);
        assert.match(dotnetArgs, /WebServiceCollectionExtensionsTests/);
        assert.match(dotnetArgs, new RegExp(projectPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("host topology policy script: fails when production embedded workers default is not false", () => {
    const tempDir = createTempDir("host-topology-policy-invalid-prod-");
    try {
        const prodSettingsPath = path.join(tempDir, "appsettings.json");
        const devSettingsPath = path.join(tempDir, "appsettings.Development.json");
        const backgroundJobsSettingsPath = path.join(tempDir, "backgroundjobs.appsettings.json");

        writeJson(prodSettingsPath, {
            WebHostTopology: {
                EnableEmbeddedWorkers: true,
                EnableDemoSeedWorker: false
            }
        });
        writeJson(devSettingsPath, {
            WebHostTopology: {
                EnableEmbeddedWorkers: false,
                EnableDemoSeedWorker: true
            }
        });
        writeJson(backgroundJobsSettingsPath, {
            SlaMonitoring: {
                WorkerEnabled: true
            },
            ContractorRating: {
                WorkerEnabled: true
            }
        });

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                SUBCONTRACTOR_TOPOLOGY_RUN_TESTS: "0",
                SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_PATH: prodSettingsPath,
                SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_DEVELOPMENT_PATH: devSettingsPath,
                SUBCONTRACTOR_TOPOLOGY_BACKGROUND_JOBS_APPSETTINGS_PATH: backgroundJobsSettingsPath
            }
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit when topology default is invalid.");
        assert.match(result.stderr, /Topology policy mismatch/);
        assert.match(result.stderr, /EnableEmbeddedWorkers/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("host topology policy script: supports config-only mode without dotnet", () => {
    const tempDir = createTempDir("host-topology-policy-config-only-");
    try {
        const prodSettingsPath = path.join(tempDir, "appsettings.json");
        const devSettingsPath = path.join(tempDir, "appsettings.Development.json");
        const backgroundJobsSettingsPath = path.join(tempDir, "backgroundjobs.appsettings.json");

        writeJson(prodSettingsPath, {
            WebHostTopology: {
                EnableEmbeddedWorkers: false,
                EnableDemoSeedWorker: false
            }
        });
        writeJson(devSettingsPath, {
            WebHostTopology: {
                EnableEmbeddedWorkers: false,
                EnableDemoSeedWorker: true
            }
        });
        writeJson(backgroundJobsSettingsPath, {
            SlaMonitoring: {
                WorkerEnabled: true
            },
            ContractorRating: {
                WorkerEnabled: true
            }
        });

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                SUBCONTRACTOR_TOPOLOGY_RUN_TESTS: "0",
                SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_PATH: prodSettingsPath,
                SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_DEVELOPMENT_PATH: devSettingsPath,
                SUBCONTRACTOR_TOPOLOGY_BACKGROUND_JOBS_APPSETTINGS_PATH: backgroundJobsSettingsPath
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /integration tests skipped/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("host topology policy script: fails when BackgroundJobs worker flags are disabled", () => {
    const tempDir = createTempDir("host-topology-policy-invalid-background-");
    try {
        const prodSettingsPath = path.join(tempDir, "appsettings.json");
        const devSettingsPath = path.join(tempDir, "appsettings.Development.json");
        const backgroundJobsSettingsPath = path.join(tempDir, "backgroundjobs.appsettings.json");

        writeJson(prodSettingsPath, {
            WebHostTopology: {
                EnableEmbeddedWorkers: false,
                EnableDemoSeedWorker: false
            }
        });
        writeJson(devSettingsPath, {
            WebHostTopology: {
                EnableEmbeddedWorkers: false,
                EnableDemoSeedWorker: true
            }
        });
        writeJson(backgroundJobsSettingsPath, {
            SlaMonitoring: {
                WorkerEnabled: false
            },
            ContractorRating: {
                WorkerEnabled: true
            }
        });

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                SUBCONTRACTOR_TOPOLOGY_RUN_TESTS: "0",
                SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_PATH: prodSettingsPath,
                SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_DEVELOPMENT_PATH: devSettingsPath,
                SUBCONTRACTOR_TOPOLOGY_BACKGROUND_JOBS_APPSETTINGS_PATH: backgroundJobsSettingsPath
            }
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit when BackgroundJobs worker policy is invalid.");
        assert.match(result.stderr, /Topology policy mismatch/);
        assert.match(result.stderr, /SlaMonitoring.WorkerEnabled/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
