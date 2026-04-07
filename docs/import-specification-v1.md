# Import Specification v1

Date: 2026-04-06

## Goal

Provide a controlled staging flow for source data import before downstream lotization and planning logic.

## Scope (Sprint 11/12 baseline)

- upload CSV or XLSX file via `/imports` page;
- configure source-to-target column mapping in wizard;
- create import batch in staging storage (queued or synchronous mode);
- store row-level validation outcome (valid/invalid + message);
- list and inspect historical import batches;
- execute operator workflow transitions on batch status;
- download validation report CSV (invalid rows only or full batch).
- build lot recommendations from `ReadyForLotting` batches;
- create draft lots from selected recommendation groups with operator confirmation.

Out of scope for v1:

- direct `.xlsx` parsing on server;
- fully automatic lot creation without operator review.

## Workflow

1. Operator downloads template from `GET /api/imports/source-data/batches/template`.
2. Operator fills data in Excel and saves as CSV or XLSX.
3. Operator opens `/imports`, selects file, and parses source rows.
4. Operator verifies/adjusts column mapping and applies mapping.
5. Operator uploads mapped rows to `POST /api/imports/source-data/batches/queued`.
6. System stores batch with status `Uploaded` and pushes it to asynchronous processing.
7. Worker transitions status to `Processing`, validates each row, and stores:
   - normalized values,
   - `IsValid`,
   - `ValidationMessage`.
8. Batch status becomes:
   - `Validated` (all rows valid), or
   - `ValidatedWithErrors` (one or more invalid rows), or
   - `Failed` (technical processing failure).
9. Operator checks batch details (`GET /api/imports/source-data/batches/{id}`).
10. Operator can:
   - run workflow action (`POST /api/imports/source-data/batches/{id}/transition`);
   - inspect status history (`GET /api/imports/source-data/batches/{id}/history`);
   - download validation report (`GET /api/imports/source-data/batches/{id}/validation-report`);
   - download lot reconciliation report (`GET /api/imports/source-data/batches/{id}/lot-reconciliation-report`).
11. For `ReadyForLotting` batch operator builds recommendation groups:
    - `GET /api/lots/recommendations/import-batches/{id}`.
12. Operator applies selected groups to create draft lots:
    - `POST /api/lots/recommendations/import-batches/{id}/apply`.

## Batch lifecycle

- `Uploaded`:
  batch is queued for asynchronous processing.
- `Processing`:
  worker validates and normalizes rows.
- `Validated`:
  all rows passed validation.
- `ValidatedWithErrors`:
  at least one row failed validation.
- `ReadyForLotting`:
  operator confirms batch is ready for downstream lotization.
- `Rejected`:
  operator rejects batch (reason required).
- `Failed`:
  technical processing failure (batch requires re-upload or retry operation).

Allowed transitions:

- `Uploaded` -> `Processing`;
- `Processing` -> `Validated` or `ValidatedWithErrors` or `Failed`;
- `Validated` -> `ReadyForLotting` or `Rejected`;
- `ValidatedWithErrors` -> `Rejected`;
- `ReadyForLotting` -> `Rejected`;
- transitions are written to batch status history for audit.

## Security

- read access: `imports.read`;
- create/upload access: `imports.write`.
