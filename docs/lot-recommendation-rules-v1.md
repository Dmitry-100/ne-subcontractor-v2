# Lot Recommendation Rules v1

## Scope

This document describes how draft lot recommendations are built from source-data import batches and how selected recommendations are applied to create draft lots.

## Entry conditions

- Source-data batch must exist.
- Recommendations can be built for any batch, but draft-lot creation is allowed only when batch status is `ReadyForLotting`.
- Only source rows marked as valid are used as recommendation candidates.

## Grouping rules

- Recommendation grouping key: `projectCode + disciplineCode`.
- Group key format in API payload: `<PROJECT_CODE>|<DISCIPLINE_CODE>`.
- Row order inside group: by `rowNumber`, then by row id.

## Suggested lot fields

- `SuggestedLotCode` pattern: `LOT-{PROJECT}-{DISCIPLINE}-{NN}` with normalization and uniqueness inside recommendation response.
- `SuggestedLotName` pattern: `{PROJECT} / {DISCIPLINE} / {ITEMS_COUNT} item(s)`.
- UI allows operator to override `lotCode` and `lotName` per selected group before apply.

## Apply behavior

- Endpoint: `POST /api/lots/recommendations/import-batches/{batchId}/apply`.
- Request includes selected groups with optional `lotCode` / `lotName` overrides.
- For each selected group:
  - create `Lot` with status `Draft`;
  - create initial `LotStatusHistory` record (`null -> Draft`);
  - map all recommendation rows into lot items.

## Skip/validation rules during apply

Group is skipped when:

- one or more rows cannot be mapped to existing project id;
- resulting lot code already exists;
- batch is not in `ReadyForLotting` status (operation rejected before processing groups).

## Result contract

- `createdLots`: successfully created draft lots.
- `skippedGroups`: groups not created with explicit reason.
- `requestedGroups`: number of selected groups sent in request.

## Traceability export

- Every processed recommendation group (`created` or `skipped`) is persisted in reconciliation trace storage.
- Export endpoint:
  - `GET /api/imports/source-data/batches/{id}/lot-reconciliation-report`
- Export includes batch/group/lot linkage, operator, operation id, requested lot values, and skip reason when applicable.

## Operational notes

- Recommendations are deterministic for a given batch content.
- Re-running apply without changing codes can produce skips because codes may already exist.
- Recommended operator flow:
  1. Build recommendations.
  2. Adjust selected groups and lot code/name if needed.
  3. Apply and verify created lots in `/lots`.
