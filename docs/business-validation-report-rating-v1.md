# Business Validation Report: Rating v1

## Validation scope

- model versioning and active model replacement;
- manual expert assessment flow;
- periodic and ad-hoc recalculation;
- rating history and analytics visibility in UI.

## Key checks

1. Model weights are editable and normalized.
2. Manual score is constrained to `0..5`.
3. Recalculation writes immutable history snapshots.
4. Contractor list reflects updated current rating.
5. Analytics view shows delta between latest and previous cycle.

## Outcome

- Functional acceptance: passed in integration tests.
- Data traceability: ensured via `ContractorRatingHistoryEntriesSet`.
- Operability: periodic worker cycle available in Web and Background hosts.

## Known operational requirement

- In production, periodic worker should run in one dedicated host role.
