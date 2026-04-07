# Monitoring MDR Import Specification v1

Date: 2026-04-06

## Purpose

Define operator upload flow for updating MDR `forecast/fact` values from CSV/XLSX without full-card replacement.

## API

- `POST /api/contracts/{id}/monitoring/mdr-cards/import-forecast-fact`

## Request payload

```json
{
  "skipConflicts": false,
  "items": [
    {
      "sourceRowNumber": 2,
      "cardTitle": "MDR-Апрель",
      "reportingDate": "2026-04-30",
      "rowCode": "MDR-001",
      "forecastValue": 125,
      "factValue": 98
    }
  ]
}
```

## Matching key

Each import row is matched against existing MDR data by:

- `CardTitle` (case-insensitive, trimmed);
- `ReportingDate` (date-only);
- `RowCode` (case-insensitive, trimmed).

## Validation rules

- contract must be in `Signed` or `Active`;
- for each row:
  - `cardTitle` required;
  - `reportingDate` required;
  - `rowCode` required;
  - `forecastValue` and `factValue` must be non-negative.

## Conflict handling

Conflicts are returned in `conflicts` with `code` and source row:

- `TARGET_NOT_FOUND` — matching MDR row does not exist;
- `DUPLICATE_IMPORT_KEY` — same key appears multiple times in import file;
- `AMBIGUOUS_TARGET` — current MDR dataset has duplicate target rows for one key.

Modes:

- `skipConflicts = false` (strict): any conflict cancels all updates;
- `skipConflicts = true`: valid rows are applied, conflicts are skipped.

## Response payload

```json
{
  "applied": true,
  "totalRows": 10,
  "updatedRows": 8,
  "conflictRows": 2,
  "conflicts": [
    {
      "sourceRowNumber": 11,
      "code": "TARGET_NOT_FOUND",
      "message": "Matching MDR row was not found for key CardTitle + ReportingDate + RowCode.",
      "cardTitle": "MDR-Апрель",
      "reportingDate": "2026-04-30",
      "rowCode": "MDR-999"
    }
  ],
  "cards": []
}
```

`cards` always contains the current server state after import operation.
