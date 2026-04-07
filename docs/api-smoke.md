# API Smoke Scenarios

These commands are intended for local smoke checks after build and run.

Note: project and contractor endpoints require authenticated user plus matching permission policy.
Without configured AD/LDAP identity and mapped user roles, requests may return `401` or `403`.

Admin note:

- users and roles endpoints require `users.read` / `users.write`;
- first bootstrap admin can be granted through `Security:BootstrapAdminLogins`.

## Projects

```bash
curl -k -X POST https://localhost:5001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"code":"PRJ-001","name":"Pilot Project","gipUserId":null}'
```

```bash
curl -k https://localhost:5001/api/projects
```

## Contractors

```bash
curl -k -X POST https://localhost:5001/api/contractors \
  -H "Content-Type: application/json" \
  -d '{
    "inn":"7701234567",
    "name":"Test Contractor LLC",
    "city":"Moscow",
    "contactName":"Ivan Ivanov",
    "phone":"+7-900-000-00-00",
    "email":"test.contractor@example.com",
    "capacityHours":1200,
    "currentRating":1.0,
    "currentLoadPercent":0,
    "manualSupportCoefficient":1.05,
    "reliabilityClass":"New",
    "status":"Active",
    "disciplineCodes":["PIPING","ELECTRICAL"]
  }'
```

```bash
curl -k https://localhost:5001/api/contractors
```

```bash
curl -k -X POST https://localhost:5001/api/contractors/recalculate-load
```

```bash
curl -k https://localhost:5001/api/contractors/rating/model
```

```bash
curl -k -X PUT https://localhost:5001/api/contractors/rating/model \
  -H "Content-Type: application/json" \
  -d '{
    "versionCode":"R-20261220-01",
    "name":"Rating model v1",
    "notes":"Smoke update",
    "weights":[
      {"factorCode":"DeliveryDiscipline","weight":0.30},
      {"factorCode":"CommercialDiscipline","weight":0.20},
      {"factorCode":"ClaimDiscipline","weight":0.15},
      {"factorCode":"ManualExpertEvaluation","weight":0.25},
      {"factorCode":"WorkloadPenalty","weight":0.10}
    ]
  }'
```

```bash
curl -k -X POST https://localhost:5001/api/contractors/rating/recalculate \
  -H "Content-Type: application/json" \
  -d '{"includeInactiveContractors":false,"reason":"Manual smoke recalculation"}'
```

```bash
curl -k -X POST https://localhost:5001/api/contractors/{CONTRACTOR_ID}/rating/manual-assessment \
  -H "Content-Type: application/json" \
  -d '{"score":4.7,"comment":"Manual smoke assessment"}'
```

```bash
curl -k https://localhost:5001/api/contractors/{CONTRACTOR_ID}/rating/history
```

```bash
curl -k https://localhost:5001/api/contractors/rating/analytics
```

## Reference data

```bash
curl -k -X PUT https://localhost:5001/api/reference-data/DISCIPLINES/items \
  -H "Content-Type: application/json" \
  -d '{"itemCode":"PIPING","displayName":"Piping","sortOrder":10,"isActive":true}'
```

```bash
curl -k https://localhost:5001/api/reference-data/DISCIPLINES/items
```

## Users administration

```bash
curl -k https://localhost:5001/api/admin/users
```

```bash
curl -k https://localhost:5001/api/admin/roles
```

## Source data imports (Sprint 11 staging + async processing)

```bash
curl -k https://localhost:5001/api/imports/source-data/batches/template
```

```bash
curl -k -X POST https://localhost:5001/api/imports/source-data/batches/queued \
  -H "Content-Type: application/json" \
  -d '{
    "fileName":"source-data-2026-09-07.xlsx",
    "notes":"Pilot batch",
    "rows":[
      {
        "rowNumber":1,
        "projectCode":"PRJ-001",
        "objectWbs":"A.01.02",
        "disciplineCode":"PIPING",
        "manHours":240.5,
        "plannedStartDate":"2026-09-10",
        "plannedFinishDate":"2026-10-05"
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/imports/source-data/batches
```

```bash
curl -k https://localhost:5001/api/imports/source-data/batches/{BATCH_ID}
```

```bash
curl -k -X POST https://localhost:5001/api/imports/source-data/batches/{BATCH_ID}/transition \
  -H "Content-Type: application/json" \
  -d '{"targetStatus":"ReadyForLotting","reason":""}'
```

```bash
curl -k -X POST https://localhost:5001/api/imports/source-data/batches/{BATCH_ID}/transition \
  -H "Content-Type: application/json" \
  -d '{"targetStatus":"Rejected","reason":"Validation issues confirmed by operator"}'
```

```bash
curl -k https://localhost:5001/api/imports/source-data/batches/{BATCH_ID}/history
```

```bash
curl -k https://localhost:5001/api/imports/source-data/batches/{BATCH_ID}/validation-report
```

```bash
curl -k "https://localhost:5001/api/imports/source-data/batches/{BATCH_ID}/validation-report?includeValidRows=true"
```

```bash
curl -k https://localhost:5001/api/imports/source-data/batches/{BATCH_ID}/lot-reconciliation-report
```

```bash
curl -k -X POST https://localhost:5001/api/imports/source-data/xml/inbox \
  -H "Content-Type: application/json" \
  -d '{
    "sourceSystem":"ExpressPlanning",
    "externalDocumentId":"DOC-2026-09-21-001",
    "fileName":"express-plan-2026-09-21.xml",
    "xmlContent":"<rows><row rowNumber=\"1\" projectCode=\"PRJ-001\" objectWbs=\"A.01.02\" disciplineCode=\"PIPING\" manHours=\"240.5\" plannedStartDate=\"2026-09-10\" plannedFinishDate=\"2026-10-05\" /></rows>"
  }'
```

```bash
curl -k https://localhost:5001/api/imports/source-data/xml/inbox
```

```bash
curl -k https://localhost:5001/api/imports/source-data/xml/inbox/{XML_ITEM_ID}
```

```bash
curl -k -X POST https://localhost:5001/api/imports/source-data/xml/inbox/{XML_ITEM_ID}/retry
```

## Lots

```bash
curl -k -X POST https://localhost:5001/api/lots \
  -H "Content-Type: application/json" \
  -d '{
    "code":"LOT-001",
    "name":"Pilot lot",
    "responsibleCommercialUserId":null,
    "items":[
      {
        "projectId":"11111111-1111-1111-1111-111111111111",
        "objectWbs":"A.01.02",
        "disciplineCode":"PIPING",
        "manHours":240.5,
        "plannedStartDate":"2026-05-01",
        "plannedFinishDate":"2026-06-15"
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/lots
```

```bash
curl -k -X POST https://localhost:5001/api/lots/{LOT_ID}/transition \
  -H "Content-Type: application/json" \
  -d '{"targetStatus":"InProcurement","reason":""}'
```

```bash
curl -k -X POST https://localhost:5001/api/lots/{LOT_ID}/transition \
  -H "Content-Type: application/json" \
  -d '{"targetStatus":"Draft","reason":"Correction required"}'
```

```bash
curl -k https://localhost:5001/api/lots/{LOT_ID}/history
```

```bash
curl -k https://localhost:5001/api/lots/recommendations/import-batches/{BATCH_ID}
```

```bash
curl -k -X POST https://localhost:5001/api/lots/recommendations/import-batches/{BATCH_ID}/apply \
  -H "Content-Type: application/json" \
  -d '{
    "groups":[
      {
        "groupKey":"PRJ-001|PIPING",
        "lotCode":"LOT-PRJ001-PIPING-01",
        "lotName":"PRJ-001 / PIPING / 2 item(s)"
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/imports/source-data/batches/{BATCH_ID}/lot-reconciliation-report
```

## Procurement procedures

Note: procedure creation expects `LOT_ID` in status `InProcurement`.

```bash
curl -k -X POST https://localhost:5001/api/procedures \
  -H "Content-Type: application/json" \
  -d '{
    "lotId":"{LOT_ID}",
    "requestDate":"2026-06-20",
    "purchaseTypeCode":"OPEN_TENDER",
    "initiatorUserId":null,
    "responsibleCommercialUserId":null,
    "objectName":"Main compressor station",
    "workScope":"Detailed design works for stage P",
    "customerName":"NLMK",
    "leadOfficeCode":"MSK",
    "analyticsLevel1Code":"A1",
    "analyticsLevel2Code":"A2",
    "analyticsLevel3Code":"A3",
    "analyticsLevel4Code":"A4",
    "analyticsLevel5Code":"A5",
    "requiredSubcontractorDeadline":"2026-08-10",
    "proposalDueDate":"2026-07-01",
    "plannedBudgetWithoutVat":1200000.00,
    "notes":"Initial request",
    "approvalMode":"InSystem",
    "approvalRouteCode":"ROUTE-DEFAULT",
    "containsConfidentialInfo":false,
    "requiresTechnicalNegotiations":true,
    "attachmentFileIds":[]
  }'
```

```bash
curl -k https://localhost:5001/api/procedures
```

```bash
curl -k -X POST https://localhost:5001/api/procedures/{PROCEDURE_ID}/transition \
  -H "Content-Type: application/json" \
  -d '{"targetStatus":"DocumentsPreparation","reason":""}'
```

```bash
curl -k -X POST https://localhost:5001/api/procedures/{PROCEDURE_ID}/transition \
  -H "Content-Type: application/json" \
  -d '{"targetStatus":"Created","reason":"Need request corrections"}'
```

```bash
curl -k https://localhost:5001/api/procedures/{PROCEDURE_ID}/history
```

### In-system approval route

```bash
curl -k -X PUT https://localhost:5001/api/procedures/{PROCEDURE_ID}/approval/steps \
  -H "Content-Type: application/json" \
  -d '{
    "steps":[
      {
        "stepOrder":1,
        "stepTitle":"Commercial lead approval",
        "approverUserId":null,
        "approverRoleName":"Commercial",
        "isRequired":true
      },
      {
        "stepOrder":2,
        "stepTitle":"Tender commission approval",
        "approverUserId":null,
        "approverRoleName":"TenderCommission",
        "isRequired":true
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/procedures/{PROCEDURE_ID}/approval/steps
```

```bash
curl -k -X POST https://localhost:5001/api/procedures/{PROCEDURE_ID}/approval/steps/{STEP_ID}/decision \
  -H "Content-Type: application/json" \
  -d '{"decisionStatus":"Approved","comment":"Approved"}'
```

### External approval

```bash
curl -k -X PUT https://localhost:5001/api/procedures/{PROCEDURE_ID}/approval/external \
  -H "Content-Type: application/json" \
  -d '{
    "isApproved":true,
    "decisionDate":"2026-07-10",
    "responsibleUserId":null,
    "protocolFileId":null,
    "comment":"Approved by external route"
  }'
```

### Shortlist

```bash
curl -k -X PUT https://localhost:5001/api/procedures/{PROCEDURE_ID}/shortlist \
  -H "Content-Type: application/json" \
  -d '{
    "items":[
      {
        "contractorId":"22222222-2222-2222-2222-222222222222",
        "isIncluded":true,
        "sortOrder":10,
        "exclusionReason":null,
        "notes":"Primary candidate"
      },
      {
        "contractorId":"33333333-3333-3333-3333-333333333333",
        "isIncluded":false,
        "sortOrder":20,
        "exclusionReason":"Insufficient qualification",
        "notes":"Excluded at shortlist stage"
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/procedures/{PROCEDURE_ID}/shortlist
```

```bash
curl -k https://localhost:5001/api/procedures/{PROCEDURE_ID}/shortlist/recommendations
```

```bash
curl -k -X POST https://localhost:5001/api/procedures/{PROCEDURE_ID}/shortlist/recommendations/apply \
  -H "Content-Type: application/json" \
  -d '{
    "maxIncluded":5,
    "adjustmentReason":"Auto shortlist baseline"
  }'
```

```bash
curl -k https://localhost:5001/api/procedures/{PROCEDURE_ID}/shortlist/adjustments
```

### Offers

Note: first offer upload automatically moves procedure from `Sent` or `Retender` to `OffersReceived`.

```bash
curl -k -X PUT https://localhost:5001/api/procedures/{PROCEDURE_ID}/offers \
  -H "Content-Type: application/json" \
  -d '{
    "items":[
      {
        "contractorId":"22222222-2222-2222-2222-222222222222",
        "offerNumber":"OF-001",
        "receivedDate":"2026-07-20",
        "amountWithoutVat":1000000.00,
        "vatAmount":200000.00,
        "totalAmount":1200000.00,
        "durationDays":60,
        "currencyCode":"RUB",
        "qualificationStatus":"Qualified",
        "decisionStatus":"Shortlisted",
        "offerFileId":null,
        "notes":"Commercially best offer"
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/procedures/{PROCEDURE_ID}/offers
```

### Comparison

```bash
curl -k https://localhost:5001/api/procedures/{PROCEDURE_ID}/comparison
```

### Outcome

Note: non-canceled outcome moves procedure to `DecisionMade`, canceled outcome moves it to `Retender`.
Procedure transition to `Completed` requires one contract bound to this procedure.

```bash
curl -k -X PUT https://localhost:5001/api/procedures/{PROCEDURE_ID}/outcome \
  -H "Content-Type: application/json" \
  -d '{
    "winnerContractorId":"22222222-2222-2222-2222-222222222222",
    "decisionDate":"2026-07-25",
    "protocolFileId":null,
    "isCanceled":false,
    "cancellationReason":null,
    "comment":"Winner approved by committee"
  }'
```

```bash
curl -k https://localhost:5001/api/procedures/{PROCEDURE_ID}/outcome
```

```bash
curl -k -X POST https://localhost:5001/api/contracts/procedures/{PROCEDURE_ID}/draft \
  -H "Content-Type: application/json" \
  -d '{
    "contractNumber":"SC-2026-001",
    "signingDate":"2026-07-30",
    "startDate":"2026-08-01",
    "endDate":"2026-12-31"
  }'
```

```bash
curl -k -X POST https://localhost:5001/api/procedures/{PROCEDURE_ID}/transition \
  -H "Content-Type: application/json" \
  -d '{"targetStatus":"Completed","reason":""}'
```

## Contracts

Status changes are handled via transition endpoint; `PUT /api/contracts/{id}` updates mutable contract fields only.
Execution milestones can be edited only for `Signed`/`Active` contracts.
Transition to `Closed` is blocked when overdue milestones exist.

```bash
curl -k https://localhost:5001/api/contracts
```

```bash
curl -k https://localhost:5001/api/contracts/{CONTRACT_ID}
```

```bash
curl -k -X POST https://localhost:5001/api/contracts/{CONTRACT_ID}/transition \
  -H "Content-Type: application/json" \
  -d '{"targetStatus":"OnApproval","reason":""}'
```

```bash
curl -k https://localhost:5001/api/contracts/{CONTRACT_ID}/history
```

```bash
curl -k https://localhost:5001/api/contracts/{CONTRACT_ID}/execution
```

```bash
curl -k https://localhost:5001/api/contracts/{CONTRACT_ID}/milestones
```

```bash
curl -k -X PUT https://localhost:5001/api/contracts/{CONTRACT_ID}/milestones \
  -H "Content-Type: application/json" \
  -d '{
    "items":[
      {
        "title":"Design package",
        "plannedDate":"2026-08-10",
        "actualDate":null,
        "progressPercent":40,
        "sortOrder":0,
        "notes":"Waiting for customer input"
      },
      {
        "title":"IFC issue",
        "plannedDate":"2026-08-20",
        "actualDate":null,
        "progressPercent":0,
        "sortOrder":1,
        "notes":null
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/contracts/{CONTRACT_ID}/monitoring/control-points
```

```bash
curl -k -L -o control-points-template.csv https://localhost:5001/api/contracts/monitoring/templates/control-points
```

```bash
curl -k -X PUT https://localhost:5001/api/contracts/{CONTRACT_ID}/monitoring/control-points \
  -H "Content-Type: application/json" \
  -d '{
    "items":[
      {
        "name":"КП-01. Документация",
        "responsibleRole":"PM",
        "plannedDate":"2026-10-05",
        "forecastDate":"2026-10-08",
        "actualDate":null,
        "progressPercent":45,
        "sortOrder":0,
        "notes":"Первичная версия",
        "stages":[
          {
            "name":"Стадия P",
            "plannedDate":"2026-09-28",
            "forecastDate":"2026-10-02",
            "actualDate":null,
            "progressPercent":70,
            "sortOrder":0,
            "notes":null
          }
        ]
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/contracts/{CONTRACT_ID}/monitoring/mdr-cards
```

```bash
curl -k -L -o mdr-template.csv https://localhost:5001/api/contracts/monitoring/templates/mdr-cards
```

```bash
curl -k -X POST https://localhost:5001/api/contracts/{CONTRACT_ID}/monitoring/mdr-cards/import-forecast-fact \
  -H "Content-Type: application/json" \
  -d '{
    "skipConflicts": false,
    "items":[
      {
        "sourceRowNumber": 2,
        "cardTitle":"MDR-Апрель",
        "reportingDate":"2026-04-30",
        "rowCode":"MDR-001",
        "forecastValue":125,
        "factValue":98
      }
    ]
  }'
```

```bash
curl -k -X PUT https://localhost:5001/api/contracts/{CONTRACT_ID}/monitoring/mdr-cards \
  -H "Content-Type: application/json" \
  -d '{
    "items":[
      {
        "title":"MDR-Апрель",
        "reportingDate":"2026-04-30",
        "sortOrder":0,
        "notes":"Еженедельный срез",
        "rows":[
          {
            "rowCode":"MDR-001",
            "description":"Разработка КМ",
            "unitCode":"MH",
            "planValue":100,
            "forecastValue":120,
            "factValue":90,
            "sortOrder":0,
            "notes":null
          }
        ]
      }
    ]
  }'
```

## SLA

```bash
curl -k https://localhost:5001/api/sla/rules
```

```bash
curl -k -X PUT https://localhost:5001/api/sla/rules \
  -H "Content-Type: application/json" \
  -d '{
    "items":[
      {
        "purchaseTypeCode":"OPEN",
        "warningDaysBeforeDue":2,
        "isActive":true,
        "description":"Открытая процедура"
      }
    ]
  }'
```

```bash
curl -k https://localhost:5001/api/sla/violations?includeResolved=false
```

```bash
curl -k -X PUT https://localhost:5001/api/sla/violations/{VIOLATION_ID}/reason \
  -H "Content-Type: application/json" \
  -d '{
    "reasonCode":"DOC_DELAY",
    "reasonComment":"Ожидание подписанного приложения"
  }'
```

```bash
curl -k -X POST "https://localhost:5001/api/sla/run?sendNotifications=true"
```

## Dashboard

```bash
curl -k https://localhost:5001/api/dashboard/summary
```

## Analytics

```bash
curl -k https://localhost:5001/api/analytics/kpi
```

```bash
curl -k https://localhost:5001/api/analytics/views
```

## Exports

```bash
curl -k -L -o projects.csv https://localhost:5001/api/exports/projects
```

```bash
curl -k -L -o contractors.csv "https://localhost:5001/api/exports/contractors?search=engineering"
```

```bash
curl -k -L -o lots.csv "https://localhost:5001/api/exports/lots?status=InProcurement"
```

```bash
curl -k -L -o procedures.csv "https://localhost:5001/api/exports/procedures?status=OnApproval"
```

```bash
curl -k -L -o contracts.csv "https://localhost:5001/api/exports/contracts?status=Active"
```
