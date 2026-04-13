"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.resolve(
    __dirname,
    "../../scripts/perf/capture-http-cache-compression-telemetry.sh"
);

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFakeCurlExecutable(tempDir) {
    const fakeCurlPath = path.join(tempDir, "curl");
    const script = `#!/usr/bin/env bash
set -euo pipefail

headers_file=""
url=""
accept_encoding=""

while (($#)); do
  case "$1" in
    -D)
      headers_file="$2"
      shift 2
      ;;
    -H)
      header="$2"
      case "$header" in
        Accept-Encoding:*)
          accept_encoding="$(printf "%s" "$header" | sed 's/^Accept-Encoding:[[:space:]]*//')"
          ;;
      esac
      shift 2
      ;;
    -o)
      shift 2
      ;;
    -w)
      shift 2
      ;;
    -s|-S|-sS)
      shift
      ;;
    http://*|https://*)
      url="$1"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -z "$headers_file" ]]; then
  echo "Expected -D <headers_file> in fake curl invocation." >&2
  exit 1
fi

if [[ -z "\${FAKE_CURL_STATE_DIR:-}" ]]; then
  echo "FAKE_CURL_STATE_DIR is required for fake curl." >&2
  exit 1
fi

mkdir -p "$FAKE_CURL_STATE_DIR"
slug="$(printf "%s|%s" "$url" "$accept_encoding" | sed 's/[^a-zA-Z0-9]/_/g')"
counter_file="$FAKE_CURL_STATE_DIR/$slug.count"
counter=0
if [[ -f "$counter_file" ]]; then
  counter="$(cat "$counter_file")"
fi
counter=$((counter + 1))
printf "%s" "$counter" > "$counter_file"

status=200
time_total="0.010"
size_download=200
cache_control="private, no-cache"
vary="Accept-Encoding"
content_encoding=""
age_header=""

if [[ "$url" == *"/api/health"* ]]; then
  cache_control="public,max-age=30"
  if [[ "$accept_encoding" == *"identity"* ]]; then
    size_download=200
    content_encoding=""
  else
    size_download=120
    content_encoding="br"
  fi
  age_header="$((counter - 1))"
elif [[ "$url" == *"/api/dashboard/summary"* ]]; then
  cache_control="no-store"
  if [[ "$accept_encoding" == *"identity"* ]]; then
    size_download=260
    content_encoding=""
  else
    size_download=180
    content_encoding="gzip"
  fi
elif [[ "$url" == *"/api/analytics/"* ]] || [[ "$url" == *"/api/admin/roles"* ]] || [[ "$url" == *"/api/reference-data/"* ]]; then
  cache_control="public,max-age=30"
  if [[ "$accept_encoding" == *"identity"* ]]; then
    size_download=220
    content_encoding=""
  else
    size_download=140
    content_encoding="br"
  fi
  age_header="$((counter - 1))"
else
  if [[ "$accept_encoding" == *"identity"* ]]; then
    size_download=400
    content_encoding=""
  else
    size_download=260
    content_encoding="gzip"
  fi
fi

{
  printf "HTTP/1.1 %s OK\\r\\n" "$status"
  printf "Cache-Control: %s\\r\\n" "$cache_control"
  printf "Vary: %s\\r\\n" "$vary"
  if [[ -n "$content_encoding" ]]; then
    printf "Content-Encoding: %s\\r\\n" "$content_encoding"
  fi
  if [[ -n "$age_header" ]]; then
    printf "Age: %s\\r\\n" "$age_header"
  fi
  printf "\\r\\n"
} > "$headers_file"

printf "%s %s %s" "$size_download" "$time_total" "$status"
`;

    fs.writeFileSync(fakeCurlPath, script, { encoding: "utf8", mode: 0o755 });
    return fakeCurlPath;
}

test("cache/compression telemetry script: writes report, raw samples and latest aliases", () => {
    const tempDir = createTempDir("perf-cache-telemetry-");
    const outDir = path.join(tempDir, "perf");
    try {
        writeFakeCurlExecutable(tempDir);

        const result = spawnSync("bash", [scriptPath, "http://perf.test", outDir], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                PERF_TELEMETRY_ITERATIONS: "3",
                FAKE_CURL_STATE_DIR: path.join(tempDir, "curl-state")
            }
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /Telemetry report:/);
        assert.match(result.stdout, /Telemetry latest report:/);

        const latestReport = path.join(outDir, "http-cache-compression-telemetry-latest.md");
        const latestRaw = path.join(outDir, "http-cache-compression-telemetry-latest.tsv");
        assert.equal(fs.existsSync(latestReport), true, "Expected latest markdown telemetry report.");
        assert.equal(fs.existsSync(latestRaw), true, "Expected latest raw telemetry samples.");

        const reportText = fs.readFileSync(latestReport, "utf8");
        assert.match(reportText, /health-api/);
        assert.match(reportText, /Age header ratio/);
        assert.match(reportText, /Warm-hit ratio/);
        assert.match(reportText, /Compression delta/);

        const rawText = fs.readFileSync(latestRaw, "utf8");
        assert.match(rawText, /health-api\t\/api\/health\t1\t200/);
        assert.match(rawText, /\tidentity\t200\t/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("cache/compression telemetry script: validates iterations input", () => {
    const tempDir = createTempDir("perf-cache-telemetry-invalid-");
    const outDir = path.join(tempDir, "perf");
    try {
        writeFakeCurlExecutable(tempDir);

        const result = spawnSync("bash", [scriptPath, "http://perf.test", outDir], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                PERF_TELEMETRY_ITERATIONS: "0",
                FAKE_CURL_STATE_DIR: path.join(tempDir, "curl-state")
            }
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit for invalid iterations value.");
        assert.match(`${result.stdout}\n${result.stderr}`, /PERF_TELEMETRY_ITERATIONS must be a positive integer/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
