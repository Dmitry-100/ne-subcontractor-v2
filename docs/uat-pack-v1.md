# UAT Pack v1

Date: 2026-04-06

## Scope

This pack covers MVP wave-1 UAT for 5 target roles:

- `GIP`
- `COMMERCIAL`
- `TENDER_COMMISSION`
- `PLANNER`
- `ADMINISTRATOR`

Covered modules:

- dashboard;
- projects;
- contractors;
- lots;
- procurement procedures;
- contracts (including execution milestones);
- exports;
- admin users and reference data.

## Entry criteria

- app starts and is reachable via `https://localhost:5001`;
- DB migrations applied, seed roles present;
- test users mapped to each target role;
- baseline smoke (`docs/api-smoke.md`) is green;
- known blocker defects: none.

## Scenario catalog

| Scenario ID | Role | Priority | Scenario | Expected result |
|---|---|---:|---|---|
| UAT-GIP-01 | GIP | High | Open Projects registry and verify scope visibility. | User sees only projects where user is assigned as GIP. |
| UAT-GIP-02 | GIP | High | Open Procedure card flow: draft -> on approval -> sent. | Transitions work according to procedure workflow rules. |
| UAT-GIP-03 | GIP | Medium | Open Dashboard and validate “My tasks”. | Pending approval or overdue items are shown for the user context. |
| UAT-COM-01 | COMMERCIAL | High | Create/Update Lot with items and run lot status transitions. | CRUD and transitions work, history is populated. |
| UAT-COM-02 | COMMERCIAL | High | Register offers/outcome and generate contract draft from procedure. | Draft contract created from winner offer with expected amounts. |
| UAT-COM-03 | COMMERCIAL | High | Manage contract transitions and milestones. | Close transition is blocked if overdue milestones exist. |
| UAT-COM-04 | COMMERCIAL | Medium | Export CSV from Projects/Lots/Procedures/Contracts. | Downloaded files have correct headers and filtered rows. |
| UAT-TC-01 | TENDER_COMMISSION | High | Review procedures/contracts in read mode. | Read-only access works, forbidden write actions are blocked (403). |
| UAT-TC-02 | TENDER_COMMISSION | Medium | Validate dashboard counters and KPI visibility. | Dashboard loads with allowed sections and no permission errors. |
| UAT-PLN-01 | PLANNER | Medium | Validate read scenario + exports + dashboard. | Planner can read registries and export data without update actions. |
| UAT-ADM-01 | ADMINISTRATOR | High | Reassign user roles and active flag in Admin page. | Role changes are persisted and reflected in user details. |
| UAT-ADM-02 | ADMINISTRATOR | High | CRUD reference data dictionary. | Items can be created/updated/deleted with normalization. |
| UAT-ADM-03 | ADMINISTRATOR | Medium | Validate permission matrix with role switch. | Access restrictions match role model after reassignment. |
| UAT-ALL-01 | All | Medium | Navigation pass through module pages and back links. | No dead-end pages, routing works across shell navigation. |
| UAT-ALL-02 | All | Medium | Error handling check (invalid transition / invalid request). | UI shows actionable error messages, no white screen/crash. |

## Execution log template

| Scenario ID | Tester | Date | Result (`Passed`/`Failed`/`Blocked`/`Not Run`) | Evidence Link | Defect IDs | Notes |
|---|---|---|---|---|---|---|
| UAT-GIP-01 |  |  | Not Run |  |  |  |
| UAT-COM-01 |  |  | Not Run |  |  |  |
| UAT-TC-01 |  |  | Not Run |  |  |  |
| UAT-PLN-01 |  |  | Not Run |  |  |  |
| UAT-ADM-01 |  |  | Not Run |  |  |  |

## Exit criteria

- all High priority scenarios are `Passed`;
- no open `Blocker` defects;
- no open `High` defects without approved workaround;
- release candidate checklist is signed.
