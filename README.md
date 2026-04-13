# Subcontractor V2 (New System)

This directory contains the new implementation foundation for the subcontractor management system on the target stack:

- .NET 8.0
- ASP.NET Core MVC
- DevExpress v24.1 (configurable CDN/local asset delivery)
- MS SQL Server 2016

## Current state

This is the initial engineering baseline (Sprint 1 scope):

- modular solution structure (`Web`, `Application`, `Domain`, `Infrastructure`, `BackgroundJobs`, `DbMigrator`, `Tests`);
- domain entities for key MVP modules;
- EF Core `AppDbContext` with base mappings;
- web host with authentication/authorization hooks and health endpoint;
- migrator console app for schema deployment;
- worker host scaffold for background jobs.

In addition, the first application vertical slice is now implemented:

- `Projects` CRUD service + API endpoints;
- `Contractors` CRUD service + API endpoints, including qualification codes;
- `Reference Data` CRUD-like API for admin-managed dictionaries;
- soft delete and audit timestamps managed in `AppDbContext`.
- policy-based authorization skeleton and default role/permission seeding in `DbMigrator`.

Sprint 2 foundation is now partially implemented:

- automatic local `AppUser` provisioning on authenticated request;
- bootstrap admin assignment by configured login whitelist (`Security:BootstrapAdminLogins`);
- user/role administration API (`/api/admin/users`, `/api/admin/roles`);
- extended permission matrix (`projects.read.all`, `users.read`, `users.write`);
- project data-scope: users without global-read permissions see only projects where they are assigned as GIP.
- initial EF Core migration baseline (`InitialCreate0001`) generated in Infrastructure.

Sprint 4 foundation has started:

- `Lots` vertical slice (`Application` + `Web API`);
- lot composition management (`LotItem` list in create/update);
- lot status transition rules with mandatory reason for rollback;
- lot status history API and persistence model;
- migration `AddLotWorkflow0002` for lot workflow history.

Sprint 5 foundation has started:

- `Procurement Procedure` vertical slice (`Application` + `Web API`);
- request form fields (including analytics 1-5, approval mode/route, deadlines, notes, budget);
- attachment linking model via `StoredFile` ownership (`PROC_REQUEST`);
- draft workflow transitions with rollback/cancel reason enforcement;
- procedure status history API and persistence model;
- migration `AddProcedureRequestShell0003`.

Sprint 6 foundation has started:

- in-system approval route configuration (`approval steps`);
- approval step decisions with sequential required-step enforcement;
- external approval registration with protocol file binding;
- shortlist management for procedure (`included/excluded`, exclusion reason);
- migration `AddProcedureApprovalAndShortlist0004`.

Sprint 7 foundation has started:

- procedure offers registry (`offers`) with validation and offer-file binding (`PROC_OFFER`);
- comparison API that merges shortlist and offers into a single contractor view;
- procedure outcome API (`winner`/`retender`) with protocol binding (`PROC_OUTCOME_PROTOCOL`);
- expanded procedure status flow (`Sent` -> `OffersReceived` -> `DecisionMade` -> `Completed`, including `Retender`);
- migration `AddProcedureOffersAndOutcome0005`.

Sprint 8 foundation has started:

- `Contracts` vertical slice (`Application` + `Web API`) with CRUD endpoints and RBAC policies;
- draft contract generation from procedure outcome winner (`POST /api/contracts/procedures/{procedureId}/draft`);
- contract lifecycle transition API (`POST /api/contracts/{id}/transition`) with sequential-step/rollback rules;
- contract status history API (`GET /api/contracts/{id}/history`) backed by migration `AddContractWorkflow0006`;
- procedure completion guard: `DecisionMade -> Completed` requires exactly one bound contract;
- lot-status synchronization from procedure workflow (`InProcurement` -> `ContractorSelected` -> `Contracted`).
- navigable MVC shell pages (`/projects`, `/lots`, `/procedures`, `/contracts`, `/admin`) with API-backed preview tables.
- DevExpress v24.1 pilots for Projects, Lots, Procedures, Contracts and Admin modules:
  - dedicated pages `/projects`, `/lots`, `/procedures`, `/contracts` with `dxDataGrid` (search/filter/sort/paging);
  - popup-based CRUD linked to `/api/projects`, `/api/lots`, `/api/procedures`, `/api/contracts` endpoints;
  - lots workflow actions (`next`/`rollback`) and history panel bound to transition/history APIs;
  - procedures transition panel (allowed status map + reason rule + history grid) bound to transition/history APIs;
  - contracts transition panel (`Draft -> OnApproval -> Signed -> Active -> Closed` with one-step rollback) and history grid;
  - contracts draft-generation panel bound to `POST /api/contracts/procedures/{procedureId}/draft`;
  - contracts execution-planning panel (milestones grid + progress/overdue summary) bound to milestones/execution APIs;
  - runtime error/status feedback in grid pages.
  - shared asset partials and `UiAssets` config for switching between CDN and local vendor files.
- DevExpress v24.1 pilot for Admin module:
  - `/admin` page with users grid bound to `/api/admin/users` and role catalog bound to `/api/admin/roles`;
  - popup update of user role assignment and active flag (`PUT /api/admin/users/{id}/roles`);
  - reference data grid with dynamic `typeCode`, active-only filter, and CRUD via `/api/reference-data/{typeCode}/items`.
- test baseline expanded (unit + integration):
  - login normalization cases;
  - project scope visibility and scoped create behavior;
  - procedure completion guard scenarios (no contract, multiple contracts, valid single-contract completion);
  - user administration scenarios (search, role reassignment, unknown role validation);
  - reference data scenarios (type/item normalization, active-only filtering, delete flow);
  - controller-level API behavior checks for `UsersController`, `ReferenceDataController`, and `ContractsController`;
  - contract workflow scenarios (status transitions, transition validation, status-history persistence);
  - contract execution scenarios (milestone upsert/validation, progress summary, overdue close guard).
- CI/CD baseline:
  - GitHub Actions CI workflow (`.github/workflows/ci.yml`) for restore/build/test and `DbMigrator --dry-run`;
  - manual migration workflow (`.github/workflows/db-migrate.yml`) using secret `SUBCONTRACTOR_SQL_CONNECTION_STRING`;
  - `DbMigrator` supports CLI flags:
    - `--dry-run` (CI smoke mode without DB changes),
    - `--skip-seed` (apply migrations only),
    - `--help`.

Sprint 9 foundation has started:

- contract execution planning slice:
  - milestones registry API (`GET|PUT /api/contracts/{id}/milestones`);
  - execution summary API (`GET /api/contracts/{id}/execution`) with progress and overdue metrics;
  - overdue close guard: transition `Active -> Closed` is blocked when overdue milestones exist;
  - migration `AddContractExecutionPlanning0007`.
- dashboard v1 slice:
  - summary API (`GET /api/dashboard/summary`) with counters, overdue controls, and baseline KPI;
  - import pipeline analytics in summary payload (source-data, XML queue/error/retry, and lot traceability indicators);
  - "my tasks" feed for pending approval steps and overdue contract milestones;
  - dashboard home page wired to live API data.
- unified registry export slice:
  - CSV export endpoints for core registries (`projects`, `contractors`, `lots`, `procedures`, `contracts`);
  - exports reuse module list filters and current permission/scope rules;
  - module pages include direct `Export CSV` actions in toolbar.
- permission validation slice:
  - automated matrix validation test for seeded roles/permissions;
  - report artifact: `docs/permission-validation-report.md`.
- UAT/RC artifacts slice:
  - `docs/dashboard-spec-v1.md`;
  - `docs/uat-pack-v1.md`;
  - `docs/defect-register-v1.md`;
  - `docs/release-candidate-checklist.md`;
  - `docs/uat-execution-report-v1.md`;
  - `docs/performance-report-v1.md`.

Sprint 10 hardening has started:

- API runtime hardening slice:
  - global exception middleware with RFC7807 error payload for unhandled exceptions;
  - correlation-id propagation middleware (`X-Correlation-Id`);
  - unified API `ProblemDetails` contract via shared `ApiControllerBase`;
  - frontend error parsers switched to `detail` (RFC7807) with backward compatibility for legacy fields.
- additional validation coverage:
  - middleware integration tests for correlation-id and global exception contract;
  - controller tests extended to assert `ProblemDetails` payloads on `400/409` flows.
- pilot readiness package:
  - `docs/pilot-readiness-report.md`;
  - `docs/production-deployment-guide.md`;
  - `docs/admin-guide.md`;
  - `docs/user-quick-start-guide.md`;
  - `docs/go-live-checklist.md`.
- deployment repeatability:
  - release preflight script (`scripts/release/preflight.sh`);
  - release publish script (`scripts/release/publish.sh`).

Sprint 11 has started:

- source-data import staging slice:
  - domain model for import batches and row-level validation results;
  - workflow status history for import batches;
  - new APIs:
    - `GET /api/imports/source-data/batches/template`
    - `GET /api/imports/source-data/batches`
    - `GET /api/imports/source-data/batches/{id}`
    - `POST /api/imports/source-data/batches`
    - `POST /api/imports/source-data/batches/queued`
    - `POST /api/imports/source-data/batches/{id}/transition`
    - `GET /api/imports/source-data/batches/{id}/history`
    - `GET /api/imports/source-data/batches/{id}/validation-report`
  - validation rules for staging rows (`projectCode`, `objectWbs`, `disciplineCode`, `manHours`, date range);
  - asynchronous processing flow (`Uploaded` -> `Processing` -> `Validated`/`ValidatedWithErrors`) with worker-based validation;
  - operator status workflow (`Validated`/`ValidatedWithErrors` -> `ReadyForLotting`/`Rejected`) with transition audit.
- operator UI slice:
  - `/imports` page provides CSV/XLSX parse preview, manual column mapping, async upload queueing, batch details with auto-refresh while processing, workflow transition actions, validation-report download, and transition history.
- import documentation artifacts:
  - `docs/import-specification-v1.md`;
  - `docs/import-data-contract-v1.md`;
  - `docs/validation-rules-source-data-v1.md`;
  - `docs/operator-guide-imports-v1.md`.
- security and navigation:
  - new permissions/policies: `imports.read`, `imports.write`;
  - role seed updated for import operators (Commercial, Planner, Administrator);
  - UI navigation updated with `/imports` module page.

Sprint 12 XML import + lot recommendation channel has started:

- XML inbox and reconciliation slice:
  - new XML inbox APIs:
    - `GET /api/imports/source-data/xml/inbox`
    - `GET /api/imports/source-data/xml/inbox/{id}`
    - `POST /api/imports/source-data/xml/inbox`
    - `POST /api/imports/source-data/xml/inbox/{id}/retry`
  - XML inbox table with statuses (`Received`, `Processing`, `Completed`, `Failed`) linked to source-data import batches.
- scheduler/background processing slice:
  - worker processes XML inbox queue and creates queued source-data batches;
  - existing import worker continues batch validation pipeline (`Uploaded` -> `Processing` -> `Validated*`).
- operator UI slice:
  - `/imports` page includes XML inbox form (source system, external id, XML payload), XML inbox table, retry action, and quick “View Batch” navigation.
- lot recommendation slice:
  - lot recommendation API from validated import batches:
    - `GET /api/lots/recommendations/import-batches/{batchId}`
    - `POST /api/lots/recommendations/import-batches/{batchId}/apply`
  - grouping strategy for recommendations: `projectCode + disciplineCode` with generated lot code/name suggestions;
  - apply operation creates draft lots and initial lot status history records (`Draft`) from selected recommendation groups;
  - persistent traceability records for each recommendation apply group (`created`/`skipped`) with batch/group/lot linkage;
  - lot reconciliation export API:
    - `GET /api/imports/source-data/batches/{id}/lot-reconciliation-report`
  - `/imports` page includes two-panel lot recommendation UI:
    - left panel: recommendation groups and selection;
    - right panel: selected groups with editable draft lot code/name before apply;
    - reconciliation report download action from batch details.
- documentation artifacts:
  - `docs/xml-contract-specification-v1.md`;
  - `docs/import-scheduler-design-v1.md`;
  - `docs/lot-recommendation-rules-v1.md`;
  - `docs/source-to-lot-mapping-design-v1.md`.

Sprint 13 monitoring foundation has started:

- monitoring domain/API slice:
  - contract-linked monitoring entities:
    - `ContractMonitoringControlPoint` + nested `ContractMonitoringControlPointStage`;
    - `ContractMdrCard` + nested `ContractMdrRow`;
  - migration `AddContractMonitoringFoundation0013`;
  - monitoring APIs:
    - `GET /api/contracts/{id}/monitoring/control-points`
    - `PUT /api/contracts/{id}/monitoring/control-points`
    - `GET /api/contracts/{id}/monitoring/mdr-cards`
    - `PUT /api/contracts/{id}/monitoring/mdr-cards`
    - `POST /api/contracts/{id}/monitoring/mdr-cards/import-forecast-fact`
    - `GET /api/contracts/monitoring/templates/control-points`
    - `GET /api/contracts/monitoring/templates/mdr-cards`
  - MDR deviation analytics in API payload (`plan vs forecast`, `plan vs fact`, %).
- operator UI baseline:
  - `/contracts` page includes section `Мониторинг KP/MDR` in tabular operator mode;
  - linked grids: KP + этапы выбранной КП, MDR карточки + строки выбранной карточки;
  - save workflow persists table edits into monitoring APIs;
  - MDR import flow (CSV/XLSX) updates `forecast/fact` by key (`CardTitle + ReportingDate + RowCode`);
  - conflict-handling modes:
    - strict (no partial apply);
    - skip conflicts (apply matched rows, return conflict report);
  - CSV template links added for KP and MDR structures;
  - read/write guard aligned with contract status (`Signed`/`Active` for update).
- tests and docs:
  - integration tests expanded for monitoring service/controller flows;
  - full solution build/test green on latest run:
    - `dotnet build Subcontractor.sln --no-restore`;
    - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` (`11` unit + `108` integration tests);
  - new monitoring artifacts:
    - `docs/monitoring-kp-spec-v1.md`;
    - `docs/monitoring-mdr-spec-v1.md`;
    - `docs/monitoring-mdr-import-spec-v1.md`;
    - `docs/monitoring-data-model-v1.md`.

Sprint 14 notifications and SLA control has started:

- SLA and notification foundation slice:
  - new domain entities `SlaRule` and `SlaViolation`;
  - migration `AddSlaMonitoringFoundation0014`;
  - SLA monitoring service (`ISlaMonitoringService`) with cycle detection for:
    - procedure proposal/subcontractor deadlines;
    - contract end dates;
    - contract milestone deadlines;
  - persistent violation registry with open/resolved lifecycle and notification trace;
  - reason assignment validation via reference-data dictionary `SLA_VIOLATION_REASON`.
- notification and worker slice:
  - SMTP sender abstraction (`INotificationEmailSender`) and infrastructure implementation;
  - SMTP config section (`Smtp`) with `Enabled`/`DryRun` support;
  - SLA worker integrated in both Web and BackgroundJobs hosts.
- API and UI slice:
  - SLA API endpoints:
    - `GET /api/sla/rules`
    - `PUT /api/sla/rules`
    - `GET /api/sla/violations`
    - `PUT /api/sla/violations/{id}/reason`
    - `POST /api/sla/run`
  - new `/sla` operator page with rule editor and violation registry actions;
  - dashboard quick link and top navigation extended with SLA module.
- permissions and tests:
  - permissions added: `sla.read`, `sla.write`;
  - role seed matrix extended for SLA access;
  - integration tests added for SLA service/controller flows.
- documentation artifacts:
  - `docs/sla-model-spec-v1.md`;
  - `docs/notification-event-catalog-v1.md`;
  - `docs/smtp-integration-guide-v1.md`;
  - `docs/email-template-pack-v1.md`;
  - `docs/ops-guide-notification-jobs-v1.md`.

Sprint 15 auto shortlist and contractor load model is completed:

- contractor load calculation slice:
  - recalculation algorithm from active contracts (`Signed`/`Active`) and lot man-hours;
  - new API endpoint:
    - `POST /api/contractors/recalculate-load`.
- shortlist recommendation slice:
  - recommendation API:
    - `GET /api/procedures/{id}/shortlist/recommendations`;
    - `POST /api/procedures/{id}/shortlist/recommendations/apply`.
  - recommendation criteria include:
    - contractor status;
    - reliability class;
    - qualification match to lot disciplines;
    - current load percent;
    - rating-based scoring.
- shortlist adjustment traceability slice:
  - new adjustment log entity with migration `AddProcedureShortlistAutomation0015`;
  - shortlist updates now persist change journal with reason;
  - journal API:
    - `GET /api/procedures/{id}/shortlist/adjustments`.
- procedure UI shortlist workspace slice:
  - Procedures page now includes dedicated workspace for shortlist automation:
    - recommendation build (`GET /api/procedures/{id}/shortlist/recommendations`);
    - recommendation apply with reason (`POST /api/procedures/{id}/shortlist/recommendations/apply`);
    - adjustment log review (`GET /api/procedures/{id}/shortlist/adjustments`).
  - recommendation grid exposes explainability fields (score, reliability, load, missing disciplines, decision factors).
- tests and docs:
  - integration tests expanded for load/recommendation/controller paths;
  - full solution build/test green on latest run:
    - `dotnet build Subcontractor.sln --no-restore`;
    - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` (`11` unit + `108` integration tests);
    - `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`.
  - Sprint 15 artifacts:
    - `docs/load-calculation-rules-v1.md`;
    - `docs/auto-shortlist-rules-v1.md`;
    - `docs/shortlist-explainability-note-v1.md`;
    - `docs/test-cases-load-shortlist-v1.md`.

Sprint 16 rating model foundation is completed:

- contractor rating model slice:
  - rating domain entities (`model version`, `weights`, `manual assessment`, `history`);
  - migration `AddContractorRatingFoundation0016`;
  - contractor rating API endpoints:
    - `GET|PUT /api/contractors/rating/model`
    - `POST /api/contractors/rating/recalculate`
    - `POST /api/contractors/{id}/rating/manual-assessment`
    - `GET /api/contractors/{id}/rating/history`
    - `GET /api/contractors/rating/analytics`
- UI slice:
  - `/contractors` page with rating model editor, manual assessment form, history grid, and analytics grid.
- artifacts:
  - `docs/rating-model-spec-v1.md`;
  - `docs/rating-formula-weights-note-v1.md`;
  - `docs/rating-history-schema-v1.md`;
  - `docs/test-cases-rating-v1.md`.

Sprint 17 automated rating and contractor analytics is completed:

- periodic recalculation job:
  - Web worker: `ContractorRatingWorker`;
  - BackgroundJobs worker: `ContractorRatingRecalculationWorker`;
  - shared config section `ContractorRating:*`.
- contractor analytics slice:
  - rating delta and latest calculation metadata in API/UI;
  - BI-friendly rating view `vwAnalytics_ContractorRatings`.
- artifacts:
  - `docs/rating-recalculation-job-v1.md`;
  - `docs/contractor-analytics-views-v1.md`;
  - `docs/business-validation-report-rating-v1.md`.

Sprint 18 KPI dashboard and analytical views is completed:

- analytics module:
  - `AnalyticsService` and `AnalyticsController`;
  - new endpoints:
    - `GET /api/analytics/kpi`
    - `GET /api/analytics/views`
- dashboard v2 analytical block:
  - lot funnel, contractor load/rating, SLA metrics, contracting totals, MDR coverage, subcontracting share, top contractors.
- SQL analytics view layer (migration `AddAnalyticsViews0017`):
  - `vwAnalytics_LotFunnel`;
  - `vwAnalytics_ContractorLoad`;
  - `vwAnalytics_SlaMetrics`;
  - `vwAnalytics_ContractingAmounts`;
  - `vwAnalytics_MdrProgress`;
  - `vwAnalytics_SubcontractingShare`;
  - `vwAnalytics_ContractorRatings`.
- artifacts:
  - `docs/analytical-data-mart-views-spec-v1.md`;
  - `docs/kpi-definitions-v1.md`;
  - `docs/reporting-validation-pack-v1.md`.

Sprint 19 Power BI readiness and final analytical rollout is completed:

- analytics access control:
  - permission `analytics.read`;
  - policy `policy.analytics.read`;
  - role seed matrix extended for analytical access.
- final BI-ready docs:
  - `docs/power-bi-connectivity-guide-v1.md`;
  - `docs/analytics-access-model-v1.md`;
  - `docs/final-reporting-pack-v1.md`.
- latest technical validation:
  - `dotnet build Subcontractor.sln --no-restore` passed;
  - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` passed (`11` unit + `119` integration tests).

## Prerequisites

.NET 8 SDK is required.

For local UI asset mode (without public CDN), place vendor files under:

- `src/Subcontractor.Web/wwwroot/lib/devexpress/<version>/...`
- `src/Subcontractor.Web/wwwroot/lib/xlsx/<version>/...`

Expected structure is documented in:

- `src/Subcontractor.Web/wwwroot/lib/README.md`

Run:

```bash
cd ne-subcontractor/subcontractor-v2
chmod +x scripts/bootstrap-solution.sh
./scripts/bootstrap-solution.sh
dotnet restore Subcontractor.sln
dotnet build Subcontractor.sln
```

## Local SQL quick start (macOS/Linux)

If SQL Server is not running locally, web startup will fail with:

- `Could not open a connection to SQL Server`
- HTTP `500` on `/` and worker errors in logs.

Start a local SQL container:

```bash
docker run -d --name subcontractor-v2-sql \
  -e ACCEPT_EULA=Y \
  -e MSSQL_SA_PASSWORD='YourStr0ng!Passw0rd' \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2019-latest
```

Apply migrations and role/permission seed:

```bash
cd ne-subcontractor/subcontractor-v2
CONN='Server=localhost,1433;Database=SubcontractorV2;User Id=sa;Password=YourStr0ng!Passw0rd;TrustServerCertificate=True;Encrypt=False'
ConnectionStrings__DefaultConnection="$CONN" dotnet run --project src/Subcontractor.DbMigrator/Subcontractor.DbMigrator.csproj
```

Then run web app:

```bash
dotnet run --project src/Subcontractor.Web/Subcontractor.Web.csproj
```

Seed demo data (idempotent API-based script):

```bash
./scripts/dev/seed-demo-data.sh
```

Notes:

- `src/Subcontractor.Web/appsettings.Development.json` is preconfigured for local SQL auth (`sa` on `localhost:1433`).
- If port `5080` is busy, stop old process first: `lsof -nP -iTCP:5080 -sTCP:LISTEN`.

## SQL-backed tests (real SQL Server contour)

Fast integration tests still run on `EF Core InMemory`, but SQL-backed tests are available in a dedicated project:

- `tests/Subcontractor.Tests.SqlServer`.

Enable SQL-backed tests:

```bash
export SUBCONTRACTOR_SQL_TESTS=1
```

Optionally override server-level SQL connection string:

```bash
export SUBCONTRACTOR_SQL_TEST_SERVER_CONNECTION='Server=localhost,1433;User Id=sa;Password=YourStr0ng!Passw0rd;TrustServerCertificate=True;Encrypt=False'
```

Run only SQL-backed contour:

```bash
dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --verbosity minimal
```

Run PR/develop core subset:

```bash
dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core" --verbosity minimal
```

Notes:

- each test creates a temporary DB, applies EF migrations, sets compatibility level `130`, and drops DB after completion;
- current SQL regression baseline: `17` meaningful tests (`15 core` + `2 full`) across schema + Contracts/Procurement/Imports/SLA/ContractorRatings/Analytics/Projects + DB delete behavior checks;
- SQL suite is configured for sequential execution to reduce flakiness in early contour adoption;
- if `SUBCONTRACTOR_SQL_TESTS` is not set, SQL-backed tests are skipped by design.

## Project layout

```text
src/Subcontractor.Web
src/Subcontractor.Application
src/Subcontractor.Domain
src/Subcontractor.Infrastructure
src/Subcontractor.BackgroundJobs
src/Subcontractor.DbMigrator
tests/Subcontractor.Tests.Unit
tests/Subcontractor.Tests.Integration
docs/
scripts/
```

## Next implementation steps

1. Execute backup/restore drill on production-like stand and capture timings/RPO-RTO evidence.
2. Run deployment rehearsal with CI/CD environment secrets and rollback checklist.
3. Run unified staging evidence contour (`BASE_URL=<stand-url> npm run perf:staging-evidence --`, full profile `BASE_URL=<stand-url> npm run perf:staging-evidence:full --`, local full profile with SQL capture via docker fallback: `BASE_URL=http://127.0.0.1:5080 npm run perf:staging-evidence:full:local-sql --`) and attach SQL Server execution plans + IO/TIME evidence to `docs/performance-report-v2.md`.
4. Validate SMTP routing and AD/LDAP identities on pilot stand with real infrastructure accounts.
5. Keep host-topology policy guard green (`npm run check:host-topology`) and define production schedule ownership for background jobs (SLA + rating) with one active host role per job; verify `BackgroundJobs` worker defaults (`SlaMonitoring.WorkerEnabled=true`, `ContractorRating.WorkerEnabled=true`).
6. Keep dependency governance guardrails green (`bash scripts/ci/check-dotnet-vulnerabilities.sh` + `npm run check:dotnet-outdated-budget`) and review `nuget-outdated-summary.txt` deltas before release.

## API endpoints implemented

- `GET /api/projects`
- `GET /api/projects/{id}`
- `POST /api/projects`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`
- `GET /api/contractors`
- `GET /api/contractors/{id}`
- `POST /api/contractors`
- `PUT /api/contractors/{id}`
- `DELETE /api/contractors/{id}`
- `POST /api/contractors/recalculate-load`
- `GET /api/contractors/rating/model`
- `PUT /api/contractors/rating/model`
- `POST /api/contractors/rating/recalculate`
- `POST /api/contractors/{id}/rating/manual-assessment`
- `GET /api/contractors/{id}/rating/history`
- `GET /api/contractors/rating/analytics`
- `GET /api/reference-data/{typeCode}/items`
- `PUT /api/reference-data/{typeCode}/items`
- `DELETE /api/reference-data/{typeCode}/items/{itemCode}`
- `GET /api/admin/users`
- `GET /api/admin/users/{id}`
- `PUT /api/admin/users/{id}/roles`
- `GET /api/admin/roles`
- `GET /api/lots`
- `GET /api/lots/{id}`
- `POST /api/lots`
- `PUT /api/lots/{id}`
- `DELETE /api/lots/{id}`
- `POST /api/lots/{id}/transition`
- `GET /api/lots/{id}/history`
- `GET /api/lots/recommendations/import-batches/{batchId}`
- `POST /api/lots/recommendations/import-batches/{batchId}/apply`
- `GET /api/procedures`
- `GET /api/procedures/{id}`
- `POST /api/procedures`
- `PUT /api/procedures/{id}`
- `DELETE /api/procedures/{id}`
- `POST /api/procedures/{id}/transition`
- `GET /api/procedures/{id}/history`
- `GET /api/procedures/{id}/approval/steps`
- `PUT /api/procedures/{id}/approval/steps`
- `POST /api/procedures/{id}/approval/steps/{stepId}/decision`
- `GET /api/procedures/{id}/approval/external`
- `PUT /api/procedures/{id}/approval/external`
- `GET /api/procedures/{id}/shortlist`
- `PUT /api/procedures/{id}/shortlist`
- `GET /api/procedures/{id}/shortlist/recommendations`
- `POST /api/procedures/{id}/shortlist/recommendations/apply`
- `GET /api/procedures/{id}/shortlist/adjustments`
- `GET /api/procedures/{id}/offers`
- `PUT /api/procedures/{id}/offers`
- `GET /api/procedures/{id}/comparison`
- `GET /api/procedures/{id}/outcome`
- `PUT /api/procedures/{id}/outcome`
- `GET /api/contracts`
- `GET /api/contracts/{id}`
- `POST /api/contracts`
- `PUT /api/contracts/{id}`
- `DELETE /api/contracts/{id}`
- `POST /api/contracts/{id}/transition`
- `GET /api/contracts/{id}/history`
- `GET /api/contracts/{id}/execution`
- `GET /api/contracts/{id}/milestones`
- `PUT /api/contracts/{id}/milestones`
- `GET /api/contracts/{id}/monitoring/control-points`
- `PUT /api/contracts/{id}/monitoring/control-points`
- `GET /api/contracts/{id}/monitoring/mdr-cards`
- `PUT /api/contracts/{id}/monitoring/mdr-cards`
- `POST /api/contracts/{id}/monitoring/mdr-cards/import-forecast-fact`
- `GET /api/contracts/monitoring/templates/control-points`
- `GET /api/contracts/monitoring/templates/mdr-cards`
- `POST /api/contracts/procedures/{procedureId}/draft`
- `GET /api/dashboard/summary`
- `GET /api/exports/projects`
- `GET /api/exports/contractors`
- `GET /api/exports/lots`
- `GET /api/exports/procedures`
- `GET /api/exports/contracts`
- `GET /api/imports/source-data/batches/template`
- `GET /api/imports/source-data/batches`
- `GET /api/imports/source-data/batches/{id}`
- `POST /api/imports/source-data/batches`
- `POST /api/imports/source-data/batches/queued`
- `POST /api/imports/source-data/batches/{id}/transition`
- `GET /api/imports/source-data/batches/{id}/history`
- `GET /api/imports/source-data/batches/{id}/validation-report`
- `GET /api/imports/source-data/batches/{id}/lot-reconciliation-report`
- `GET /api/imports/source-data/xml/inbox`
- `GET /api/imports/source-data/xml/inbox/{id}`
- `POST /api/imports/source-data/xml/inbox`
- `POST /api/imports/source-data/xml/inbox/{id}/retry`
- `GET /api/sla/rules`
- `PUT /api/sla/rules`
- `GET /api/sla/violations`
- `PUT /api/sla/violations/{id}/reason`
- `POST /api/sla/run`
- `GET /api/analytics/kpi`
- `GET /api/analytics/views`
