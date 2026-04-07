# Release Candidate Checklist (Sprint 9)

Date: 2026-04-06

## Build and test baseline

- [x] `dotnet restore` completed.
- [x] `dotnet build Subcontractor.sln --no-restore` is green.
- [x] Unit tests are green.
- [x] Integration tests are green.
- [x] API smoke scenarios updated (`docs/api-smoke.md`).

## Data and migrations

- [x] EF migrations are generated and committed up to current model.
- [ ] Migration dry-run validated on target SQL Server 2016 stand.
- [ ] Backup/restore rehearsal executed on RC environment.

## Security and access

- [x] Seeded role/permission matrix validated by automated test.
- [x] Permission validation report prepared (`docs/permission-validation-report.md`).
- [ ] Role-based access verified on RC environment with real AD/LDAP identities.

## Functional readiness

- [x] Dashboard v1 implemented and documented.
- [x] Unified CSV export endpoints implemented and documented.
- [x] Contract execution planning slice implemented and tested.
- [x] Technical pre-UAT execution report prepared (`docs/uat-execution-report-v1.md`).
- [ ] UAT wave-1 executed using `docs/uat-pack-v1.md`.
- [ ] Defect register updated with UAT results (`docs/defect-register-v1.md`).

## Defect gate

- [ ] No open `Blocker` defects.
- [ ] No open `High` defects without approved workaround.
- [ ] All deferred defects approved by Product owner.

## Operational readiness

- [x] CI workflow present (`.github/workflows/ci.yml`).
- [x] DB migration workflow present (`.github/workflows/db-migrate.yml`).
- [x] Production deployment runbook prepared (`docs/production-deployment-guide.md`).
- [x] Go-live checklist prepared (`docs/go-live-checklist.md`).
- [x] Admin/User operational guides prepared (`docs/admin-guide.md`, `docs/user-quick-start-guide.md`).
- [ ] Production-like deployment rehearsal completed.
- [ ] Monitoring/log review completed after RC deployment.

## Sign-off

| Gate | Owner | Status | Date | Notes |
|---|---|---|---|---|
| Engineering sign-off | Tech Lead | Pending |  |  |
| QA sign-off | QA Lead | Pending |  |  |
| Product sign-off | Product Owner | Pending |  |  |
| Operations sign-off | DevOps/Infra | Pending |  |  |
