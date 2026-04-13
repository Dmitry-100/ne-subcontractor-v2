#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_MANIFEST="${1:-artifacts/perf/perf-contour-latest.json}"
OUT_DIR="${2:-artifacts/perf}"
TARGET_MANIFEST="$OUT_DIR/perf-contour-baseline.json"
META_FILE="$OUT_DIR/perf-contour-baseline.meta.json"

cd "$ROOT_DIR"

if [[ ! -f "$SOURCE_MANIFEST" ]]; then
  echo "[ERROR] Source manifest not found: $SOURCE_MANIFEST" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
cp "$SOURCE_MANIFEST" "$TARGET_MANIFEST"

cat > "$META_FILE" << EOF
{
  "pinnedAtUtc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "sourceManifest": "$SOURCE_MANIFEST",
  "targetManifest": "$TARGET_MANIFEST"
}
EOF

echo "Pinned performance baseline:"
echo "  Source: $SOURCE_MANIFEST"
echo "  Target: $TARGET_MANIFEST"
echo "  Meta:   $META_FILE"
