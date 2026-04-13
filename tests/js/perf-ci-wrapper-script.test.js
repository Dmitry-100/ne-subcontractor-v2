"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const wrapperScriptPath = path.resolve(__dirname, "../../scripts/ci/run-performance-contour.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFakeDotnetExecutable(tempDir) {
    const fakeDotnetPath = path.join(tempDir, "dotnet");
    const script = `#!/usr/bin/env bash
set -euo pipefail

if [[ "$1" == "run" ]]; then
  echo "fake dotnet host started"
  trap 'exit 0' TERM INT
  while true; do
    sleep 1
  done
fi

echo "Unexpected dotnet invocation: $*" >&2
exit 1
`;

    fs.writeFileSync(fakeDotnetPath, script, { encoding: "utf8", mode: 0o755 });
    return fakeDotnetPath;
}

function writeFakeCurlExecutable(tempDir) {
    const fakeCurlPath = path.join(tempDir, "curl");
    const script = `#!/usr/bin/env bash
set -euo pipefail

url="\${@: -1}"
if [[ "$url" == *"/api/health"* ]]; then
  echo '{"status":"ok"}' >/dev/null
  exit 0
fi

echo "Unexpected curl url: $url" >&2
exit 1
`;

    fs.writeFileSync(fakeCurlPath, script, { encoding: "utf8", mode: 0o755 });
    return fakeCurlPath;
}

function writeFakeNpmExecutable(tempDir) {
    const fakeNpmPath = path.join(tempDir, "npm");
    const script = `#!/usr/bin/env bash
set -euo pipefail

if [[ -z "\${FAKE_NPM_LOG_FILE:-}" ]]; then
  echo "FAKE_NPM_LOG_FILE is required." >&2
  exit 1
fi

cmd=""
for arg in "$@"; do
  if [[ "$arg" == perf:* ]]; then
    cmd="$arg"
    break
  fi
done

if [[ -z "$cmd" ]]; then
  echo "Unexpected npm invocation: $*" >&2
  exit 1
fi

printf "%s|capture=%s\\n" "$cmd" "\${PERF_CAPTURE_TELEMETRY:-unset}" >> "$FAKE_NPM_LOG_FILE"
exit 0
`;

    fs.writeFileSync(fakeNpmPath, script, { encoding: "utf8", mode: 0o755 });
    return fakeNpmPath;
}

function writeExecutable(filePath, script) {
    fs.writeFileSync(filePath, script, { encoding: "utf8", mode: 0o755 });
}

function runWrapper(tempDir, outDir, envOverrides = {}) {
    const npmLogFile = path.join(tempDir, "npm-commands.log");
    fs.writeFileSync(npmLogFile, "", "utf8");

    writeFakeDotnetExecutable(tempDir);
    writeFakeCurlExecutable(tempDir);
    writeFakeNpmExecutable(tempDir);

    const webLogFile = path.join(tempDir, "web-perf.log");

    const result = spawnSync("bash", [wrapperScriptPath], {
        encoding: "utf8",
        env: {
            ...process.env,
            ...envOverrides,
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            BASE_URL: "http://127.0.0.1:5999",
            PERF_OUT_DIR: outDir,
            PERF_WEB_LOG_FILE: webLogFile,
            PERF_HEALTH_TIMEOUT_SEC: "2",
            FAKE_NPM_LOG_FILE: npmLogFile
        }
    });

    return {
        ...result,
        npmLogFile,
        webLogFile
    };
}

function readCommands(npmLogFile) {
    return fs
        .readFileSync(npmLogFile, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

test("perf ci wrapper: runs contour and telemetry by default", () => {
    const tempDir = createTempDir("perf-ci-wrapper-default-");
    const outDir = path.join(tempDir, "artifacts", "perf");
    try {
        const result = runWrapper(tempDir, outDir);
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const commands = readCommands(result.npmLogFile);
        assert.deepEqual(commands, ["perf:contour|capture=1"]);

        const copiedLogFile = path.join(outDir, "subcontractor-web-perf.log");
        assert.equal(fs.existsSync(copiedLogFile), true, "Expected copied web log file in perf out dir.");
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf ci wrapper: skips telemetry when PERF_CAPTURE_TELEMETRY=0", () => {
    const tempDir = createTempDir("perf-ci-wrapper-no-telemetry-");
    const outDir = path.join(tempDir, "artifacts", "perf");
    try {
        const result = runWrapper(tempDir, outDir, { PERF_CAPTURE_TELEMETRY: "0" });
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const commands = readCommands(result.npmLogFile);
        assert.deepEqual(commands, ["perf:contour|capture=0"]);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf ci wrapper: runs local-ui-assets preflight when enabled", () => {
    const tempDir = createTempDir("perf-ci-wrapper-preflight-");
    const outDir = path.join(tempDir, "artifacts", "perf");
    try {
        const preflightLogFile = path.join(tempDir, "preflight.log");
        const fakeCheckerPath = path.join(tempDir, "fake-check-local-ui-assets.sh");
        writeExecutable(fakeCheckerPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" > "${preflightLogFile}"
`);

        const result = runWrapper(tempDir, outDir, {
            PERF_UI_ASSETS_PREFLIGHT: "1",
            PERF_UI_ASSETS_CHECKER: fakeCheckerPath,
            PERF_UI_ASSETS_SETTINGS_FILE: "custom-settings.json",
            PERF_UI_ASSETS_FORCE_LOCAL: "1"
        });
        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const preflightArgs = fs.readFileSync(preflightLogFile, "utf8");
        assert.match(preflightArgs, /--settings-file custom-settings\.json/);
        assert.match(preflightArgs, /--force-local/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
