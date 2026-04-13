#!/usr/bin/env bash
set -euo pipefail

PERF_DIR="${1:-artifacts/perf}"
SQL_EVIDENCE_DIR="${2:-}"

if ! command -v node >/dev/null 2>&1; then
    echo "node is required." >&2
    exit 1
fi

manifest_path="$PERF_DIR/perf-contour-latest.json"

if [[ ! -f "$manifest_path" ]]; then
    echo "Missing perf manifest: $manifest_path" >&2
    exit 1
fi

manifest_parse_output="$(
    node -e '
const fs = require("node:fs");
const path = require("node:path");
const manifestPath = process.argv[1];
const perfDir = process.argv[2];
const raw = fs.readFileSync(manifestPath, "utf8");
const parsed = JSON.parse(raw);
if (!parsed.browserMetricsJson || !parsed.httpMetricsTsv) {
  throw new Error("Manifest must include browserMetricsJson and httpMetricsTsv.");
}
const normalizePath = (value) => String(value || "").replace(/\\\\/g, "/").replace(/\/+$/g, "");
const normalizedArtifactsDir = normalizePath(parsed.artifactsDir);
const manifestDir = path.dirname(manifestPath);

const resolveManifestArtifactPath = (value) => {
  if (!value) {
    return "";
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  const candidates = [];
  candidates.push(path.resolve(value));
  candidates.push(path.join(perfDir, value));
  candidates.push(path.join(manifestDir, value));

  const normalizedValue = normalizePath(value);
  if (normalizedArtifactsDir && normalizedValue.startsWith(`${normalizedArtifactsDir}/`)) {
    const strippedRelative = normalizedValue.slice(normalizedArtifactsDir.length + 1);
    candidates.push(path.join(perfDir, strippedRelative));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
};

const browserPath = resolveManifestArtifactPath(parsed.browserMetricsJson);
const httpPath = resolveManifestArtifactPath(parsed.httpMetricsTsv);
if (!fs.existsSync(browserPath)) {
  throw new Error(`Missing browser metrics raw file: ${browserPath}`);
}
if (!fs.existsSync(httpPath)) {
  throw new Error(`Missing HTTP metrics raw file: ${httpPath}`);
}
const telemetryReportPath = parsed.telemetryReportMd
  ? resolveManifestArtifactPath(parsed.telemetryReportMd)
  : "";
const telemetryRawPath = parsed.telemetryRawTsv
  ? resolveManifestArtifactPath(parsed.telemetryRawTsv)
  : "";
const budgetReportPath = parsed.budgetReportMd
  ? resolveManifestArtifactPath(parsed.budgetReportMd)
  : "";
console.log(browserPath);
console.log(httpPath);
console.log(telemetryReportPath);
console.log(telemetryRawPath);
console.log(budgetReportPath);
' "$manifest_path" "$PERF_DIR"
)"

browser_json_path="$(printf "%s\n" "$manifest_parse_output" | sed -n '1p')"
http_tsv_path="$(printf "%s\n" "$manifest_parse_output" | sed -n '2p')"
telemetry_report_path="$(printf "%s\n" "$manifest_parse_output" | sed -n '3p')"
telemetry_raw_path="$(printf "%s\n" "$manifest_parse_output" | sed -n '4p')"
budget_report_path="$(printf "%s\n" "$manifest_parse_output" | sed -n '5p')"

if [[ -z "$telemetry_report_path" ]]; then
    telemetry_report_path="$PERF_DIR/http-cache-compression-telemetry-latest.md"
fi
if [[ -z "$telemetry_raw_path" ]]; then
    telemetry_raw_path="$PERF_DIR/http-cache-compression-telemetry-latest.tsv"
fi
if [[ -z "$budget_report_path" ]]; then
    budget_report_path="$PERF_DIR/perf-budget-latest.md"
fi

if [[ ! -f "$telemetry_report_path" ]]; then
    echo "Missing telemetry report: $telemetry_report_path" >&2
    exit 1
fi

if [[ ! -f "$telemetry_raw_path" ]]; then
    echo "Missing telemetry raw samples: $telemetry_raw_path" >&2
    exit 1
fi

if [[ ! -f "$budget_report_path" ]]; then
    echo "Missing budget report: $budget_report_path" >&2
    exit 1
fi

if [[ -n "$SQL_EVIDENCE_DIR" ]]; then
    sql_manifest="$SQL_EVIDENCE_DIR/manifest.json"
    sql_summary="$SQL_EVIDENCE_DIR/evidence-summary.md"

    if [[ ! -f "$sql_manifest" ]]; then
        echo "Missing SQL evidence manifest: $sql_manifest" >&2
        exit 1
    fi

    if [[ ! -f "$sql_summary" ]]; then
        echo "Missing SQL evidence summary: $sql_summary" >&2
        exit 1
    fi
fi

echo "Performance evidence pack check: OK"
echo "Perf dir: $PERF_DIR"
echo "Manifest: $manifest_path"
echo "Browser raw: $browser_json_path"
echo "HTTP raw: $http_tsv_path"
echo "Telemetry report: $telemetry_report_path"
echo "Telemetry raw: $telemetry_raw_path"
echo "Budget report: $budget_report_path"
if [[ -n "$SQL_EVIDENCE_DIR" ]]; then
    echo "SQL evidence dir: $SQL_EVIDENCE_DIR"
fi
