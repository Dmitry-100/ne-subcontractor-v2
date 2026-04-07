# KPI Definitions v1

## Lot funnel

- Source: `Lot.Status`.
- KPI: count of lots by status (`Draft`, `InProcurement`, `Contracted`, etc.).

## Contractor load

- `ActiveContractors`: active contractor count.
- `OverloadedContractors`: active contractors with `CurrentLoadPercent > 100`.
- `AverageLoadPercent`: average `CurrentLoadPercent` for active contractors.
- `AverageRating`: average `CurrentRating` for active contractors.

## SLA metrics

- `OpenWarnings`: violations with `Severity=Warning` and `IsResolved=false`.
- `OpenOverdue`: violations with `Severity=Overdue` and `IsResolved=false`.
- `ResolvedLast30Days`: resolved violations where `ResolvedAtUtc >= now - 30 days`.

## Contracting totals

- `SignedAndActiveTotalAmount`: sum of `TotalAmount` for contracts in `Signed` or `Active`.
- `ClosedTotalAmount`: sum of `TotalAmount` for contracts in `Closed`.
- `AverageContractAmount`: average `TotalAmount` for non-draft contracts.

## MDR progress

- `RowsTotal`: total MDR rows.
- `RowsWithFact`: MDR rows where `FactValue > 0`.
- `FactCoveragePercent`: `RowsWithFact / RowsTotal * 100`.

## Subcontracting share

- `TotalPlannedManHours`: sum of all lot item man-hours.
- `ContractedManHours`: sum of lot item man-hours for lots with signed/active/closed contracts.
- `SharePercent`: `ContractedManHours / TotalPlannedManHours * 100`.
