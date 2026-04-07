# Validation Rules for Source Data v1

Date: 2026-04-06

## Scope

Rules are applied during asynchronous batch processing after queued upload (`POST /api/imports/source-data/batches/queued`) and stored at row level.

## Batch-level rules

1. `fileName` is required.
2. `rows` must contain at least one row.

## Row-level rules

1. `projectCode` is required and must exist in project registry.
2. `objectWbs` is required.
3. `disciplineCode` is required.
4. `manHours` must be non-negative.
5. If both dates are present: `plannedStartDate <= plannedFinishDate`.

## Resulting statuses

- queued batch -> `Uploaded`;
- worker is validating rows -> `Processing`;
- all rows valid -> `Validated`;
- at least one invalid row -> `ValidatedWithErrors`.
- technical processing failure -> `Failed`.

Operator workflow statuses:

- `Validated` -> `ReadyForLotting` or `Rejected`;
- `ValidatedWithErrors` -> `Rejected`;
- `ReadyForLotting` -> `Rejected`.

`Rejected` transition requires reason.
