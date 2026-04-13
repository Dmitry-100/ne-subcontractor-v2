#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SNAPSHOT_SQL="$ROOT_DIR/docs/sql-performance-snapshot.sql"
TOP_QUERIES_SQL="$ROOT_DIR/docs/sql-performance-top-queries.sql"
ARTIFACTS_DIR="$ROOT_DIR/artifacts/perf"

SERVER="localhost"
DATABASE="SubcontractorV2"
USERNAME=""
PASSWORD=""
TAG=""
OUTPUT_DIR=""
INCLUDE_TOP_QUERIES="true"
CREATE_ARCHIVE="true"
SQLCMD_MODE="auto"
SQLCMD_DOCKER_CONTAINER="subcontractor-v2-sql"
SQLCMD_DOCKER_BIN="/opt/mssql-tools18/bin/sqlcmd"
TRUST_SERVER_CERTIFICATE="true"
SQLCMD_EXECUTOR=""

print_help() {
  cat <<'EOF'
Usage: bash scripts/perf/capture-sql-performance-evidence-pack.sh [options]

Options:
  --server <name>       SQL Server host or host,port (default: localhost)
  --database <name>     Database name (default: SubcontractorV2)
  --username <name>     SQL login; when omitted, integrated auth (-E) is used
  --password <value>    SQL password (required when --username is provided)
  --tag <value>         Logical tag for artifact folder/archive naming (e.g. staging, rc, prod-like)
  --output-dir <path>   Output directory (default: artifacts/perf/sql-evidence-<timestamp>[-tag])
  --sqlcmd-mode <mode>  sqlcmd execution mode: auto|host|docker (default: auto)
  --sqlcmd-docker-container <name>
                        Docker container name for sqlcmd fallback (default: subcontractor-v2-sql)
  --sqlcmd-docker-bin <path>
                        sqlcmd binary path inside docker container (default: /opt/mssql-tools18/bin/sqlcmd)
  --no-trust-server-certificate
                        Do not append sqlcmd -C (trust server certificate)
  --no-top-queries      Skip docs/sql-performance-top-queries.sql capture
  --no-archive          Do not build tar.gz archive
  -h, --help            Show this help message

Examples:
  bash scripts/perf/capture-sql-performance-evidence-pack.sh --server localhost,1433 --database SubcontractorV2 --username sa --password '***' --tag staging
  bash scripts/perf/capture-sql-performance-evidence-pack.sh --server sql-staging --database SubcontractorV2 --tag pre-go-live
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
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --sqlcmd-mode)
      SQLCMD_MODE="${2:-}"
      shift 2
      ;;
    --sqlcmd-docker-container)
      SQLCMD_DOCKER_CONTAINER="${2:-}"
      shift 2
      ;;
    --sqlcmd-docker-bin)
      SQLCMD_DOCKER_BIN="${2:-}"
      shift 2
      ;;
    --no-trust-server-certificate)
      TRUST_SERVER_CERTIFICATE="false"
      shift
      ;;
    --no-top-queries)
      INCLUDE_TOP_QUERIES="false"
      shift
      ;;
    --no-archive)
      CREATE_ARCHIVE="false"
      shift
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

if [[ -n "$USERNAME" && -z "$PASSWORD" ]]; then
  echo "[ERROR] --password is required when --username is provided." >&2
  exit 1
fi

if [[ ! -f "$SNAPSHOT_SQL" ]]; then
  echo "[ERROR] SQL input file not found: $SNAPSHOT_SQL" >&2
  exit 1
fi

if [[ "$INCLUDE_TOP_QUERIES" == "true" && ! -f "$TOP_QUERIES_SQL" ]]; then
  echo "[ERROR] SQL input file not found: $TOP_QUERIES_SQL" >&2
  exit 1
fi

require_docker_sqlcmd() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[ERROR] Docker is not available, cannot use docker sqlcmd fallback." >&2
    exit 1
  fi

  if ! docker ps --format '{{.Names}}' | grep -Fxq "$SQLCMD_DOCKER_CONTAINER"; then
    echo "[ERROR] Docker container '$SQLCMD_DOCKER_CONTAINER' is not running." >&2
    exit 1
  fi

  if ! docker exec "$SQLCMD_DOCKER_CONTAINER" test -x "$SQLCMD_DOCKER_BIN"; then
    echo "[ERROR] sqlcmd binary '$SQLCMD_DOCKER_BIN' not found in container '$SQLCMD_DOCKER_CONTAINER'." >&2
    exit 1
  fi
}

resolve_sqlcmd_executor() {
  case "$SQLCMD_MODE" in
    auto)
      if command -v sqlcmd >/dev/null 2>&1; then
        SQLCMD_EXECUTOR="host"
      else
        require_docker_sqlcmd
        SQLCMD_EXECUTOR="docker"
      fi
      ;;
    host)
      if ! command -v sqlcmd >/dev/null 2>&1; then
        echo "[ERROR] SQLCMD mode is 'host', but 'sqlcmd' is not found in PATH." >&2
        exit 1
      fi
      SQLCMD_EXECUTOR="host"
      ;;
    docker)
      require_docker_sqlcmd
      SQLCMD_EXECUTOR="docker"
      ;;
    *)
      echo "[ERROR] Unsupported --sqlcmd-mode value: $SQLCMD_MODE (expected: auto|host|docker)." >&2
      exit 1
      ;;
  esac
}

run_sqlcmd_from_file() {
  local input_file="$1"
  local output_file="$2"

  if [[ "$SQLCMD_EXECUTOR" == "host" ]]; then
    sqlcmd "${sqlcmd_args[@]}" -i "$input_file" -o "$output_file"
    return
  fi

  cat "$input_file" | docker exec -i "$SQLCMD_DOCKER_CONTAINER" "$SQLCMD_DOCKER_BIN" "${sqlcmd_args[@]}" -i /dev/stdin > "$output_file"
}

mkdir -p "$ARTIFACTS_DIR"

timestamp="$(date +%Y%m%d-%H%M%S)"
safe_tag=""
if [[ -n "$TAG" ]]; then
  safe_tag="$(echo "$TAG" | tr '[:space:]/' '__' | tr -cd '[:alnum:]_-')"
fi

if [[ -z "$OUTPUT_DIR" ]]; then
  if [[ -n "$safe_tag" ]]; then
    OUTPUT_DIR="$ARTIFACTS_DIR/sql-evidence-$timestamp-$safe_tag"
  else
    OUTPUT_DIR="$ARTIFACTS_DIR/sql-evidence-$timestamp"
  fi
elif [[ "$OUTPUT_DIR" != /* ]]; then
  OUTPUT_DIR="$ROOT_DIR/$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR"

snapshot_output="$OUTPUT_DIR/sql-performance-snapshot.txt"
top_queries_output="$OUTPUT_DIR/sql-performance-top-queries.txt"
manifest_path="$OUTPUT_DIR/manifest.json"
summary_path="$OUTPUT_DIR/evidence-summary.md"
archive_path=""

if command -v git >/dev/null 2>&1; then
  git_commit="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || true)"
else
  git_commit=""
fi

if [[ -z "$git_commit" ]]; then
  git_commit="unknown"
fi

resolve_sqlcmd_executor

if [[ "$SQLCMD_EXECUTOR" == "docker" && -z "$USERNAME" ]]; then
  echo "[ERROR] Docker sqlcmd mode requires SQL login (--username/--password)." >&2
  exit 1
fi

sqlcmd_args=(-S "$SERVER" -d "$DATABASE")
if [[ -n "$USERNAME" ]]; then
  sqlcmd_args+=(-U "$USERNAME" -P "$PASSWORD")
else
  sqlcmd_args+=(-E)
fi
if [[ "$TRUST_SERVER_CERTIFICATE" == "true" ]]; then
  sqlcmd_args+=(-C)
fi

echo "Capturing SQL performance evidence pack..."
echo "Server:   $SERVER"
echo "Database: $DATABASE"
echo "Output:   $OUTPUT_DIR"
echo "sqlcmd executor: $SQLCMD_EXECUTOR"
if [[ "$SQLCMD_EXECUTOR" == "docker" ]]; then
  echo "sqlcmd docker container: $SQLCMD_DOCKER_CONTAINER"
fi
if [[ -n "$safe_tag" ]]; then
  echo "Tag:      $safe_tag"
fi

run_sqlcmd_from_file "$SNAPSHOT_SQL" "$snapshot_output"

if [[ "$INCLUDE_TOP_QUERIES" == "true" ]]; then
  run_sqlcmd_from_file "$TOP_QUERIES_SQL" "$top_queries_output"
fi

{
  echo "{"
  echo "  \"capturedAtUtc\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"server\": \"${SERVER}\","
  echo "  \"database\": \"${DATABASE}\","
  if [[ -n "$safe_tag" ]]; then
    echo "  \"tag\": \"${safe_tag}\","
  else
    echo "  \"tag\": null,"
  fi
  echo "  \"gitCommit\": \"${git_commit}\","
  echo "  \"files\": {"
  echo "    \"snapshot\": \"$(basename "$snapshot_output")\","
  if [[ "$INCLUDE_TOP_QUERIES" == "true" ]]; then
    echo "    \"topQueries\": \"$(basename "$top_queries_output")\","
  else
    echo "    \"topQueries\": null,"
  fi
  echo "    \"summary\": \"$(basename "$summary_path")\","
  echo "    \"sourceSql\": ["
  echo "      \"$(basename "$SNAPSHOT_SQL")\","
  if [[ "$INCLUDE_TOP_QUERIES" == "true" ]]; then
    echo "      \"$(basename "$TOP_QUERIES_SQL")\""
  else
    echo "      null"
  fi
  echo "    ]"
  echo "  }"
  echo "}"
} > "$manifest_path"

{
  echo "# SQL Performance Evidence Summary"
  echo
  echo "Captured at (UTC): \`$(date -u +%Y-%m-%dT%H:%M:%SZ)\`"
  echo
  echo "- Server: \`$SERVER\`"
  echo "- Database: \`$DATABASE\`"
  if [[ -n "$safe_tag" ]]; then
    echo "- Tag: \`$safe_tag\`"
  else
    echo "- Tag: \`n/a\`"
  fi
  echo "- Git commit: \`$git_commit\`"
  echo
  echo "## Files"
  echo
  echo "- \`$(basename "$snapshot_output")\`"
  if [[ "$INCLUDE_TOP_QUERIES" == "true" ]]; then
    echo "- \`$(basename "$top_queries_output")\`"
  fi
  echo "- \`$(basename "$manifest_path")\`"
  echo
  echo "## Review Checklist"
  echo
  echo "- [ ] Проверены TOP statement hotspots (elapsed/cpu/reads) из \`sql-performance-top-queries.txt\`."
  echo "- [ ] Для 3-5 тяжелых запросов приложены execution plans (Actual/Estimated)."
  echo "- [ ] Проанализированы waits/missing-index hints и отмечены actionable пункты."
  echo "- [ ] Созданы follow-up задачи с owner и сроком для найденных bottlenecks."
  echo "- [ ] Ссылка на evidence-pack добавлена в RC/Go-live checklist."
} > "$summary_path"

if [[ "$CREATE_ARCHIVE" == "true" ]]; then
  if command -v tar >/dev/null 2>&1; then
    if [[ -n "$safe_tag" ]]; then
      archive_path="$ARTIFACTS_DIR/sql-evidence-$timestamp-$safe_tag.tar.gz"
    else
      archive_path="$ARTIFACTS_DIR/sql-evidence-$timestamp.tar.gz"
    fi
    tar -C "$OUTPUT_DIR" -czf "$archive_path" .
  else
    echo "[WARN] 'tar' not found, archive step skipped."
  fi
fi

echo "SQL evidence pack saved:"
echo "  $OUTPUT_DIR"
echo "Manifest:"
echo "  $manifest_path"
echo "Summary:"
echo "  $summary_path"
if [[ -n "$archive_path" ]]; then
  echo "Archive:"
  echo "  $archive_path"
fi
