#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_URL="${BASE_URL:-http://127.0.0.1:5090}"
OUT_DIR="${PERF_OUT_DIR:-artifacts/perf}"
WEB_LOG_FILE="${PERF_WEB_LOG_FILE:-/tmp/subcontractor-web-perf.log}"
HEALTH_PATH="${PERF_HEALTH_PATH:-/api/health}"
HEALTH_TIMEOUT_SEC="${PERF_HEALTH_TIMEOUT_SEC:-180}"
ASPNETCORE_ENVIRONMENT_VALUE="${PERF_ASPNETCORE_ENVIRONMENT:-Development}"
LOG_LEVEL_DEFAULT="${PERF_LOG_LEVEL_DEFAULT:-Information}"
LOG_LEVEL_MICROSOFT="${PERF_LOG_LEVEL_MICROSOFT:-Warning}"
LOG_LEVEL_EFCORE="${PERF_LOG_LEVEL_EFCORE:-Warning}"
CAPTURE_TELEMETRY="${PERF_CAPTURE_TELEMETRY:-1}"
UI_ASSETS_PREFLIGHT="${PERF_UI_ASSETS_PREFLIGHT:-1}"
UI_ASSETS_CHECKER="${PERF_UI_ASSETS_CHECKER:-$ROOT_DIR/scripts/ci/check-local-ui-assets.sh}"
UI_ASSETS_SETTINGS_FILE="${PERF_UI_ASSETS_SETTINGS_FILE:-$ROOT_DIR/src/Subcontractor.Web/appsettings.Development.json}"
UI_ASSETS_FORCE_LOCAL="${PERF_UI_ASSETS_FORCE_LOCAL:-0}"

cd "$ROOT_DIR"
mkdir -p "$OUT_DIR"

is_enabled() {
  case "${1:-}" in
    1|true|True|TRUE|yes|YES)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

if is_enabled "$UI_ASSETS_PREFLIGHT"; then
  if [[ ! -f "$UI_ASSETS_CHECKER" ]]; then
    echo "Local UI assets checker not found: $UI_ASSETS_CHECKER" >&2
    exit 1
  fi

  preflight_args=(
    --settings-file "$UI_ASSETS_SETTINGS_FILE"
  )
  if is_enabled "$UI_ASSETS_FORCE_LOCAL"; then
    preflight_args+=(--force-local)
  fi

  echo "Running local UI assets preflight..."
  bash "$UI_ASSETS_CHECKER" "${preflight_args[@]}"
fi

env \
  "ASPNETCORE_ENVIRONMENT=$ASPNETCORE_ENVIRONMENT_VALUE" \
  "Logging__LogLevel__Default=$LOG_LEVEL_DEFAULT" \
  "Logging__LogLevel__Microsoft=$LOG_LEVEL_MICROSOFT" \
  "Logging__LogLevel__Microsoft.EntityFrameworkCore=$LOG_LEVEL_EFCORE" \
dotnet run \
  --project src/Subcontractor.Web/Subcontractor.Web.csproj \
  --configuration Release \
  --no-build \
  --urls "$BASE_URL" > "$WEB_LOG_FILE" 2>&1 &
APP_PID=$!

cleanup() {
  status=$?

  cp "$WEB_LOG_FILE" "$OUT_DIR/subcontractor-web-perf.log" >/dev/null 2>&1 || true

  if [[ "$status" -ne 0 ]]; then
    echo "=== Subcontractor.Web perf log (tail) ==="
    tail -n 200 "$WEB_LOG_FILE" || true
  fi

  kill "$APP_PID" >/dev/null 2>&1 || true
  wait "$APP_PID" >/dev/null 2>&1 || true
  return "$status"
}
trap cleanup EXIT

max_attempts=$((HEALTH_TIMEOUT_SEC / 2))
if [[ "$max_attempts" -lt 1 ]]; then
  max_attempts=1
fi

for attempt in $(seq 1 "$max_attempts"); do
  if curl -fsS "$BASE_URL$HEALTH_PATH" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

curl -fsS "$BASE_URL$HEALTH_PATH" >/dev/null

if [[ -n "${PERF_BASELINE_MANIFEST:-}" ]]; then
  env \
    PERF_AUTO_BASELINE="${PERF_AUTO_BASELINE:-0}" \
    PERF_CAPTURE_TELEMETRY="$CAPTURE_TELEMETRY" \
    npm run --silent perf:contour -- "$BASE_URL" "$OUT_DIR" "$PERF_BASELINE_MANIFEST"
else
  env \
    PERF_AUTO_BASELINE="${PERF_AUTO_BASELINE:-0}" \
    PERF_CAPTURE_TELEMETRY="$CAPTURE_TELEMETRY" \
    npm run --silent perf:contour -- "$BASE_URL" "$OUT_DIR"
fi
