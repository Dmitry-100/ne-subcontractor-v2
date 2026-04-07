# Import Data Contract v1

Date: 2026-04-06

## API endpoint

`POST /api/imports/source-data/batches`

Primary asynchronous endpoint:

`POST /api/imports/source-data/batches/queued`

Related endpoints:

- `GET /api/imports/source-data/batches`
- `GET /api/imports/source-data/batches/{id}`
- `POST /api/imports/source-data/batches/{id}/transition`
- `GET /api/imports/source-data/batches/{id}/history`
- `GET /api/imports/source-data/batches/{id}/validation-report`
- `GET /api/imports/source-data/batches/{id}/lot-reconciliation-report`
- `POST /api/imports/source-data/xml/inbox` (see `docs/xml-contract-specification-v1.md`)

## Request payload

```json
{
  "fileName": "source-data-2026-09-07.csv",
  "notes": "Pilot batch",
  "rows": [
    {
      "rowNumber": 1,
      "projectCode": "PRJ-001",
      "objectWbs": "A.01.02",
      "disciplineCode": "PIPING",
      "manHours": 240.5,
      "plannedStartDate": "2026-09-10",
      "plannedFinishDate": "2026-10-05"
    }
  ]
}
```

## Field definitions

- `fileName` (string, required): source CSV file name for audit trace.
- `notes` (string, optional): operator comment.
- `rows` (array, required, min 1): imported data rows.
- `rowNumber` (int): original line number in source file.
- `projectCode` (string, required): project code, must exist in project registry.
- `objectWbs` (string, required): object WBS code.
- `disciplineCode` (string, required): discipline code.
- `manHours` (decimal, required): non-negative value.
- `plannedStartDate` / `plannedFinishDate` (date, optional): ISO date (`YYYY-MM-DD`).

## Validation rules

Server-side:

1. `fileName` is required.
2. At least one row is required.
3. `projectCode` must be non-empty and reference existing project.
4. `objectWbs` and `disciplineCode` must be non-empty.
5. `manHours` must be non-negative.
6. If both dates present, `plannedStartDate <= plannedFinishDate`.

Batch status logic:

- no invalid rows -> `Validated`;
- one or more invalid rows -> `ValidatedWithErrors`.

Asynchronous lifecycle:

- queued upload -> `Uploaded`;
- worker starts processing -> `Processing`;
- successful validation -> `Validated` or `ValidatedWithErrors`;
- technical failure -> `Failed`.

Operator workflow statuses:

- `Validated` -> `ReadyForLotting` or `Rejected`;
- `ValidatedWithErrors` -> `Rejected`;
- `ReadyForLotting` -> `Rejected`.

Transition request payload (`POST /api/imports/source-data/batches/{id}/transition`):

```json
{
  "targetStatus": "Rejected",
  "reason": "Validation issues confirmed by operator"
}
```

Rules:

- `targetStatus` must differ from current status;
- `reason` is required when target status is `Rejected`;
- successful transition creates status-history audit record.

Validation report export:

- invalid rows only: `GET /api/imports/source-data/batches/{id}/validation-report`;
- full report (valid + invalid): `GET /api/imports/source-data/batches/{id}/validation-report?includeValidRows=true`.

Lot reconciliation export:

- endpoint: `GET /api/imports/source-data/batches/{id}/lot-reconciliation-report`;
- returns CSV with traceability chain `batch -> recommendation group -> created/skipped lot result`;
- includes operation id, operator, requested lot code/name, row count, man-hours, and skip reason (if skipped).

Queued upload behavior (`POST /api/imports/source-data/batches/queued`):

- request payload is same as synchronous endpoint;
- response is `201 Created` with initial status `Uploaded`;
- row validation is completed asynchronously by worker.

## CSV template columns

`RowNumber,ProjectCode,ObjectWbs,DisciplineCode,ManHours,PlannedStartDate,PlannedFinishDate`

## Wizard mapping behavior

- upload supports `.csv`, `.txt`, `.xlsx`, `.xls`;
- wizard auto-detects mappings by header names and allows manual override;
- required target fields:
  - `ProjectCode`,
  - `ObjectWbs`,
  - `DisciplineCode`,
  - `ManHours`.
