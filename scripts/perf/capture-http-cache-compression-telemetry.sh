#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:5080}"
OUT_DIR="${2:-artifacts/perf}"
ITERATIONS="${PERF_TELEMETRY_ITERATIONS:-6}"
AUTH_HEADER="${PERF_TELEMETRY_AUTH_HEADER:-}"
EXTRA_HEADER="${PERF_TELEMETRY_EXTRA_HEADER:-}"

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required." >&2
    exit 1
fi

if ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || (( ITERATIONS < 1 )); then
    echo "PERF_TELEMETRY_ITERATIONS must be a positive integer." >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RAW_FILE="$OUT_DIR/http-cache-compression-telemetry-$TIMESTAMP.tsv"
REPORT_FILE="$OUT_DIR/http-cache-compression-telemetry-$TIMESTAMP.md"
LATEST_RAW_FILE="$OUT_DIR/http-cache-compression-telemetry-latest.tsv"
LATEST_REPORT_FILE="$OUT_DIR/http-cache-compression-telemetry-latest.md"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

curl_extra_args=()
if [[ -n "$AUTH_HEADER" ]]; then
    curl_extra_args+=(-H "$AUTH_HEADER")
fi
if [[ -n "$EXTRA_HEADER" ]]; then
    curl_extra_args+=(-H "$EXTRA_HEADER")
fi

ENDPOINTS=(
    "health-api|/api/health|yes"
    "home-page|/|no"
    "dashboard-summary-api|/api/dashboard/summary|no"
    "analytics-kpi-api|/api/analytics/kpi|yes"
    "analytics-views-api|/api/analytics/views|yes"
    "admin-roles-api|/api/admin/roles|yes"
    "reference-data-lot-status-api|/api/reference-data/lot-status/items?activeOnly=true|yes"
)

extract_header() {
    local name="$1"
    local file_path="$2"
    local name_lower
    name_lower="$(printf "%s" "$name" | tr '[:upper:]' '[:lower:]')"

    awk -v header_name="$name_lower" '
        {
            line = $0
            sub(/\r$/, "", line)
            separator_index = index(line, ":")
            if (separator_index <= 0) {
                next
            }
            key = tolower(substr(line, 1, separator_index - 1))
            if (key == header_name) {
                value = substr(line, separator_index + 1)
                sub(/^[[:space:]]+/, "", value)
                print value
                exit
            }
        }
    ' "$file_path"
}

is_positive_integer() {
    local value="$1"
    [[ "$value" =~ ^[0-9]+$ ]] && (( value > 0 ))
}

to_ms() {
    local seconds="$1"
    awk -v value="$seconds" 'BEGIN { printf "%.1f", value * 1000 }'
}

to_percent() {
    local numerator="$1"
    local denominator="$2"
    awk -v n="$numerator" -v d="$denominator" '
        BEGIN {
            if (d == 0) {
                printf "0.0"
                exit
            }
            printf "%.1f", (n / d) * 100
        }
    '
}

compression_delta_percent() {
    local compressed_bytes="$1"
    local identity_bytes="$2"
    awk -v compressed="$compressed_bytes" -v identity="$identity_bytes" '
        BEGIN {
            if (identity <= 0) {
                printf "n/a"
                exit
            }
            printf "%.1f", ((1 - (compressed / identity)) * 100)
        }
    '
}

request_probe() {
    local path="$1"
    local accept_encoding="$2"
    local headers_file="$3"
    local response

    if (( ${#curl_extra_args[@]} > 0 )); then
        response="$(
            curl -sS \
                -D "$headers_file" \
                -o /dev/null \
                -w '%{size_download} %{time_total} %{http_code}' \
                "${curl_extra_args[@]}" \
                -H "Accept-Encoding: ${accept_encoding}" \
                "$BASE_URL$path"
        )"
    else
        response="$(
            curl -sS \
                -D "$headers_file" \
                -o /dev/null \
                -w '%{size_download} %{time_total} %{http_code}' \
                -H "Accept-Encoding: ${accept_encoding}" \
                "$BASE_URL$path"
        )"
    fi

    printf "%s\n" "$response"
}

printf "endpoint\tpath\tprobe\tstatus\ttime_total\tsize_download\tcontent_encoding\tcache_control\tvary\tage\texpected_cache\n" > "$RAW_FILE"

printf "# HTTP Cache and Compression Telemetry\n\n" > "$REPORT_FILE"
printf "Base URL: \`%s\`\n\n" "$BASE_URL" >> "$REPORT_FILE"
printf "Iterations per endpoint: \`%s\`\n\n" "$ITERATIONS" >> "$REPORT_FILE"
if [[ -n "$AUTH_HEADER" ]]; then
    printf "Auth header: configured\n\n" >> "$REPORT_FILE"
fi
printf "| Endpoint | Expected cache | Status | Content-Encoding | Cache-Control | Vary | Age header ratio | Warm-hit ratio (Age>0) | Compressed responses | Avg compressed bytes | Identity bytes | Compression delta %% | Avg time (ms) |\n" >> "$REPORT_FILE"
printf "|---|---|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|\n" >> "$REPORT_FILE"

for endpoint_item in "${ENDPOINTS[@]}"; do
    endpoint_name="${endpoint_item%%|*}"
    endpoint_rest="${endpoint_item#*|}"
    endpoint_path="${endpoint_rest%%|*}"
    endpoint_expected_cache="${endpoint_rest##*|}"

    endpoint_dir="$TEMP_DIR/$endpoint_name"
    mkdir -p "$endpoint_dir"

    total_size=0
    total_time_seconds="0"
    compressed_count=0
    age_header_count=0
    warm_hit_count=0

    first_status="n/a"
    first_content_encoding="-"
    first_cache_control="-"
    first_vary="-"

    for iteration in $(seq 1 "$ITERATIONS"); do
        headers_file="$endpoint_dir/headers-$iteration.txt"
        probe_result="$(request_probe "$endpoint_path" "gzip, br" "$headers_file")"
        read -r size_download time_total status_code <<< "$probe_result"

        content_encoding="$(extract_header "Content-Encoding" "$headers_file")"
        cache_control="$(extract_header "Cache-Control" "$headers_file")"
        vary_header="$(extract_header "Vary" "$headers_file")"
        age_header="$(extract_header "Age" "$headers_file")"

        if (( iteration == 1 )); then
            first_status="$status_code"
            if [[ -n "$content_encoding" ]]; then
                first_content_encoding="$content_encoding"
            fi
            if [[ -n "$cache_control" ]]; then
                first_cache_control="$cache_control"
            fi
            if [[ -n "$vary_header" ]]; then
                first_vary="$vary_header"
            fi
        fi

        if [[ -n "$content_encoding" ]]; then
            compressed_count=$((compressed_count + 1))
        fi

        if [[ -n "$age_header" ]]; then
            age_header_count=$((age_header_count + 1))
            if is_positive_integer "$age_header"; then
                warm_hit_count=$((warm_hit_count + 1))
            fi
        fi

        total_size=$((total_size + size_download))
        total_time_seconds="$(awk -v sum="$total_time_seconds" -v value="$time_total" 'BEGIN { printf "%.6f", sum + value }')"

        printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
            "$endpoint_name" \
            "$endpoint_path" \
            "$iteration" \
            "$status_code" \
            "$time_total" \
            "$size_download" \
            "${content_encoding:--}" \
            "${cache_control:--}" \
            "${vary_header:--}" \
            "${age_header:--}" \
            "$endpoint_expected_cache" >> "$RAW_FILE"
    done

    identity_headers_file="$endpoint_dir/headers-identity.txt"
    identity_result="$(request_probe "$endpoint_path" "identity" "$identity_headers_file")"
    read -r identity_size_download identity_time_total identity_status_code <<< "$identity_result"

    identity_cache_control="$(extract_header "Cache-Control" "$identity_headers_file")"
    identity_vary_header="$(extract_header "Vary" "$identity_headers_file")"
    identity_age_header="$(extract_header "Age" "$identity_headers_file")"

    printf "%s\t%s\tidentity\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
        "$endpoint_name" \
        "$endpoint_path" \
        "$identity_status_code" \
        "$identity_time_total" \
        "$identity_size_download" \
        "-" \
        "${identity_cache_control:--}" \
        "${identity_vary_header:--}" \
        "${identity_age_header:--}" \
        "$endpoint_expected_cache" >> "$RAW_FILE"

    avg_compressed_bytes="$(awk -v sum="$total_size" -v count="$ITERATIONS" 'BEGIN { if (count == 0) { print 0 } else { printf "%.0f", sum / count } }')"
    avg_time_seconds="$(awk -v sum="$total_time_seconds" -v count="$ITERATIONS" 'BEGIN { if (count == 0) { printf "0" } else { printf "%.6f", sum / count } }')"
    avg_time_ms="$(to_ms "$avg_time_seconds")"
    age_header_ratio="$(to_percent "$age_header_count" "$ITERATIONS")"
    warm_hit_ratio="$(to_percent "$warm_hit_count" "$ITERATIONS")"
    compressed_ratio="$(to_percent "$compressed_count" "$ITERATIONS")"
    compression_delta="$(compression_delta_percent "$avg_compressed_bytes" "$identity_size_download")"
    compression_delta_display="$compression_delta"
    if [[ "$compression_delta" != "n/a" ]]; then
        compression_delta_display="${compression_delta}%"
    fi

    printf "| %s | %s | %s | %s | %s | %s | %s%% | %s%% | %s%% | %s | %s | %s | %s |\n" \
        "$endpoint_name" \
        "$endpoint_expected_cache" \
        "$first_status" \
        "$first_content_encoding" \
        "$first_cache_control" \
        "$first_vary" \
        "$age_header_ratio" \
        "$warm_hit_ratio" \
        "$compressed_ratio" \
        "$avg_compressed_bytes" \
        "$identity_size_download" \
        "$compression_delta_display" \
        "$avg_time_ms" >> "$REPORT_FILE"
done

cp "$RAW_FILE" "$LATEST_RAW_FILE"
cp "$REPORT_FILE" "$LATEST_REPORT_FILE"

printf "\nRaw samples: \`%s\`\n" "$RAW_FILE" >> "$REPORT_FILE"
printf "Latest report alias: \`%s\`\n" "$LATEST_REPORT_FILE" >> "$REPORT_FILE"

echo "Telemetry report: $REPORT_FILE"
echo "Telemetry raw samples: $RAW_FILE"
echo "Telemetry latest report: $LATEST_REPORT_FILE"
