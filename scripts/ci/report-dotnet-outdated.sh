#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOLUTION_PATH="${1:-$ROOT_DIR/Subcontractor.sln}"
REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/artifacts/security}"
REPORT_PATH="${REPORT_PATH:-$REPORT_DIR/nuget-outdated-report.json}"
SUMMARY_PATH="${SUMMARY_PATH:-$REPORT_DIR/nuget-outdated-summary.txt}"

mkdir -p "$REPORT_DIR"

if command -v dotnet >/dev/null 2>&1; then
  DOTNET_BIN="${DOTNET_COMMAND:-dotnet}"
elif [ -x "$ROOT_DIR/.dotnet/dotnet" ]; then
  DOTNET_BIN="${DOTNET_COMMAND:-$ROOT_DIR/.dotnet/dotnet}"
else
  echo "dotnet CLI is not available." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for outdated dependency report." >&2
  exit 1
fi

"$DOTNET_BIN" list "$SOLUTION_PATH" package --outdated --highest-patch --include-transitive --format json > "$REPORT_PATH"

outdated_count="$(
  jq -r '
    [
      .projects[]? as $project
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | select(($package.latestVersion // "") != "")
      | select(($package.resolvedVersion // "") != ($package.latestVersion // ""))
    ]
    | length
  ' "$REPORT_PATH"
)"

outdated_patch_count="$(
  jq -r '
    def parse_version($v):
      ($v // "")
      | split("-")[0]
      | split(".")
      | map(tonumber? // 0)
      | { major: (.[0] // 0), minor: (.[1] // 0), patch: (.[2] // 0) };
    def classify($resolved; $latest):
      (parse_version($resolved)) as $r
      | (parse_version($latest)) as $l
      | if $l.major > $r.major then "major"
        elif $l.major == $r.major and $l.minor > $r.minor then "minor"
        elif $l.major == $r.major and $l.minor == $r.minor and $l.patch > $r.patch then "patch"
        else "other"
        end;
    [
      .projects[]? as $project
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | select(($package.latestVersion // "") != "")
      | select(($package.resolvedVersion // "") != ($package.latestVersion // ""))
      | classify($package.resolvedVersion; $package.latestVersion)
    ]
    | map(select(. == "patch"))
    | length
  ' "$REPORT_PATH"
)"

outdated_minor_count="$(
  jq -r '
    def parse_version($v):
      ($v // "")
      | split("-")[0]
      | split(".")
      | map(tonumber? // 0)
      | { major: (.[0] // 0), minor: (.[1] // 0), patch: (.[2] // 0) };
    def classify($resolved; $latest):
      (parse_version($resolved)) as $r
      | (parse_version($latest)) as $l
      | if $l.major > $r.major then "major"
        elif $l.major == $r.major and $l.minor > $r.minor then "minor"
        elif $l.major == $r.major and $l.minor == $r.minor and $l.patch > $r.patch then "patch"
        else "other"
        end;
    [
      .projects[]? as $project
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | select(($package.latestVersion // "") != "")
      | select(($package.resolvedVersion // "") != ($package.latestVersion // ""))
      | classify($package.resolvedVersion; $package.latestVersion)
    ]
    | map(select(. == "minor"))
    | length
  ' "$REPORT_PATH"
)"

outdated_major_count="$(
  jq -r '
    def parse_version($v):
      ($v // "")
      | split("-")[0]
      | split(".")
      | map(tonumber? // 0)
      | { major: (.[0] // 0), minor: (.[1] // 0), patch: (.[2] // 0) };
    def classify($resolved; $latest):
      (parse_version($resolved)) as $r
      | (parse_version($latest)) as $l
      | if $l.major > $r.major then "major"
        elif $l.major == $r.major and $l.minor > $r.minor then "minor"
        elif $l.major == $r.major and $l.minor == $r.minor and $l.patch > $r.patch then "patch"
        else "other"
        end;
    [
      .projects[]? as $project
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | select(($package.latestVersion // "") != "")
      | select(($package.resolvedVersion // "") != ($package.latestVersion // ""))
      | classify($package.resolvedVersion; $package.latestVersion)
    ]
    | map(select(. == "major"))
    | length
  ' "$REPORT_PATH"
)"

production_outdated_count="$(
  jq -r '
    [
      .projects[]? as $project
      | select((($project.path // "") | test("(^|/|\\\\)tests($|/|\\\\)")) | not)
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | select(($package.latestVersion // "") != "")
      | select(($package.resolvedVersion // "") != ($package.latestVersion // ""))
    ]
    | length
  ' "$REPORT_PATH"
)"

production_patch_count="$(
  jq -r '
    def parse_version($v):
      ($v // "")
      | split("-")[0]
      | split(".")
      | map(tonumber? // 0)
      | { major: (.[0] // 0), minor: (.[1] // 0), patch: (.[2] // 0) };
    def classify($resolved; $latest):
      (parse_version($resolved)) as $r
      | (parse_version($latest)) as $l
      | if $l.major > $r.major then "major"
        elif $l.major == $r.major and $l.minor > $r.minor then "minor"
        elif $l.major == $r.major and $l.minor == $r.minor and $l.patch > $r.patch then "patch"
        else "other"
        end;
    [
      .projects[]? as $project
      | select((($project.path // "") | test("(^|/|\\\\)tests($|/|\\\\)")) | not)
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | select(($package.latestVersion // "") != "")
      | select(($package.resolvedVersion // "") != ($package.latestVersion // ""))
      | classify($package.resolvedVersion; $package.latestVersion)
    ]
    | map(select(. == "patch"))
    | length
  ' "$REPORT_PATH"
)"

production_minor_count="$(
  jq -r '
    def parse_version($v):
      ($v // "")
      | split("-")[0]
      | split(".")
      | map(tonumber? // 0)
      | { major: (.[0] // 0), minor: (.[1] // 0), patch: (.[2] // 0) };
    def classify($resolved; $latest):
      (parse_version($resolved)) as $r
      | (parse_version($latest)) as $l
      | if $l.major > $r.major then "major"
        elif $l.major == $r.major and $l.minor > $r.minor then "minor"
        elif $l.major == $r.major and $l.minor == $r.minor and $l.patch > $r.patch then "patch"
        else "other"
        end;
    [
      .projects[]? as $project
      | select((($project.path // "") | test("(^|/|\\\\)tests($|/|\\\\)")) | not)
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | select(($package.latestVersion // "") != "")
      | select(($package.resolvedVersion // "") != ($package.latestVersion // ""))
      | classify($package.resolvedVersion; $package.latestVersion)
    ]
    | map(select(. == "minor"))
    | length
  ' "$REPORT_PATH"
)"

production_major_count="$(
  jq -r '
    def parse_version($v):
      ($v // "")
      | split("-")[0]
      | split(".")
      | map(tonumber? // 0)
      | { major: (.[0] // 0), minor: (.[1] // 0), patch: (.[2] // 0) };
    def classify($resolved; $latest):
      (parse_version($resolved)) as $r
      | (parse_version($latest)) as $l
      | if $l.major > $r.major then "major"
        elif $l.major == $r.major and $l.minor > $r.minor then "minor"
        elif $l.major == $r.major and $l.minor == $r.minor and $l.patch > $r.patch then "patch"
        else "other"
        end;
    [
      .projects[]? as $project
      | select((($project.path // "") | test("(^|/|\\\\)tests($|/|\\\\)")) | not)
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | select(($package.latestVersion // "") != "")
      | select(($package.resolvedVersion // "") != ($package.latestVersion // ""))
      | classify($package.resolvedVersion; $package.latestVersion)
    ]
    | map(select(. == "major"))
    | length
  ' "$REPORT_PATH"
)"

{
  echo "NuGet outdated report generated at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Solution: $SOLUTION_PATH"
  echo "Total outdated packages (highest patch): $outdated_count"
  echo "  Breakdown (total): patch=$outdated_patch_count, minor=$outdated_minor_count, major=$outdated_major_count"
  echo "Production-scope outdated packages: $production_outdated_count"
  echo "  Breakdown (production): patch=$production_patch_count, minor=$production_minor_count, major=$production_major_count"
  echo "Report: $REPORT_PATH"
} > "$SUMMARY_PATH"

echo "Outdated dependency summary:"
cat "$SUMMARY_PATH"
