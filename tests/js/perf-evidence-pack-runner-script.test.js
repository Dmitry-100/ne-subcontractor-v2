"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.resolve(__dirname, "../../scripts/ci/run-performance-evidence-pack.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeExecutable(filePath, script) {
    fs.writeFileSync(filePath, script, { encoding: "utf8", mode: 0o755 });
}

function readLines(filePath) {
    return fs
        .readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
}

test("performance evidence pack runner: executes contour and evidence check by default", () => {
    const tempDir = createTempDir("perf-evidence-pack-default-");
    try {
        const contourLog = path.join(tempDir, "contour.log");
        const checkerArgsLog = path.join(tempDir, "checker-args.log");
        const npmLog = path.join(tempDir, "npm.log");
        const perfOutDir = path.join(tempDir, "perf-out");

        const contourRunnerPath = path.join(tempDir, "fake-contour-runner.sh");
        writeExecutable(contourRunnerPath, `#!/usr/bin/env bash
set -euo pipefail
cat > "${contourLog}" <<EOF
BASE_URL=$BASE_URL
PERF_OUT_DIR=$PERF_OUT_DIR
PERF_CAPTURE_TELEMETRY=$PERF_CAPTURE_TELEMETRY
PERF_AUTO_BASELINE=$PERF_AUTO_BASELINE
PERF_BASELINE_MANIFEST=\${PERF_BASELINE_MANIFEST:-}
PERF_UI_ASSETS_PREFLIGHT=\${PERF_UI_ASSETS_PREFLIGHT:-}
PERF_UI_ASSETS_CHECKER=\${PERF_UI_ASSETS_CHECKER:-}
PERF_UI_ASSETS_SETTINGS_FILE=\${PERF_UI_ASSETS_SETTINGS_FILE:-}
PERF_UI_ASSETS_FORCE_LOCAL=\${PERF_UI_ASSETS_FORCE_LOCAL:-}
EOF
`);

        const checkerPath = path.join(tempDir, "fake-checker.sh");
        writeExecutable(checkerPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" > "${checkerArgsLog}"
`);

        const fakeNpmPath = path.join(tempDir, "npm");
        writeExecutable(fakeNpmPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" >> "${npmLog}"
`);

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                NPM_COMMAND: "npm",
                BASE_URL: "http://127.0.0.1:5088",
                PERF_OUT_DIR: perfOutDir,
                PERF_CAPTURE_TELEMETRY: "0",
                PERF_AUTO_BASELINE: "0",
                PERF_CONTOUR_RUNNER: contourRunnerPath,
                PERF_EVIDENCE_CHECKER: checkerPath
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const contourState = fs.readFileSync(contourLog, "utf8");
        assert.match(contourState, /BASE_URL=http:\/\/127\.0\.0\.1:5088/);
        assert.match(contourState, /PERF_CAPTURE_TELEMETRY=0/);
        assert.match(contourState, new RegExp(`PERF_OUT_DIR=${perfOutDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

        const checkerArgs = readLines(checkerArgsLog);
        assert.deepEqual(checkerArgs, [perfOutDir]);
        assert.equal(fs.existsSync(npmLog), false, "Did not expect npm invocations without PERF_PIN_BASELINE.");
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("performance evidence pack runner: supports SQL evidence capture and baseline pin", () => {
    const tempDir = createTempDir("perf-evidence-pack-sql-pin-");
    try {
        const contourLog = path.join(tempDir, "contour.log");
        const checkerArgsLog = path.join(tempDir, "checker-args.log");
        const sqlArgsLog = path.join(tempDir, "sql-args.log");
        const npmLog = path.join(tempDir, "npm.log");
        const perfOutDir = path.join(tempDir, "perf-out");
        const sqlOutDir = path.join(tempDir, "sql-evidence");

        const contourRunnerPath = path.join(tempDir, "fake-contour-runner.sh");
        writeExecutable(contourRunnerPath, `#!/usr/bin/env bash
set -euo pipefail
cat > "${contourLog}" <<EOF
PERF_UI_ASSETS_PREFLIGHT=\${PERF_UI_ASSETS_PREFLIGHT:-}
PERF_UI_ASSETS_CHECKER=\${PERF_UI_ASSETS_CHECKER:-}
PERF_UI_ASSETS_SETTINGS_FILE=\${PERF_UI_ASSETS_SETTINGS_FILE:-}
PERF_UI_ASSETS_FORCE_LOCAL=\${PERF_UI_ASSETS_FORCE_LOCAL:-}
EOF
`);

        const checkerPath = path.join(tempDir, "fake-checker.sh");
        writeExecutable(checkerPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" > "${checkerArgsLog}"
`);

        const sqlRunnerPath = path.join(tempDir, "fake-sql-runner.sh");
        writeExecutable(sqlRunnerPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" > "${sqlArgsLog}"
`);

        const fakeNpmPath = path.join(tempDir, "npm");
        writeExecutable(fakeNpmPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" >> "${npmLog}"
`);

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                NPM_COMMAND: "npm",
                PERF_OUT_DIR: perfOutDir,
                PERF_PIN_BASELINE: "1",
                PERF_CONTOUR_RUNNER: contourRunnerPath,
                PERF_EVIDENCE_CHECKER: checkerPath,
                PERF_CAPTURE_SQL_EVIDENCE: "1",
                SQL_EVIDENCE_RUNNER: sqlRunnerPath,
                SQL_EVIDENCE_SERVER: "sql-host,1433",
                SQL_EVIDENCE_DATABASE: "SubcontractorV2",
                SQL_EVIDENCE_TAG: "staging",
                SQL_EVIDENCE_OUTPUT_DIR: sqlOutDir,
                SQL_EVIDENCE_NO_ARCHIVE: "1",
                SQL_EVIDENCE_NO_TOP_QUERIES: "1",
                PERF_UI_ASSETS_PREFLIGHT: "0",
                PERF_UI_ASSETS_CHECKER: path.join(tempDir, "checker.sh"),
                PERF_UI_ASSETS_SETTINGS_FILE: "appsettings.perf.json",
                PERF_UI_ASSETS_FORCE_LOCAL: "1"
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const sqlArgs = fs.readFileSync(sqlArgsLog, "utf8");
        assert.match(sqlArgs, /--server sql-host,1433/);
        assert.match(sqlArgs, /--database SubcontractorV2/);
        assert.match(sqlArgs, /--tag staging/);
        assert.match(sqlArgs, new RegExp(`--output-dir ${sqlOutDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
        assert.match(sqlArgs, /--no-archive/);
        assert.match(sqlArgs, /--no-top-queries/);

        const checkerArgs = readLines(checkerArgsLog);
        assert.deepEqual(checkerArgs, [`${perfOutDir} ${sqlOutDir}`]);

        const contourState = fs.readFileSync(contourLog, "utf8");
        assert.match(contourState, /PERF_UI_ASSETS_PREFLIGHT=0/);
        assert.match(contourState, /PERF_UI_ASSETS_CHECKER=.*checker\.sh/);
        assert.match(contourState, /PERF_UI_ASSETS_SETTINGS_FILE=appsettings\.perf\.json/);
        assert.match(contourState, /PERF_UI_ASSETS_FORCE_LOCAL=1/);

        const npmCalls = readLines(npmLog);
        assert.equal(npmCalls.length, 1, "Expected single npm call for baseline pin.");
        assert.match(npmCalls[0], /run --silent perf:pin-baseline --/);
        assert.match(npmCalls[0], /perf-contour-latest\.json/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
