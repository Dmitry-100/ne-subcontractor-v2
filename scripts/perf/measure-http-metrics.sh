#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:5080}"
OUT_DIR="${2:-artifacts/perf}"
ITERATIONS="${PERF_ITERATIONS:-25}"

mkdir -p "$OUT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_FILE="$OUT_DIR/http-metrics-$TIMESTAMP.md"
RAW_FILE="$OUT_DIR/http-metrics-$TIMESTAMP.tsv"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

ENDPOINTS=(
    "home|/"
    "projects-page|/Home/Projects"
    "lots-page|/Home/Lots"
    "procedures-page|/Home/Procedures"
    "contracts-page|/Home/Contracts"
    "contractors-page|/Home/Contractors"
    "sla-page|/Home/Sla"
    "admin-page|/Home/Admin"
    "dashboard-summary-api|/api/dashboard/summary"
    "projects-api-paged|/api/projects?skip=0&take=50&requireTotalCount=true"
    "lots-api-paged|/api/lots?skip=0&take=50&requireTotalCount=true"
    "procedures-api-paged|/api/procedures?skip=0&take=50&requireTotalCount=true"
    "contracts-api-paged|/api/contracts?skip=0&take=50&requireTotalCount=true"
    "contractors-api-paged|/api/contractors?skip=0&take=50&requireTotalCount=true"
    "sla-rules-api|/api/sla/rules"
    "sla-violations-api|/api/sla/violations"
    "admin-users-api|/api/admin/users"
    "admin-roles-api|/api/admin/roles"
)

request_once() {
    local path="$1"
    local output
    output="$(curl -sS -o /dev/null -w '%{time_total} %{time_starttransfer} %{size_download} %{http_code}' "$BASE_URL$path")"
    printf "%s\n" "$output"
}

percentile() {
    local input_file="$1"
    local pct="$2"
    sort -n "$input_file" | awk -v p="$pct" '
        { values[++n] = $1 }
        END {
            if (n == 0) {
                printf "0"
                exit
            }
            idx = int((p * n + 99) / 100)
            if (idx < 1) {
                idx = 1
            }
            if (idx > n) {
                idx = n
            }
            printf "%.6f", values[idx]
        }
    '
}

average() {
    local input_file="$1"
    awk '
        { sum += $1; count += 1 }
        END {
            if (count == 0) {
                printf "0"
                exit
            }
            printf "%.6f", sum / count
        }
    ' "$input_file"
}

to_ms() {
    local seconds="$1"
    awk -v value="$seconds" 'BEGIN { printf "%.1f", value * 1000 }'
}

printf "# HTTP Performance Snapshot\n\n" > "$REPORT_FILE"
printf "Base URL: \`%s\`\n\n" "$BASE_URL" >> "$REPORT_FILE"
printf "Iterations per endpoint: \`%s\`\n\n" "$ITERATIONS" >> "$REPORT_FILE"
printf "| Endpoint | HTTP | Cold (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Avg (ms) | Avg TTFB (ms) | Avg bytes |\n" >> "$REPORT_FILE"
printf "|---|---:|---:|---:|---:|---:|---:|---:|---:|\n" >> "$REPORT_FILE"

printf "endpoint\tpath\titeration\ttime_total\ttime_starttransfer\tsize_download\thttp_code\n" > "$RAW_FILE"

for endpoint_item in "${ENDPOINTS[@]}"; do
    endpoint_name="${endpoint_item%%|*}"
    endpoint_path="${endpoint_item#*|}"

    endpoint_dir="$TEMP_DIR/$endpoint_name"
    mkdir -p "$endpoint_dir"
    times_file="$endpoint_dir/times.txt"
    ttfb_file="$endpoint_dir/ttfb.txt"
    bytes_file="$endpoint_dir/bytes.txt"

    cold_result="$(request_once "$endpoint_path")"
    read -r cold_total cold_ttfb cold_bytes cold_http <<< "$cold_result"
    printf "%s\t%s\tcold\t%s\t%s\t%s\t%s\n" "$endpoint_name" "$endpoint_path" "$cold_total" "$cold_ttfb" "$cold_bytes" "$cold_http" >> "$RAW_FILE"

    for iteration in $(seq 1 "$ITERATIONS"); do
        result="$(request_once "$endpoint_path")"
        read -r time_total time_ttfb size_download http_code <<< "$result"
        printf "%s\n" "$time_total" >> "$times_file"
        printf "%s\n" "$time_ttfb" >> "$ttfb_file"
        printf "%s\n" "$size_download" >> "$bytes_file"
        printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "$endpoint_name" "$endpoint_path" "$iteration" "$time_total" "$time_ttfb" "$size_download" "$http_code" >> "$RAW_FILE"
    done

    p50_seconds="$(percentile "$times_file" 50)"
    p95_seconds="$(percentile "$times_file" 95)"
    p99_seconds="$(percentile "$times_file" 99)"
    avg_seconds="$(average "$times_file")"
    avg_ttfb_seconds="$(average "$ttfb_file")"
    avg_bytes="$(average "$bytes_file")"

    cold_ms="$(to_ms "$cold_total")"
    p50_ms="$(to_ms "$p50_seconds")"
    p95_ms="$(to_ms "$p95_seconds")"
    p99_ms="$(to_ms "$p99_seconds")"
    avg_ms="$(to_ms "$avg_seconds")"
    avg_ttfb_ms="$(to_ms "$avg_ttfb_seconds")"

    avg_bytes_rounded="$(awk -v value="$avg_bytes" 'BEGIN { printf "%.0f", value }')"

    printf "| %s | %s | %s | %s | %s | %s | %s | %s | %s |\n" \
        "$endpoint_name" \
        "$cold_http" \
        "$cold_ms" \
        "$p50_ms" \
        "$p95_ms" \
        "$p99_ms" \
        "$avg_ms" \
        "$avg_ttfb_ms" \
        "$avg_bytes_rounded" >> "$REPORT_FILE"
done

printf "\nRaw samples: \`%s\`\n" "$RAW_FILE" >> "$REPORT_FILE"

echo "HTTP metrics report: $REPORT_FILE"
echo "HTTP raw samples: $RAW_FILE"
