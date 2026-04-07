# Go-Live Checklist (MVP)

Date: 2026-04-06

## 1. Pre-go-live readiness

- [ ] `docs/pilot-readiness-report.md` reviewed and approved.
- [ ] `docs/production-deployment-guide.md` reviewed by operations team.
- [ ] Release artifact package created from tagged commit.
- [ ] Final RC build and tests are green.
- [ ] Open defect list has no `Blocker`.
- [ ] Open `High` defects have approved workaround.

## 2. Infrastructure and data

- [ ] Target SQL Server 2016 connection validated.
- [ ] Pre-release DB backup created and verified.
- [ ] Migration dry-run completed on target stand.
- [ ] Migration execution plan approved.
- [ ] Rollback owner assigned and reachable.

## 3. Security and access

- [ ] AD/LDAP identity mapping validated for pilot roles.
- [ ] Admin accounts validated.
- [ ] Permission matrix spot-check passed on production-like stand.

## 4. Deployment execution

- [ ] Application package deployed to IIS.
- [ ] DB migrations applied successfully.
- [ ] App pool recycled and app starts successfully.
- [ ] `/api/health` returns healthy status.
- [ ] Smoke scenarios from `docs/api-smoke.md` passed.

## 5. Business validation

- [ ] Key user checks passed for Projects/Lots/Procedures/Contracts.
- [ ] Dashboard and exports validated.
- [ ] Admin functions (users/reference data) validated.
- [ ] UAT sign-off archived.

## 6. Hypercare and communication

- [ ] Go-live announcement sent to stakeholder list.
- [ ] Support channel and on-call contacts published.
- [ ] Incident template includes mandatory `X-Correlation-Id`.
- [ ] Hypercare window and daily status cadence agreed.

## Sign-off table

| Gate | Owner | Status | Date | Notes |
|---|---|---|---|---|
| Engineering | Tech Lead | Pending |  |  |
| QA | QA Lead | Pending |  |  |
| Product | Product Owner | Pending |  |  |
| Operations | DevOps/Infra | Pending |  |  |
| Business | Pilot Sponsor | Pending |  |  |
