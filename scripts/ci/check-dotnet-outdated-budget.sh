#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOLUTION_PATH="${1:-$ROOT_DIR/Subcontractor.sln}"

REPORT_RUNNER="${OUTDATED_REPORT_RUNNER:-$ROOT_DIR/scripts/ci/report-dotnet-outdated.sh}"
REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/artifacts/security}"
REPORT_PATH="${REPORT_PATH:-$REPORT_DIR/nuget-outdated-report.json}"
SUMMARY_PATH="${SUMMARY_PATH:-$REPORT_DIR/nuget-outdated-summary.txt}"

PROD_MAJOR_MAX="${OUTDATED_BUDGET_PROD_MAJOR_MAX:-0}"
PROD_MINOR_MAX="${OUTDATED_BUDGET_PROD_MINOR_MAX:-0}"
PROD_PATCH_MAX="${OUTDATED_BUDGET_PROD_PATCH_MAX:-999999}"
TOTAL_MAJOR_MAX="${OUTDATED_BUDGET_TOTAL_MAJOR_MAX:-999999}"
TOTAL_MINOR_MAX="${OUTDATED_BUDGET_TOTAL_MINOR_MAX:-999999}"

if [[ ! -f "$REPORT_RUNNER" ]]; then
    echo "Outdated report runner not found: $REPORT_RUNNER" >&2
    exit 1
fi

if ! [[ "$PROD_MAJOR_MAX" =~ ^[0-9]+$ && "$PROD_MINOR_MAX" =~ ^[0-9]+$ && "$PROD_PATCH_MAX" =~ ^[0-9]+$ ]]; then
    echo "Production outdated budget values must be non-negative integers." >&2
    exit 1
fi
if ! [[ "$TOTAL_MAJOR_MAX" =~ ^[0-9]+$ && "$TOTAL_MINOR_MAX" =~ ^[0-9]+$ ]]; then
    echo "Total outdated budget values must be non-negative integers." >&2
    exit 1
fi

echo "[outdated-budget] generating outdated report..."
bash "$REPORT_RUNNER" "$SOLUTION_PATH"

if [[ ! -f "$SUMMARY_PATH" ]]; then
    echo "Outdated summary report not found: $SUMMARY_PATH" >&2
    exit 1
fi
if [[ ! -f "$REPORT_PATH" ]]; then
    echo "Outdated JSON report not found: $REPORT_PATH" >&2
    exit 1
fi

extract_breakdown() {
    local scope="$1"
    local summary_file="$2"
    local line
    line="$(grep -E "Breakdown \($scope\): patch=[0-9]+, minor=[0-9]+, major=[0-9]+" "$summary_file" | tail -n 1 || true)"
    if [[ -z "$line" ]]; then
        echo "Failed to parse outdated breakdown for scope '$scope' from $summary_file" >&2
        exit 1
    fi

    sed -E 's/.*patch=([0-9]+), minor=([0-9]+), major=([0-9]+).*/\1 \2 \3/' <<< "$line"
}

total_breakdown="$(extract_breakdown "total" "$SUMMARY_PATH")" || exit 1
production_breakdown="$(extract_breakdown "production" "$SUMMARY_PATH")" || exit 1

read -r total_patch total_minor total_major <<< "$total_breakdown"
read -r prod_patch prod_minor prod_major <<< "$production_breakdown"

if [[ -z "${total_patch:-}" || -z "${total_minor:-}" || -z "${total_major:-}" ]]; then
    echo "Failed to parse total outdated breakdown values from $SUMMARY_PATH" >&2
    exit 1
fi
if [[ -z "${prod_patch:-}" || -z "${prod_minor:-}" || -z "${prod_major:-}" ]]; then
    echo "Failed to parse production outdated breakdown values from $SUMMARY_PATH" >&2
    exit 1
fi

status=0

if (( prod_major > PROD_MAJOR_MAX )); then
    echo "[outdated-budget][FAIL] production major outdated: $prod_major > $PROD_MAJOR_MAX" >&2
    status=1
fi
if (( prod_minor > PROD_MINOR_MAX )); then
    echo "[outdated-budget][FAIL] production minor outdated: $prod_minor > $PROD_MINOR_MAX" >&2
    status=1
fi
if (( prod_patch > PROD_PATCH_MAX )); then
    echo "[outdated-budget][FAIL] production patch outdated: $prod_patch > $PROD_PATCH_MAX" >&2
    status=1
fi
if (( total_major > TOTAL_MAJOR_MAX )); then
    echo "[outdated-budget][FAIL] total major outdated: $total_major > $TOTAL_MAJOR_MAX" >&2
    status=1
fi
if (( total_minor > TOTAL_MINOR_MAX )); then
    echo "[outdated-budget][FAIL] total minor outdated: $total_minor > $TOTAL_MINOR_MAX" >&2
    status=1
fi

echo "[outdated-budget] total: patch=$total_patch, minor=$total_minor, major=$total_major"
echo "[outdated-budget] production: patch=$prod_patch, minor=$prod_minor, major=$prod_major"

if (( status != 0 )); then
    exit "$status"
fi

echo "[outdated-budget] within configured budget."
