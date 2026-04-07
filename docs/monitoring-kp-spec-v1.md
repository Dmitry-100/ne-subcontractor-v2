# Monitoring KP Specification v1

Date: 2026-04-06

## Purpose

Define the baseline contract monitoring model for control points (KP) and nested stages.

## API

- `GET /api/contracts/{id}/monitoring/control-points`
- `PUT /api/contracts/{id}/monitoring/control-points`

## Request payload (PUT)

```json
{
  "items": [
    {
      "name": "КП-01. Документация",
      "responsibleRole": "PM",
      "plannedDate": "2026-10-05",
      "forecastDate": "2026-10-08",
      "actualDate": null,
      "progressPercent": 45,
      "sortOrder": 0,
      "notes": "Первичная версия",
      "stages": [
        {
          "name": "Стадия P",
          "plannedDate": "2026-09-28",
          "forecastDate": "2026-10-02",
          "actualDate": null,
          "progressPercent": 70,
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
- control point:
  - `name` required;
  - `plannedDate` required;
  - `progressPercent` in `0..100`;
  - `sortOrder` normalized to non-negative.
- stage:
  - `name` required;
  - `plannedDate` required;
  - `progressPercent` in `0..100`;
  - `sortOrder` normalized to non-negative.

## Read model

Response adds computed field `isDelayed`:

- stage is delayed when `progressPercent < 100` and `(forecastDate ?? plannedDate) < today`;
- control point is delayed when delayed itself or any stage is delayed.

## Notes

- PUT uses replace semantics for the selected contract: previous control points/stages are replaced by provided `items`.
