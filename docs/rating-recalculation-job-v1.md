# Rating Recalculation Job v1

## Purpose

Automated periodic contractor rating recalculation for operational and analytical consistency.

## Hosts

- Web host worker: `ContractorRatingWorker`.
- Background host worker: `ContractorRatingRecalculationWorker`.

Both use shared `ContractorRatingOptions`.

## Configuration

`ContractorRating` section:

- `WorkerEnabled`
- `WorkerPollingIntervalMinutes` (clamped to `5..1440`)
- `AutoRecalculateActiveOnly`

Recommended production setup: enable job in exactly one host role to avoid duplicate periodic cycles.

## Job behavior

1. Resolve active rating model (or create baseline model).
2. Select contractors (`active only` by default).
3. Recalculate scores and update `Contractor.CurrentRating`.
4. Write history snapshot rows.
5. Log processed/updated counters.

## Error handling

- Unexpected exception is logged.
- Worker retries on next cycle after short delay.
