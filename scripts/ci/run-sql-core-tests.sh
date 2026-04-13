#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_DOTNET_BIN="$ROOT_DIR/.dotnet/dotnet"
DOTNET_BIN_OVERRIDE="${SUBCONTRACTOR_SQL_DOTNET_BIN:-}"
PROJECT_PATH="${SUBCONTRACTOR_SQL_TEST_PROJECT_PATH:-$ROOT_DIR/tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj}"

export SUBCONTRACTOR_SQL_TESTS="${SUBCONTRACTOR_SQL_TESTS:-1}"
export SUBCONTRACTOR_SQL_TEST_SERVER_CONNECTION="${SUBCONTRACTOR_SQL_TEST_SERVER_CONNECTION:-Server=localhost,1433;User Id=sa;Password=YourStr0ng!Passw0rd;TrustServerCertificate=True;Encrypt=False}"

if [[ -n "$DOTNET_BIN_OVERRIDE" ]]; then
  DOTNET_BIN="$DOTNET_BIN_OVERRIDE"
  if [[ ! -x "$DOTNET_BIN" ]]; then
    echo "Configured dotnet runtime is not executable: $DOTNET_BIN" >&2
    exit 1
  fi
elif [[ -x "$DEFAULT_DOTNET_BIN" ]]; then
  DOTNET_BIN="$DEFAULT_DOTNET_BIN"
elif command -v dotnet >/dev/null 2>&1; then
  DOTNET_BIN="$(command -v dotnet)"
else
  echo "dotnet runtime not found. Checked: $DEFAULT_DOTNET_BIN and PATH." >&2
  exit 1
fi

if [[ ! -f "$PROJECT_PATH" ]]; then
  echo "SQL test project not found: $PROJECT_PATH" >&2
  exit 1
fi

start_ts="$(date +%s)"
echo "[sql-core] started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[sql-core] project: $PROJECT_PATH"
echo "[sql-core] dotnet: $DOTNET_BIN"

"$DOTNET_BIN" test "$PROJECT_PATH" \
  --filter "SqlSuite=Core" \
  --verbosity minimal \
  --logger "console;verbosity=normal" \
  --blame-hang-timeout 10m

finish_ts="$(date +%s)"
elapsed="$((finish_ts - start_ts))"
echo "[sql-core] finished in ${elapsed}s"
