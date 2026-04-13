#!/bin/zsh
set -euo pipefail

PROJECT_ROOT="/Users/Sotnikov/Google Drive 100/10 - coding project/ne-subcontractor/ne-subcontractor/subcontractor-v2"
DOTNET_BIN="$PROJECT_ROOT/.dotnet/dotnet"
WEB_PROJECT="$PROJECT_ROOT/src/Subcontractor.Web/Subcontractor.Web.csproj"
LOCAL_UI_ASSETS_CHECK_SCRIPT="$PROJECT_ROOT/scripts/ci/check-local-ui-assets.sh"
UI_ASSETS_SETTINGS_FILE="${UI_ASSETS_SETTINGS_FILE:-$PROJECT_ROOT/src/Subcontractor.Web/appsettings.Development.json}"
SKIP_UI_ASSETS_PREFLIGHT="${SKIP_UI_ASSETS_PREFLIGHT:-0}"

export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"

cd "$PROJECT_ROOT"

if [[ "$SKIP_UI_ASSETS_PREFLIGHT" != "1" && -f "$LOCAL_UI_ASSETS_CHECK_SCRIPT" ]]; then
  echo "Running local UI assets preflight..."
  bash "$LOCAL_UI_ASSETS_CHECK_SCRIPT" --settings-file "$UI_ASSETS_SETTINGS_FILE"
fi

exec "$DOTNET_BIN" run --project "$WEB_PROJECT" --urls "http://127.0.0.1:5080"
