#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:5080}"
SOURCE_ROW_LIMIT="${SOURCE_ROW_LIMIT:-5}"
SEED_AMBIGUOUS_BATCH="${SEED_AMBIGUOUS_BATCH:-true}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

MAPPINGS_FILE="${MAPPINGS_FILE:-${REPO_ROOT}/sample-data/discipline-mappings-20260423.json}"
SELECTED_ROWS_FILE="${SELECTED_ROWS_FILE:-${REPO_ROOT}/sample-data/express-source-data-20260423-selected-disciplines.rows.json}"
RAW_ROWS_FILE="${RAW_ROWS_FILE:-${REPO_ROOT}/sample-data/express-source-data-20260423-raw-resource.rows.json}"
TECHNICAL_ASSIGNMENT_FILE="${TECHNICAL_ASSIGNMENT_FILE:-${REPO_ROOT}/sample-data/technical-assignment-placeholder.txt}"

SOURCE_BATCH_FILE_NAME="${SOURCE_BATCH_FILE_NAME:-20260423-Модуль. Субподрядчик.xlsx}"
RAW_BATCH_FILE_NAME="${RAW_BATCH_FILE_NAME:-20260423-Модуль. Субподрядчик.raw-resource.xlsx}"
REQUEST_SEARCH_TOKEN="${REQUEST_SEARCH_TOKEN:-EXPRESS-20260423}"
REQUEST_TITLE="${REQUEST_TITLE:-${REQUEST_SEARCH_TOKEN}: заявка на закупку по выбранным работам}"

require_cmd() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is missing: ${command_name}" >&2
    exit 1
  fi
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Required file is missing: ${path}" >&2
    exit 1
  fi
}

api_get() {
  local path="$1"
  curl -fsS "${API_BASE_URL}${path}"
}

api_post_json() {
  local path="$1"
  local payload="$2"
  curl -fsS -X POST "${API_BASE_URL}${path}" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

api_put_json() {
  local path="$1"
  local payload="$2"
  curl -fsS -X PUT "${API_BASE_URL}${path}" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

ensure_api_available() {
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/health")"
  if [[ "$code" != "200" ]]; then
    echo "API is not ready at ${API_BASE_URL} (health status: ${code})." >&2
    exit 1
  fi
}

batch_id_by_file_name() {
  local file_name="$1"
  api_get "/api/imports/source-data/batches" |
    jq -r --arg fileName "$file_name" '.[] | select(.fileName == $fileName) | .id' |
    head -n1
}

ensure_batch_from_rows_file() {
  local file_name="$1"
  local notes="$2"
  local rows_file="$3"

  local existing_id
  existing_id="$(batch_id_by_file_name "$file_name")"
  if [[ -n "$existing_id" ]]; then
    echo "$existing_id"
    return 0
  fi

  local payload
  payload="$(jq -n \
    --arg fileName "$file_name" \
    --arg notes "$notes" \
    --slurpfile rows "$rows_file" \
    '{ fileName: $fileName, notes: $notes, rows: $rows[0] }')"

  api_post_json "/api/imports/source-data/batches" "$payload" >/dev/null
  batch_id_by_file_name "$file_name"
}

seed_discipline_mappings() {
  local payload
  payload="$(jq -n --slurpfile items "$MAPPINGS_FILE" '{ items: $items[0] }')"
  api_put_json "/api/imports/discipline-mappings" "$payload" >/dev/null
}

existing_procedure_id() {
  api_get "/api/procedures?search=${REQUEST_SEARCH_TOKEN}" |
    jq -r '.[0].id // empty'
}

upload_technical_assignment() {
  curl -fsS -X POST "${API_BASE_URL}/api/files" \
    -F "file=@${TECHNICAL_ASSIGNMENT_FILE};type=text/plain" |
    jq -r '.id'
}

create_procurement_request() {
  local batch_id="$1"
  local existing_id
  existing_id="$(existing_procedure_id)"
  if [[ -n "$existing_id" ]]; then
    echo "$existing_id"
    return 0
  fi

  local details
  details="$(api_get "/api/imports/source-data/batches/${batch_id}")"

  local selected_row_ids
  selected_row_ids="$(jq --argjson limit "$SOURCE_ROW_LIMIT" '[.rows[] | select(.isValid == true) | .id][0:$limit]' <<<"$details")"
  if [[ "$(jq 'length' <<<"$selected_row_ids")" == "0" ]]; then
    echo "No valid source rows found in batch ${batch_id}." >&2
    exit 1
  fi

  local technical_assignment_file_id
  technical_assignment_file_id="$(upload_technical_assignment)"

  local payload
  payload="$(jq -n \
    --argjson sourceDataRowIds "$selected_row_ids" \
    --arg technicalAssignmentFileId "$technical_assignment_file_id" \
    --arg requestTitle "$REQUEST_TITLE" \
    --arg lotCode "LOT-${REQUEST_SEARCH_TOKEN}" \
    --arg lotName "${REQUEST_SEARCH_TOKEN}: работы из реестра Экспресс" \
    '{
      sourceDataRowIds: $sourceDataRowIds,
      technicalAssignmentFileId: $technicalAssignmentFileId,
      purchaseTypeCode: "SUBCONTRACT",
      requestTitle: $requestTitle,
      lotCode: $lotCode,
      lotName: $lotName,
      workScope: "Работы выбраны из импортированного реестра Экспресс; ТЗ приложено к заявке.",
      customerName: "НЛМК",
      leadOfficeCode: "KDO",
      approvalMode: "Internal",
      containsConfidentialInfo: false,
      requiresTechnicalNegotiations: true
    }')"

  api_post_json "/api/procedures/from-source-data" "$payload" |
    jq -r '.procedureId'
}

main() {
  require_cmd curl
  require_cmd jq
  require_file "$MAPPINGS_FILE"
  require_file "$SELECTED_ROWS_FILE"
  require_file "$RAW_ROWS_FILE"
  require_file "$TECHNICAL_ASSIGNMENT_FILE"
  ensure_api_available

  echo "Seeding discipline mappings from ${MAPPINGS_FILE}..."
  seed_discipline_mappings

  echo "Seeding selected Express source-data batch from ${SELECTED_ROWS_FILE}..."
  local selected_batch_id
  selected_batch_id="$(ensure_batch_from_rows_file \
    "$SOURCE_BATCH_FILE_NAME" \
    "Данные из 20260423-Модуль. Субподрядчик.xlsx с выбранными проектными дисциплинами." \
    "$SELECTED_ROWS_FILE")"
  local selected_batch_summary
  selected_batch_summary="$(api_get "/api/imports/source-data/batches/${selected_batch_id}" |
    jq -r '"status=\(.status), totalRows=\(.totalRows), validRows=\(.validRows), invalidRows=\(.invalidRows)"')"
  echo "Selected batch summary: ${selected_batch_summary}"

  if [[ "$SEED_AMBIGUOUS_BATCH" == "true" ]]; then
    echo "Seeding raw Express source-data batch for ambiguous discipline checks..."
    local raw_batch_id
    raw_batch_id="$(ensure_batch_from_rows_file \
      "$RAW_BATCH_FILE_NAME" \
      "Raw-строки из листа данных Экспресс без выбора проектной дисциплины." \
      "$RAW_ROWS_FILE")"
    local raw_batch_summary
    raw_batch_summary="$(api_get "/api/imports/source-data/batches/${raw_batch_id}" |
      jq -r '"status=\(.status), totalRows=\(.totalRows), validRows=\(.validRows), invalidRows=\(.invalidRows)"')"
    echo "Raw batch summary: ${raw_batch_summary}"
  fi

  echo "Creating procurement request from the first ${SOURCE_ROW_LIMIT} valid source rows..."
  local procedure_id
  procedure_id="$(create_procurement_request "$selected_batch_id")"

  echo "Express seed completed."
  echo "API base: ${API_BASE_URL}"
  echo "Source batch: ${selected_batch_id}"
  echo "Procedure: ${procedure_id}"
}

main "$@"
