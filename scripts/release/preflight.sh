#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet CLI is required. Install .NET 8 SDK first."
  exit 1
fi

echo "[preflight] restore"
dotnet restore Subcontractor.sln --verbosity minimal

echo "[preflight] build"
dotnet build Subcontractor.sln --no-restore -v minimal

echo "[preflight] test"
dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal

echo "[preflight] db migrator dry-run"
dotnet run --project src/Subcontractor.DbMigrator/Subcontractor.DbMigrator.csproj -- --dry-run

echo "[preflight] completed successfully"
