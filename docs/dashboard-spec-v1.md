# Dashboard Specification v1

Date: 2026-04-06

## Purpose

Dashboard v1 provides operational visibility for MVP users:

- high-level registry counters;
- overdue control summary;
- baseline KPI;
- import pipeline analytics (source-data + XML queue);
- role-aware "my tasks" feed;
- quick links to module pages.

## Data model

API endpoint:

- `GET /api/dashboard/summary`

Payload sections:

- `counters`:
  - `projectsTotal`
  - `lotsTotal`
  - `proceduresTotal`
  - `contractsTotal`
- `overdue`:
  - `proceduresCount`
  - `contractsCount`
  - `milestonesCount`
- `kpi`:
  - `procedureCompletionRatePercent`
  - `contractClosureRatePercent`
  - `milestoneCompletionRatePercent`
- `lotStatuses`, `procedureStatuses`, `contractStatuses`
- `importPipeline`:
  - `sourceUploadedCount`
  - `sourceProcessingCount`
  - `sourceReadyForLottingCount`
  - `sourceValidatedWithErrorsCount`
  - `sourceFailedCount`
  - `sourceRejectedCount`
  - `sourceInvalidRowsCount`
  - `xmlReceivedCount`
  - `xmlProcessingCount`
  - `xmlCompletedCount`
  - `xmlFailedCount`
  - `xmlRetriedPendingCount`
  - `traceAppliedGroupsCount`
  - `traceCreatedGroupsCount`
  - `traceSkippedGroupsCount`
  - `traceCreatedLotsCount`
- `myTasks`

## Business rules

Counter and list visibility is restricted by module read permissions:

- projects: `projects.read` (+ scoped to own projects unless global read);
- lots: `lots.read`;
- procedures: `procedures.read`;
- contracts: `contracts.read`.
- import pipeline analytics: `imports.read`.

My tasks are built from:

- pending approval steps assigned by approver user or approver role (requires `procedures.transition`);
- overdue contract milestones in signed/active contracts (requires `contracts.update`).

Overdue rules:

- procedures: non-completed/non-canceled with expired proposal/subcontractor deadlines;
- contracts: non-closed with `EndDate < today`;
- milestones: `ProgressPercent < 100` and `PlannedDate < today`.

## UI composition

Dashboard page (`/`) sections:

- toolbar (`Refresh`, `Open Raw API`);
- metric cards (projects/lots/procedures/contracts);
- status breakdown (lots/procedures/contracts);
- overdue control panel;
- baseline KPI panel;
- import pipeline panel;
- my tasks list;
- quick navigation cards.

## Non-functional notes

- endpoint is read-only and side-effect free;
- response is generated on demand without caching;
- used by page script `wwwroot/js/dashboard-page.js`.
