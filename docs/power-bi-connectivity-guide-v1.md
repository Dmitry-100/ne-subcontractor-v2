# Power BI Connectivity Guide v1

## Recommended source layer

Use analytical SQL views (`vwAnalytics_*`) as dataset sources instead of raw operational tables.

## Connection

1. Open Power BI Desktop.
2. Select SQL Server connector.
3. Configure server/database for `SubcontractorV2`.
4. Use read-only analytical login.
5. Import required views from `dbo` schema.

## Suggested model

- Fact-like sources:
  - `vwAnalytics_ContractingAmounts`
  - `vwAnalytics_MdrProgress`
  - `vwAnalytics_ContractorRatings`
- Aggregate snapshots:
  - `vwAnalytics_LotFunnel`
  - `vwAnalytics_SlaMetrics`
  - `vwAnalytics_SubcontractingShare`

## Refresh guidance

- Pilot mode: 2-4 refreshes per day.
- Production mode: align with background job schedule (rating and SLA cycles).

## Compatibility

Views are designed for SQL Server 2016 and tested through migration-based deployment.
