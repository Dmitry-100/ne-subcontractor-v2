#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_URL="${1:-http://localhost:5080}"
OUT_DIR="${2:-artifacts/perf}"
BASELINE_MANIFEST="${3:-${PERF_BASELINE_MANIFEST:-}}"
AUTO_BASELINE_FLAG="${PERF_AUTO_BASELINE:-1}"
CAPTURE_TELEMETRY_FLAG="${PERF_CAPTURE_TELEMETRY:-1}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BASELINE_SOURCE="none"

cd "$ROOT_DIR"
mkdir -p "$OUT_DIR"

http_log="$(mktemp)"
browser_log="$(mktemp)"
telemetry_log="$(mktemp)"
auto_baseline_manifest=""
cleanup() {
  rm -f "$http_log" "$browser_log" "$telemetry_log"
  if [[ -n "$auto_baseline_manifest" ]]; then
    rm -f "$auto_baseline_manifest"
  fi
}
trap cleanup EXIT

auto_baseline_enabled=1
capture_telemetry_enabled=1
case "$AUTO_BASELINE_FLAG" in
  0|false|False|FALSE|no|NO)
    auto_baseline_enabled=0
    ;;
esac

case "$CAPTURE_TELEMETRY_FLAG" in
  0|false|False|FALSE|no|NO)
    capture_telemetry_enabled=0
    ;;
esac

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  printf '%s' "$value"
}

echo "Running HTTP contour..."
npm run --silent perf:http -- "$BASE_URL" "$OUT_DIR" | tee "$http_log"

http_tsv="$(awk -F': ' '/HTTP raw samples:/ {print $2}' "$http_log" | tail -n 1)"
if [[ -z "$http_tsv" ]]; then
  echo "[ERROR] Failed to resolve HTTP raw samples file from perf:http output." >&2
  exit 1
fi

echo "Running browser contour..."
npm run --silent perf:browser -- "$BASE_URL" "$OUT_DIR" | tee "$browser_log"

browser_json="$(awk -F': ' '/Browser metrics raw json:/ {print $2}' "$browser_log" | tail -n 1)"
if [[ -z "$browser_json" ]]; then
  echo "[ERROR] Failed to resolve browser raw json file from perf:browser output." >&2
  exit 1
fi

telemetry_report=""
telemetry_raw=""
if [[ "$capture_telemetry_enabled" -eq 1 ]]; then
  echo "Running cache/compression telemetry..."
  npm run --silent perf:telemetry -- "$BASE_URL" "$OUT_DIR" | tee "$telemetry_log"

  telemetry_report="$(awk -F': ' '/Telemetry report:/ {print $2}' "$telemetry_log" | tail -n 1)"
  telemetry_raw="$(awk -F': ' '/Telemetry raw samples:/ {print $2}' "$telemetry_log" | tail -n 1)"
  if [[ -z "$telemetry_report" || -z "$telemetry_raw" ]]; then
    echo "[ERROR] Failed to resolve telemetry artifact files from perf:telemetry output." >&2
    exit 1
  fi
fi

contour_manifest="$OUT_DIR/perf-contour-$TIMESTAMP.json"
latest_contour_manifest="$OUT_DIR/perf-contour-latest.json"
pinned_baseline_manifest="$OUT_DIR/perf-contour-baseline.json"
regression_report="$OUT_DIR/perf-regression-$TIMESTAMP.md"
latest_regression_report="$OUT_DIR/perf-regression-latest.md"
budget_report="$OUT_DIR/perf-budget-$TIMESTAMP.md"
latest_budget_report="$OUT_DIR/perf-budget-latest.md"

if [[ "$auto_baseline_enabled" -eq 1 && -z "$BASELINE_MANIFEST" && -f "$pinned_baseline_manifest" ]]; then
  BASELINE_MANIFEST="$pinned_baseline_manifest"
  BASELINE_SOURCE="pinned-baseline"
elif [[ "$auto_baseline_enabled" -eq 1 && -z "$BASELINE_MANIFEST" && -f "$latest_contour_manifest" ]]; then
  auto_baseline_manifest="$(mktemp)"
  cp "$latest_contour_manifest" "$auto_baseline_manifest"
  BASELINE_MANIFEST="$auto_baseline_manifest"
  BASELINE_SOURCE="auto-latest"
elif [[ -n "$BASELINE_MANIFEST" ]]; then
  BASELINE_SOURCE="explicit"
fi

if [[ "$capture_telemetry_enabled" -eq 1 ]]; then
cat > "$contour_manifest" << EOF
{
  "generatedAtUtc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "baseUrl": "$(json_escape "$BASE_URL")",
  "artifactsDir": "$(json_escape "$OUT_DIR")",
  "browserMetricsJson": "$(json_escape "$browser_json")",
  "httpMetricsTsv": "$(json_escape "$http_tsv")",
  "budgetReportMd": "$(json_escape "$budget_report")",
  "telemetryReportMd": "$(json_escape "$telemetry_report")",
  "telemetryRawTsv": "$(json_escape "$telemetry_raw")"
}
EOF
else
cat > "$contour_manifest" << EOF
{
  "generatedAtUtc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "baseUrl": "$(json_escape "$BASE_URL")",
  "artifactsDir": "$(json_escape "$OUT_DIR")",
  "browserMetricsJson": "$(json_escape "$browser_json")",
  "httpMetricsTsv": "$(json_escape "$http_tsv")",
  "budgetReportMd": "$(json_escape "$budget_report")"
}
EOF
fi

cp "$contour_manifest" "$latest_contour_manifest"

echo "Running budget gate..."
budget_args=(
  --manifest "$contour_manifest"
  --report-md "$budget_report"
)
if [[ -n "$BASELINE_MANIFEST" ]]; then
  budget_args+=(
    --baseline-manifest "$BASELINE_MANIFEST"
  )
fi
npm run --silent perf:budget -- "${budget_args[@]}"
cp "$budget_report" "$latest_budget_report"

if [[ -n "$BASELINE_MANIFEST" ]]; then
  echo "Building regression report..."
  npm run --silent perf:compare -- \
    --manifest "$contour_manifest" \
    --baseline-manifest "$BASELINE_MANIFEST" \
    --out "$regression_report"
  cp "$regression_report" "$latest_regression_report"
fi

echo "Performance contour completed."
echo "Browser raw: $browser_json"
echo "HTTP raw:    $http_tsv"
if [[ "$capture_telemetry_enabled" -eq 1 ]]; then
  echo "Telemetry report: $telemetry_report"
  echo "Telemetry raw:    $telemetry_raw"
fi
echo "Manifest:    $contour_manifest"
echo "Budget report: $budget_report"
if [[ -n "$BASELINE_MANIFEST" ]]; then
  echo "Baseline:    $BASELINE_MANIFEST"
  echo "Baseline source: $BASELINE_SOURCE"
  echo "Regression report: $regression_report"
fi
