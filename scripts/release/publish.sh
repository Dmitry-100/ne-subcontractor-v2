#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet CLI is required. Install .NET 8 SDK first."
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 <output-dir> [Release|Debug]"
  exit 1
fi

OUTPUT_DIR="$1"
CONFIGURATION="${2:-Release}"

mkdir -p "$OUTPUT_DIR/web"
mkdir -p "$OUTPUT_DIR/db-migrator"

echo "[publish] web ($CONFIGURATION)"
dotnet publish src/Subcontractor.Web/Subcontractor.Web.csproj \
  -c "$CONFIGURATION" \
  -o "$OUTPUT_DIR/web" \
  --nologo

echo "[publish] db migrator ($CONFIGURATION)"
dotnet publish src/Subcontractor.DbMigrator/Subcontractor.DbMigrator.csproj \
  -c "$CONFIGURATION" \
  -o "$OUTPUT_DIR/db-migrator" \
  --nologo

BUILD_TIME_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"

cat > "$OUTPUT_DIR/build-metadata.txt" <<EOF
build_time_utc=$BUILD_TIME_UTC
git_commit=$GIT_COMMIT
configuration=$CONFIGURATION
EOF

echo "[publish] artifacts created in: $OUTPUT_DIR"
