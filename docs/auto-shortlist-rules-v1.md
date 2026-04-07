# Auto Shortlist Rules v1

## Scope

Sprint 15 foundation: explainable recommendation of subcontractors for procedure shortlist.

## Input context

- procedure (`/api/procedures/{id}`);
- required disciplines from procedure lot items (`LotItem.DisciplineCode`);
- contractor profile:
  - status (`Active`/`Blocked`);
  - reliability class (`A`, `B`, `New`, `D`);
  - current rating;
  - current load percent;
  - qualification set.

## Hard eligibility rules

Contractor is recommended only if all conditions are true:

1. `ContractorStatus == Active`;
2. `ReliabilityClass != D`;
3. all required lot disciplines are present in contractor qualifications;
4. `CurrentLoadPercent <= 100`.

## Scoring model (ranking among candidates)

Composite score combines:

- current rating;
- reliability class bonus;
- qualification match bonus/penalty;
- load penalty;
- optional multiplier `ManualSupportCoefficient`.

Result:

- candidates are sorted by:
  1. `IsRecommended` desc
  2. `Score` desc
  3. `CurrentLoadPercent` asc
  4. `ContractorName` asc

## APIs

- `GET /api/procedures/{id}/shortlist/recommendations`
- `POST /api/procedures/{id}/shortlist/recommendations/apply`

Apply endpoint behavior:

- takes top `MaxIncluded` recommended candidates;
- persists shortlist items;
- writes adjustment logs with provided reason (`AdjustmentReason`) when previous shortlist existed.
