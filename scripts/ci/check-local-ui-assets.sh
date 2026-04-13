#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SETTINGS_FILE="$ROOT_DIR/src/Subcontractor.Web/appsettings.Development.json"
WEBROOT_DIR="$ROOT_DIR/src/Subcontractor.Web/wwwroot"
FORCE_LOCAL_CHECK="false"

print_help() {
  cat <<'EOF'
Usage: bash scripts/ci/check-local-ui-assets.sh [options]

Options:
  --settings-file <path>   appsettings json file (default: src/Subcontractor.Web/appsettings.Development.json)
  --webroot-dir <path>     web root path (default: src/Subcontractor.Web/wwwroot)
  --force-local            Validate local assets regardless of UseLocal flags
  -h, --help               Show this help

Examples:
  bash scripts/ci/check-local-ui-assets.sh
  bash scripts/ci/check-local-ui-assets.sh --settings-file src/Subcontractor.Web/appsettings.json
  bash scripts/ci/check-local-ui-assets.sh --force-local
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --settings-file)
      SETTINGS_FILE="${2:-}"
      shift 2
      ;;
    --webroot-dir)
      WEBROOT_DIR="${2:-}"
      shift 2
      ;;
    --force-local)
      FORCE_LOCAL_CHECK="true"
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

if [[ "$SETTINGS_FILE" != /* ]]; then
  SETTINGS_FILE="$ROOT_DIR/$SETTINGS_FILE"
fi
if [[ "$WEBROOT_DIR" != /* ]]; then
  WEBROOT_DIR="$ROOT_DIR/$WEBROOT_DIR"
fi

if [[ ! -f "$SETTINGS_FILE" ]]; then
  echo "[ERROR] Settings file not found: $SETTINGS_FILE" >&2
  exit 1
fi

if [[ ! -d "$WEBROOT_DIR" ]]; then
  echo "[ERROR] Webroot directory not found: $WEBROOT_DIR" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 is required." >&2
  exit 1
fi

config_values="$(
  python3 - "$SETTINGS_FILE" <<'PY'
import json
import pathlib
import sys

settings_path = pathlib.Path(sys.argv[1])
with settings_path.open("r", encoding="utf-8") as fh:
    data = json.load(fh)

ui = data.get("UiAssets", {})
dev = ui.get("DevExpress", {})
sheet = ui.get("SheetJs", {})

def bool_to_str(value):
    return "true" if bool(value) else "false"

version = str(dev.get("Version") or "24.1.6")
local_base_path = str(dev.get("LocalBasePath") or f"/lib/devexpress/{version}")
sheet_version = str(sheet.get("Version") or "0.18.5")
sheet_local_path = str(sheet.get("LocalPath") or f"/lib/xlsx/{sheet_version}/xlsx.full.min.js")

print(f"DEV_USE_LOCAL={bool_to_str(dev.get('UseLocal'))}")
print(f"DEV_LOCAL_BASE_PATH={local_base_path}")
print(f"SHEET_USE_LOCAL={bool_to_str(sheet.get('UseLocal'))}")
print(f"SHEET_LOCAL_PATH={sheet_local_path}")
PY
)"

declare DEV_USE_LOCAL=""
declare DEV_LOCAL_BASE_PATH=""
declare SHEET_USE_LOCAL=""
declare SHEET_LOCAL_PATH=""
while IFS= read -r line; do
  case "$line" in
    DEV_USE_LOCAL=*) DEV_USE_LOCAL="${line#DEV_USE_LOCAL=}" ;;
    DEV_LOCAL_BASE_PATH=*) DEV_LOCAL_BASE_PATH="${line#DEV_LOCAL_BASE_PATH=}" ;;
    SHEET_USE_LOCAL=*) SHEET_USE_LOCAL="${line#SHEET_USE_LOCAL=}" ;;
    SHEET_LOCAL_PATH=*) SHEET_LOCAL_PATH="${line#SHEET_LOCAL_PATH=}" ;;
  esac
done <<< "$config_values"

if [[ "$FORCE_LOCAL_CHECK" == "true" ]]; then
  DEV_USE_LOCAL="true"
  SHEET_USE_LOCAL="true"
fi

required_files=()

if [[ "$DEV_USE_LOCAL" == "true" ]]; then
  normalized_base="${DEV_LOCAL_BASE_PATH#/}"
  required_files+=("$WEBROOT_DIR/$normalized_base/css/dx.light.css")
  required_files+=("$WEBROOT_DIR/$normalized_base/js/jquery.min.js")
  required_files+=("$WEBROOT_DIR/$normalized_base/js/dx.all.js")
  required_files+=("$WEBROOT_DIR/$normalized_base/js/localization/dx.messages.ru.js")
fi

if [[ "$SHEET_USE_LOCAL" == "true" ]]; then
  normalized_sheet="${SHEET_LOCAL_PATH#/}"
  required_files+=("$WEBROOT_DIR/$normalized_sheet")
fi

if [[ "${#required_files[@]}" -eq 0 ]]; then
  echo "Local UI assets check skipped: UseLocal=false for DevExpress/SheetJs."
  echo "Settings: $SETTINGS_FILE"
  exit 0
fi

missing=0
echo "Validating local UI assets..."
echo "Settings: $SETTINGS_FILE"
echo "Webroot:  $WEBROOT_DIR"

for file_path in "${required_files[@]}"; do
  if [[ -f "$file_path" ]]; then
    echo "[OK] $file_path"
  else
    echo "[MISSING] $file_path"
    missing=$((missing + 1))
  fi
done

if [[ "$missing" -gt 0 ]]; then
  echo "Local UI assets check failed. Missing files: $missing" >&2
  exit 1
fi

echo "Local UI assets check passed."
