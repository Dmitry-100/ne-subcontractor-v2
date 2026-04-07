#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:5080}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-2}"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-30}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command is missing: $cmd" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq

api_get() {
  local path="$1"
  curl -fsS "${API_BASE_URL}${path}"
}

api_post() {
  local path="$1"
  local payload="$2"
  curl -fsS -X POST "${API_BASE_URL}${path}" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

api_post_empty() {
  local path="$1"
  curl -fsS -X POST "${API_BASE_URL}${path}"
}

api_put() {
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

iso_date() {
  local offset="${1:-0}"
  if date -u -v+0d +%F >/dev/null 2>&1; then
    local token
    if (( offset >= 0 )); then
      token="+${offset}d"
    else
      token="${offset}d"
    fi

    date -u -v"${token}" +%F
    return
  fi

  date -u -d "${offset} days" +%F
}

wait_for_value() {
  local description="$1"
  local command="$2"
  local expected="$3"
  local actual=""
  local attempt

  for (( attempt = 1; attempt <= POLL_ATTEMPTS; attempt++ )); do
    actual="$(eval "$command")"
    if [[ "$actual" == "$expected" ]]; then
      return 0
    fi

    sleep "$POLL_INTERVAL_SECONDS"
  done

  echo "Timed out while waiting for ${description}. Expected '${expected}', got '${actual}'." >&2
  exit 1
}

refresh_projects() {
  PROJECTS_JSON="$(api_get "/api/projects")"
}

refresh_contractors() {
  CONTRACTORS_JSON="$(api_get "/api/contractors")"
}

refresh_lots() {
  LOTS_JSON="$(api_get "/api/lots")"
}

refresh_procedures() {
  PROCEDURES_JSON="$(api_get "/api/procedures")"
}

refresh_contracts() {
  CONTRACTS_JSON="$(api_get "/api/contracts")"
}

refresh_batches() {
  BATCHES_JSON="$(api_get "/api/imports/source-data/batches")"
}

refresh_xml_inbox() {
  XML_INBOX_JSON="$(api_get "/api/imports/source-data/xml/inbox")"
}

refresh_sla_violations() {
  SLA_VIOLATIONS_JSON="$(api_get "/api/sla/violations?includeResolved=false")"
}

project_id_by_code() {
  jq -r --arg code "$1" '.[] | select(.code == $code) | .id' <<<"$PROJECTS_JSON" | head -n1
}

contractor_id_by_inn() {
  jq -r --arg inn "$1" '.[] | select(.inn == $inn) | .id' <<<"$CONTRACTORS_JSON" | head -n1
}

lot_id_by_code() {
  jq -r --arg code "$1" '.[] | select(.code == $code) | .id' <<<"$LOTS_JSON" | head -n1
}

lot_status_by_id() {
  jq -r --arg id "$1" '.[] | select(.id == $id) | .status' <<<"$LOTS_JSON" | head -n1
}

procedure_id_by_lot() {
  jq -r --arg lotId "$1" '.[] | select(.lotId == $lotId) | .id' <<<"$PROCEDURES_JSON" | head -n1
}

procedure_status_by_id() {
  jq -r --arg id "$1" '.[] | select(.id == $id) | .status' <<<"$PROCEDURES_JSON" | head -n1
}

contract_id_by_procedure() {
  jq -r --arg procedureId "$1" '.[] | select(.procedureId == $procedureId) | .id' <<<"$CONTRACTS_JSON" | head -n1
}

contract_status_by_id() {
  jq -r --arg id "$1" '.[] | select(.id == $id) | .status' <<<"$CONTRACTS_JSON" | head -n1
}

batch_id_by_file_name() {
  jq -r --arg fileName "$1" '.[] | select(.fileName == $fileName) | .id' <<<"$BATCHES_JSON" | head -n1
}

batch_status_by_id() {
  jq -r --arg id "$1" '.[] | select(.id == $id) | .status' <<<"$BATCHES_JSON" | head -n1
}

xml_item_id_by_file_name() {
  jq -r --arg fileName "$1" '.[] | select(.fileName == $fileName) | .id' <<<"$XML_INBOX_JSON" | head -n1
}

xml_item_status_by_file_name() {
  jq -r --arg fileName "$1" '.[] | select(.fileName == $fileName) | .status' <<<"$XML_INBOX_JSON" | head -n1
}

xml_item_batch_id_by_file_name() {
  jq -r --arg fileName "$1" '.[] | select(.fileName == $fileName) | .sourceDataImportBatchId' <<<"$XML_INBOX_JSON" | head -n1
}

lot_status_rank() {
  case "$1" in
    Draft) echo 1 ;;
    InProcurement) echo 2 ;;
    ContractorSelected) echo 3 ;;
    Contracted) echo 4 ;;
    InExecution) echo 5 ;;
    Closed) echo 6 ;;
    *) echo 0 ;;
  esac
}

contract_status_rank() {
  case "$1" in
    Draft) echo 1 ;;
    OnApproval) echo 2 ;;
    Signed) echo 3 ;;
    Active) echo 4 ;;
    Closed) echo 5 ;;
    *) echo 0 ;;
  esac
}

next_lot_status() {
  case "$1" in
    Draft) echo "InProcurement" ;;
    InProcurement) echo "ContractorSelected" ;;
    ContractorSelected) echo "Contracted" ;;
    Contracted) echo "InExecution" ;;
    InExecution) echo "Closed" ;;
    *) echo "" ;;
  esac
}

next_contract_status() {
  case "$1" in
    Draft) echo "OnApproval" ;;
    OnApproval) echo "Signed" ;;
    Signed) echo "Active" ;;
    Active) echo "Closed" ;;
    *) echo "" ;;
  esac
}

resolve_demo_user() {
  local users_json
  users_json="$(api_get "/api/admin/users")"
  DEMO_USER_ID="$(jq -r 'map(select(.login == "local.admin"))[0].id // .[0].id // empty' <<<"$users_json")"
  DEMO_USER_EMAIL="$(jq -r 'map(select(.login == "local.admin"))[0].email // .[0].email // empty' <<<"$users_json")"
}

ensure_reference_item() {
  local type_code="$1"
  local item_code="$2"
  local display_name="$3"
  local sort_order="$4"

  api_put "/api/reference-data/${type_code}/items" "$(jq -nc \
    --arg itemCode "$item_code" \
    --arg displayName "$display_name" \
    --argjson sortOrder "$sort_order" \
    '{
      itemCode: $itemCode,
      displayName: $displayName,
      sortOrder: $sortOrder,
      isActive: true
    }')" >/dev/null
}

ensure_project() {
  local code="$1"
  local name="$2"

  refresh_projects
  if [[ -n "$(project_id_by_code "$code")" ]]; then
    return 0
  fi

  api_post "/api/projects" "$(jq -nc \
    --arg code "$code" \
    --arg name "$name" \
    '{
      code: $code,
      name: $name,
      gipUserId: null
    }')" >/dev/null
}

ensure_contractor() {
  local inn="$1"
  local name="$2"
  local city="$3"
  local contact_name="$4"
  local phone="$5"
  local email="$6"
  local capacity_hours="$7"
  local current_rating="$8"
  local current_load_percent="$9"
  local manual_support="${10}"
  local reliability_class="${11}"
  local status="${12}"
  local disciplines_json="${13}"

  refresh_contractors
  if [[ -n "$(contractor_id_by_inn "$inn")" ]]; then
    return 0
  fi

  api_post "/api/contractors" "$(jq -nc \
    --arg inn "$inn" \
    --arg name "$name" \
    --arg city "$city" \
    --arg contactName "$contact_name" \
    --arg phone "$phone" \
    --arg email "$email" \
    --arg reliabilityClass "$reliability_class" \
    --arg status "$status" \
    --argjson capacityHours "$capacity_hours" \
    --argjson currentRating "$current_rating" \
    --argjson currentLoadPercent "$current_load_percent" \
    --argjson manualSupportCoefficient "$manual_support" \
    --argjson disciplineCodes "$disciplines_json" \
    '{
      inn: $inn,
      name: $name,
      city: $city,
      contactName: $contactName,
      phone: $phone,
      email: $email,
      capacityHours: $capacityHours,
      currentRating: $currentRating,
      currentLoadPercent: $currentLoadPercent,
      manualSupportCoefficient: $manualSupportCoefficient,
      reliabilityClass: $reliabilityClass,
      status: $status,
      disciplineCodes: $disciplineCodes
    }')" >/dev/null
}

ensure_lot() {
  local code="$1"
  local name="$2"
  local items_json="$3"

  refresh_lots
  local lot_id
  lot_id="$(lot_id_by_code "$code")"
  if [[ -n "$lot_id" ]]; then
    echo "$lot_id"
    return 0
  fi

  api_post "/api/lots" "$(jq -nc \
    --arg code "$code" \
    --arg name "$name" \
    --arg userId "${DEMO_USER_ID:-}" \
    --argjson items "$items_json" \
    '{
      code: $code,
      name: $name,
      responsibleCommercialUserId: (if $userId == "" then null else $userId end),
      items: $items
    }')" >/dev/null

  refresh_lots
  lot_id="$(lot_id_by_code "$code")"
  if [[ -z "$lot_id" ]]; then
    echo "Failed to resolve lot '${code}'." >&2
    exit 1
  fi

  echo "$lot_id"
}

ensure_lot_status() {
  local lot_id="$1"
  local target_status="$2"

  while true; do
    refresh_lots
    local current_status
    current_status="$(lot_status_by_id "$lot_id")"
    if [[ -z "$current_status" ]]; then
      echo "Lot '${lot_id}' was not found while applying status '${target_status}'." >&2
      exit 1
    fi

    if [[ "$current_status" == "$target_status" ]]; then
      return 0
    fi

    if (( "$(lot_status_rank "$current_status")" > "$(lot_status_rank "$target_status")" )); then
      echo "Lot '${lot_id}' is already in later status '${current_status}', skipping downgrade to '${target_status}'." >&2
      return 0
    fi

    local next_status
    next_status="$(next_lot_status "$current_status")"
    if [[ -z "$next_status" ]]; then
      echo "Cannot move lot '${lot_id}' from '${current_status}' to '${target_status}'." >&2
      exit 1
    fi

    api_post "/api/lots/${lot_id}/transition" "$(jq -nc \
      --arg targetStatus "$next_status" \
      '{ targetStatus: $targetStatus, reason: "" }')" >/dev/null
  done
}

ensure_procedure() {
  local lot_id="$1"
  local purchase_type="$2"
  local object_name="$3"
  local work_scope="$4"
  local proposal_due_date="$5"
  local subcontract_deadline="$6"
  local planned_budget="$7"
  local notes="$8"

  refresh_procedures
  local procedure_id
  procedure_id="$(procedure_id_by_lot "$lot_id")"
  if [[ -n "$procedure_id" ]]; then
    echo "$procedure_id"
    return 0
  fi

  api_post "/api/procedures" "$(jq -nc \
    --arg lotId "$lot_id" \
    --arg purchaseTypeCode "$purchase_type" \
    --arg objectName "$object_name" \
    --arg workScope "$work_scope" \
    --arg proposalDueDate "$proposal_due_date" \
    --arg requiredSubcontractorDeadline "$subcontract_deadline" \
    --arg userId "${DEMO_USER_ID:-}" \
    --arg notes "$notes" \
    --arg requestDate "$DAY_MINUS_20" \
    --arg customerContractDate "$DAY_MINUS_10" \
    --argjson plannedBudgetWithoutVat "$planned_budget" \
    '{
      lotId: $lotId,
      requestDate: $requestDate,
      purchaseTypeCode: $purchaseTypeCode,
      initiatorUserId: (if $userId == "" then null else $userId end),
      responsibleCommercialUserId: (if $userId == "" then null else $userId end),
      objectName: $objectName,
      workScope: $workScope,
      customerName: "НЭ Инжиниринг",
      leadOfficeCode: "MSK",
      analyticsLevel1Code: "DEMO",
      analyticsLevel2Code: "SCENARIO",
      analyticsLevel3Code: "PROC",
      analyticsLevel4Code: "V2",
      analyticsLevel5Code: "SEED",
      customerContractNumber: "CN-DEMO-2026",
      customerContractDate: $customerContractDate,
      requiredSubcontractorDeadline: $requiredSubcontractorDeadline,
      proposalDueDate: $proposalDueDate,
      plannedBudgetWithoutVat: $plannedBudgetWithoutVat,
      notes: $notes,
      approvalMode: "InSystem",
      approvalRouteCode: "ROUTE-DEMO",
      containsConfidentialInfo: false,
      requiresTechnicalNegotiations: true,
      attachmentFileIds: []
    }')" >/dev/null

  refresh_procedures
  procedure_id="$(procedure_id_by_lot "$lot_id")"
  if [[ -z "$procedure_id" ]]; then
    echo "Failed to resolve procedure for lot '${lot_id}'." >&2
    exit 1
  fi

  echo "$procedure_id"
}

configure_procedure_approval_steps() {
  local procedure_id="$1"

  api_put "/api/procedures/${procedure_id}/approval/steps" "$(jq -nc \
    --arg userId "${DEMO_USER_ID:-}" \
    '{
      steps: [
        {
          stepOrder: 1,
          stepTitle: "Коммерческий контроль",
          approverUserId: (if $userId == "" then null else $userId end),
          approverRoleName: "Commercial",
          isRequired: true
        },
        {
          stepOrder: 2,
          stepTitle: "Тендерная комиссия",
          approverUserId: (if $userId == "" then null else $userId end),
          approverRoleName: "TenderCommission",
          isRequired: true
        }
      ]
    }')" >/dev/null
}

transition_procedure() {
  local procedure_id="$1"
  local target_status="$2"
  local reason="${3:-}"

  api_post "/api/procedures/${procedure_id}/transition" "$(jq -nc \
    --arg targetStatus "$target_status" \
    --arg reason "$reason" \
    '{
      targetStatus: $targetStatus,
      reason: $reason
    }')" >/dev/null
}

ensure_procedure_documents_preparation() {
  local procedure_id="$1"

  refresh_procedures
  local status
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "Created" ]]; then
    transition_procedure "$procedure_id" "DocumentsPreparation"
  fi
}

ensure_procedure_on_approval() {
  local procedure_id="$1"

  refresh_procedures
  local status
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "Sent" || "$status" == "OffersReceived" || "$status" == "Retender" || "$status" == "DecisionMade" || "$status" == "Completed" || "$status" == "Canceled" ]]; then
    return 0
  fi

  ensure_procedure_documents_preparation "$procedure_id"
  refresh_procedures
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "DocumentsPreparation" || "$status" == "OnApproval" ]]; then
    configure_procedure_approval_steps "$procedure_id"
  fi

  refresh_procedures
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "DocumentsPreparation" ]]; then
    transition_procedure "$procedure_id" "OnApproval"
  fi
}

ensure_procedure_sent() {
  local procedure_id="$1"

  ensure_procedure_on_approval "$procedure_id"

  refresh_procedures
  local status
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "OnApproval" ]]; then
    transition_procedure "$procedure_id" "Sent"
  fi
}

ensure_procedure_canceled() {
  local procedure_id="$1"

  refresh_procedures
  local status
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "Canceled" ]]; then
    return 0
  fi

  if [[ "$status" == "Created" ]]; then
    transition_procedure "$procedure_id" "Canceled" "Отмена сценария для демонстрации"
  fi
}

ensure_shortlist_with_adjustments() {
  local procedure_id="$1"

  local shortlist_json
  shortlist_json="$(api_get "/api/procedures/${procedure_id}/shortlist")"
  if [[ "$(jq 'length' <<<"$shortlist_json")" == "0" ]]; then
    api_put "/api/procedures/${procedure_id}/shortlist" "$(jq -nc \
      --arg contractorA "$CONTRACTOR_A_ID" \
      --arg contractorB "$CONTRACTOR_B_ID" \
      --arg contractorC "$CONTRACTOR_C_ID" \
      '{
        adjustmentReason: "Первичное формирование shortlist для демонстрации",
        items: [
          {
            contractorId: $contractorA,
            isIncluded: true,
            sortOrder: 0,
            exclusionReason: null,
            notes: "Профильный подрядчик по трубопроводам"
          },
          {
            contractorId: $contractorC,
            isIncluded: true,
            sortOrder: 1,
            exclusionReason: null,
            notes: "Резервный подрядчик"
          },
          {
            contractorId: $contractorB,
            isIncluded: false,
            sortOrder: 2,
            exclusionReason: "Недостаточное соответствие дисциплинам",
            notes: "Оставлен в аналитике shortlist"
          }
        ]
      }')" >/dev/null
  fi

  local adjustments_json
  adjustments_json="$(api_get "/api/procedures/${procedure_id}/shortlist/adjustments")"
  if [[ "$(jq 'length' <<<"$adjustments_json")" == "0" ]]; then
    api_put "/api/procedures/${procedure_id}/shortlist" "$(jq -nc \
      --arg contractorA "$CONTRACTOR_A_ID" \
      --arg contractorB "$CONTRACTOR_B_ID" \
      --arg contractorC "$CONTRACTOR_C_ID" \
      '{
        adjustmentReason: "Ручная корректировка shortlist для демонстрации журнала изменений",
        items: [
          {
            contractorId: $contractorA,
            isIncluded: true,
            sortOrder: 0,
            exclusionReason: null,
            notes: "Основной кандидат"
          },
          {
            contractorId: $contractorC,
            isIncluded: true,
            sortOrder: 1,
            exclusionReason: null,
            notes: "Резервный кандидат"
          },
          {
            contractorId: $contractorB,
            isIncluded: true,
            sortOrder: 2,
            exclusionReason: null,
            notes: "Добавлен по решению комиссии"
          }
        ]
      }')" >/dev/null
  fi
}

upsert_offers() {
  local procedure_id="$1"
  local variant="$2"

  local payload
  case "$variant" in
    piping_competition)
      payload="$(jq -nc \
        --arg contractorA "$CONTRACTOR_A_ID" \
        --arg contractorC "$CONTRACTOR_C_ID" \
        --arg receivedDate "$DAY_MINUS_1" \
        '{
          items: [
            {
              contractorId: $contractorA,
              offerNumber: "OF-DEMO-A-001",
              receivedDate: $receivedDate,
              amountWithoutVat: 980000.00,
              vatAmount: 196000.00,
              totalAmount: 1176000.00,
              durationDays: 55,
              currencyCode: "RUB",
              qualificationStatus: "Qualified",
              decisionStatus: "Shortlisted",
              offerFileId: null,
              notes: "Основное коммерческое предложение"
            },
            {
              contractorId: $contractorC,
              offerNumber: "OF-DEMO-C-001",
              receivedDate: $receivedDate,
              amountWithoutVat: 1030000.00,
              vatAmount: 206000.00,
              totalAmount: 1236000.00,
              durationDays: 63,
              currencyCode: "RUB",
              qualificationStatus: "Qualified",
              decisionStatus: "Shortlisted",
              offerFileId: null,
              notes: "Альтернативное предложение"
            }
          ]
        }')"
      ;;
    civil_retender)
      payload="$(jq -nc \
        --arg contractorB "$CONTRACTOR_B_ID" \
        --arg contractorC "$CONTRACTOR_C_ID" \
        --arg receivedDate "$DAY_MINUS_2" \
        '{
          items: [
            {
              contractorId: $contractorB,
              offerNumber: "OF-DEMO-B-RET-001",
              receivedDate: $receivedDate,
              amountWithoutVat: 870000.00,
              vatAmount: 174000.00,
              totalAmount: 1044000.00,
              durationDays: 47,
              currencyCode: "RUB",
              qualificationStatus: "ConditionallyQualified",
              decisionStatus: "Shortlisted",
              offerFileId: null,
              notes: "Предложение требует уточнений"
            },
            {
              contractorId: $contractorC,
              offerNumber: "OF-DEMO-C-RET-001",
              receivedDate: $receivedDate,
              amountWithoutVat: 910000.00,
              vatAmount: 182000.00,
              totalAmount: 1092000.00,
              durationDays: 52,
              currencyCode: "RUB",
              qualificationStatus: "Qualified",
              decisionStatus: "Shortlisted",
              offerFileId: null,
              notes: "Резервный претендент"
            }
          ]
        }')"
      ;;
    civil_competition)
      payload="$(jq -nc \
        --arg contractorB "$CONTRACTOR_B_ID" \
        --arg contractorC "$CONTRACTOR_C_ID" \
        --arg receivedDate "$DAY_MINUS_2" \
        '{
          items: [
            {
              contractorId: $contractorB,
              offerNumber: "OF-DEMO-B-001",
              receivedDate: $receivedDate,
              amountWithoutVat: 870000.00,
              vatAmount: 174000.00,
              totalAmount: 1044000.00,
              durationDays: 47,
              currencyCode: "RUB",
              qualificationStatus: "Qualified",
              decisionStatus: "Shortlisted",
              offerFileId: null,
              notes: "Базовое предложение по строительной части"
            },
            {
              contractorId: $contractorC,
              offerNumber: "OF-DEMO-C-002",
              receivedDate: $receivedDate,
              amountWithoutVat: 910000.00,
              vatAmount: 182000.00,
              totalAmount: 1092000.00,
              durationDays: 52,
              currencyCode: "RUB",
              qualificationStatus: "Qualified",
              decisionStatus: "Shortlisted",
              offerFileId: null,
              notes: "Альтернативное предложение"
            }
          ]
        }')"
      ;;
    *)
      echo "Unknown offer variant '${variant}'." >&2
      exit 1
      ;;
  esac

  api_put "/api/procedures/${procedure_id}/offers" "$payload" >/dev/null
}

upsert_winner_outcome() {
  local procedure_id="$1"
  local winner_contractor_id="$2"
  local comment="$3"

  api_put "/api/procedures/${procedure_id}/outcome" "$(jq -nc \
    --arg winnerContractorId "$winner_contractor_id" \
    --arg decisionDate "$TODAY" \
    --arg comment "$comment" \
    '{
      winnerContractorId: $winnerContractorId,
      decisionDate: $decisionDate,
      protocolFileId: null,
      isCanceled: false,
      cancellationReason: null,
      comment: $comment
    }')" >/dev/null
}

upsert_canceled_outcome() {
  local procedure_id="$1"
  local cancellation_reason="$2"

  api_put "/api/procedures/${procedure_id}/outcome" "$(jq -nc \
    --arg decisionDate "$TODAY" \
    --arg cancellationReason "$cancellation_reason" \
    '{
      winnerContractorId: null,
      decisionDate: $decisionDate,
      protocolFileId: null,
      isCanceled: true,
      cancellationReason: $cancellationReason,
      comment: "Закупка отправлена на ретендер"
    }')" >/dev/null
}

ensure_procedure_offers_received() {
  local procedure_id="$1"
  local offers_variant="$2"

  refresh_procedures
  local status
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "Completed" || "$status" == "Canceled" ]]; then
    return 0
  fi

  if [[ "$status" == "Created" || "$status" == "DocumentsPreparation" || "$status" == "OnApproval" ]]; then
    ensure_procedure_sent "$procedure_id"
  fi

  refresh_procedures
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "Sent" || "$status" == "Retender" || "$status" == "OffersReceived" || "$status" == "DecisionMade" ]]; then
    upsert_offers "$procedure_id" "$offers_variant"
  fi
}

ensure_procedure_retender() {
  local procedure_id="$1"

  refresh_procedures
  local status
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "Retender" ]]; then
    return 0
  fi

  ensure_procedure_offers_received "$procedure_id" "civil_retender"
  refresh_procedures
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "OffersReceived" || "$status" == "DecisionMade" ]]; then
    upsert_canceled_outcome "$procedure_id" "Поступившие предложения требуют повторного тендера"
  fi
}

ensure_procedure_decision_made() {
  local procedure_id="$1"
  local winner_contractor_id="$2"
  local offers_variant="${3:-piping_competition}"

  refresh_procedures
  local status
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "DecisionMade" || "$status" == "Completed" ]]; then
    return 0
  fi

  ensure_procedure_offers_received "$procedure_id" "$offers_variant"
  refresh_procedures
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "OffersReceived" || "$status" == "Retender" ]]; then
    upsert_winner_outcome "$procedure_id" "$winner_contractor_id" "Определен победитель по демо-сценарию"
  fi
}

ensure_contract_draft() {
  local procedure_id="$1"
  local contract_number="$2"
  local signing_date="$3"
  local start_date="$4"
  local end_date="$5"

  refresh_contracts
  local contract_id
  contract_id="$(contract_id_by_procedure "$procedure_id")"
  if [[ -n "$contract_id" ]]; then
    echo "$contract_id"
    return 0
  fi

  api_post "/api/contracts/procedures/${procedure_id}/draft" "$(jq -nc \
    --arg contractNumber "$contract_number" \
    --arg signingDate "$signing_date" \
    --arg startDate "$start_date" \
    --arg endDate "$end_date" \
    '{
      contractNumber: $contractNumber,
      signingDate: $signingDate,
      startDate: $startDate,
      endDate: $endDate
    }')" >/dev/null

  refresh_contracts
  contract_id="$(contract_id_by_procedure "$procedure_id")"
  if [[ -z "$contract_id" ]]; then
    echo "Failed to resolve contract for procedure '${procedure_id}'." >&2
    exit 1
  fi

  echo "$contract_id"
}

ensure_contract_status() {
  local contract_id="$1"
  local target_status="$2"

  while true; do
    refresh_contracts
    local current_status
    current_status="$(contract_status_by_id "$contract_id")"
    if [[ -z "$current_status" ]]; then
      echo "Contract '${contract_id}' was not found while applying status '${target_status}'." >&2
      exit 1
    fi

    if [[ "$current_status" == "$target_status" ]]; then
      return 0
    fi

    if (( "$(contract_status_rank "$current_status")" > "$(contract_status_rank "$target_status")" )); then
      echo "Contract '${contract_id}' is already in later status '${current_status}', skipping downgrade to '${target_status}'." >&2
      return 0
    fi

    local next_status
    next_status="$(next_contract_status "$current_status")"
    if [[ -z "$next_status" ]]; then
      echo "Cannot move contract '${contract_id}' from '${current_status}' to '${target_status}'." >&2
      exit 1
    fi

    api_post "/api/contracts/${contract_id}/transition" "$(jq -nc \
      --arg targetStatus "$next_status" \
      '{ targetStatus: $targetStatus, reason: "" }')" >/dev/null
  done
}

ensure_contract_milestones() {
  local contract_id="$1"
  local profile="$2"

  local payload
  case "$profile" in
    signed)
      payload="$(jq -nc \
        --arg plannedA "$DAY_MINUS_7" \
        --arg actualA "$DAY_MINUS_6" \
        --arg plannedB "$DAY_PLUS_7" \
        '{
          items: [
            {
              title: "Получение исходных данных",
              plannedDate: $plannedA,
              actualDate: $actualA,
              progressPercent: 100,
              sortOrder: 0,
              notes: "Этап завершен"
            },
            {
              title: "Выпуск комплекта РД",
              plannedDate: $plannedB,
              actualDate: null,
              progressPercent: 35,
              sortOrder: 1,
              notes: "Работы стартовали"
            }
          ]
        }')"
      ;;
    active)
      payload="$(jq -nc \
        --arg overdueDate "$DAY_MINUS_10" \
        --arg warningDate "$DAY_PLUS_2" \
        '{
          items: [
            {
              title: "Согласование ТЗ",
              plannedDate: $overdueDate,
              actualDate: null,
              progressPercent: 80,
              sortOrder: 0,
              notes: "Просрочка для демонстрации SLA"
            },
            {
              title: "Передача промежуточного выпуска",
              plannedDate: $warningDate,
              actualDate: null,
              progressPercent: 45,
              sortOrder: 1,
              notes: "Скоро срок исполнения"
            }
          ]
        }')"
      ;;
    closed)
      payload="$(jq -nc \
        --arg plannedA "$DAY_MINUS_20" \
        --arg actualA "$DAY_MINUS_18" \
        --arg plannedB "$DAY_MINUS_5" \
        --arg actualB "$DAY_MINUS_2" \
        '{
          items: [
            {
              title: "Разработка проектной документации",
              plannedDate: $plannedA,
              actualDate: $actualA,
              progressPercent: 100,
              sortOrder: 0,
              notes: "Закрыто"
            },
            {
              title: "Авторский надзор",
              plannedDate: $plannedB,
              actualDate: $actualB,
              progressPercent: 100,
              sortOrder: 1,
              notes: "Закрыто"
            }
          ]
        }')"
      ;;
    *)
      echo "Unknown milestone profile '${profile}'." >&2
      exit 1
      ;;
  esac

  api_put "/api/contracts/${contract_id}/milestones" "$payload" >/dev/null
}

ensure_contract_control_points() {
  local contract_id="$1"
  local profile="$2"

  local payload
  case "$profile" in
    signed)
      payload="$(jq -nc \
        --arg plannedA "$DAY_MINUS_3" \
        --arg forecastA "$DAY_MINUS_1" \
        --arg actualA "$DAY_MINUS_1" \
        --arg plannedB "$DAY_PLUS_6" \
        --arg forecastB "$DAY_PLUS_8" \
        '{
          items: [
            {
              name: "Старт работ",
              responsibleRole: "ГИП",
              plannedDate: $plannedA,
              forecastDate: $forecastA,
              actualDate: $actualA,
              progressPercent: 100,
              sortOrder: 0,
              notes: "Запуск подтвержден",
              stages: [
                {
                  name: "Kick-off",
                  plannedDate: $plannedA,
                  forecastDate: $forecastA,
                  actualDate: $actualA,
                  progressPercent: 100,
                  sortOrder: 0,
                  notes: "Завершено"
                }
              ]
            },
            {
              name: "Промежуточная сдача",
              responsibleRole: "РП",
              plannedDate: $plannedB,
              forecastDate: $forecastB,
              actualDate: null,
              progressPercent: 40,
              sortOrder: 1,
              notes: "Подготовка материалов",
              stages: [
                {
                  name: "Внутренняя проверка",
                  plannedDate: $plannedB,
                  forecastDate: $forecastB,
                  actualDate: null,
                  progressPercent: 50,
                  sortOrder: 0,
                  notes: "В работе"
                }
              ]
            }
          ]
        }')"
      ;;
    active)
      payload="$(jq -nc \
        --arg plannedA "$DAY_MINUS_8" \
        --arg forecastA "$DAY_MINUS_4" \
        --arg plannedB "$DAY_PLUS_4" \
        --arg forecastB "$DAY_PLUS_6" \
        '{
          items: [
            {
              name: "Передача исходной модели",
              responsibleRole: "Lead Engineer",
              plannedDate: $plannedA,
              forecastDate: $forecastA,
              actualDate: null,
              progressPercent: 70,
              sortOrder: 0,
              notes: "Отставание по срокам",
              stages: [
                {
                  name: "Проверка комплекта",
                  plannedDate: $plannedA,
                  forecastDate: $forecastA,
                  actualDate: null,
                  progressPercent: 65,
                  sortOrder: 0,
                  notes: "Есть замечания"
                }
              ]
            },
            {
              name: "Выдача клиенту",
              responsibleRole: "Project Manager",
              plannedDate: $plannedB,
              forecastDate: $forecastB,
              actualDate: null,
              progressPercent: 20,
              sortOrder: 1,
              notes: "Планируется на следующую неделю",
              stages: [
                {
                  name: "Подготовка пакета",
                  plannedDate: $plannedB,
                  forecastDate: $forecastB,
                  actualDate: null,
                  progressPercent: 30,
                  sortOrder: 0,
                  notes: "В работе"
                }
              ]
            }
          ]
        }')"
      ;;
    closed)
      payload="$(jq -nc \
        --arg plannedA "$DAY_MINUS_20" \
        --arg actualA "$DAY_MINUS_18" \
        --arg plannedB "$DAY_MINUS_6" \
        --arg actualB "$DAY_MINUS_3" \
        '{
          items: [
            {
              name: "Передача исходных данных",
              responsibleRole: "ГИП",
              plannedDate: $plannedA,
              forecastDate: $actualA,
              actualDate: $actualA,
              progressPercent: 100,
              sortOrder: 0,
              notes: "Завершено",
              stages: [
                {
                  name: "Формирование пакета",
                  plannedDate: $plannedA,
                  forecastDate: $actualA,
                  actualDate: $actualA,
                  progressPercent: 100,
                  sortOrder: 0,
                  notes: "Закрыто"
                }
              ]
            },
            {
              name: "Финальная передача",
              responsibleRole: "Project Manager",
              plannedDate: $plannedB,
              forecastDate: $actualB,
              actualDate: $actualB,
              progressPercent: 100,
              sortOrder: 1,
              notes: "Закрыто",
              stages: [
                {
                  name: "Подтверждение заказчика",
                  plannedDate: $plannedB,
                  forecastDate: $actualB,
                  actualDate: $actualB,
                  progressPercent: 100,
                  sortOrder: 0,
                  notes: "Подтверждено"
                }
              ]
            }
          ]
        }')"
      ;;
    *)
      echo "Unknown control-point profile '${profile}'." >&2
      exit 1
      ;;
  esac

  api_put "/api/contracts/${contract_id}/monitoring/control-points" "$payload" >/dev/null
}

ensure_contract_mdr_cards() {
  local contract_id="$1"
  local profile="$2"

  local payload
  case "$profile" in
    signed)
      payload="$(jq -nc \
        --arg reportingDate "$DAY_MINUS_1" \
        '{
          items: [
            {
              title: "MDR Подписание",
              reportingDate: $reportingDate,
              sortOrder: 0,
              notes: "Базовый срез подписанного договора",
              rows: [
                {
                  rowCode: "ROW-001",
                  description: "Разработка РД",
                  unitCode: "чел.ч",
                  planValue: 120,
                  forecastValue: 126,
                  factValue: 108,
                  sortOrder: 0,
                  notes: null
                },
                {
                  rowCode: "ROW-002",
                  description: "Координация разделов",
                  unitCode: "чел.ч",
                  planValue: 80,
                  forecastValue: 82,
                  factValue: 60,
                  sortOrder: 1,
                  notes: null
                }
              ]
            }
          ]
        }')"
      ;;
    active)
      payload="$(jq -nc \
        --arg reportingDate "$TODAY" \
        '{
          items: [
            {
              title: "MDR Активная стадия",
              reportingDate: $reportingDate,
              sortOrder: 0,
              notes: "Срез для импорта forecast/fact",
              rows: [
                {
                  rowCode: "ROW-001",
                  description: "Разработка РД",
                  unitCode: "чел.ч",
                  planValue: 140,
                  forecastValue: 145,
                  factValue: 118,
                  sortOrder: 0,
                  notes: null
                },
                {
                  rowCode: "ROW-002",
                  description: "Авторский надзор",
                  unitCode: "чел.ч",
                  planValue: 90,
                  forecastValue: 92,
                  factValue: 70,
                  sortOrder: 1,
                  notes: null
                }
              ]
            }
          ]
        }')"
      ;;
    closed)
      payload="$(jq -nc \
        --arg reportingDate "$DAY_MINUS_2" \
        '{
          items: [
            {
              title: "MDR Финальный",
              reportingDate: $reportingDate,
              sortOrder: 0,
              notes: "Итоговый закрытый отчет",
              rows: [
                {
                  rowCode: "ROW-001",
                  description: "Разработка РД",
                  unitCode: "чел.ч",
                  planValue: 150,
                  forecastValue: 150,
                  factValue: 150,
                  sortOrder: 0,
                  notes: null
                },
                {
                  rowCode: "ROW-002",
                  description: "Сопровождение экспертизы",
                  unitCode: "чел.ч",
                  planValue: 40,
                  forecastValue: 40,
                  factValue: 40,
                  sortOrder: 1,
                  notes: null
                }
              ]
            }
          ]
        }')"
      ;;
    *)
      echo "Unknown MDR profile '${profile}'." >&2
      exit 1
      ;;
  esac

  api_put "/api/contracts/${contract_id}/monitoring/mdr-cards" "$payload" >/dev/null
}

ensure_contract_mdr_import() {
  local contract_id="$1"

  api_post "/api/contracts/${contract_id}/monitoring/mdr-cards/import-forecast-fact" "$(jq -nc \
    --arg reportingDate "$TODAY" \
    '{
      skipConflicts: false,
      items: [
        {
          sourceRowNumber: 1,
          cardTitle: "MDR Активная стадия",
          reportingDate: $reportingDate,
          rowCode: "ROW-001",
          forecastValue: 148,
          factValue: 121
        },
        {
          sourceRowNumber: 2,
          cardTitle: "MDR Активная стадия",
          reportingDate: $reportingDate,
          rowCode: "ROW-002",
          forecastValue: 96,
          factValue: 74
        }
      ]
    }')" >/dev/null
}

ensure_completed_procedure() {
  local procedure_id="$1"

  refresh_procedures
  local status
  status="$(procedure_status_by_id "$procedure_id")"
  if [[ "$status" == "Completed" ]]; then
    return 0
  fi

  if [[ "$status" == "DecisionMade" ]]; then
    transition_procedure "$procedure_id" "Completed"
  fi
}

ensure_direct_batch() {
  local file_name="$1"
  local notes="$2"
  local rows_json="$3"

  refresh_batches
  local batch_id
  batch_id="$(batch_id_by_file_name "$file_name")"
  if [[ -n "$batch_id" ]]; then
    echo "$batch_id"
    return 0
  fi

  api_post "/api/imports/source-data/batches" "$(jq -nc \
    --arg fileName "$file_name" \
    --arg notes "$notes" \
    --argjson rows "$rows_json" \
    '{
      fileName: $fileName,
      notes: $notes,
      rows: $rows
    }')" >/dev/null

  refresh_batches
  batch_id="$(batch_id_by_file_name "$file_name")"
  if [[ -z "$batch_id" ]]; then
    echo "Failed to resolve import batch '${file_name}'." >&2
    exit 1
  fi

  echo "$batch_id"
}

ensure_batch_transition() {
  local batch_id="$1"
  local target_status="$2"
  local reason="$3"

  refresh_batches
  local current_status
  current_status="$(batch_status_by_id "$batch_id")"
  if [[ "$current_status" == "$target_status" ]]; then
    return 0
  fi

  if [[ "$current_status" == "Validated" && "$target_status" == "ReadyForLotting" ]]; then
    api_post "/api/imports/source-data/batches/${batch_id}/transition" "$(jq -nc \
      --arg targetStatus "$target_status" \
      --arg reason "$reason" \
      '{ targetStatus: $targetStatus, reason: $reason }')" >/dev/null
    return 0
  fi

  if [[ ( "$current_status" == "Validated" || "$current_status" == "ValidatedWithErrors" || "$current_status" == "ReadyForLotting" ) && "$target_status" == "Rejected" ]]; then
    api_post "/api/imports/source-data/batches/${batch_id}/transition" "$(jq -nc \
      --arg targetStatus "$target_status" \
      --arg reason "$reason" \
      '{ targetStatus: $targetStatus, reason: $reason }')" >/dev/null
    return 0
  fi
}

ensure_recommendation_lots() {
  local batch_id="$1"

  refresh_lots
  if [[ -n "$(lot_id_by_code "LOT-REC-DEMO-001")" && -n "$(lot_id_by_code "LOT-REC-DEMO-002")" ]]; then
    return 0
  fi

  api_get "/api/lots/recommendations/import-batches/${batch_id}" >/dev/null

  api_post "/api/lots/recommendations/import-batches/${batch_id}/apply" "$(jq -nc \
    '{
      groups: [
        {
          groupKey: "PRJ-IMPORT-001|PIPING",
          lotCode: "LOT-REC-DEMO-001",
          lotName: "Рекомендация / Импорт / PIPING"
        },
        {
          groupKey: "PRJ-DEMO-003|CIVIL",
          lotCode: "LOT-REC-DEMO-002",
          lotName: "Рекомендация / Проект C / CIVIL"
        }
      ]
    }')" >/dev/null
}

ensure_xml_item() {
  local file_name="$1"
  local external_document_id="$2"
  local xml_content="$3"

  refresh_xml_inbox
  local item_id
  item_id="$(xml_item_id_by_file_name "$file_name")"
  if [[ -n "$item_id" ]]; then
    echo "$item_id"
    return 0
  fi

  api_post "/api/imports/source-data/xml/inbox" "$(jq -nc \
    --arg fileName "$file_name" \
    --arg externalDocumentId "$external_document_id" \
    --arg xmlContent "$xml_content" \
    '{
      sourceSystem: "ExpressPlanning",
      externalDocumentId: $externalDocumentId,
      fileName: $fileName,
      xmlContent: $xmlContent
    }')" >/dev/null

  refresh_xml_inbox
  item_id="$(xml_item_id_by_file_name "$file_name")"
  if [[ -z "$item_id" ]]; then
    echo "Failed to resolve XML inbox item '${file_name}'." >&2
    exit 1
  fi

  echo "$item_id"
}

wait_for_xml_status() {
  local file_name="$1"
  local expected_status="$2"

  wait_for_value \
    "XML inbox item ${file_name}" \
    "refresh_xml_inbox >/dev/null; xml_item_status_by_file_name \"${file_name}\"" \
    "$expected_status"
}

wait_for_batch_stable_status() {
  local batch_id="$1"
  local attempt

  for (( attempt = 1; attempt <= POLL_ATTEMPTS; attempt++ )); do
    refresh_batches
    local status
    status="$(batch_status_by_id "$batch_id")"
    case "$status" in
      Validated|ValidatedWithErrors|ReadyForLotting|Rejected|Failed)
        return 0
        ;;
    esac

    sleep "$POLL_INTERVAL_SECONDS"
  done

  echo "Timed out while waiting for import batch '${batch_id}' to leave transient statuses." >&2
  exit 1
}

seed_ratings_if_needed() {
  local analytics_json
  analytics_json="$(api_get "/api/contractors/rating/analytics")"
  if [[ "$(jq 'length' <<<"$analytics_json")" != "0" ]]; then
    return 0
  fi

  api_put "/api/contractors/rating/model" "$(jq -nc '{
    versionCode: "R-DEMO-2026",
    name: "Демо-модель рейтинга подрядчиков",
    notes: "Инициализировано сид-скриптом для демонстрационных сценариев.",
    weights: [
      { factorCode: "DeliveryDiscipline", weight: 0.30, notes: "Соблюдение сроков" },
      { factorCode: "CommercialDiscipline", weight: 0.20, notes: "Коммерческая дисциплина" },
      { factorCode: "ClaimDiscipline", weight: 0.15, notes: "Работа с претензиями" },
      { factorCode: "ManualExpertEvaluation", weight: 0.25, notes: "Экспертная оценка" },
      { factorCode: "WorkloadPenalty", weight: 0.10, notes: "Нагрузка" }
    ]
  }')" >/dev/null

  api_post "/api/contractors/${CONTRACTOR_A_ID}/rating/manual-assessment" "$(jq -nc '{
    score: 92,
    comment: "Сильная практика по срокам и качеству"
  }')" >/dev/null

  api_post "/api/contractors/${CONTRACTOR_C_ID}/rating/manual-assessment" "$(jq -nc '{
    score: 78,
    comment: "Хорошая резервная команда, требуется контроль загрузки"
  }')" >/dev/null

  api_post "/api/contractors/rating/recalculate" "$(jq -nc '{
    includeInactiveContractors: true,
    reason: "Первичный пересчет после наполнения демо-данными"
  }')" >/dev/null
}

echo "Checking API availability..."
ensure_api_available

echo "Resolving current local user..."
resolve_demo_user
if [[ -z "${DEMO_USER_ID:-}" ]]; then
  echo "Failed to resolve a local development user." >&2
  exit 1
fi

TODAY="$(iso_date 0)"
DAY_MINUS_20="$(iso_date -20)"
DAY_MINUS_18="$(iso_date -18)"
DAY_MINUS_16="$(iso_date -16)"
DAY_MINUS_12="$(iso_date -12)"
DAY_MINUS_10="$(iso_date -10)"
DAY_MINUS_8="$(iso_date -8)"
DAY_MINUS_7="$(iso_date -7)"
DAY_MINUS_6="$(iso_date -6)"
DAY_MINUS_5="$(iso_date -5)"
DAY_MINUS_4="$(iso_date -4)"
DAY_MINUS_3="$(iso_date -3)"
DAY_MINUS_2="$(iso_date -2)"
DAY_MINUS_1="$(iso_date -1)"
DAY_MINUS_30="$(iso_date -30)"
DAY_PLUS_1="$(iso_date 1)"
DAY_PLUS_2="$(iso_date 2)"
DAY_PLUS_4="$(iso_date 4)"
DAY_PLUS_5="$(iso_date 5)"
DAY_PLUS_6="$(iso_date 6)"
DAY_PLUS_7="$(iso_date 7)"
DAY_PLUS_8="$(iso_date 8)"
DAY_PLUS_10="$(iso_date 10)"
DAY_PLUS_12="$(iso_date 12)"
DAY_PLUS_14="$(iso_date 14)"
DAY_PLUS_15="$(iso_date 15)"
DAY_PLUS_20="$(iso_date 20)"
DAY_PLUS_30="$(iso_date 30)"
DAY_PLUS_40="$(iso_date 40)"
DAY_PLUS_45="$(iso_date 45)"
DAY_PLUS_60="$(iso_date 60)"
DAY_PLUS_90="$(iso_date 90)"

echo "Upserting reference data..."
ensure_reference_item "DISCIPLINES" "PIPING" "Трубопроводы" 10
ensure_reference_item "DISCIPLINES" "ELECTRICAL" "Электрика" 20
ensure_reference_item "DISCIPLINES" "CIVIL" "Строительная часть" 30
ensure_reference_item "SLA_VIOLATION_REASON" "DATA_DELAY" "Задержка исходных данных" 10
ensure_reference_item "SLA_VIOLATION_REASON" "CUSTOMER_WAIT" "Ожидание решения заказчика" 20
ensure_reference_item "SLA_VIOLATION_REASON" "FORCE_MAJEURE" "Форс-мажор" 30

echo "Ensuring projects..."
ensure_project "PRJ-DEMO-001" "Демо-проект A"
ensure_project "PRJ-DEMO-002" "Демо-проект B"
ensure_project "PRJ-DEMO-003" "Демо-проект C"
ensure_project "PRJ-IMPORT-001" "Импортный песочница-проект"
refresh_projects
PROJECT_A_ID="$(project_id_by_code "PRJ-DEMO-001")"
PROJECT_B_ID="$(project_id_by_code "PRJ-DEMO-002")"
PROJECT_C_ID="$(project_id_by_code "PRJ-DEMO-003")"
PROJECT_IMPORT_ID="$(project_id_by_code "PRJ-IMPORT-001")"

echo "Ensuring contractors..."
ensure_contractor \
  "7701000001" \
  "Демо Подрядчик Инжиниринг" \
  "Москва" \
  "Иван Петров" \
  "+7-900-111-11-11" \
  "demo.contractor1@example.com" \
  "1800" \
  "1.00" \
  "0" \
  "1.05" \
  "A" \
  "Active" \
  '["PIPING","ELECTRICAL"]'
ensure_contractor \
  "7701000002" \
  "Демо Подрядчик Civil" \
  "Санкт-Петербург" \
  "Анна Смирнова" \
  "+7-900-222-22-22" \
  "demo.contractor2@example.com" \
  "1400" \
  "0.95" \
  "0" \
  "1.00" \
  "New" \
  "Active" \
  '["CIVIL"]'
ensure_contractor \
  "7701000003" \
  "Демо Подрядчик MultiDiscipline" \
  "Казань" \
  "Павел Орлов" \
  "+7-900-333-33-33" \
  "demo.contractor3@example.com" \
  "2200" \
  "0.98" \
  "0" \
  "0.97" \
  "B" \
  "Active" \
  '["PIPING","CIVIL"]'
ensure_contractor \
  "7701000004" \
  "Демо Подрядчик Blocked" \
  "Екатеринбург" \
  "Мария Волкова" \
  "+7-900-444-44-44" \
  "demo.contractor4@example.com" \
  "900" \
  "0.70" \
  "0" \
  "1.00" \
  "D" \
  "Blocked" \
  '["ELECTRICAL"]'
refresh_contractors
CONTRACTOR_A_ID="$(contractor_id_by_inn "7701000001")"
CONTRACTOR_B_ID="$(contractor_id_by_inn "7701000002")"
CONTRACTOR_C_ID="$(contractor_id_by_inn "7701000003")"
CONTRACTOR_D_ID="$(contractor_id_by_inn "7701000004")"

echo "Seeding procurement and contract scenarios..."

LOT_DRAFT_ID="$(ensure_lot "LOT-DEMO-013" "Лот / Черновик" "$(jq -nc \
  --arg projectA "$PROJECT_A_ID" \
  --arg projectB "$PROJECT_B_ID" \
  --arg startA "$DAY_PLUS_10" \
  --arg finishA "$DAY_PLUS_45" \
  --arg startB "$DAY_PLUS_14" \
  --arg finishB "$DAY_PLUS_60" \
  '[
    {
      projectId: $projectA,
      objectWbs: "A.13.01",
      disciplineCode: "PIPING",
      manHours: 260,
      plannedStartDate: $startA,
      plannedFinishDate: $finishA
    },
    {
      projectId: $projectB,
      objectWbs: "B.13.02",
      disciplineCode: "ELECTRICAL",
      manHours: 180,
      plannedStartDate: $startB,
      plannedFinishDate: $finishB
    }
  ]')")"

LOT_CREATED_ID="$(ensure_lot "LOT-DEMO-012" "Лот / Процедура Created" "$(jq -nc \
  --arg projectA "$PROJECT_A_ID" \
  --arg startA "$DAY_PLUS_6" \
  --arg finishA "$DAY_PLUS_30" \
  '[
    {
      projectId: $projectA,
      objectWbs: "A.12.01",
      disciplineCode: "PIPING",
      manHours: 200,
      plannedStartDate: $startA,
      plannedFinishDate: $finishA
    }
  ]')")"
ensure_lot_status "$LOT_CREATED_ID" "InProcurement"
PROC_CREATED_ID="$(ensure_procedure \
  "$LOT_CREATED_ID" \
  "OPEN_TENDER" \
  "Сценарий закупки: Created" \
  "Формирование закупочной процедуры на ранней стадии" \
  "$DAY_PLUS_8" \
  "$DAY_PLUS_30" \
  "1250000" \
  "Демонстрационный сценарий статуса Created")"

LOT_DOCS_ID="$(ensure_lot "LOT-DEMO-002" "Лот / Процедура DocumentsPreparation" "$(jq -nc \
  --arg projectB "$PROJECT_B_ID" \
  --arg startB "$DAY_PLUS_4" \
  --arg finishB "$DAY_PLUS_45" \
  '[
    {
      projectId: $projectB,
      objectWbs: "B.02.01",
      disciplineCode: "CIVIL",
      manHours: 320,
      plannedStartDate: $startB,
      plannedFinishDate: $finishB
    }
  ]')")"
ensure_lot_status "$LOT_DOCS_ID" "InProcurement"
PROC_DOCS_ID="$(ensure_procedure \
  "$LOT_DOCS_ID" \
  "REQUEST_FOR_QUOTATION" \
  "Сценарий закупки: DocumentsPreparation" \
  "Подготовка комплекта закупочных документов" \
  "$DAY_PLUS_6" \
  "$DAY_PLUS_45" \
  "980000" \
  "Демонстрационный сценарий статуса DocumentsPreparation")"
ensure_procedure_documents_preparation "$PROC_DOCS_ID"

LOT_APPROVAL_ID="$(ensure_lot "LOT-DEMO-003" "Лот / Процедура OnApproval" "$(jq -nc \
  --arg projectC "$PROJECT_C_ID" \
  --arg startC "$DAY_PLUS_2" \
  --arg finishC "$DAY_PLUS_30" \
  '[
    {
      projectId: $projectC,
      objectWbs: "C.03.01",
      disciplineCode: "CIVIL",
      manHours: 210,
      plannedStartDate: $startC,
      plannedFinishDate: $finishC
    }
  ]')")"
ensure_lot_status "$LOT_APPROVAL_ID" "InProcurement"
PROC_APPROVAL_ID="$(ensure_procedure \
  "$LOT_APPROVAL_ID" \
  "OPEN_TENDER" \
  "Сценарий закупки: OnApproval" \
  "Согласование закупочной стратегии" \
  "$DAY_PLUS_4" \
  "$DAY_PLUS_30" \
  "1430000" \
  "Демонстрационный сценарий статуса OnApproval")"
ensure_procedure_on_approval "$PROC_APPROVAL_ID"

LOT_SENT_ID="$(ensure_lot "LOT-DEMO-004" "Лот / Процедура Sent" "$(jq -nc \
  --arg projectA "$PROJECT_A_ID" \
  --arg startA "$DAY_MINUS_5" \
  --arg finishA "$DAY_PLUS_20" \
  '[
    {
      projectId: $projectA,
      objectWbs: "A.04.01",
      disciplineCode: "PIPING",
      manHours: 290,
      plannedStartDate: $startA,
      plannedFinishDate: $finishA
    }
  ]')")"
ensure_lot_status "$LOT_SENT_ID" "InProcurement"
PROC_SENT_ID="$(ensure_procedure \
  "$LOT_SENT_ID" \
  "OPEN_TENDER" \
  "Сценарий закупки: Sent" \
  "Запрос коммерческих предложений отправлен подрядчикам" \
  "$DAY_MINUS_3" \
  "$DAY_PLUS_1" \
  "1180000" \
  "Демонстрационный сценарий статуса Sent и shortlist")"
ensure_procedure_sent "$PROC_SENT_ID"
ensure_shortlist_with_adjustments "$PROC_SENT_ID"

LOT_OFFERS_ID="$(ensure_lot "LOT-DEMO-005" "Лот / Процедура OffersReceived" "$(jq -nc \
  --arg projectA "$PROJECT_A_ID" \
  --arg projectC "$PROJECT_C_ID" \
  --arg startA "$DAY_MINUS_4" \
  --arg finishA "$DAY_PLUS_30" \
  --arg startC "$DAY_MINUS_2" \
  --arg finishC "$DAY_PLUS_45" \
  '[
    {
      projectId: $projectA,
      objectWbs: "A.05.01",
      disciplineCode: "PIPING",
      manHours: 240,
      plannedStartDate: $startA,
      plannedFinishDate: $finishA
    },
    {
      projectId: $projectC,
      objectWbs: "C.05.02",
      disciplineCode: "PIPING",
      manHours: 120,
      plannedStartDate: $startC,
      plannedFinishDate: $finishC
    }
  ]')")"
ensure_lot_status "$LOT_OFFERS_ID" "InProcurement"
PROC_OFFERS_ID="$(ensure_procedure \
  "$LOT_OFFERS_ID" \
  "OPEN_TENDER" \
  "Сценарий закупки: OffersReceived" \
  "Процедура на этапе сопоставления предложений" \
  "$DAY_MINUS_2" \
  "$DAY_PLUS_4" \
  "1640000" \
  "Демонстрационный сценарий статуса OffersReceived")"
ensure_procedure_sent "$PROC_OFFERS_ID"
ensure_shortlist_with_adjustments "$PROC_OFFERS_ID"
ensure_procedure_offers_received "$PROC_OFFERS_ID" "piping_competition"

LOT_RETENDER_ID="$(ensure_lot "LOT-DEMO-006" "Лот / Процедура Retender" "$(jq -nc \
  --arg projectB "$PROJECT_B_ID" \
  --arg startB "$DAY_MINUS_8" \
  --arg finishB "$DAY_PLUS_20" \
  '[
    {
      projectId: $projectB,
      objectWbs: "B.06.01",
      disciplineCode: "CIVIL",
      manHours: 260,
      plannedStartDate: $startB,
      plannedFinishDate: $finishB
    }
  ]')")"
ensure_lot_status "$LOT_RETENDER_ID" "InProcurement"
PROC_RETENDER_ID="$(ensure_procedure \
  "$LOT_RETENDER_ID" \
  "REQUEST_FOR_QUOTATION" \
  "Сценарий закупки: Retender" \
  "Переобъявление закупки после анализа предложений" \
  "$DAY_MINUS_1" \
  "$DAY_PLUS_6" \
  "1060000" \
  "Демонстрационный сценарий статуса Retender")"
ensure_procedure_retender "$PROC_RETENDER_ID"

LOT_DECISION_ID="$(ensure_lot "LOT-DEMO-001" "Лот / Процедура DecisionMade" "$(jq -nc \
  --arg projectA "$PROJECT_A_ID" \
  --arg projectB "$PROJECT_B_ID" \
  --arg startA "$DAY_MINUS_10" \
  --arg finishA "$DAY_PLUS_20" \
  --arg startB "$DAY_MINUS_6" \
  --arg finishB "$DAY_PLUS_30" \
  '[
    {
      projectId: $projectA,
      objectWbs: "A.01.01",
      disciplineCode: "PIPING",
      manHours: 250,
      plannedStartDate: $startA,
      plannedFinishDate: $finishA
    },
    {
      projectId: $projectB,
      objectWbs: "B.01.02",
      disciplineCode: "ELECTRICAL",
      manHours: 180,
      plannedStartDate: $startB,
      plannedFinishDate: $finishB
    }
  ]')")"
ensure_lot_status "$LOT_DECISION_ID" "InProcurement"
PROC_DECISION_ID="$(ensure_procedure \
  "$LOT_DECISION_ID" \
  "OPEN_TENDER" \
  "Сценарий закупки: DecisionMade" \
  "Определение победителя и создание черновика договора" \
  "$DAY_MINUS_4" \
  "$DAY_PLUS_2" \
  "1200000" \
  "Демонстрационный сценарий статуса DecisionMade")"
ensure_procedure_decision_made "$PROC_DECISION_ID" "$CONTRACTOR_A_ID"
CONTRACT_DRAFT_ID="$(ensure_contract_draft "$PROC_DECISION_ID" "SC-DEMO-DRAFT-001" "$DAY_MINUS_1" "$DAY_PLUS_1" "$DAY_PLUS_90")"

LOT_CONTRACT_ONAPP_ID="$(ensure_lot "LOT-DEMO-007" "Лот / Договор OnApproval" "$(jq -nc \
  --arg projectA "$PROJECT_A_ID" \
  --arg startA "$DAY_MINUS_12" \
  --arg finishA "$DAY_PLUS_45" \
  '[
    {
      projectId: $projectA,
      objectWbs: "A.07.01",
      disciplineCode: "PIPING",
      manHours: 310,
      plannedStartDate: $startA,
      plannedFinishDate: $finishA
    }
  ]')")"
ensure_lot_status "$LOT_CONTRACT_ONAPP_ID" "InProcurement"
PROC_CONTRACT_ONAPP_ID="$(ensure_procedure \
  "$LOT_CONTRACT_ONAPP_ID" \
  "OPEN_TENDER" \
  "Сценарий договора: OnApproval" \
  "Закупка завершена, договор направлен на согласование" \
  "$DAY_MINUS_2" \
  "$DAY_PLUS_10" \
  "1320000" \
  "Демонстрационный сценарий договора OnApproval")"
ensure_procedure_decision_made "$PROC_CONTRACT_ONAPP_ID" "$CONTRACTOR_A_ID"
CONTRACT_ONAPP_ID="$(ensure_contract_draft "$PROC_CONTRACT_ONAPP_ID" "SC-DEMO-ONAPP-001" "$TODAY" "$DAY_PLUS_1" "$DAY_PLUS_60")"
ensure_contract_status "$CONTRACT_ONAPP_ID" "OnApproval"
ensure_completed_procedure "$PROC_CONTRACT_ONAPP_ID"

LOT_CONTRACT_SIGNED_ID="$(ensure_lot "LOT-DEMO-008" "Лот / Договор Signed" "$(jq -nc \
  --arg projectC "$PROJECT_C_ID" \
  --arg startC "$DAY_MINUS_12" \
  --arg finishC "$DAY_PLUS_30" \
  '[
    {
      projectId: $projectC,
      objectWbs: "C.08.01",
      disciplineCode: "CIVIL",
      manHours: 280,
      plannedStartDate: $startC,
      plannedFinishDate: $finishC
    }
  ]')")"
ensure_lot_status "$LOT_CONTRACT_SIGNED_ID" "InProcurement"
PROC_CONTRACT_SIGNED_ID="$(ensure_procedure \
  "$LOT_CONTRACT_SIGNED_ID" \
  "REQUEST_FOR_QUOTATION" \
  "Сценарий договора: Signed" \
  "Подписанный договор в работе без старта исполнения" \
  "$DAY_PLUS_1" \
  "$DAY_PLUS_14" \
  "1140000" \
  "Демонстрационный сценарий договора Signed")"
ensure_procedure_decision_made "$PROC_CONTRACT_SIGNED_ID" "$CONTRACTOR_C_ID"
CONTRACT_SIGNED_ID="$(ensure_contract_draft "$PROC_CONTRACT_SIGNED_ID" "SC-DEMO-SIGNED-001" "$TODAY" "$DAY_PLUS_1" "$DAY_PLUS_45")"
ensure_contract_status "$CONTRACT_SIGNED_ID" "Signed"
ensure_contract_milestones "$CONTRACT_SIGNED_ID" "signed"
ensure_contract_control_points "$CONTRACT_SIGNED_ID" "signed"
ensure_contract_mdr_cards "$CONTRACT_SIGNED_ID" "signed"
ensure_completed_procedure "$PROC_CONTRACT_SIGNED_ID"

LOT_CONTRACT_ACTIVE_ID="$(ensure_lot "LOT-DEMO-009" "Лот / Договор Active" "$(jq -nc \
  --arg projectA "$PROJECT_A_ID" \
  --arg projectC "$PROJECT_C_ID" \
  --arg startA "$DAY_MINUS_18" \
  --arg finishA "$DAY_PLUS_20" \
  --arg startC "$DAY_MINUS_16" \
  --arg finishC "$DAY_PLUS_30" \
  '[
    {
      projectId: $projectA,
      objectWbs: "A.09.01",
      disciplineCode: "PIPING",
      manHours: 340,
      plannedStartDate: $startA,
      plannedFinishDate: $finishA
    },
    {
      projectId: $projectC,
      objectWbs: "C.09.02",
      disciplineCode: "PIPING",
      manHours: 140,
      plannedStartDate: $startC,
      plannedFinishDate: $finishC
    }
  ]')")"
ensure_lot_status "$LOT_CONTRACT_ACTIVE_ID" "InProcurement"
PROC_CONTRACT_ACTIVE_ID="$(ensure_procedure \
  "$LOT_CONTRACT_ACTIVE_ID" \
  "OPEN_TENDER" \
  "Сценарий договора: Active" \
  "Активный договор с просроченными и предупреждающими индикаторами" \
  "$DAY_MINUS_5" \
  "$DAY_PLUS_2" \
  "1760000" \
  "Демонстрационный сценарий договора Active и SLA")"
ensure_procedure_decision_made "$PROC_CONTRACT_ACTIVE_ID" "$CONTRACTOR_A_ID"
CONTRACT_ACTIVE_ID="$(ensure_contract_draft "$PROC_CONTRACT_ACTIVE_ID" "SC-DEMO-ACTIVE-001" "$DAY_MINUS_7" "$DAY_MINUS_10" "$DAY_MINUS_3")"
ensure_contract_status "$CONTRACT_ACTIVE_ID" "Active"
ensure_contract_milestones "$CONTRACT_ACTIVE_ID" "active"
ensure_contract_control_points "$CONTRACT_ACTIVE_ID" "active"
ensure_contract_mdr_cards "$CONTRACT_ACTIVE_ID" "active"
ensure_contract_mdr_import "$CONTRACT_ACTIVE_ID"
ensure_completed_procedure "$PROC_CONTRACT_ACTIVE_ID"
ensure_lot_status "$LOT_CONTRACT_ACTIVE_ID" "InExecution"

LOT_CONTRACT_CLOSED_ID="$(ensure_lot "LOT-DEMO-010" "Лот / Договор Closed" "$(jq -nc \
  --arg projectB "$PROJECT_B_ID" \
  --arg startB "$DAY_MINUS_30" \
  --arg finishB "$DAY_MINUS_2" \
  '[
    {
      projectId: $projectB,
      objectWbs: "B.10.01",
      disciplineCode: "CIVIL",
      manHours: 230,
      plannedStartDate: $startB,
      plannedFinishDate: $finishB
    }
  ]')")"
ensure_lot_status "$LOT_CONTRACT_CLOSED_ID" "InProcurement"
PROC_CONTRACT_CLOSED_ID="$(ensure_procedure \
  "$LOT_CONTRACT_CLOSED_ID" \
  "REQUEST_FOR_QUOTATION" \
  "Сценарий договора: Closed" \
  "Закрытый договор с завершенным исполнением" \
  "$DAY_MINUS_12" \
  "$DAY_MINUS_4" \
  "950000" \
  "Демонстрационный сценарий договора Closed")"
ensure_procedure_decision_made "$PROC_CONTRACT_CLOSED_ID" "$CONTRACTOR_B_ID" "civil_competition"
CONTRACT_CLOSED_ID="$(ensure_contract_draft "$PROC_CONTRACT_CLOSED_ID" "SC-DEMO-CLOSED-001" "$DAY_MINUS_20" "$DAY_MINUS_18" "$DAY_MINUS_1")"
refresh_contracts
CONTRACT_CLOSED_STATUS="$(contract_status_by_id "$CONTRACT_CLOSED_ID")"
if [[ "$CONTRACT_CLOSED_STATUS" != "Closed" ]]; then
  ensure_contract_status "$CONTRACT_CLOSED_ID" "Active"
  ensure_contract_milestones "$CONTRACT_CLOSED_ID" "closed"
  ensure_contract_control_points "$CONTRACT_CLOSED_ID" "closed"
  ensure_contract_mdr_cards "$CONTRACT_CLOSED_ID" "closed"
  ensure_contract_status "$CONTRACT_CLOSED_ID" "Closed"
fi
ensure_completed_procedure "$PROC_CONTRACT_CLOSED_ID"
ensure_lot_status "$LOT_CONTRACT_CLOSED_ID" "Closed"

LOT_CANCELED_ID="$(ensure_lot "LOT-DEMO-011" "Лот / Процедура Canceled" "$(jq -nc \
  --arg projectB "$PROJECT_B_ID" \
  --arg startB "$DAY_PLUS_8" \
  --arg finishB "$DAY_PLUS_30" \
  '[
    {
      projectId: $projectB,
      objectWbs: "B.11.01",
      disciplineCode: "ELECTRICAL",
      manHours: 150,
      plannedStartDate: $startB,
      plannedFinishDate: $finishB
    }
  ]')")"
ensure_lot_status "$LOT_CANCELED_ID" "InProcurement"
PROC_CANCELED_ID="$(ensure_procedure \
  "$LOT_CANCELED_ID" \
  "OPEN_TENDER" \
  "Сценарий закупки: Canceled" \
  "Закупка отменена без перехода к предложениям" \
  "$DAY_PLUS_10" \
  "$DAY_PLUS_45" \
  "730000" \
  "Демонстрационный сценарий статуса Canceled")"
ensure_procedure_canceled "$PROC_CANCELED_ID"

echo "Recalculating contractor load..."
api_post_empty "/api/contractors/recalculate-load" >/dev/null

echo "Seeding contractor ratings..."
seed_ratings_if_needed

echo "Seeding import scenarios..."
VALIDATED_BATCH_ID="$(ensure_direct_batch \
  "seed-demo-validated.csv" \
  "Валидный импорт для демонстрации" \
  "$(jq -nc \
    --arg startA "$DAY_PLUS_6" \
    --arg finishA "$DAY_PLUS_30" \
    --arg startB "$DAY_PLUS_8" \
    --arg finishB "$DAY_PLUS_45" \
    '[
      {
        rowNumber: 1,
        projectCode: "PRJ-DEMO-001",
        objectWbs: "IMP.01.01",
        disciplineCode: "PIPING",
        manHours: 160,
        plannedStartDate: $startA,
        plannedFinishDate: $finishA
      },
      {
        rowNumber: 2,
        projectCode: "PRJ-DEMO-002",
        objectWbs: "IMP.01.02",
        disciplineCode: "CIVIL",
        manHours: 220,
        plannedStartDate: $startB,
        plannedFinishDate: $finishB
      }
    ]')")"

INVALID_BATCH_ID="$(ensure_direct_batch \
  "seed-demo-invalid.csv" \
  "Импорт с ошибками валидации" \
  "$(jq -nc \
    --arg startA "$DAY_PLUS_4" \
    --arg finishA "$DAY_PLUS_20" \
    '[
      {
        rowNumber: 1,
        projectCode: "UNKNOWN-PROJECT",
        objectWbs: "ERR.01.01",
        disciplineCode: "PIPING",
        manHours: 100,
        plannedStartDate: $startA,
        plannedFinishDate: $finishA
      },
      {
        rowNumber: 2,
        projectCode: "PRJ-DEMO-001",
        objectWbs: "",
        disciplineCode: "ELECTRICAL",
        manHours: 90,
        plannedStartDate: $startA,
        plannedFinishDate: $finishA
      }
    ]')")"

READY_BATCH_ID="$(ensure_direct_batch \
  "seed-demo-ready.csv" \
  "Импорт для разлотковки и рекомендаций" \
  "$(jq -nc \
    --arg startA "$DAY_PLUS_12" \
    --arg finishA "$DAY_PLUS_45" \
    --arg startB "$DAY_PLUS_14" \
    --arg finishB "$DAY_PLUS_60" \
    --arg startC "$DAY_PLUS_10" \
    --arg finishC "$DAY_PLUS_40" \
    '[
      {
        rowNumber: 1,
        projectCode: "PRJ-IMPORT-001",
        objectWbs: "REC.01.01",
        disciplineCode: "PIPING",
        manHours: 150,
        plannedStartDate: $startA,
        plannedFinishDate: $finishA
      },
      {
        rowNumber: 2,
        projectCode: "PRJ-IMPORT-001",
        objectWbs: "REC.01.02",
        disciplineCode: "PIPING",
        manHours: 130,
        plannedStartDate: $startB,
        plannedFinishDate: $finishB
      },
      {
        rowNumber: 3,
        projectCode: "PRJ-DEMO-003",
        objectWbs: "REC.02.01",
        disciplineCode: "CIVIL",
        manHours: 210,
        plannedStartDate: $startC,
        plannedFinishDate: $finishC
      }
    ]')")"
ensure_batch_transition "$READY_BATCH_ID" "ReadyForLotting" "Пакет подготовлен для автоматической разлотковки"
ensure_recommendation_lots "$READY_BATCH_ID"

REJECTED_BATCH_ID="$(ensure_direct_batch \
  "seed-demo-rejected.csv" \
  "Импорт, отклоненный оператором" \
  "$(jq -nc \
    --arg startA "$DAY_PLUS_5" \
    --arg finishA "$DAY_PLUS_15" \
    '[
      {
        rowNumber: 1,
        projectCode: "PRJ-DEMO-002",
        objectWbs: "REJ.01.01",
        disciplineCode: "CIVIL",
        manHours: 110,
        plannedStartDate: $startA,
        plannedFinishDate: $finishA
      }
    ]')")"
ensure_batch_transition "$REJECTED_BATCH_ID" "Rejected" "Пакет отклонен оператором для демонстрации workflow"

echo "Seeding XML inbox scenarios..."
XML_SUCCESS_ID="$(ensure_xml_item \
  "seed-demo-xml-success.xml" \
  "XML-DEMO-SUCCESS-001" \
  "<rows><row rowNumber=\"1\" projectCode=\"PRJ-DEMO-001\" objectWbs=\"XML.01.01\" disciplineCode=\"PIPING\" manHours=\"140\" plannedStartDate=\"${DAY_PLUS_6}\" plannedFinishDate=\"${DAY_PLUS_30}\" /></rows>")"
wait_for_xml_status "seed-demo-xml-success.xml" "Completed"
refresh_xml_inbox
XML_SUCCESS_BATCH_ID="$(xml_item_batch_id_by_file_name "seed-demo-xml-success.xml")"
if [[ -n "$XML_SUCCESS_BATCH_ID" ]]; then
  wait_for_batch_stable_status "$XML_SUCCESS_BATCH_ID"
fi

XML_FAILED_ID="$(ensure_xml_item \
  "seed-demo-xml-failed.xml" \
  "XML-DEMO-FAILED-001" \
  "<rows></rows>")"
wait_for_xml_status "seed-demo-xml-failed.xml" "Failed"

echo "Configuring SLA rules and generating violations..."
api_put "/api/sla/rules" "$(jq -nc '{
  items: [
    {
      purchaseTypeCode: "OPEN_TENDER",
      warningDaysBeforeDue: 3,
      isActive: true,
      description: "Базовый SLA для открытого тендера"
    },
    {
      purchaseTypeCode: "REQUEST_FOR_QUOTATION",
      warningDaysBeforeDue: 2,
      isActive: true,
      description: "Базовый SLA для запроса котировок"
    }
  ]
}')" >/dev/null

api_post_empty "/api/sla/run?sendNotifications=false" >/dev/null
refresh_sla_violations
SLA_REASON_TARGET_ID="$(jq -r '.[] | select(.reasonCode == null) | .id' <<<"$SLA_VIOLATIONS_JSON" | head -n1)"
if [[ -n "$SLA_REASON_TARGET_ID" ]]; then
  api_put "/api/sla/violations/${SLA_REASON_TARGET_ID}/reason" "$(jq -nc '{
    reasonCode: "DATA_DELAY",
    reasonComment: "Причина назначена сид-скриптом для демонстрации механизма классификации."
  }')" >/dev/null
fi

echo
echo "Demo seed completed successfully."
echo "API base: ${API_BASE_URL}"
echo "Local user: ${DEMO_USER_ID} (${DEMO_USER_EMAIL})"
echo

refresh_projects
refresh_contractors
refresh_lots
refresh_procedures
refresh_contracts
refresh_batches
refresh_xml_inbox
refresh_sla_violations

echo "Current counts:"
echo "  Projects:         $(jq 'length' <<<"$PROJECTS_JSON")"
echo "  Contractors:      $(jq 'length' <<<"$CONTRACTORS_JSON")"
echo "  Lots:             $(jq 'length' <<<"$LOTS_JSON")"
echo "  Procedures:       $(jq 'length' <<<"$PROCEDURES_JSON")"
echo "  Contracts:        $(jq 'length' <<<"$CONTRACTS_JSON")"
echo "  Import batches:   $(jq 'length' <<<"$BATCHES_JSON")"
echo "  XML inbox items:  $(jq 'length' <<<"$XML_INBOX_JSON")"
echo "  SLA violations:   $(jq 'length' <<<"$SLA_VIOLATIONS_JSON")"
echo
echo "Stable scenario coverage:"
echo "  Lot statuses:           $(jq -r '[.[] | .status] | unique | join(", ")' <<<"$LOTS_JSON")"
echo "  Procedure statuses:     $(jq -r '[.[] | .status] | unique | join(", ")' <<<"$PROCEDURES_JSON")"
echo "  Contract statuses:      $(jq -r '[.[] | .status] | unique | join(", ")' <<<"$CONTRACTS_JSON")"
echo "  Import batch statuses:  $(jq -r '[.[] | .status] | unique | join(", ")' <<<"$BATCHES_JSON")"
echo "  XML inbox statuses:     $(jq -r '[.[] | .status] | unique | join(", ")' <<<"$XML_INBOX_JSON")"
