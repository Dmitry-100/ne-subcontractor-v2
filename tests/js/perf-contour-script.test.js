"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const contourScriptPath = path.resolve(__dirname, "../../scripts/perf/run-performance-contour.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function writeFakeNpmExecutable(tempDir, budgetArgsFile, compareArgsFile) {
    const fakeNpmPath = path.join(tempDir, "npm");
    const script = `#!/usr/bin/env bash
set -euo pipefail

cmd=""
for arg in "$@"; do
  case "$arg" in
    perf:http|perf:browser|perf:telemetry|perf:budget|perf:compare)
      cmd="$arg"
      ;;
  esac
done

if [[ -n "\${FAKE_NPM_COMMAND_LOG:-}" && -n "$cmd" ]]; then
  printf '%s\\n' "$cmd" >> "$FAKE_NPM_COMMAND_LOG"
fi

case "$cmd" in
  perf:http)
    out_dir="\${@: -1}"
    mkdir -p "$out_dir"
    tsv="$out_dir/http-metrics-fake.tsv"
    cat > "$tsv" <<'EOF'
endpoint	path	iteration	time_total	time_starttransfer	size_download	http_code
home	/	cold	0.010	0.009	1024	200
home	/	1	0.020	0.010	1024	200
EOF
    echo "HTTP raw samples: $tsv"
    ;;
  perf:browser)
    out_dir="\${@: -1}"
    mkdir -p "$out_dir"
    json="$out_dir/browser-metrics-fake.json"
    cat > "$json" <<'EOF'
{"results":[{"page":"home","requestCount":{"avg":1},"staticRequests":{"avgFailedSameOrigin":0},"domContentLoadedMs":{"p50":100},"loadMs":{"p50":100}}]}
EOF
    echo "Browser metrics raw json: $json"
    ;;
  perf:telemetry)
    out_dir="\${@: -1}"
    mkdir -p "$out_dir"
    report="$out_dir/http-cache-compression-telemetry-fake.md"
    raw="$out_dir/http-cache-compression-telemetry-fake.tsv"
    cat > "$report" <<'EOF'
# fake telemetry report
EOF
    cat > "$raw" <<'EOF'
endpoint	path
EOF
    cp "$report" "$out_dir/http-cache-compression-telemetry-latest.md"
    cp "$raw" "$out_dir/http-cache-compression-telemetry-latest.tsv"
    echo "Telemetry report: $report"
    echo "Telemetry raw samples: $raw"
    ;;
  perf:budget)
    printf '%s\n' "$@" > "${budgetArgsFile}"
    report_file=""
    args=("$@")
    for ((i=0; i<\${#args[@]}; i++)); do
      if [[ "\${args[$i]}" == "--report-md" && $((i+1)) -lt \${#args[@]} ]]; then
        report_file="\${args[$((i+1))]}"
        break
      fi
    done
    if [[ -n "$report_file" ]]; then
      mkdir -p "$(dirname "$report_file")"
      cat > "$report_file" <<'EOF'
# fake budget report
EOF
    fi
    ;;
  perf:compare)
    printf '%s\n' "$@" > "${compareArgsFile}"
    out_file=""
    args=("$@")
    for ((i=0; i<\${#args[@]}; i++)); do
      if [[ "\${args[$i]}" == "--out" && $((i+1)) -lt \${#args[@]} ]]; then
        out_file="\${args[$((i+1))]}"
        break
      fi
    done
    if [[ -n "$out_file" ]]; then
      mkdir -p "$(dirname "$out_file")"
      cat > "$out_file" <<'EOF'
# fake regression report
EOF
    fi
    ;;
  *)
    echo "Unexpected npm invocation: $*" >&2
    exit 1
    ;;
esac
`;

    fs.writeFileSync(fakeNpmPath, script, { encoding: "utf8", mode: 0o755 });
    return fakeNpmPath;
}

function runContour(tempDir, outDir, explicitBaselineManifest, envOverrides = {}) {
    const budgetArgsFile = path.join(tempDir, "budget-args.txt");
    const compareArgsFile = path.join(tempDir, "compare-args.txt");
    const commandLogFile = path.join(tempDir, "command-log.txt");
    fs.writeFileSync(commandLogFile, "", "utf8");
    writeFakeNpmExecutable(tempDir, budgetArgsFile, compareArgsFile);

    const args = [contourScriptPath, "http://127.0.0.1:5080", outDir];
    if (explicitBaselineManifest) {
        args.push(explicitBaselineManifest);
    }

    const result = spawnSync("bash", args, {
        encoding: "utf8",
        env: {
            ...process.env,
            ...envOverrides,
            FAKE_NPM_COMMAND_LOG: commandLogFile,
            PATH: `${tempDir}:${process.env.PATH || ""}`
        }
    });

    return {
        ...result,
        budgetArgsFile,
        compareArgsFile,
        commandLogFile
    };
}

function readBudgetArgs(budgetArgsFile) {
    return fs
        .readFileSync(budgetArgsFile, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

function readCommands(commandLogFile) {
    return fs
        .readFileSync(commandLogFile, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

test("perf contour script: passes only manifest to budget when no baseline is available", () => {
    const tempDir = createTempDir("perf-contour-no-baseline-");
    const outDir = path.join(tempDir, "perf");
    try {
        const result = runContour(tempDir, outDir);
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const budgetArgs = readBudgetArgs(result.budgetArgsFile);
        assert.ok(budgetArgs.includes("--manifest"), "Expected --manifest arg for budget command.");
        assert.ok(
            !budgetArgs.includes("--baseline-manifest"),
            "Did not expect --baseline-manifest when no previous baseline exists."
        );
        assert.equal(
            fs.existsSync(result.compareArgsFile),
            false,
            "Did not expect compare invocation without baseline."
        );

        const commands = readCommands(result.commandLogFile);
        assert.deepEqual(commands, ["perf:http", "perf:browser", "perf:telemetry", "perf:budget"]);

        const latestManifestPath = path.join(outDir, "perf-contour-latest.json");
        const latestManifest = JSON.parse(fs.readFileSync(latestManifestPath, "utf8"));
        assert.ok(latestManifest.telemetryReportMd, "Expected telemetry report path in contour manifest.");
        assert.ok(latestManifest.telemetryRawTsv, "Expected telemetry raw path in contour manifest.");
        assert.ok(latestManifest.budgetReportMd, "Expected budget report path in contour manifest.");
        assert.equal(
            fs.existsSync(path.join(outDir, "perf-budget-latest.md")),
            true,
            "Expected latest budget report alias to be created."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf contour script: skips auto baseline when PERF_AUTO_BASELINE=0", () => {
    const tempDir = createTempDir("perf-contour-disable-auto-baseline-");
    const outDir = path.join(tempDir, "perf");
    try {
        fs.mkdirSync(outDir, { recursive: true });
        const previousLatestManifest = path.join(outDir, "perf-contour-latest.json");
        writeJson(previousLatestManifest, {
            browserMetricsJson: "browser-previous.json",
            httpMetricsTsv: "http-previous.tsv"
        });

        const result = runContour(tempDir, outDir, null, { PERF_AUTO_BASELINE: "0" });
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const budgetArgs = readBudgetArgs(result.budgetArgsFile);
        assert.ok(
            !budgetArgs.includes("--baseline-manifest"),
            "Did not expect baseline manifest when auto-baseline is disabled."
        );
        assert.equal(
            fs.existsSync(path.join(outDir, "perf-regression-latest.md")),
            false,
            "Did not expect regression report when auto-baseline is disabled."
        );

        const commands = readCommands(result.commandLogFile);
        assert.deepEqual(commands, ["perf:http", "perf:browser", "perf:telemetry", "perf:budget"]);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf contour script: skips telemetry when PERF_CAPTURE_TELEMETRY=0", () => {
    const tempDir = createTempDir("perf-contour-disable-telemetry-");
    const outDir = path.join(tempDir, "perf");
    try {
        const result = runContour(tempDir, outDir, null, { PERF_CAPTURE_TELEMETRY: "0", PERF_AUTO_BASELINE: "0" });
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const commands = readCommands(result.commandLogFile);
        assert.deepEqual(commands, ["perf:http", "perf:browser", "perf:budget"]);

        const latestManifestPath = path.join(outDir, "perf-contour-latest.json");
        const latestManifest = JSON.parse(fs.readFileSync(latestManifestPath, "utf8"));
        assert.equal(
            Object.prototype.hasOwnProperty.call(latestManifest, "telemetryReportMd"),
            false,
            "Did not expect telemetryReportMd field when telemetry is disabled."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf contour script: auto-uses previous latest manifest as baseline when available", () => {
    const tempDir = createTempDir("perf-contour-auto-baseline-");
    const outDir = path.join(tempDir, "perf");
    try {
        fs.mkdirSync(outDir, { recursive: true });
        const previousLatestManifest = path.join(outDir, "perf-contour-latest.json");
        writeJson(previousLatestManifest, {
            browserMetricsJson: "browser-previous.json",
            httpMetricsTsv: "http-previous.tsv"
        });

        const result = runContour(tempDir, outDir);
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /Baseline source: auto-latest/);

        const budgetArgs = readBudgetArgs(result.budgetArgsFile);
        assert.ok(budgetArgs.includes("--baseline-manifest"), "Expected auto baseline manifest argument.");
        assert.equal(
            fs.existsSync(path.join(outDir, "perf-regression-latest.md")),
            true,
            "Expected latest regression report to be created when baseline is available."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf contour script: prefers pinned baseline manifest over previous latest manifest", () => {
    const tempDir = createTempDir("perf-contour-pinned-baseline-");
    const outDir = path.join(tempDir, "perf");
    try {
        fs.mkdirSync(outDir, { recursive: true });
        const pinnedBaselineManifest = path.join(outDir, "perf-contour-baseline.json");
        writeJson(pinnedBaselineManifest, {
            browserMetricsJson: "browser-pinned.json",
            httpMetricsTsv: "http-pinned.tsv"
        });
        writeJson(path.join(outDir, "perf-contour-latest.json"), {
            browserMetricsJson: "browser-previous.json",
            httpMetricsTsv: "http-previous.tsv"
        });

        const result = runContour(tempDir, outDir);
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /Baseline source: pinned-baseline/);

        const budgetArgs = readBudgetArgs(result.budgetArgsFile);
        const baselineFlagIndex = budgetArgs.indexOf("--baseline-manifest");
        assert.ok(baselineFlagIndex >= 0, "Expected --baseline-manifest argument for pinned baseline mode.");
        assert.equal(
            budgetArgs[baselineFlagIndex + 1],
            pinnedBaselineManifest,
            "Expected pinned baseline manifest path to be passed to budget command."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf contour script: prefers explicit baseline manifest over auto baseline", () => {
    const tempDir = createTempDir("perf-contour-explicit-baseline-");
    const outDir = path.join(tempDir, "perf");
    try {
        fs.mkdirSync(outDir, { recursive: true });
        writeJson(path.join(outDir, "perf-contour-latest.json"), {
            browserMetricsJson: "browser-previous.json",
            httpMetricsTsv: "http-previous.tsv"
        });

        const explicitBaselineManifest = path.join(tempDir, "explicit-baseline.json");
        writeJson(explicitBaselineManifest, {
            browserMetricsJson: "browser-explicit.json",
            httpMetricsTsv: "http-explicit.tsv"
        });

        const result = runContour(tempDir, outDir, explicitBaselineManifest);
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /Baseline source: explicit/);

        const budgetArgs = readBudgetArgs(result.budgetArgsFile);
        const baselineFlagIndex = budgetArgs.indexOf("--baseline-manifest");
        assert.ok(baselineFlagIndex >= 0, "Expected explicit --baseline-manifest argument.");
        assert.equal(
            budgetArgs[baselineFlagIndex + 1],
            explicitBaselineManifest,
            "Expected explicit baseline manifest path to be passed to budget command."
        );
        assert.equal(
            fs.existsSync(path.join(outDir, "perf-regression-latest.md")),
            true,
            "Expected latest regression report to be created for explicit baseline runs."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
