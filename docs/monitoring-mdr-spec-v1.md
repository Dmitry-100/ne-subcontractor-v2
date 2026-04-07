# Monitoring MDR Specification v1

Date: 2026-04-06

## Purpose

Define baseline MDR monitoring model with card header and row-level `plan/forecast/fact` values.

## API

- `GET /api/contracts/{id}/monitoring/mdr-cards`
- `PUT /api/contracts/{id}/monitoring/mdr-cards`

## Request payload (PUT)

```json
{
  "items": [
    {
      "title": "MDR-Апрель",
      "reportingDate": "2026-04-30",
      "sortOrder": 0,
      "notes": "Еженедельный срез",
      "rows": [
        {
          "rowCode": "MDR-001",
          "description": "Разработка КМ",
          "unitCode": "MH",
          "planValue": 100,
          "forecastValue": 120,
          "factValue": 90,
          "sortOrder": 0,
          "notes": null
        }
      ]
    }
  ]
}
```

## Validation rules

- editing is allowed only for contracts in `Signed` or `Active` statuses;
- card:
  - `title` required;
  - `reportingDate` required;
  - `sortOrder` normalized to non-negative.
- row:
  - `rowCode`, `description`, `unitCode` required;
  - `planValue`, `forecastValue`, `factValue` non-negative;
  - `sortOrder` normalized to non-negative.

## Read model and analytics

Response includes:

- row-level:
  - `forecastDeviationPercent = (forecast - plan) / plan * 100`, if `plan > 0`;
  - `factDeviationPercent = (fact - plan) / plan * 100`, if `plan > 0`.
- card-level totals:
  - `totalPlanValue`, `totalForecastValue`, `totalFactValue`;
  - `forecastDeviationPercent` and `factDeviationPercent` from totals.

All percentages are rounded to 2 decimals.

## Notes

- PUT uses replace semantics for the selected contract: previous MDR cards/rows are replaced by provided `items`.
