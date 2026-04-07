# Contractor Analytics Views v1

## API analytics endpoints

- `GET /api/contractors/rating/analytics`
- `GET /api/analytics/kpi`
- `GET /api/analytics/views`

## BI-oriented SQL view

`vwAnalytics_ContractorRatings` provides:

- contractor identity (`ContractorId`, `Inn`, `Name`);
- operational dimensions (`ContractorStatusCode`, `ReliabilityClassCode`);
- current operational metrics (`CurrentRating`, `CurrentLoadPercent`);
- latest rating-cycle context (`LastFinalScore`, `LastCalculatedAtUtc`, `ModelVersionCode`).

## Typical analytical use cases

- identify top-rated and overloaded contractors;
- track rating freshness by `LastCalculatedAtUtc`;
- compare operational rating (`CurrentRating`) with latest score snapshot (`LastFinalScore / 20`).
