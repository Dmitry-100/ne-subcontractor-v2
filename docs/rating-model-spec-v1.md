# Rating Model Specification v1

## Scope

Sprint 16 baseline for controlled contractor rating with model versioning, history tracking, and manual expert adjustment.

## Domain entities

- `ContractorRatingModelVersion`: model header (`VersionCode`, `Name`, `IsActive`, `ActivatedAtUtc`, `Notes`).
- `ContractorRatingWeight`: per-factor normalized weight (`FactorCode`, `Weight`, `Notes`).
- `ContractorRatingManualAssessment`: GIP manual score (`Score` in range `0..5`) with optional comment.
- `ContractorRatingHistoryEntry`: immutable calculation snapshot for each rating cycle.

## Calculation factors

- `DeliveryDiscipline`
- `CommercialDiscipline`
- `ClaimDiscipline`
- `ManualExpertEvaluation`
- `WorkloadPenalty`

Each factor contributes to final score using normalized weights (sum = `1.0`).

## API

- `GET /api/contractors/rating/model`
- `PUT /api/contractors/rating/model`
- `POST /api/contractors/rating/recalculate`
- `POST /api/contractors/{id}/rating/manual-assessment`
- `GET /api/contractors/{id}/rating/history`
- `GET /api/contractors/rating/analytics`

## UI

- `/contractors` page contains:
  - active model editor;
  - manual assessment form;
  - history grid for selected contractor;
  - contractor analytics grid with current rating and delta.

## Persistence

- Migration: `20260406223549_AddContractorRatingFoundation0016`.
- All rating writes are auditable (`CreatedAtUtc`, `CreatedBy`, `LastModified*`).
