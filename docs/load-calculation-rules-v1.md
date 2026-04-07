# Load Calculation Rules v1

## Scope

Sprint 15 foundation: contractor load recalculation from active contract portfolio.

## Source data

- contractor capacity: `Contractor.CapacityHours`;
- active workload:
  - contracts in statuses `Signed` and `Active`;
  - related lot items (`LotItem.ManHours`) by `Contract.LotId`.

## Formula

For each active contractor:

`loadPercent = (sum(activeContractLotManHours) / capacityHours) * 100`

Edge case:

- if `capacityHours <= 0`:
  - `loadPercent = 100` when active workload > 0;
  - `loadPercent = 0` when active workload = 0.

Rounding:

- 2 decimals, midpoint away from zero.

## API

- `POST /api/contractors/recalculate-load`:
  - recalculates `CurrentLoadPercent` for active contractors;
  - returns count of updated records.

## Notes

- recalculation is also executed before shortlist recommendation generation to keep scoring актуальным;
- overloaded contractors (`loadPercent > 100`) are marked as non-recommended in auto-shortlist baseline.
