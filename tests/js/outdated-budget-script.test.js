"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.resolve(__dirname, "../../scripts/ci/check-dotnet-outdated-budget.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeExecutable(filePath, script) {
    fs.writeFileSync(filePath, script, { encoding: "utf8", mode: 0o755 });
}

test("outdated budget script: passes when counts are within budget", () => {
    const tempDir = createTempDir("outdated-budget-pass-");
    try {
        const reportDir = path.join(tempDir, "artifacts");
        const reportPath = path.join(reportDir, "nuget-outdated-report.json");
        const summaryPath = path.join(reportDir, "nuget-outdated-summary.txt");
        const fakeRunner = path.join(tempDir, "fake-report.sh");

        writeExecutable(
            fakeRunner,
            `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "${reportDir}"
cat > "${reportPath}" <<EOF
{"ok":true}
EOF
cat > "${summaryPath}" <<EOF
NuGet outdated report generated at 2026-04-13T00:00:00Z
Solution: test.sln
Total outdated packages (highest patch): 20
  Breakdown (total): patch=20, minor=0, major=0
Production-scope outdated packages: 10
  Breakdown (production): patch=10, minor=0, major=0
Report: ${reportPath}
EOF
`
        );

        const result = spawnSync("bash", [scriptPath, "test.sln"], {
            encoding: "utf8",
            env: {
                ...process.env,
                OUTDATED_REPORT_RUNNER: fakeRunner,
                REPORT_DIR: reportDir,
                REPORT_PATH: reportPath,
                SUMMARY_PATH: summaryPath,
                OUTDATED_BUDGET_PROD_PATCH_MAX: "15"
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /within configured budget/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("outdated budget script: fails when production minor exceeds budget", () => {
    const tempDir = createTempDir("outdated-budget-fail-minor-");
    try {
        const reportDir = path.join(tempDir, "artifacts");
        const reportPath = path.join(reportDir, "nuget-outdated-report.json");
        const summaryPath = path.join(reportDir, "nuget-outdated-summary.txt");
        const fakeRunner = path.join(tempDir, "fake-report.sh");

        writeExecutable(
            fakeRunner,
            `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "${reportDir}"
cat > "${reportPath}" <<EOF
{"ok":true}
EOF
cat > "${summaryPath}" <<EOF
NuGet outdated report generated at 2026-04-13T00:00:00Z
Solution: test.sln
Total outdated packages (highest patch): 5
  Breakdown (total): patch=4, minor=1, major=0
Production-scope outdated packages: 3
  Breakdown (production): patch=2, minor=1, major=0
Report: ${reportPath}
EOF
`
        );

        const result = spawnSync("bash", [scriptPath, "test.sln"], {
            encoding: "utf8",
            env: {
                ...process.env,
                OUTDATED_REPORT_RUNNER: fakeRunner,
                REPORT_DIR: reportDir,
                REPORT_PATH: reportPath,
                SUMMARY_PATH: summaryPath,
                OUTDATED_BUDGET_PROD_MINOR_MAX: "0"
            }
        });

        assert.notEqual(result.status, 0, "Expected failure when production minor budget is exceeded.");
        assert.match(result.stderr, /production minor outdated/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("outdated budget script: fails when summary breakdown lines are missing", () => {
    const tempDir = createTempDir("outdated-budget-fail-parse-");
    try {
        const reportDir = path.join(tempDir, "artifacts");
        const reportPath = path.join(reportDir, "nuget-outdated-report.json");
        const summaryPath = path.join(reportDir, "nuget-outdated-summary.txt");
        const fakeRunner = path.join(tempDir, "fake-report.sh");

        writeExecutable(
            fakeRunner,
            `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "${reportDir}"
cat > "${reportPath}" <<EOF
{"ok":true}
EOF
cat > "${summaryPath}" <<EOF
NuGet outdated report generated at 2026-04-13T00:00:00Z
Solution: test.sln
EOF
`
        );

        const result = spawnSync("bash", [scriptPath, "test.sln"], {
            encoding: "utf8",
            env: {
                ...process.env,
                OUTDATED_REPORT_RUNNER: fakeRunner,
                REPORT_DIR: reportDir,
                REPORT_PATH: reportPath,
                SUMMARY_PATH: summaryPath
            }
        });

        assert.notEqual(result.status, 0, "Expected failure for malformed summary.");
        assert.match(result.stderr, /Failed to parse outdated breakdown/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
