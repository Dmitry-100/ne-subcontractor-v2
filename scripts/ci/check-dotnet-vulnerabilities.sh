#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOLUTION_PATH="${1:-$ROOT_DIR/Subcontractor.sln}"
ALLOWLIST_PATH="${ALLOWLIST_PATH:-$ROOT_DIR/.github/dependency-vulnerability-allowlist.json}"
REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/artifacts/security}"
REPORT_PATH="${REPORT_PATH:-$REPORT_DIR/nuget-vulnerability-report.json}"
ENFORCE_ALLOWLIST_REVIEW_DATE="${ENFORCE_ALLOWLIST_REVIEW_DATE:-true}"
REQUIRE_ALLOWLIST_ENTRY_METADATA="${REQUIRE_ALLOWLIST_ENTRY_METADATA:-true}"
TODAY_UTC="$(date -u +%Y-%m-%d)"

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
  echo "jq is required for vulnerability checks." >&2
  exit 1
fi

if [ ! -f "$ALLOWLIST_PATH" ]; then
  echo "Dependency vulnerability allowlist not found: $ALLOWLIST_PATH" >&2
  exit 1
fi

is_iso_date() {
  local value="$1"
  [[ "$value" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]
}

validate_allowlist_metadata() {
  local failures=0

  local policy_version
  policy_version="$(jq -r '.policyVersion // 0' "$ALLOWLIST_PATH")"
  if ! [[ "$policy_version" =~ ^[0-9]+$ ]] || [ "$policy_version" -lt 1 ]; then
    echo "[ALLOWLIST] Invalid policyVersion: '$policy_version'. Expected integer >= 1." >&2
    failures=$((failures + 1))
  fi

  local reviewed_on
  reviewed_on="$(jq -r '.reviewedOn // empty' "$ALLOWLIST_PATH")"
  if [ -n "$reviewed_on" ] && ! is_iso_date "$reviewed_on"; then
    echo "[ALLOWLIST] reviewedOn must be ISO date YYYY-MM-DD. Got '$reviewed_on'." >&2
    failures=$((failures + 1))
  fi

  local next_review_on
  next_review_on="$(jq -r '.nextReviewOn // empty' "$ALLOWLIST_PATH")"
  if [ "$ENFORCE_ALLOWLIST_REVIEW_DATE" = "true" ]; then
    if [ -z "$next_review_on" ]; then
      echo "[ALLOWLIST] nextReviewOn is required when ENFORCE_ALLOWLIST_REVIEW_DATE=true." >&2
      failures=$((failures + 1))
    elif ! is_iso_date "$next_review_on"; then
      echo "[ALLOWLIST] nextReviewOn must be ISO date YYYY-MM-DD. Got '$next_review_on'." >&2
      failures=$((failures + 1))
    elif [[ "$next_review_on" < "$TODAY_UTC" ]]; then
      echo "[ALLOWLIST] nextReviewOn '$next_review_on' is overdue (today: $TODAY_UTC)." >&2
      failures=$((failures + 1))
    fi
  fi

  local duplicate_count
  duplicate_count="$(
    jq -r '
      [
        .entries[]?
        | {
            packageId: (.packageId // ""),
            severity: (.severity // ""),
            advisoryUrl: (.advisoryUrl // ""),
            scope: (.scope // "")
          }
      ]
      | group_by(.packageId, .severity, .advisoryUrl, .scope)
      | map(select(length > 1))
      | length
    ' "$ALLOWLIST_PATH"
  )"
  if ! [[ "$duplicate_count" =~ ^[0-9]+$ ]]; then
    duplicate_count=0
  fi
  if [ "$duplicate_count" -gt 0 ]; then
    echo "[ALLOWLIST] Duplicate entries found by (packageId,severity,advisoryUrl,scope): $duplicate_count" >&2
    failures=$((failures + 1))
  fi

  while IFS= read -r entry_json; do
    [ -z "$entry_json" ] && continue

    local package_id severity advisory_url scope reason expires_on owner
    package_id="$(jq -r '.packageId // empty' <<<"$entry_json")"
    severity="$(jq -r '.severity // empty' <<<"$entry_json")"
    advisory_url="$(jq -r '.advisoryUrl // empty' <<<"$entry_json")"
    scope="$(jq -r '.scope // empty' <<<"$entry_json")"
    reason="$(jq -r '.reason // empty' <<<"$entry_json")"
    expires_on="$(jq -r '.expiresOn // empty' <<<"$entry_json")"
    owner="$(jq -r '.owner // empty' <<<"$entry_json")"

    if [ -z "$package_id" ] || [ -z "$severity" ] || [ -z "$advisory_url" ] || [ -z "$scope" ]; then
      echo "[ALLOWLIST] Entry is missing required matcher fields (packageId/severity/advisoryUrl/scope)." >&2
      failures=$((failures + 1))
      continue
    fi

    case "$scope" in
      production|tests|all)
        ;;
      *)
        echo "[ALLOWLIST] Entry scope '$scope' is invalid for package '$package_id'." >&2
        failures=$((failures + 1))
        ;;
    esac

    if [ "$REQUIRE_ALLOWLIST_ENTRY_METADATA" = "true" ]; then
      if [ -z "$reason" ]; then
        echo "[ALLOWLIST] Entry '$package_id' is missing non-empty reason." >&2
        failures=$((failures + 1))
      fi
      if [ -z "$owner" ]; then
        echo "[ALLOWLIST] Entry '$package_id' is missing owner." >&2
        failures=$((failures + 1))
      fi
      if [ -z "$expires_on" ]; then
        echo "[ALLOWLIST] Entry '$package_id' is missing expiresOn." >&2
        failures=$((failures + 1))
      elif ! is_iso_date "$expires_on"; then
        echo "[ALLOWLIST] Entry '$package_id' has invalid expiresOn '$expires_on' (expected YYYY-MM-DD)." >&2
        failures=$((failures + 1))
      elif [[ "$expires_on" < "$TODAY_UTC" ]]; then
        echo "[ALLOWLIST] Entry '$package_id' expired on '$expires_on' (today: $TODAY_UTC)." >&2
        failures=$((failures + 1))
      fi
    fi
  done < <(jq -c '.entries[]?' "$ALLOWLIST_PATH")

  if [ "$failures" -gt 0 ]; then
    echo "[ALLOWLIST] Validation failed with $failures issue(s)." >&2
    exit 1
  fi
}

validate_allowlist_metadata

"$DOTNET_BIN" list "$SOLUTION_PATH" package --vulnerable --include-transitive --format json > "$REPORT_PATH"

FINDINGS=()
while IFS= read -r finding_json; do
  FINDINGS+=("$finding_json")
done < <(
  jq -c '
    [
      .projects[]? as $project
      | ($project.frameworks // [])[]? as $framework
      | ((($framework.topLevelPackages // []) + ($framework.transitivePackages // []))[]?) as $package
      | ($package.vulnerabilities // [])[]?
      | {
          projectPath: $project.path,
          framework: $framework.framework,
          packageId: $package.id,
          resolvedVersion: ($package.resolvedVersion // ""),
          severity: .severity,
          advisoryUrl: .advisoryurl
        }
    ]
    | unique_by(.projectPath, .framework, .packageId, .resolvedVersion, .severity, .advisoryUrl)
    | .[]
  ' "$REPORT_PATH"
)

if [ "${#FINDINGS[@]}" -eq 0 ]; then
  echo "No NuGet vulnerabilities found."
  echo "Report written to $REPORT_PATH"
  exit 0
fi

echo "NuGet vulnerability findings:"

FAILURES=0

for finding_json in "${FINDINGS[@]}"; do
  project_path="$(jq -r '.projectPath' <<<"$finding_json")"
  framework="$(jq -r '.framework' <<<"$finding_json")"
  package_id="$(jq -r '.packageId' <<<"$finding_json")"
  resolved_version="$(jq -r '.resolvedVersion' <<<"$finding_json")"
  severity="$(jq -r '.severity' <<<"$finding_json")"
  advisory_url="$(jq -r '.advisoryUrl' <<<"$finding_json")"

  if [[ "$project_path" == *"/tests/"* ]] || [[ "$project_path" == *"\\tests\\"* ]]; then
    project_scope="tests"
  else
    project_scope="production"
  fi

  matched_allowlist_entry="$(
    jq -c \
    --arg package_id "$package_id" \
    --arg severity "$severity" \
    --arg advisory_url "$advisory_url" \
    --arg project_scope "$project_scope" \
    '
      .entries[]?
      | select(.packageId == $package_id)
      | select(.severity == $severity)
      | select(.advisoryUrl == $advisory_url)
      | select(.scope == "all" or .scope == $project_scope)
    ' "$ALLOWLIST_PATH" \
    | head -n 1
  )"

  if [ -n "$matched_allowlist_entry" ]; then
    entry_reason="$(jq -r '.reason // empty' <<<"$matched_allowlist_entry")"
    entry_expires_on="$(jq -r '.expiresOn // empty' <<<"$matched_allowlist_entry")"
    entry_owner="$(jq -r '.owner // empty' <<<"$matched_allowlist_entry")"

    if [ "$REQUIRE_ALLOWLIST_ENTRY_METADATA" = "true" ]; then
      allowlist_entry_valid=true

      if [ -z "$entry_reason" ]; then
        echo "ALLOWLIST_INVALID [$severity][$project_scope] $package_id $resolved_version :: missing reason"
        allowlist_entry_valid=false
      fi
      if [ -z "$entry_owner" ]; then
        echo "ALLOWLIST_INVALID [$severity][$project_scope] $package_id $resolved_version :: missing owner"
        allowlist_entry_valid=false
      fi
      if [ -z "$entry_expires_on" ]; then
        echo "ALLOWLIST_INVALID [$severity][$project_scope] $package_id $resolved_version :: missing expiresOn"
        allowlist_entry_valid=false
      elif ! is_iso_date "$entry_expires_on"; then
        echo "ALLOWLIST_INVALID [$severity][$project_scope] $package_id $resolved_version :: invalid expiresOn '$entry_expires_on'"
        allowlist_entry_valid=false
      elif [[ "$entry_expires_on" < "$TODAY_UTC" ]]; then
        echo "ALLOWLIST_EXPIRED [$severity][$project_scope] $package_id $resolved_version :: expired $entry_expires_on"
        allowlist_entry_valid=false
      fi

      if [ "$allowlist_entry_valid" = "true" ]; then
        echo "ALLOWLISTED [$severity][$project_scope] $package_id $resolved_version :: $advisory_url (owner: $entry_owner, expiresOn: $entry_expires_on)"
        continue
      fi
    else
      echo "ALLOWLISTED [$severity][$project_scope] $package_id $resolved_version :: $advisory_url"
      continue
    fi
  fi

  echo "FOUND [$severity][$project_scope] $package_id $resolved_version :: $advisory_url ($framework, $project_path)"

  case "$severity" in
    Critical|High)
      FAILURES=$((FAILURES + 1))
      ;;
    Moderate)
      if [ "$project_scope" = "production" ]; then
        FAILURES=$((FAILURES + 1))
      fi
      ;;
  esac
done

if [ "$FAILURES" -gt 0 ]; then
  echo "Dependency vulnerability policy violated. Blocking findings: $FAILURES"
  echo "Report written to $REPORT_PATH"
  exit 1
fi

echo "Dependency vulnerability policy passed. Findings are either low-risk or allowlisted."
echo "Report written to $REPORT_PATH"
