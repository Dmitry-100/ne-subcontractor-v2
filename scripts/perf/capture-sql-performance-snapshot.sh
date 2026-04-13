#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INPUT_SQL="$ROOT_DIR/docs/sql-performance-snapshot.sql"
ARTIFACTS_DIR="$ROOT_DIR/artifacts/perf"

SERVER="localhost"
DATABASE="SubcontractorV2"
USERNAME=""
PASSWORD=""
OUTPUT_FILE=""

print_help() {
  cat <<'EOF'
Usage: bash scripts/perf/capture-sql-performance-snapshot.sh [options]

Options:
  --server <name>       SQL Server host or host,port (default: localhost)
  --database <name>     Database name (default: SubcontractorV2)
  --username <name>     SQL login; when omitted, integrated auth (-E) is used
  --password <value>    SQL password (required when --username is provided)
  --output <file>       Output file path (default: artifacts/perf/sql-performance-snapshot-<ts>.txt)
  -h, --help            Show this help message

Examples:
  bash scripts/perf/capture-sql-performance-snapshot.sh --server localhost,1433 --database SubcontractorV2 --username sa --password '***'
  bash scripts/perf/capture-sql-performance-snapshot.sh --server sql-prod --database SubcontractorV2 --output artifacts/perf/sql-prod-snapshot.txt
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server)
      SERVER="${2:-}"
      shift 2
      ;;
    --database)
      DATABASE="${2:-}"
      shift 2
      ;;
    --username)
      USERNAME="${2:-}"
      shift 2
      ;;
    --password)
      PASSWORD="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown option: $1" >&2
      print_help
      exit 1
      ;;
  esac
done

if ! command -v sqlcmd >/dev/null 2>&1; then
  echo "[ERROR] 'sqlcmd' is not installed or not found in PATH." >&2
  echo "Install Microsoft SQL command-line tools and retry." >&2
  exit 1
fi

if [[ -n "$USERNAME" && -z "$PASSWORD" ]]; then
  echo "[ERROR] --password is required when --username is provided." >&2
  exit 1
fi

if [[ ! -f "$INPUT_SQL" ]]; then
  echo "[ERROR] SQL input file not found: $INPUT_SQL" >&2
  exit 1
fi

mkdir -p "$ARTIFACTS_DIR"

if [[ -z "$OUTPUT_FILE" ]]; then
  timestamp="$(date +%Y%m%d-%H%M%S)"
  OUTPUT_FILE="$ARTIFACTS_DIR/sql-performance-snapshot-$timestamp.txt"
elif [[ "$OUTPUT_FILE" != /* ]]; then
  OUTPUT_FILE="$ROOT_DIR/$OUTPUT_FILE"
fi

echo "Capturing SQL performance snapshot..."
echo "Server:   $SERVER"
echo "Database: $DATABASE"
echo "Input:    $INPUT_SQL"
echo "Output:   $OUTPUT_FILE"

if [[ -n "$USERNAME" ]]; then
  sqlcmd -S "$SERVER" -d "$DATABASE" -U "$USERNAME" -P "$PASSWORD" -i "$INPUT_SQL" -o "$OUTPUT_FILE"
else
  sqlcmd -S "$SERVER" -d "$DATABASE" -E -i "$INPUT_SQL" -o "$OUTPUT_FILE"
fi

echo "SQL performance snapshot saved to:"
echo "  $OUTPUT_FILE"
