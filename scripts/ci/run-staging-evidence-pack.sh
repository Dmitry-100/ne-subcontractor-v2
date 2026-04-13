#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

BASE_URL="${BASE_URL:-}"
OUT_ROOT="${STAGING_EVIDENCE_OUT_DIR:-$ROOT_DIR/artifacts/staging-evidence}"
RUN_ID="${STAGING_EVIDENCE_RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
RUN_DIR="$OUT_ROOT/$RUN_ID"
PERF_OUT_DIR="${STAGING_PERF_OUT_DIR:-$RUN_DIR/perf}"

PERF_RUNNER="${STAGING_PERF_RUNNER:-$ROOT_DIR/scripts/ci/run-performance-evidence-pack.sh}"
SQL_CORE_RUNNER="${STAGING_SQL_CORE_RUNNER:-$ROOT_DIR/scripts/ci/run-sql-core-tests.sh}"
TOPOLOGY_RUNNER="${STAGING_TOPOLOGY_RUNNER:-$ROOT_DIR/scripts/ci/check-host-topology-policy.sh}"
DEPENDENCY_VULN_RUNNER="${STAGING_DEPENDENCY_VULN_RUNNER:-$ROOT_DIR/scripts/ci/check-dotnet-vulnerabilities.sh}"
DEPENDENCY_OUTDATED_RUNNER="${STAGING_DEPENDENCY_OUTDATED_RUNNER:-$ROOT_DIR/scripts/ci/check-dotnet-outdated-budget.sh}"
DEPENDENCY_SOLUTION_PATH="${STAGING_DEPENDENCY_SOLUTION_PATH:-$ROOT_DIR/Subcontractor.sln}"
RUN_SQL_CORE="${STAGING_RUN_SQL_CORE:-1}"
RUN_TOPOLOGY_CHECK="${STAGING_RUN_TOPOLOGY_CHECK:-1}"
RUN_DEPENDENCY_GUARDS="${STAGING_RUN_DEPENDENCY_GUARDS:-0}"
TOPOLOGY_RUN_TESTS="${STAGING_TOPOLOGY_RUN_TESTS:-}"
CAPTURE_SQL_EVIDENCE="${PERF_CAPTURE_SQL_EVIDENCE:-0}"

SUMMARY_FILE="$RUN_DIR/staging-evidence-summary.md"
LATEST_SUMMARY_FILE="$OUT_ROOT/staging-evidence-latest.md"
PERF_LOG_FILE="$RUN_DIR/perf-evidence-run.log"
SQL_CORE_LOG_FILE="$RUN_DIR/sql-core-run.log"
TOPOLOGY_LOG_FILE="$RUN_DIR/topology-check-run.log"
DEPENDENCY_VULN_LOG_FILE="$RUN_DIR/dependency-vulnerability-check-run.log"
DEPENDENCY_OUTDATED_LOG_FILE="$RUN_DIR/dependency-outdated-budget-check-run.log"

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

require_file() {
    local file_path="$1"
    local label="$2"
    if [[ ! -f "$file_path" ]]; then
        echo "$label not found: $file_path" >&2
        exit 1
    fi
}

artifact_status() {
    local artifact_path="$1"
    if [[ -f "$artifact_path" ]]; then
        printf "present"
    else
        printf "missing"
    fi
}

if [[ -z "$BASE_URL" ]]; then
    echo "BASE_URL is required for staging evidence run." >&2
    exit 1
fi

require_file "$PERF_RUNNER" "Performance evidence runner"
if is_enabled "$RUN_SQL_CORE"; then
    require_file "$SQL_CORE_RUNNER" "SQL core runner"
fi
if is_enabled "$RUN_TOPOLOGY_CHECK"; then
    require_file "$TOPOLOGY_RUNNER" "Host topology policy runner"
fi
if is_enabled "$RUN_DEPENDENCY_GUARDS"; then
    require_file "$DEPENDENCY_VULN_RUNNER" "Dependency vulnerability runner"
    require_file "$DEPENDENCY_OUTDATED_RUNNER" "Dependency outdated budget runner"
fi

mkdir -p "$RUN_DIR"
mkdir -p "$PERF_OUT_DIR"

echo "[staging-evidence] run-id: $RUN_ID"
echo "[staging-evidence] base-url: $BASE_URL"
echo "[staging-evidence] run-dir: $RUN_DIR"
echo "[staging-evidence] perf-out-dir: $PERF_OUT_DIR"

topology_status="skipped"
topology_exit_code=0
if is_enabled "$RUN_TOPOLOGY_CHECK"; then
    topology_status="failed"
    echo "[staging-evidence] running host-topology preflight..."
    topology_env_args=()
    if [[ -n "$TOPOLOGY_RUN_TESTS" ]]; then
        topology_env_args+=("SUBCONTRACTOR_TOPOLOGY_RUN_TESTS=$TOPOLOGY_RUN_TESTS")
    fi

    set +e
    if [[ "${#topology_env_args[@]}" -gt 0 ]]; then
        env "${topology_env_args[@]}" bash "$TOPOLOGY_RUNNER" 2>&1 | tee "$TOPOLOGY_LOG_FILE"
    else
        bash "$TOPOLOGY_RUNNER" 2>&1 | tee "$TOPOLOGY_LOG_FILE"
    fi
    topology_exit_code=$?
    set -e
    if [[ "$topology_exit_code" -eq 0 ]]; then
        topology_status="passed"
    fi
else
    echo "[staging-evidence] host-topology preflight skipped (STAGING_RUN_TOPOLOGY_CHECK=$RUN_TOPOLOGY_CHECK)."
fi

dependency_vulnerability_status="skipped"
dependency_vulnerability_exit_code=0
dependency_outdated_status="skipped"
dependency_outdated_exit_code=0
if is_enabled "$RUN_DEPENDENCY_GUARDS"; then
    dependency_vulnerability_status="failed"
    echo "[staging-evidence] running dependency vulnerability guard..."
    set +e
    bash "$DEPENDENCY_VULN_RUNNER" "$DEPENDENCY_SOLUTION_PATH" 2>&1 | tee "$DEPENDENCY_VULN_LOG_FILE"
    dependency_vulnerability_exit_code=$?
    set -e
    if [[ "$dependency_vulnerability_exit_code" -eq 0 ]]; then
        dependency_vulnerability_status="passed"
    fi

    dependency_outdated_status="failed"
    echo "[staging-evidence] running dependency outdated budget guard..."
    set +e
    bash "$DEPENDENCY_OUTDATED_RUNNER" "$DEPENDENCY_SOLUTION_PATH" 2>&1 | tee "$DEPENDENCY_OUTDATED_LOG_FILE"
    dependency_outdated_exit_code=$?
    set -e
    if [[ "$dependency_outdated_exit_code" -eq 0 ]]; then
        dependency_outdated_status="passed"
    fi
else
    echo "[staging-evidence] dependency guards skipped (STAGING_RUN_DEPENDENCY_GUARDS=$RUN_DEPENDENCY_GUARDS)."
fi

perf_status="failed"
perf_exit_code=0
echo "[staging-evidence] running performance evidence pack..."
set +e
env \
    BASE_URL="$BASE_URL" \
    PERF_OUT_DIR="$PERF_OUT_DIR" \
    bash "$PERF_RUNNER" 2>&1 | tee "$PERF_LOG_FILE"
perf_exit_code=$?
set -e
if [[ "$perf_exit_code" -eq 0 ]]; then
    perf_status="passed"
fi

sql_status="skipped"
sql_exit_code=0
if is_enabled "$RUN_SQL_CORE"; then
    sql_status="failed"
    echo "[staging-evidence] running SQL Core contour..."
    set +e
    bash "$SQL_CORE_RUNNER" 2>&1 | tee "$SQL_CORE_LOG_FILE"
    sql_exit_code=$?
    set -e
    if [[ "$sql_exit_code" -eq 0 ]]; then
        sql_status="passed"
    fi
else
    echo "[staging-evidence] SQL Core contour skipped (STAGING_RUN_SQL_CORE=$RUN_SQL_CORE)."
fi

manifest_path="$PERF_OUT_DIR/perf-contour-latest.json"
budget_path="$PERF_OUT_DIR/perf-budget-latest.md"
regression_path="$PERF_OUT_DIR/perf-regression-latest.md"
telemetry_path="$PERF_OUT_DIR/http-cache-compression-telemetry-latest.md"
sql_evidence_dir="$(awk -F': ' '/^SQL evidence dir:/ {print $2}' "$PERF_LOG_FILE" | tail -n 1 || true)"

sql_evidence_status="not-requested"
if is_enabled "$CAPTURE_SQL_EVIDENCE"; then
    if [[ -n "$sql_evidence_dir" && -d "$sql_evidence_dir" ]]; then
        sql_evidence_status="present"
    else
        sql_evidence_status="missing"
    fi
fi

cat > "$SUMMARY_FILE" << EOF
# Staging Evidence Summary

- Run ID: \`$RUN_ID\`
- Base URL: \`$BASE_URL\`
- Run directory: \`$RUN_DIR\`
- Generated at (UTC): \`$(date -u +"%Y-%m-%dT%H:%M:%SZ")\`

## Contour Status

| Check | Status | Evidence |
|---|---|---|
| Host topology preflight | \`$topology_status\` | \`$TOPOLOGY_LOG_FILE\` |
| Dependency vulnerability guard | \`$dependency_vulnerability_status\` | \`$DEPENDENCY_VULN_LOG_FILE\` |
| Dependency outdated budget guard | \`$dependency_outdated_status\` | \`$DEPENDENCY_OUTDATED_LOG_FILE\` |
| Performance evidence pack | \`$perf_status\` | \`$PERF_LOG_FILE\` |
| SQL Core contour | \`$sql_status\` | \`$SQL_CORE_LOG_FILE\` |

## Perf Artifacts

| Artifact | Status | Path |
|---|---|---|
| Contour manifest | \`$(artifact_status "$manifest_path")\` | \`$manifest_path\` |
| Budget report | \`$(artifact_status "$budget_path")\` | \`$budget_path\` |
| Regression report | \`$(artifact_status "$regression_path")\` | \`$regression_path\` |
| Cache/compression telemetry | \`$(artifact_status "$telemetry_path")\` | \`$telemetry_path\` |
| SQL performance evidence pack | \`$sql_evidence_status\` | \`${sql_evidence_dir:-n/a}\` |
EOF

cp "$SUMMARY_FILE" "$LATEST_SUMMARY_FILE"

echo "[staging-evidence] summary: $SUMMARY_FILE"
echo "[staging-evidence] latest summary alias: $LATEST_SUMMARY_FILE"

if [[ "$topology_exit_code" -ne 0 || "$dependency_vulnerability_exit_code" -ne 0 || "$dependency_outdated_exit_code" -ne 0 || "$perf_exit_code" -ne 0 || "$sql_exit_code" -ne 0 ]]; then
    echo "[staging-evidence] one or more checks failed." >&2
    exit 1
fi

echo "[staging-evidence] all checks passed."
