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

## 6. Performance and topology hardening (wave 2)

- [ ] Host topology separation validated on target stand (`WebHostTopology:EnableEmbeddedWorkers=false`, jobs in `Subcontractor.BackgroundJobs`; `BackgroundJobs` defaults keep `SlaMonitoring.WorkerEnabled=true` and `ContractorRating.WorkerEnabled=true`; config/test preflight: `npm run check:host-topology`).
- [ ] Startup/perf evidence attached (`docs/performance-host-topology-evidence-2026-04-13.md`).
- [ ] HTTP/browser before/after snapshot attached (`docs/performance-report-v2.md` + `artifacts/perf/*`).
- [ ] Cache/compression telemetry snapshot attached (`npm run perf:telemetry -- <baseUrl>`, artifact `artifacts/perf/http-cache-compression-telemetry-latest.md`).
- [ ] Unified staging evidence run completed (`npm run perf:staging-evidence --`, env: `BASE_URL`, optional `STAGING_RUN_SQL_CORE=0`, `STAGING_RUN_TOPOLOGY_CHECK=0`, `STAGING_RUN_DEPENDENCY_GUARDS=1`; shortcuts: `npm run perf:staging-evidence:full --`, локальный профиль с SQL capture: `npm run perf:staging-evidence:full:local-sql --`).
- [ ] UI assets fallback validated on target stand (primary CDN -> secondary CDN; optional local fallback path for DevExpress/SheetJS).
- [ ] При `UseLocal=true` local vendor assets проверены скриптом `scripts/ci/check-local-ui-assets.sh` (без missing файлов).
- [ ] Performance budget gate rerun is green (`npm run perf:budget`, default paired artifacts via `artifacts/perf/perf-contour-latest.json`).
- [ ] Performance regression diff reviewed (`artifacts/perf/perf-regression-latest.md`) и отклонения в пределах budget thresholds.
- [ ] Performance evidence completeness check is green (`npm run check:perf-evidence -- artifacts/perf` or `bash scripts/ci/check-performance-evidence-pack.sh artifacts/perf`).
- [ ] Release baseline pinned (`npm run perf:pin-baseline -- artifacts/perf/perf-contour-latest.json artifacts/perf`) и сохранён `artifacts/perf/perf-contour-baseline.json`.
- [ ] CI nightly performance contour is green (`performance-budget-nightly` job with `perf:contour` + `perf:budget`).
- [ ] CI weekly long-run contour is green (`performance-budget-long-run-weekly`, включая review `artifacts/perf-long-run/perf-trend-latest.md`).
- [ ] Registry paging contracts validated for Projects/Lots/Procedures/Contracts/Contractors.
- [ ] SQL performance evidence pack captured on staging (`scripts/perf/capture-sql-performance-evidence-pack.sh`, runbook: `docs/sql-performance-evidence-runbook.md`; при отсутствии host `sqlcmd` допускается docker fallback) with execution plans + IO/TIME.
- [ ] SQL Core contour rerun green (`scripts/ci/run-sql-core-tests.sh`).
- [ ] Dependency governance report reviewed (`nuget-outdated-report` artifact from `dependency-governance-report` CI job).
- [ ] Outdated semver-budget guard green (`npm run check:dotnet-outdated-budget`; CI job `dependency-outdated-budget`).
- [ ] No critical runtime regressions after disabling embedded workers in `Subcontractor.Web`.

## 7. Hypercare and communication

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
