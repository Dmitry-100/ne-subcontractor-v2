#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export BASE_URL="${BASE_URL:-http://127.0.0.1:5091}"
export PERF_OUT_DIR="${PERF_OUT_DIR:-artifacts/perf-long-run}"
export PERF_ITERATIONS="${PERF_ITERATIONS:-60}"
export PERF_BROWSER_ITERATIONS="${PERF_BROWSER_ITERATIONS:-10}"
export PERF_HEALTH_TIMEOUT_SEC="${PERF_HEALTH_TIMEOUT_SEC:-240}"

cd "$ROOT_DIR"

echo "Running long-run performance contour profile..."
echo "BASE_URL=$BASE_URL"
echo "PERF_OUT_DIR=$PERF_OUT_DIR"
echo "PERF_ITERATIONS=$PERF_ITERATIONS"
echo "PERF_BROWSER_ITERATIONS=$PERF_BROWSER_ITERATIONS"

bash scripts/ci/run-performance-contour.sh

TREND_LIMIT="${PERF_TREND_LIMIT:-8}"
TREND_REPORT_PATH="${PERF_TREND_REPORT_PATH:-$PERF_OUT_DIR/perf-trend-latest.md}"

echo "Building long-run trend report..."
npm run --silent perf:trend -- \
  --dir "$PERF_OUT_DIR" \
  --out "$TREND_REPORT_PATH" \
  --limit "$TREND_LIMIT"
