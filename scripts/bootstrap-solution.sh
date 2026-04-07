#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet CLI is required. Install .NET 8 SDK first."
  exit 1
fi

if [ ! -f "Subcontractor.sln" ]; then
  dotnet new sln --name Subcontractor
fi

add_project_if_missing() {
  local project_path="$1"
  if dotnet sln Subcontractor.sln list | grep -Fq "$project_path"; then
    return 0
  fi
  dotnet sln Subcontractor.sln add "$project_path"
}

add_project_if_missing "src/Subcontractor.Domain/Subcontractor.Domain.csproj"
add_project_if_missing "src/Subcontractor.Application/Subcontractor.Application.csproj"
add_project_if_missing "src/Subcontractor.Infrastructure/Subcontractor.Infrastructure.csproj"
add_project_if_missing "src/Subcontractor.Web/Subcontractor.Web.csproj"
add_project_if_missing "src/Subcontractor.BackgroundJobs/Subcontractor.BackgroundJobs.csproj"
add_project_if_missing "src/Subcontractor.DbMigrator/Subcontractor.DbMigrator.csproj"
add_project_if_missing "tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj"
add_project_if_missing "tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj"

echo "Solution bootstrap completed."
