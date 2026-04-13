#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
JS_ROOT="$ROOT_DIR/src/Subcontractor.Web/wwwroot/js"

WARNING_THRESHOLD="${JS_WARNING_THRESHOLD:-200}"
FAIL_THRESHOLD="${JS_FAIL_THRESHOLD:-250}"
EXCLUDE_REGEX="${JS_SIZE_EXCLUDE_REGEX:-/bundles/}"

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

while IFS= read -r file; do
  if [[ "$file" =~ $EXCLUDE_REGEX ]]; then
    continue
  fi

  line_count="$(wc -l < "$file" | tr -d ' ')"
  printf "%s\t%s\n" "$line_count" "${file#$ROOT_DIR/}" >> "$TMP_FILE"
done < <(find "$JS_ROOT" -type f -name "*.js" | sort)

total_files="$(wc -l < "$TMP_FILE" | tr -d ' ')"
warning_count="$(awk -F'\t' -v threshold="$WARNING_THRESHOLD" '$1 > threshold { count++ } END { print count + 0 }' "$TMP_FILE")"
fail_count="$(awk -F'\t' -v threshold="$FAIL_THRESHOLD" '$1 > threshold { count++ } END { print count + 0 }' "$TMP_FILE")"

echo "JS module size guard (excluding regex: $EXCLUDE_REGEX)"
echo "Total scanned files: $total_files"
echo "Warning threshold > $WARNING_THRESHOLD LOC: $warning_count"
echo "Fail threshold > $FAIL_THRESHOLD LOC: $fail_count"

if [[ "$warning_count" -gt 0 ]]; then
  echo "Modules above warning threshold:"
  awk -F'\t' -v threshold="$WARNING_THRESHOLD" '$1 > threshold { printf "  %4d  %s\n", $1, $2 }' "$TMP_FILE" | sort -nr
fi

if [[ "$fail_count" -gt 0 ]]; then
  echo "ERROR: modules above fail threshold detected:"
  awk -F'\t' -v threshold="$FAIL_THRESHOLD" '$1 > threshold { printf "  %4d  %s\n", $1, $2 }' "$TMP_FILE" | sort -nr
  exit 1
fi

echo "JS module size guard passed."
