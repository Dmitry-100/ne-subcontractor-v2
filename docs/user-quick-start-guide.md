# User Quick Start Guide

Date: 2026-04-06

## First login

1. Open system URL in browser.
2. Authenticate with corporate account.
3. Verify top navigation is visible (`Dashboard`, `Projects`, `Lots`, `Procedures`, `Contracts`, `Imports`, `SLA`, `Admin` if allowed).

If access is denied, contact administrator for role assignment.

## Main workflow (MVP)

1. `Projects`: review project list and assignments.
2. `Lots`: create lot with composition items and move status to procurement.
3. `Procedures`: create procurement procedure for lot, run approval/shortlist/offers/outcome.
4. `Contracts`: create contract draft from procedure winner, move through approval/signing/active states.
5. `SLA`: review warning/overdue events and record violation reasons (if permitted).
6. `Dashboard`: monitor workload, overdue items, and personal tasks.

## Basic page usage

- all registries support search, filtering, sorting, paging;
- create/edit forms open in popup dialogs;
- status transitions are executed in dedicated action panels;
- CSV export is available on module pages where permitted.

## Common rules to remember

- status cannot be changed by direct edit, use transition actions;
- some rollbacks require a reason;
- contract cannot be closed while overdue milestones exist;
- not all users can see all records: data scope depends on role.

## If operation fails

1. note action and timestamp;
2. copy error text from UI;
3. provide `X-Correlation-Id` from browser network response to support team.

## Recommended first-day smoke checks

1. Open each allowed module from navigation.
2. Run one search and one filter in each module.
3. Execute one allowed create/update operation.
4. Verify dashboard loads without permission errors.
