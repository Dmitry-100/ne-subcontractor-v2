#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DOTNET_BIN_OVERRIDE="${SUBCONTRACTOR_TOPOLOGY_DOTNET_BIN:-}"
DEFAULT_DOTNET_BIN="$ROOT_DIR/.dotnet/dotnet"
RUN_TESTS="${SUBCONTRACTOR_TOPOLOGY_RUN_TESTS:-1}"
TEST_PROJECT_PATH="${SUBCONTRACTOR_TOPOLOGY_TEST_PROJECT_PATH:-$ROOT_DIR/tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj}"
TEST_FILTER="${SUBCONTRACTOR_TOPOLOGY_TEST_FILTER:-FullyQualifiedName~WebServiceCollectionExtensionsTests|FullyQualifiedName~BackgroundJobsServiceCollectionExtensionsTests}"

APPSETTINGS_PATH="${SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_PATH:-$ROOT_DIR/src/Subcontractor.Web/appsettings.json}"
APPSETTINGS_DEV_PATH="${SUBCONTRACTOR_TOPOLOGY_APPSETTINGS_DEVELOPMENT_PATH:-$ROOT_DIR/src/Subcontractor.Web/appsettings.Development.json}"
BACKGROUND_JOBS_APPSETTINGS_PATH="${SUBCONTRACTOR_TOPOLOGY_BACKGROUND_JOBS_APPSETTINGS_PATH:-$ROOT_DIR/src/Subcontractor.BackgroundJobs/appsettings.json}"

EXPECTED_PROD_EMBEDDED="${SUBCONTRACTOR_TOPOLOGY_EXPECT_PROD_EMBEDDED:-false}"
EXPECTED_PROD_DEMO_SEED="${SUBCONTRACTOR_TOPOLOGY_EXPECT_PROD_DEMO_SEED:-false}"
EXPECTED_DEV_EMBEDDED="${SUBCONTRACTOR_TOPOLOGY_EXPECT_DEV_EMBEDDED:-false}"
EXPECTED_BACKGROUND_SLA_ENABLED="${SUBCONTRACTOR_TOPOLOGY_EXPECT_BACKGROUND_SLA_ENABLED:-true}"
EXPECTED_BACKGROUND_RATING_ENABLED="${SUBCONTRACTOR_TOPOLOGY_EXPECT_BACKGROUND_RATING_ENABLED:-true}"

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

resolve_dotnet_bin() {
    if [[ -n "$DOTNET_BIN_OVERRIDE" ]]; then
        if [[ ! -x "$DOTNET_BIN_OVERRIDE" ]]; then
            echo "Configured dotnet runtime is not executable: $DOTNET_BIN_OVERRIDE" >&2
            exit 1
        fi
        printf "%s" "$DOTNET_BIN_OVERRIDE"
        return 0
    fi

    if [[ -x "$DEFAULT_DOTNET_BIN" ]]; then
        printf "%s" "$DEFAULT_DOTNET_BIN"
        return 0
    fi

    if command -v dotnet >/dev/null 2>&1; then
        command -v dotnet
        return 0
    fi

    echo "dotnet runtime not found. Checked: $DEFAULT_DOTNET_BIN and PATH." >&2
    exit 1
}

read_json_path_value() {
    local file_path="$1"
    local dot_path="$2"
    node - "$file_path" "$dot_path" <<'NODE'
const fs = require("node:fs");

const filePath = process.argv[2];
const dotPath = process.argv[3];
const source = fs.readFileSync(filePath, "utf8");
const json = JSON.parse(source);

const parts = dotPath.split(".");
let current = json;
for (const part of parts) {
    if (current == null || !Object.prototype.hasOwnProperty.call(current, part)) {
        process.stderr.write(`Path not found: ${dotPath}\n`);
        process.exit(2);
    }
    current = current[part];
}

process.stdout.write(String(current));
NODE
}

assert_file_exists() {
    local file_path="$1"
    local label="$2"
    if [[ ! -f "$file_path" ]]; then
        echo "$label not found: $file_path" >&2
        exit 1
    fi
}

assert_json_value() {
    local file_path="$1"
    local path="$2"
    local expected="$3"
    local actual
    actual="$(read_json_path_value "$file_path" "$path")"
    if [[ "$actual" != "$expected" ]]; then
        echo "Topology policy mismatch for '$path' in '$file_path': expected '$expected', got '$actual'." >&2
        exit 1
    fi
}

assert_file_exists "$APPSETTINGS_PATH" "Production appsettings"
assert_file_exists "$APPSETTINGS_DEV_PATH" "Development appsettings"
assert_file_exists "$BACKGROUND_JOBS_APPSETTINGS_PATH" "BackgroundJobs appsettings"

assert_json_value "$APPSETTINGS_PATH" "WebHostTopology.EnableEmbeddedWorkers" "$EXPECTED_PROD_EMBEDDED"
assert_json_value "$APPSETTINGS_PATH" "WebHostTopology.EnableDemoSeedWorker" "$EXPECTED_PROD_DEMO_SEED"
assert_json_value "$APPSETTINGS_DEV_PATH" "WebHostTopology.EnableEmbeddedWorkers" "$EXPECTED_DEV_EMBEDDED"
assert_json_value "$BACKGROUND_JOBS_APPSETTINGS_PATH" "SlaMonitoring.WorkerEnabled" "$EXPECTED_BACKGROUND_SLA_ENABLED"
assert_json_value "$BACKGROUND_JOBS_APPSETTINGS_PATH" "ContractorRating.WorkerEnabled" "$EXPECTED_BACKGROUND_RATING_ENABLED"

echo "[host-topology] configuration policy check passed."

if is_enabled "$RUN_TESTS"; then
    if [[ ! -f "$TEST_PROJECT_PATH" ]]; then
        echo "Topology integration test project not found: $TEST_PROJECT_PATH" >&2
        exit 1
    fi

    DOTNET_BIN="$(resolve_dotnet_bin)"
    echo "[host-topology] dotnet: $DOTNET_BIN"
    echo "[host-topology] running integration policy filter: $TEST_FILTER"

    "$DOTNET_BIN" test "$TEST_PROJECT_PATH" \
      --filter "$TEST_FILTER" \
      --verbosity minimal \
      --logger "console;verbosity=normal"
else
    echo "[host-topology] integration tests skipped (SUBCONTRACTOR_TOPOLOGY_RUN_TESTS=$RUN_TESTS)."
fi

echo "[host-topology] check completed successfully."
