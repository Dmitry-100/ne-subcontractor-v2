# Rating History Schema v1

## Tables

## `ContractorRatingModelVersionsSet`

- Key: `Id`
- Unique: `VersionCode`
- Operational indexes:
  - `IsActive`
  - `(IsActive, CreatedAtUtc)`

## `ContractorRatingWeightsSet`

- Key: `Id`
- Unique: `(ModelVersionId, FactorCode)`
- FK: `ModelVersionId -> ContractorRatingModelVersionsSet(Id)` (cascade delete)

## `ContractorRatingManualAssessmentsSet`

- Key: `Id`
- Indexes:
  - `ContractorId`
  - `ModelVersionId`
  - `(ContractorId, CreatedAtUtc)`
- FK:
  - `ContractorId -> ContractorsSet(Id)` (cascade delete)
  - `ModelVersionId -> ContractorRatingModelVersionsSet(Id)` (restrict)

## `ContractorRatingHistoryEntriesSet`

- Key: `Id`
- Indexes:
  - `ContractorId`
  - `ModelVersionId`
  - `ManualAssessmentId`
  - `(ContractorId, CalculatedAtUtc)`
  - `(ContractorId, SourceType, CalculatedAtUtc)`
- FK:
  - `ContractorId -> ContractorsSet(Id)` (cascade delete)
  - `ModelVersionId -> ContractorRatingModelVersionsSet(Id)` (restrict)
  - `ManualAssessmentId -> ContractorRatingManualAssessmentsSet(Id)` (set null)

## Notes

- History row is persisted for every recalculation cycle.
- `SourceType` differentiates auto cycle from manual-assessment-triggered cycle.
- `CalculatedAtUtc` is the primary analytical timeline for trend views.
