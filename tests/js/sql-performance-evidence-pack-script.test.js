"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.resolve(__dirname, "../../scripts/perf/capture-sql-performance-evidence-pack.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeExecutable(filePath, script) {
    fs.writeFileSync(filePath, script, { encoding: "utf8", mode: 0o755 });
}

test("sql evidence pack: uses host sqlcmd when available", () => {
    const tempDir = createTempDir("sql-evidence-host-");
    try {
        const sqlcmdLog = path.join(tempDir, "sqlcmd.log");
        const outputDir = path.join(tempDir, "evidence");
        const fakeSqlcmdPath = path.join(tempDir, "sqlcmd");

        writeExecutable(fakeSqlcmdPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" >> "${sqlcmdLog}"
out=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o)
      out="\${2:-}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done
if [[ -z "$out" ]]; then
  echo "missing -o" >&2
  exit 1
fi
printf "host-sqlcmd-output\\n" > "$out"
`);

        const result = spawnSync("bash", [
            scriptPath,
            "--server",
            "localhost,1433",
            "--database",
            "SubcontractorV2",
            "--username",
            "sa",
            "--password",
            "YourStr0ng!Passw0rd",
            "--tag",
            "host-test",
            "--output-dir",
            outputDir,
            "--no-top-queries",
            "--no-archive"
        ], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /sqlcmd executor: host/);

        const snapshotPath = path.join(outputDir, "sql-performance-snapshot.txt");
        const manifestPath = path.join(outputDir, "manifest.json");
        const summaryPath = path.join(outputDir, "evidence-summary.md");
        assert.equal(fs.existsSync(snapshotPath), true);
        assert.equal(fs.existsSync(manifestPath), true);
        assert.equal(fs.existsSync(summaryPath), true);

        const snapshot = fs.readFileSync(snapshotPath, "utf8");
        assert.match(snapshot, /host-sqlcmd-output/);

        const sqlcmdCalls = fs.readFileSync(sqlcmdLog, "utf8");
        assert.match(sqlcmdCalls, /-S localhost,1433/);
        assert.match(sqlcmdCalls, /-U sa/);
        assert.match(sqlcmdCalls, /-P YourStr0ng!Passw0rd/);
        assert.match(sqlcmdCalls, /-C/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("sql evidence pack: falls back to docker sqlcmd when host sqlcmd is unavailable", () => {
    const tempDir = createTempDir("sql-evidence-docker-");
    try {
        const dockerLog = path.join(tempDir, "docker.log");
        const outputDir = path.join(tempDir, "evidence");
        const fakeDockerPath = path.join(tempDir, "docker");

        writeExecutable(fakeDockerPath, `#!/usr/bin/env bash
set -euo pipefail
printf "%s\\n" "$*" >> "${dockerLog}"

if [[ "\${1:-}" == "ps" ]]; then
  echo "fake-sql"
  exit 0
fi

if [[ "\${1:-}" == "exec" ]]; then
  shift
  if [[ "\${1:-}" == "-i" ]]; then
    shift
    container="\${1:-}"
    shift || true
    command_path="\${1:-}"
    shift || true
    if [[ "$container" != "fake-sql" ]]; then
      echo "unexpected container: $container" >&2
      exit 1
    fi
    if [[ "$command_path" != "/opt/mssql-tools18/bin/sqlcmd" ]]; then
      echo "unexpected sqlcmd path: $command_path" >&2
      exit 1
    fi
    cat >/dev/null
    printf "docker-sqlcmd-output\\n"
    exit 0
  fi

  container="\${1:-}"
  shift || true
  command_name="\${1:-}"
  shift || true
  if [[ "$container" != "fake-sql" ]]; then
    echo "unexpected container: $container" >&2
    exit 1
  fi
  if [[ "$command_name" == "test" ]]; then
    exit 0
  fi
fi

echo "unsupported docker invocation" >&2
exit 1
`);

        const result = spawnSync("bash", [
            scriptPath,
            "--sqlcmd-mode",
            "docker",
            "--sqlcmd-docker-container",
            "fake-sql",
            "--sqlcmd-docker-bin",
            "/opt/mssql-tools18/bin/sqlcmd",
            "--server",
            "localhost",
            "--database",
            "SubcontractorV2",
            "--username",
            "sa",
            "--password",
            "YourStr0ng!Passw0rd",
            "--tag",
            "docker-test",
            "--output-dir",
            outputDir,
            "--no-top-queries",
            "--no-archive"
        ], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /sqlcmd executor: docker/);
        assert.match(result.stdout, /sqlcmd docker container: fake-sql/);

        const snapshotPath = path.join(outputDir, "sql-performance-snapshot.txt");
        assert.equal(fs.existsSync(snapshotPath), true);
        const snapshot = fs.readFileSync(snapshotPath, "utf8");
        assert.match(snapshot, /docker-sqlcmd-output/);

        const dockerCalls = fs.readFileSync(dockerLog, "utf8");
        assert.match(dockerCalls, /ps --format/);
        assert.match(dockerCalls, /exec fake-sql test -x \/opt\/mssql-tools18\/bin\/sqlcmd/);
        assert.match(dockerCalls, /-C/);
        assert.match(dockerCalls, /-i \/dev\/stdin/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
