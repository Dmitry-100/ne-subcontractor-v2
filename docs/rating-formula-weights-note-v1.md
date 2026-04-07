# Rating Formula and Weights Note v1

## Final score

Final score is calculated in range `0..100`:

`FinalScore = Σ(FactorScore * Weight)`

Current contractor rating (`0..5`) is:

`CurrentRating = FinalScore / 20`

## Default normalized weights

- `DeliveryDiscipline`: `0.30`
- `CommercialDiscipline`: `0.20`
- `ClaimDiscipline`: `0.15`
- `ManualExpertEvaluation`: `0.25`
- `WorkloadPenalty`: `0.10`

If user submits non-normalized weights, service normalizes them automatically before storing a new active version.

## Factor score conventions

- `DeliveryDiscipline`: based on overdue milestone ratio for signed/active contracts.
- `CommercialDiscipline`: based on ratio of closed contracts to total contracts.
- `ClaimDiscipline`: derived from reliability class.
- `ManualExpertEvaluation`: manual score (`0..5`) transformed to percent (`*20`) or fallback from current rating.
- `WorkloadPenalty`: stepped penalty based on `CurrentLoadPercent`.

## Rounding

- Weight normalization: `6` decimals.
- Intermediate factor scores: clamped to `0..100`, rounded to `3` decimals.
- `FinalScore`: rounded to `3` decimals.
- `CurrentRating`: rounded to `3` decimals.
