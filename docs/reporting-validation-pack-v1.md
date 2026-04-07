# Reporting Validation Pack v1

## Goal

Confirm that KPI API values and SQL analytical views produce consistent aggregates.

## Validation checklist

1. `GET /api/analytics/kpi` returns non-error payload.
2. `GET /api/analytics/views` returns expected view catalog.
3. SQL views are present in DB:
   - run `SELECT name FROM sys.views WHERE name LIKE 'vwAnalytics_%';`.
4. `vwAnalytics_SubcontractingShare` returns exactly one row.
5. `vwAnalytics_ContractorRatings` returns one row per active/not-deleted contractor.
6. Dashboard analytics panel values are aligned with API payload.

## Smoke SQL snippets

```sql
SELECT * FROM vwAnalytics_LotFunnel;
SELECT * FROM vwAnalytics_ContractorLoad;
SELECT * FROM vwAnalytics_SlaMetrics;
SELECT * FROM vwAnalytics_ContractingAmounts;
SELECT * FROM vwAnalytics_MdrProgress;
SELECT * FROM vwAnalytics_SubcontractingShare;
SELECT TOP (20) * FROM vwAnalytics_ContractorRatings ORDER BY CurrentRating DESC;
```

## Result status

Technical validation passed on local integration suite and build pipeline.
