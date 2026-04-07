# Source-to-Lot Mapping Design v1

## Objective

Provide a controlled path from validated source-data imports to draft lots, with operator confirmation and traceable mapping.

## End-to-end flow

1. Source data is uploaded (CSV/XLSX) or received via XML inbox.
2. Batch is asynchronously validated and transitioned to `ReadyForLotting`.
3. Operator opens `/imports`, selects batch, builds lot recommendations.
4. Operator selects recommendation groups, adjusts lot code/name if needed, applies creation.
5. System creates draft lots and initial lot-status history records.

## Components

- `SourceDataImportBatch` / `SourceDataImportRow`: staging + validation source.
- `LotRecommendationsService`: recommendation build + apply orchestration.
- `LotRecommendationsController`: API contract for UI.
- `/imports` page (`imports-page.js`): two-panel recommendation UX.

## Mapping model

### Group level

- Group key: `projectCode + disciplineCode`.
- Group fields:
  - `groupKey`
  - `suggestedLotCode`
  - `suggestedLotName`
  - `rowsCount`
  - `totalManHours`
  - date range (`plannedStartDate`, `plannedFinishDate`)

### Row to lot-item mapping

- `row.projectCode` -> resolved `projectId` (mandatory for apply).
- `row.objectWbs` -> `LotItem.objectWbs`.
- `row.disciplineCode` -> `LotItem.disciplineCode`.
- `row.manHours` -> `LotItem.manHours`.
- `row.plannedStartDate` -> `LotItem.plannedStartDate`.
- `row.plannedFinishDate` -> `LotItem.plannedFinishDate`.

## API sequence

- Build:
  - `GET /api/lots/recommendations/import-batches/{batchId}`
  - returns recommendation groups and apply availability (`canApply`).
- Apply:
  - `POST /api/lots/recommendations/import-batches/{batchId}/apply`
  - accepts selected group set with optional lot code/name overrides.
  - returns created lots and skipped groups.

## UX behavior in `/imports`

- Left panel:
  - recommendation groups generated from batch;
  - checkbox selection for groups to apply.
- Right panel:
  - selected groups only;
  - editable lot code and lot name.
- Apply is enabled only when:
  - a batch is selected;
  - recommendations are built for that batch;
  - batch is `ReadyForLotting`;
  - at least one group is selected.

## Traceability and audit

- Batch status history tracks transition to `ReadyForLotting`.
- Each created lot receives a `LotStatusHistory` entry with creation reason containing source batch/group.
- `SourceDataLotReconciliationRecord` persists each apply-group result with linkage:
  - source batch id;
  - recommendation group key (`projectCode|disciplineCode`);
  - requested lot code/name;
  - created lot id (for successful apply) or skip reason;
  - operator and operation timestamp (`CreatedBy`, `CreatedAtUtc`, `ApplyOperationId`).
- Apply response provides explicit `createdLots` and `skippedGroups` for operator reconciliation.
- CSV export endpoint `GET /api/imports/source-data/batches/{id}/lot-reconciliation-report` provides downloadable reconciliation evidence.

## Known limitations (v1)

- Row-level relation table from individual source row id to created lot item id is not implemented yet (traceability is stored on recommendation-group level).
- No built-in rollback of created lots from the same apply operation.
- UI-level conflict precheck for duplicate lot code is not implemented; conflict is handled on apply response.
