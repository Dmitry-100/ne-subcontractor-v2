# Pilot Readiness Report

Date: 2026-04-06  
Prepared by: Engineering

## Scope

This report confirms readiness of MVP baseline for pilot launch on a production-like stand.

Target stack:

- .NET 8.0
- ASP.NET Core MVC
- DevExpress v24.1
- MS SQL Server 2016

## Readiness summary

Current status: `Conditionally Ready` (engineering gates are green, infra/UAT gates require stand execution).

## Engineering evidence

- build is green: `dotnet build Subcontractor.sln --no-restore`;
- test baseline is green: `11` unit + `103` integration tests;
- migration chain is present and validated via idempotent script generation;
- API hardening completed:
  - RFC7807 `ProblemDetails` for handled and unhandled errors;
  - `X-Correlation-Id` propagation;
  - middleware/controller coverage in integration tests;
- dashboard/export/contract execution modules are implemented and covered by tests;
- SLA monitoring and SMTP notification foundation implemented (rules, violations, background job, API, and `/sla` UI page).

## Pilot entry gates

- [x] MVP modules implemented end-to-end in local engineering stand.
- [x] CI baseline is in repository (`ci.yml`, `db-migrate.yml`).
- [x] release preflight script is available (`scripts/release/preflight.sh`).
- [x] release publish script is available (`scripts/release/publish.sh`).
- [ ] migration dry-run executed on target SQL Server 2016 stand.
- [ ] backup/restore drill executed on pilot stand.
- [ ] AD/LDAP claim mapping verified with real users.
- [ ] UAT wave-1 executed and signed.
- [ ] no open blocker defects.

## Known risks before go-live

1. AD/LDAP claim mapping is environment-dependent and cannot be closed in local-only run.
2. SQL performance tuning requires execution-plan check on staging with realistic data volumes.
3. Final go/no-go depends on operational rehearsal (deployment + rollback + backup restore).

## Pilot execution plan (recommended)

1. Run `scripts/release/preflight.sh` on release branch.
2. Produce release artifacts via `scripts/release/publish.sh <output-dir>`.
3. Apply migrations on pilot DB and run backup snapshot.
4. Deploy web package to IIS pilot environment.
5. Execute smoke scenarios from `docs/api-smoke.md` and role-based UAT from `docs/uat-pack-v1.md`.
6. Record defects in `docs/defect-register-v1.md`.
7. Complete `docs/go-live-checklist.md` and sign-off table.

## Decision

Pilot launch can start after environment gates are closed on staging/pilot infrastructure.
