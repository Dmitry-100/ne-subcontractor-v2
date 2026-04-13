"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.resolve(__dirname, "../../scripts/ci/run-staging-evidence-pack.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeExecutable(filePath, script) {
    fs.writeFileSync(filePath, script, { encoding: "utf8", mode: 0o755 });
}

test("staging evidence runner: executes perf and SQL contours and writes summary", () => {
    const tempDir = createTempDir("staging-evidence-default-");
    try {
        const outRoot = path.join(tempDir, "out");
        const runId = "run-default";
        const runDir = path.join(outRoot, runId);
        const perfDir = path.join(runDir, "perf");
        const perfEnvLog = path.join(tempDir, "perf-env.log");
        const sqlLog = path.join(tempDir, "sql.log");
        const topologyLog = path.join(tempDir, "topology.log");
        const perfRunnerPath = path.join(tempDir, "fake-perf-runner.sh");
        const sqlRunnerPath = path.join(tempDir, "fake-sql-runner.sh");
        const topologyRunnerPath = path.join(tempDir, "fake-topology-runner.sh");

        writeExecutable(
            perfRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf "BASE_URL=%s\\nPERF_OUT_DIR=%s\\n" "$BASE_URL" "$PERF_OUT_DIR" > "${perfEnvLog}"
mkdir -p "$PERF_OUT_DIR"
cat > "$PERF_OUT_DIR/perf-contour-latest.json" <<EOF
{"ok":true}
EOF
cat > "$PERF_OUT_DIR/perf-budget-latest.md" <<EOF
# budget
EOF
cat > "$PERF_OUT_DIR/perf-regression-latest.md" <<EOF
# regression
EOF
cat > "$PERF_OUT_DIR/http-cache-compression-telemetry-latest.md" <<EOF
# telemetry
EOF
`
        );

        writeExecutable(
            sqlRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf "sql-core-ran\\n" > "${sqlLog}"
`
        );
        writeExecutable(
            topologyRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf "topology-ran\\n" > "${topologyLog}"
`
        );

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                BASE_URL: "http://127.0.0.1:5088",
                STAGING_EVIDENCE_OUT_DIR: outRoot,
                STAGING_EVIDENCE_RUN_ID: runId,
                STAGING_PERF_RUNNER: perfRunnerPath,
                STAGING_SQL_CORE_RUNNER: sqlRunnerPath,
                STAGING_TOPOLOGY_RUNNER: topologyRunnerPath
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.equal(fs.existsSync(sqlLog), true, "Expected SQL runner invocation.");
        assert.equal(fs.existsSync(topologyLog), true, "Expected topology runner invocation.");

        const perfEnvState = fs.readFileSync(perfEnvLog, "utf8");
        assert.match(perfEnvState, /BASE_URL=http:\/\/127\.0\.0\.1:5088/);
        assert.match(perfEnvState, new RegExp(`PERF_OUT_DIR=${perfDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

        const summaryPath = path.join(runDir, "staging-evidence-summary.md");
        const latestSummaryPath = path.join(outRoot, "staging-evidence-latest.md");
        assert.equal(fs.existsSync(summaryPath), true, "Expected summary report.");
        assert.equal(fs.existsSync(latestSummaryPath), true, "Expected latest summary alias.");

        const summary = fs.readFileSync(summaryPath, "utf8");
        assert.match(summary, /Host topology preflight \| `passed`/);
        assert.match(summary, /Performance evidence pack \| `passed`/);
        assert.match(summary, /SQL Core contour \| `passed`/);
        assert.match(summary, /Contour manifest \| `present`/);
        assert.match(summary, /Cache\/compression telemetry \| `present`/);
        assert.match(summary, /SQL performance evidence pack \| `not-requested`/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("staging evidence runner: supports SQL contour skip mode", () => {
    const tempDir = createTempDir("staging-evidence-skip-sql-");
    try {
        const outRoot = path.join(tempDir, "out");
        const runId = "run-skip-sql";
        const perfRunnerPath = path.join(tempDir, "fake-perf-runner.sh");
        const sqlRunnerPath = path.join(tempDir, "fake-sql-runner.sh");
        const sqlLog = path.join(tempDir, "sql.log");
        const topologyRunnerPath = path.join(tempDir, "fake-topology-runner.sh");

        writeExecutable(
            perfRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$PERF_OUT_DIR"
cat > "$PERF_OUT_DIR/perf-contour-latest.json" <<EOF
{"ok":true}
EOF
cat > "$PERF_OUT_DIR/perf-budget-latest.md" <<EOF
# budget
EOF
cat > "$PERF_OUT_DIR/perf-regression-latest.md" <<EOF
# regression
EOF
cat > "$PERF_OUT_DIR/http-cache-compression-telemetry-latest.md" <<EOF
# telemetry
EOF
`
        );

        writeExecutable(
            sqlRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf "unexpected\\n" > "${sqlLog}"
`
        );
        writeExecutable(
            topologyRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf "unexpected\\n" > "${tempDir}/topology.log"
`
        );

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                BASE_URL: "http://127.0.0.1:5090",
                STAGING_EVIDENCE_OUT_DIR: outRoot,
                STAGING_EVIDENCE_RUN_ID: runId,
                STAGING_PERF_RUNNER: perfRunnerPath,
                STAGING_SQL_CORE_RUNNER: sqlRunnerPath,
                STAGING_TOPOLOGY_RUNNER: topologyRunnerPath,
                STAGING_RUN_SQL_CORE: "0",
                STAGING_RUN_TOPOLOGY_CHECK: "0"
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.equal(fs.existsSync(sqlLog), false, "Did not expect SQL runner invocation.");

        const summaryPath = path.join(outRoot, runId, "staging-evidence-summary.md");
        const summary = fs.readFileSync(summaryPath, "utf8");
        assert.match(summary, /Host topology preflight \| `skipped`/);
        assert.match(summary, /SQL Core contour \| `skipped`/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("staging evidence runner: fails fast when BASE_URL is missing", () => {
    const tempDir = createTempDir("staging-evidence-no-base-url-");
    try {
        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                BASE_URL: "",
                STAGING_EVIDENCE_OUT_DIR: path.join(tempDir, "out")
            }
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit without BASE_URL.");
        assert.match(result.stderr, /BASE_URL is required/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("staging evidence runner: fails when topology preflight fails", () => {
    const tempDir = createTempDir("staging-evidence-topology-fail-");
    try {
        const outRoot = path.join(tempDir, "out");
        const runId = "run-topology-fail";
        const perfRunnerPath = path.join(tempDir, "fake-perf-runner.sh");
        const topologyRunnerPath = path.join(tempDir, "fake-topology-runner.sh");

        writeExecutable(
            perfRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$PERF_OUT_DIR"
cat > "$PERF_OUT_DIR/perf-contour-latest.json" <<EOF
{"ok":true}
EOF
cat > "$PERF_OUT_DIR/perf-budget-latest.md" <<EOF
# budget
EOF
cat > "$PERF_OUT_DIR/http-cache-compression-telemetry-latest.md" <<EOF
# telemetry
EOF
`
        );
        writeExecutable(
            topologyRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
echo "topology error" >&2
exit 7
`
        );

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                BASE_URL: "http://127.0.0.1:5091",
                STAGING_EVIDENCE_OUT_DIR: outRoot,
                STAGING_EVIDENCE_RUN_ID: runId,
                STAGING_PERF_RUNNER: perfRunnerPath,
                STAGING_RUN_SQL_CORE: "0",
                STAGING_TOPOLOGY_RUNNER: topologyRunnerPath
            }
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit when topology preflight fails.");

        const summaryPath = path.join(outRoot, runId, "staging-evidence-summary.md");
        const summary = fs.readFileSync(summaryPath, "utf8");
        assert.match(summary, /Host topology preflight \| `failed`/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("staging evidence runner: executes dependency guards when enabled", () => {
    const tempDir = createTempDir("staging-evidence-dependency-guards-");
    try {
        const outRoot = path.join(tempDir, "out");
        const runId = "run-dependency-guards";
        const perfRunnerPath = path.join(tempDir, "fake-perf-runner.sh");
        const vulnerabilityRunnerPath = path.join(tempDir, "fake-vulnerability-runner.sh");
        const outdatedRunnerPath = path.join(tempDir, "fake-outdated-runner.sh");
        const vulnerabilityLog = path.join(tempDir, "vulnerability.log");
        const outdatedLog = path.join(tempDir, "outdated.log");
        const fakeSolutionPath = path.join(tempDir, "fake.sln");

        fs.writeFileSync(fakeSolutionPath, "Microsoft Visual Studio Solution File, Format Version 12.00\n", "utf8");
        writeExecutable(
            perfRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$PERF_OUT_DIR"
cat > "$PERF_OUT_DIR/perf-contour-latest.json" <<EOF
{"ok":true}
EOF
cat > "$PERF_OUT_DIR/perf-budget-latest.md" <<EOF
# budget
EOF
cat > "$PERF_OUT_DIR/perf-regression-latest.md" <<EOF
# regression
EOF
cat > "$PERF_OUT_DIR/http-cache-compression-telemetry-latest.md" <<EOF
# telemetry
EOF
`
        );
        writeExecutable(
            vulnerabilityRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf "vulnerability:%s\\n" "$1" > "${vulnerabilityLog}"
`
        );
        writeExecutable(
            outdatedRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf "outdated:%s\\n" "$1" > "${outdatedLog}"
`
        );

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                BASE_URL: "http://127.0.0.1:5092",
                STAGING_EVIDENCE_OUT_DIR: outRoot,
                STAGING_EVIDENCE_RUN_ID: runId,
                STAGING_RUN_SQL_CORE: "0",
                STAGING_RUN_TOPOLOGY_CHECK: "0",
                STAGING_RUN_DEPENDENCY_GUARDS: "1",
                STAGING_DEPENDENCY_SOLUTION_PATH: fakeSolutionPath,
                STAGING_PERF_RUNNER: perfRunnerPath,
                STAGING_DEPENDENCY_VULN_RUNNER: vulnerabilityRunnerPath,
                STAGING_DEPENDENCY_OUTDATED_RUNNER: outdatedRunnerPath
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        const vulnerabilityInvocation = fs.readFileSync(vulnerabilityLog, "utf8");
        const outdatedInvocation = fs.readFileSync(outdatedLog, "utf8");
        assert.match(vulnerabilityInvocation, new RegExp(`vulnerability:${fakeSolutionPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
        assert.match(outdatedInvocation, new RegExp(`outdated:${fakeSolutionPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

        const summaryPath = path.join(outRoot, runId, "staging-evidence-summary.md");
        const summary = fs.readFileSync(summaryPath, "utf8");
        assert.match(summary, /Dependency vulnerability guard \| `passed`/);
        assert.match(summary, /Dependency outdated budget guard \| `passed`/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("staging evidence runner: fails when dependency vulnerability guard fails", () => {
    const tempDir = createTempDir("staging-evidence-dependency-vuln-fail-");
    try {
        const outRoot = path.join(tempDir, "out");
        const runId = "run-dependency-vuln-fail";
        const perfRunnerPath = path.join(tempDir, "fake-perf-runner.sh");
        const vulnerabilityRunnerPath = path.join(tempDir, "fake-vulnerability-runner.sh");
        const outdatedRunnerPath = path.join(tempDir, "fake-outdated-runner.sh");
        const fakeSolutionPath = path.join(tempDir, "fake.sln");

        fs.writeFileSync(fakeSolutionPath, "Microsoft Visual Studio Solution File, Format Version 12.00\n", "utf8");
        writeExecutable(
            perfRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$PERF_OUT_DIR"
cat > "$PERF_OUT_DIR/perf-contour-latest.json" <<EOF
{"ok":true}
EOF
cat > "$PERF_OUT_DIR/perf-budget-latest.md" <<EOF
# budget
EOF
cat > "$PERF_OUT_DIR/perf-regression-latest.md" <<EOF
# regression
EOF
cat > "$PERF_OUT_DIR/http-cache-compression-telemetry-latest.md" <<EOF
# telemetry
EOF
`
        );
        writeExecutable(
            vulnerabilityRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
echo "vulnerability check failed" >&2
exit 9
`
        );
        writeExecutable(
            outdatedRunnerPath,
            `#!/usr/bin/env bash
set -euo pipefail
exit 0
`
        );

        const result = spawnSync("bash", [scriptPath], {
            encoding: "utf8",
            env: {
                ...process.env,
                BASE_URL: "http://127.0.0.1:5093",
                STAGING_EVIDENCE_OUT_DIR: outRoot,
                STAGING_EVIDENCE_RUN_ID: runId,
                STAGING_RUN_SQL_CORE: "0",
                STAGING_RUN_TOPOLOGY_CHECK: "0",
                STAGING_RUN_DEPENDENCY_GUARDS: "1",
                STAGING_DEPENDENCY_SOLUTION_PATH: fakeSolutionPath,
                STAGING_PERF_RUNNER: perfRunnerPath,
                STAGING_DEPENDENCY_VULN_RUNNER: vulnerabilityRunnerPath,
                STAGING_DEPENDENCY_OUTDATED_RUNNER: outdatedRunnerPath
            }
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit when vulnerability guard fails.");

        const summaryPath = path.join(outRoot, runId, "staging-evidence-summary.md");
        const summary = fs.readFileSync(summaryPath, "utf8");
        assert.match(summary, /Dependency vulnerability guard \| `failed`/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
