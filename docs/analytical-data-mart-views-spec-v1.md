# Analytical Data Mart / Views Specification v1

## Implemented SQL views (Migration `AddAnalyticsViews0017`)

- `vwAnalytics_LotFunnel`
- `vwAnalytics_ContractorLoad`
- `vwAnalytics_SlaMetrics`
- `vwAnalytics_ContractingAmounts`
- `vwAnalytics_MdrProgress`
- `vwAnalytics_SubcontractingShare`
- `vwAnalytics_ContractorRatings`

## Design principles

- read-only analytical projections over operational tables;
- stable column naming for BI usage;
- no write-back logic in views;
- predictable grain per view.

## Grains

- `LotFunnel`: one row per lot status.
- `ContractorLoad`: one row per contractor.
- `SlaMetrics`: one row per (`Severity`, `IsResolved`).
- `ContractingAmounts`: one row per contract status.
- `MdrProgress`: one row per MDR card.
- `SubcontractingShare`: one global aggregate row.
- `ContractorRatings`: one row per contractor with latest rating context.

## Consumption

- dashboard KPI API (`/api/analytics/kpi`);
- ad-hoc SQL for analytical users;
- Power BI dataset based on view layer.
