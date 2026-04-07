# Defect Register v1

Date: 2026-04-06

## Purpose

This register tracks UAT and pilot defects for Sprint 9 release candidate.

## Severity scale

- `Blocker`: core scenario cannot be completed, no workaround.
- `High`: key scenario degraded, workaround exists but risky/expensive.
- `Medium`: non-critical functional issue with acceptable workaround.
- `Low`: cosmetic/usability issue without functional impact.

## Status workflow

- `Open` -> `In Progress` -> `Fixed` -> `Verified` -> `Closed`
- Optional: `Rejected`, `Duplicate`, `Deferred`

## Register

| ID | Module | Scenario ID | Severity | Priority | Status | Owner | Summary | Repro Steps | Found In | Fixed In | Verified By | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DR-001 | System | N/A | Low | P4 | Closed | Team | Initial register created, no active defects at baseline. | N/A | Sprint 9 prep | N/A | QA | Seed row for tracking start point. |
| DR-002 | System | TECH-PRE-UAT | Low | P4 | Closed | Team | Automated pre-UAT run completed without failures (`11` unit, `42` integration). | N/A | Sprint 9 pre-UAT | N/A | QA | Recorded in `docs/uat-execution-report-v1.md`. |

## Triage cadence

- daily triage for `Blocker` and `High`;
- every 2 days for `Medium` and `Low`;
- all `Open` defects are reviewed before RC decision.

## Governance

- QA owns defect log updates;
- Tech Lead owns assignment and target fix version;
- Product owner approves `Deferred` decisions.
