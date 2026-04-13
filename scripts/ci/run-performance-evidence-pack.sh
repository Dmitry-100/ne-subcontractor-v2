#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

PERF_BASE_URL="${BASE_URL:-http://127.0.0.1:5090}"
PERF_OUT_DIR="${PERF_OUT_DIR:-artifacts/perf}"
PERF_CAPTURE_TELEMETRY="${PERF_CAPTURE_TELEMETRY:-1}"
PERF_AUTO_BASELINE="${PERF_AUTO_BASELINE:-0}"
PERF_BASELINE_MANIFEST="${PERF_BASELINE_MANIFEST:-}"
PERF_PIN_BASELINE="${PERF_PIN_BASELINE:-0}"
PERF_UI_ASSETS_PREFLIGHT="${PERF_UI_ASSETS_PREFLIGHT:-}"
PERF_UI_ASSETS_CHECKER="${PERF_UI_ASSETS_CHECKER:-}"
PERF_UI_ASSETS_SETTINGS_FILE="${PERF_UI_ASSETS_SETTINGS_FILE:-}"
PERF_UI_ASSETS_FORCE_LOCAL="${PERF_UI_ASSETS_FORCE_LOCAL:-}"

PERF_CONTOUR_RUNNER="${PERF_CONTOUR_RUNNER:-$ROOT_DIR/scripts/ci/run-performance-contour.sh}"
PERF_EVIDENCE_CHECKER="${PERF_EVIDENCE_CHECKER:-$ROOT_DIR/scripts/ci/check-performance-evidence-pack.sh}"
SQL_EVIDENCE_RUNNER="${SQL_EVIDENCE_RUNNER:-$ROOT_DIR/scripts/perf/capture-sql-performance-evidence-pack.sh}"
NPM_BIN="${NPM_COMMAND:-npm}"

CAPTURE_SQL_EVIDENCE="${PERF_CAPTURE_SQL_EVIDENCE:-0}"
SQL_EVIDENCE_DIR="${SQL_EVIDENCE_DIR:-}"
SQL_EVIDENCE_SERVER="${SQL_EVIDENCE_SERVER:-}"
SQL_EVIDENCE_DATABASE="${SQL_EVIDENCE_DATABASE:-}"
SQL_EVIDENCE_USERNAME="${SQL_EVIDENCE_USERNAME:-}"
SQL_EVIDENCE_PASSWORD="${SQL_EVIDENCE_PASSWORD:-}"
SQL_EVIDENCE_TAG="${SQL_EVIDENCE_TAG:-staging}"
SQL_EVIDENCE_OUTPUT_DIR="${SQL_EVIDENCE_OUTPUT_DIR:-$ROOT_DIR/artifacts/perf/sql-evidence-${SQL_EVIDENCE_TAG}}"
SQL_EVIDENCE_NO_ARCHIVE="${SQL_EVIDENCE_NO_ARCHIVE:-0}"
SQL_EVIDENCE_NO_TOP_QUERIES="${SQL_EVIDENCE_NO_TOP_QUERIES:-0}"

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

if [[ ! -f "$PERF_CONTOUR_RUNNER" ]]; then
    echo "Perf contour runner not found: $PERF_CONTOUR_RUNNER" >&2
    exit 1
fi

if [[ ! -f "$PERF_EVIDENCE_CHECKER" ]]; then
    echo "Perf evidence checker not found: $PERF_EVIDENCE_CHECKER" >&2
    exit 1
fi

if ! command -v "$NPM_BIN" >/dev/null 2>&1; then
    echo "npm command not found: $NPM_BIN" >&2
    exit 1
fi

mkdir -p "$PERF_OUT_DIR"

echo "Running performance contour wrapper..."
if [[ -n "$PERF_BASELINE_MANIFEST" ]]; then
    env \
        BASE_URL="$PERF_BASE_URL" \
        PERF_OUT_DIR="$PERF_OUT_DIR" \
        PERF_CAPTURE_TELEMETRY="$PERF_CAPTURE_TELEMETRY" \
        PERF_AUTO_BASELINE="$PERF_AUTO_BASELINE" \
        PERF_UI_ASSETS_PREFLIGHT="$PERF_UI_ASSETS_PREFLIGHT" \
        PERF_UI_ASSETS_CHECKER="$PERF_UI_ASSETS_CHECKER" \
        PERF_UI_ASSETS_SETTINGS_FILE="$PERF_UI_ASSETS_SETTINGS_FILE" \
        PERF_UI_ASSETS_FORCE_LOCAL="$PERF_UI_ASSETS_FORCE_LOCAL" \
        PERF_BASELINE_MANIFEST="$PERF_BASELINE_MANIFEST" \
        bash "$PERF_CONTOUR_RUNNER"
else
    env \
        BASE_URL="$PERF_BASE_URL" \
        PERF_OUT_DIR="$PERF_OUT_DIR" \
        PERF_CAPTURE_TELEMETRY="$PERF_CAPTURE_TELEMETRY" \
        PERF_AUTO_BASELINE="$PERF_AUTO_BASELINE" \
        PERF_UI_ASSETS_PREFLIGHT="$PERF_UI_ASSETS_PREFLIGHT" \
        PERF_UI_ASSETS_CHECKER="$PERF_UI_ASSETS_CHECKER" \
        PERF_UI_ASSETS_SETTINGS_FILE="$PERF_UI_ASSETS_SETTINGS_FILE" \
        PERF_UI_ASSETS_FORCE_LOCAL="$PERF_UI_ASSETS_FORCE_LOCAL" \
        bash "$PERF_CONTOUR_RUNNER"
fi

if is_enabled "$CAPTURE_SQL_EVIDENCE"; then
    if [[ -z "$SQL_EVIDENCE_SERVER" || -z "$SQL_EVIDENCE_DATABASE" ]]; then
        echo "SQL_EVIDENCE_SERVER and SQL_EVIDENCE_DATABASE are required when PERF_CAPTURE_SQL_EVIDENCE=1." >&2
        exit 1
    fi

    if [[ ! -f "$SQL_EVIDENCE_RUNNER" ]]; then
        echo "SQL evidence runner not found: $SQL_EVIDENCE_RUNNER" >&2
        exit 1
    fi

    sql_args=(
        --server "$SQL_EVIDENCE_SERVER"
        --database "$SQL_EVIDENCE_DATABASE"
        --tag "$SQL_EVIDENCE_TAG"
        --output-dir "$SQL_EVIDENCE_OUTPUT_DIR"
    )

    if [[ -n "$SQL_EVIDENCE_USERNAME" ]]; then
        if [[ -z "$SQL_EVIDENCE_PASSWORD" ]]; then
            echo "SQL_EVIDENCE_PASSWORD is required when SQL_EVIDENCE_USERNAME is set." >&2
            exit 1
        fi
        sql_args+=(
            --username "$SQL_EVIDENCE_USERNAME"
            --password "$SQL_EVIDENCE_PASSWORD"
        )
    fi

    if is_enabled "$SQL_EVIDENCE_NO_ARCHIVE"; then
        sql_args+=(--no-archive)
    fi

    if is_enabled "$SQL_EVIDENCE_NO_TOP_QUERIES"; then
        sql_args+=(--no-top-queries)
    fi

    echo "Capturing SQL evidence pack..."
    bash "$SQL_EVIDENCE_RUNNER" "${sql_args[@]}"
    SQL_EVIDENCE_DIR="$SQL_EVIDENCE_OUTPUT_DIR"
fi

echo "Validating performance evidence pack..."
if [[ -n "$SQL_EVIDENCE_DIR" ]]; then
    bash "$PERF_EVIDENCE_CHECKER" "$PERF_OUT_DIR" "$SQL_EVIDENCE_DIR"
else
    bash "$PERF_EVIDENCE_CHECKER" "$PERF_OUT_DIR"
fi

if is_enabled "$PERF_PIN_BASELINE"; then
    echo "Pinning baseline manifest..."
    "$NPM_BIN" run --silent perf:pin-baseline -- "$PERF_OUT_DIR/perf-contour-latest.json" "$PERF_OUT_DIR"
fi

echo "Performance evidence pack workflow completed."
echo "Perf out dir: $PERF_OUT_DIR"
if [[ -n "$SQL_EVIDENCE_DIR" ]]; then
    echo "SQL evidence dir: $SQL_EVIDENCE_DIR"
fi
