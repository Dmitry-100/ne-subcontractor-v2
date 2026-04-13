"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.resolve(__dirname, "../../scripts/ci/run-sql-core-tests.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeExecutable(filePath, script) {
    fs.writeFileSync(filePath, script, { encoding: "utf8", mode: 0o755 });
}

test("sql core runner: uses configured dotnet override path", () => {
    const tempDir = createTempDir("sql-core-runner-override-");
    try {
        const fakeDotnetPath = path.join(tempDir, "dotnet");
        const dotnetArgsLog = path.join(tempDir, "dotnet-args.log");
        const fakeProjectPath = path.join(tempDir, "Subcontractor.Tests.SqlServer.csproj");

        fs.writeFileSync(fakeProjectPath, "<Project />\n", "utf8");
        writeExecutable(fakeDotnetPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" > "${dotnetArgsLog}"
exit 0
`);

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                SUBCONTRACTOR_SQL_DOTNET_BIN: fakeDotnetPath,
                SUBCONTRACTOR_SQL_TEST_PROJECT_PATH: fakeProjectPath
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        const dotnetArgs = fs.readFileSync(dotnetArgsLog, "utf8");
        assert.match(dotnetArgs, /test/);
        assert.match(dotnetArgs, /SqlSuite=Core/);
        assert.match(dotnetArgs, new RegExp(fakeProjectPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("sql core runner: fails when configured dotnet override is not executable", () => {
    const tempDir = createTempDir("sql-core-runner-missing-dotnet-");
    try {
        const fakeProjectPath = path.join(tempDir, "Subcontractor.Tests.SqlServer.csproj");
        fs.writeFileSync(fakeProjectPath, "<Project />\n", "utf8");

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                SUBCONTRACTOR_SQL_DOTNET_BIN: path.join(tempDir, "missing-dotnet"),
                SUBCONTRACTOR_SQL_TEST_PROJECT_PATH: fakeProjectPath
            }
        });

        assert.notEqual(result.status, 0, "Expected failure for missing configured dotnet executable.");
        assert.match(result.stderr, /Configured dotnet runtime is not executable/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("sql core runner: fails when SQL test project path is missing", () => {
    const tempDir = createTempDir("sql-core-runner-missing-project-");
    try {
        const fakeDotnetPath = path.join(tempDir, "dotnet");
        writeExecutable(fakeDotnetPath, "#!/usr/bin/env bash\nset -euo pipefail\nexit 0\n");

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                SUBCONTRACTOR_SQL_DOTNET_BIN: fakeDotnetPath,
                SUBCONTRACTOR_SQL_TEST_PROJECT_PATH: path.join(tempDir, "missing.csproj")
            }
        });

        assert.notEqual(result.status, 0, "Expected failure for missing SQL test project.");
        assert.match(result.stderr, /SQL test project not found/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
