# Explainability Note: Shortlist Recommendations v1

## Purpose

Document why contractor is recommended or excluded by auto-shortlist logic.

## Explainability payload

Recommendation item contains:

- `IsRecommended` (true/false);
- `Score`;
- `HasRequiredQualifications`;
- `MissingDisciplineCodes`;
- `DecisionFactors[]` (human-readable factors).

## Typical decision factors

- positive:
  - "Все требуемые квалификации подтверждены."
  - "Рекомендован к включению в shortlist."
- negative:
  - "Подрядчик не активен."
  - "Класс надежности D."
  - "Не хватает квалификаций: ...".
  - "Загрузка превышает 100%."

## Manual correction traceability

Any shortlist update over an existing shortlist creates adjustment logs in:

- `ProcedureShortlistAdjustmentLogsSet`

Log includes:

- previous/new inclusion state;
- previous/new sort order;
- previous/new exclusion reason;
- operation reason (`AdjustmentReason`);
- operator and timestamp.

Read API:

- `GET /api/procedures/{id}/shortlist/adjustments`
