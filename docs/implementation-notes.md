# Implementation Notes

## Current baseline

Implemented in code:

- solution skeleton with layered architecture and deployable hosts;
- domain model for users/roles, projects, contractors, lots, procedures, contracts, files, reference data;
- `Projects`, `Contractors`, `ReferenceData` APIs and application services;
- policy-based permission checks via custom `AuthorizationHandler`;
- default role/permission seeding in `DbMigrator`;
- soft-delete and audit handling in EF Core persistence layer.

## Sprint 2 foundation (in progress)

Implemented in this iteration:

- minimal MVC shell (`HomeController`, layout, static style) to prepare DevExpress screen integration;
- authenticated-user provisioning into local `AppUser` table via middleware (`CurrentUserProvisioningMiddleware`);
- bootstrap admin assignment by config whitelist (`Security:BootstrapAdminLogins`);
- admin user management API (`/api/admin/users`, `/api/admin/roles`);
- extended permission matrix (`projects.read.all`, `users.read`, `users.write`);
- project data-scope in `ProjectsService`:
  - global-read users see all projects;
  - scoped users (e.g., GIP) see only projects where `GipUserId == current user`.
- initial EF migration baseline (`InitialCreate0001`) generated and checked against current model.
- lots workflow slice:
  - Lots CRUD and lot composition update API;
  - status transition API with forward-step rule and mandatory rollback reason;
  - lot status history persistence and API (`AddLotWorkflow0002` migration).
- procurement procedure slice:
  - procedure request form CRUD API;
  - attachment binding via `StoredFile` ownership marker (`PROC_REQUEST`);
  - draft workflow transitions (`Created`, `DocumentsPreparation`, `OnApproval`, `Sent`, `Canceled`);
  - procedure status history persistence and API (`AddProcedureRequestShell0003` migration).
- procurement approval & shortlist slice:
  - in-system approval steps CRUD and sequential decision flow;
  - external approval record + protocol file binding (`PROC_EXTERNAL_APPROVAL`);
  - shortlist CRUD with exclusion reasons and active-contractor validation;
  - migration `AddProcedureApprovalAndShortlist0004`.
- procurement offers/comparison/outcome slice:
  - offers CRUD with amount consistency checks and file binding (`PROC_OFFER`);
  - comparison API that merges shortlist and offers in one table view;
  - outcome registration (`winner` or `retender`) with protocol binding (`PROC_OUTCOME_PROTOCOL`);
  - extended procedure transition graph for `OffersReceived`, `Retender`, `DecisionMade`, `Completed`;
  - migration `AddProcedureOffersAndOutcome0005`.
- contracts closure slice:
  - contracts CRUD API with dedicated RBAC policies;
  - contract draft generation from selected procedure winner;
  - contract status transition API with sequential forward/rollback rules;
  - contract status history persistence and API (`AddContractWorkflow0006` migration);
  - contract execution planning APIs (`GET /execution`, `GET|PUT /milestones`);
  - milestone edit guard (`Signed`/`Active` only) and close guard for overdue milestones;
  - update API guardrail: status change is only allowed through transition endpoint;
  - guardrail for procedure completion (requires single contract bound to procedure);
  - lot status synchronization from procedure outcome/completion stages.
- MVC shell navigation slice:
  - dedicated pages for projects/lots/procedures/contracts/admin;
  - API-backed preview registry tables on module pages;
  - active navigation and shared registry page script.
- dashboard v1 slice:
  - `DashboardService` with scoped counters, overdue controls, baseline KPI, and my-task feed;
  - API endpoint `GET /api/dashboard/summary`;
  - import pipeline analytics in dashboard payload (source-data queue/validation/error + XML queue/error/retry + lot traceability indicators);
  - home page dashboard widgets bound to live API response;
  - task `ActionUrl` deep-links enriched with registry filters (`status`, `search`) for faster triage flows.
- unified export slice:
  - `RegistryExportService` generates CSV exports for projects/contractors/lots/procedures/contracts;
  - API endpoints under `/api/exports/*` with module read-permission policies;
  - toolbar shortcuts (`Export CSV`) added to Projects, Lots, Procedures, and Contracts pages.
- permission validation slice:
  - integration test validates seeded role-permission matrix against expected role capabilities;
  - report artifact created: `docs/permission-validation-report.md`.
- UAT and RC documentation slice:
  - dashboard specification (`docs/dashboard-spec-v1.md`);
  - UAT package for 5 roles (`docs/uat-pack-v1.md`);
  - defect register baseline (`docs/defect-register-v1.md`);
  - release-candidate gate checklist (`docs/release-candidate-checklist.md`);
  - technical pre-UAT execution report (`docs/uat-execution-report-v1.md`).
- DevExpress UI pilot slice:
  - `/projects` migrated from preview-table shell to DevExpress v24.1 `dxDataGrid`;
  - popup CRUD operations integrated with existing `ProjectsController` API;
  - `/lots` migrated to DevExpress v24.1 `dxDataGrid` with workflow action panel;
  - lots transition (`next`/`rollback`) and history view integrated with `LotsController` APIs;
  - `/procedures` migrated to DevExpress v24.1 `dxDataGrid` with transition target selector and history panel;
  - procedures transition and status history integrated with `ProcurementProceduresController` APIs;
  - `/contracts` migrated to DevExpress v24.1 `dxDataGrid` with draft creation panel;
  - contracts CRUD, status transition panel, and history grid integrated with `ContractsController` APIs;
  - contract-status management moved from direct edit to dedicated transition endpoint calls;
  - execution planning panel for contracts (milestones grid + progress/overdue summary);
  - URL-driven initial filters (`status`, `search`) and toolbar action `Clear URL Filters` for procedures/contracts registries;
  - `/admin` migrated from preview-table shell to DevExpress v24.1 workspace:
    - users grid + popup role assignment bound to `/api/admin/users` and `/api/admin/roles`;
    - reference data grid with dynamic type-code CRUD bound to `/api/reference-data/{typeCode}/items`;
  - section-level status/error feedback for API operation results.
- test baseline slice:
  - `LoginNormalizer` unit tests for domain/email/trim normalization;
  - `ProjectsService` integration tests for scoped/global read and scoped create override;
  - `ProcurementProceduresService` integration tests for completion guard and lot status sync;
  - `ContractsService` integration tests for status transitions and update-guard behavior;
  - `ContractsService` execution-planning tests (milestones upsert/summary/overdue close guard);
  - `DashboardService` integration tests for scoped counters/KPI/tasks;
  - export integration tests for CSV output and controller file responses;
  - permission matrix validation test for seeded roles and full admin permission coverage;
  - `UsersAdministrationService` integration tests for search, role reassignment and unknown-role validation;
  - `ReferenceDataService` integration tests for normalization, active-only filtering and delete flow;
  - controller-level integration tests for `UsersController`, `ReferenceDataController`, and `ContractsController`.
- CI/CD baseline slice:
  - GitHub Actions workflow `ci.yml` with restore/build/test and `DbMigrator --dry-run`;
  - manual workflow `db-migrate.yml` for applying migrations via secret connection string;
  - `DbMigrator` CLI options added: `--dry-run`, `--skip-seed`, `--help`.

## Sprint 10 hardening (in progress)

Implemented in this iteration:

- performance tuning slice:
  - migration `AddPerformanceIndexes0008` extends DB indexing strategy for dashboard and registry workloads:
    - `ProjectsSet`: `GipUserId`;
    - `LotsSet`: `Status`;
    - `ProceduresSet`: `Status`, `Status+ProposalDueDate`, `Status+RequiredSubcontractorDeadline`;
    - `ProcedureApprovalStepsSet`: `Status+ApproverUserId+ApproverRoleName`;
    - `ContractsSet`: `ContractorId`, `LotId`, `ProcedureId`, `Status`, `Status+EndDate`;
    - `FilesSet`: `OwnerEntityType+OwnerEntityId`;
    - `ContractMilestonesSet`: `PlannedDate+ProgressPercent`;
    - redundant single-column milestone index `ContractId` removed in favor of composite strategy.
- dashboard query-optimization slice:
  - counters now reuse grouped status aggregates instead of extra total-count queries;
  - KPI ratios for procedures/contracts are calculated from grouped status counts;
  - milestone KPI aggregation reduced to one grouped DB query.
- technical validation slice:
  - `dotnet build Subcontractor.sln --no-restore` passed;
  - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` passed (`11` unit + `45` integration tests).
  - release scripts validation:
    - `scripts/release/preflight.sh` executed successfully;
    - `scripts/release/publish.sh /tmp/subcontractor-release-check Release` generated web + migrator artifacts and metadata file.
- API runtime hardening slice:
  - global exception middleware added (`GlobalExceptionMiddleware`) with RFC7807 payload for unhandled errors;
  - correlation-id middleware added (`CorrelationIdMiddleware`) with `X-Correlation-Id` propagation and request trace binding;
  - shared `ApiControllerBase` introduced for unified `400/404/409` `ProblemDetails` responses in API controllers;
  - frontend error parsers updated to prefer RFC7807 `detail` field (with backward compatibility for legacy `error/title`);
  - middleware/controller integration tests added for error contract and correlation-id behavior.
- pilot readiness artifact slice:
  - pilot readiness report prepared (`docs/pilot-readiness-report.md`);
  - production deployment runbook prepared (`docs/production-deployment-guide.md`);
  - admin operations guide prepared (`docs/admin-guide.md`);
  - end-user quick start prepared (`docs/user-quick-start-guide.md`);
  - go-live checklist prepared (`docs/go-live-checklist.md`);
  - release automation scripts added:
    - `scripts/release/preflight.sh`,
    - `scripts/release/publish.sh`.

## Sprint 11 source-data import staging (in progress)

Implemented in this iteration:

- import staging domain slice:
  - new entities `SourceDataImportBatch` and `SourceDataImportRow`;
  - new status-history entity `SourceDataImportBatchStatusHistory`;
  - batch workflow statuses extended with `ReadyForLotting`, `Rejected`, `Processing`, and `Failed`;
  - migration `AddSourceDataImportStaging0009` adds staging tables with row-level validation fields.
  - migration `AddSourceDataImportWorkflow0010` adds status history table for batch audit.
- import application/API slice:
  - `SourceDataImportsService` with synchronous and queued batch creation, background processing, workflow transitions, history, and validation-report export;
  - row normalization and validation rules:
    - project existence by `projectCode`,
    - required `objectWbs` and `disciplineCode`,
    - non-negative `manHours`,
    - `plannedStartDate <= plannedFinishDate`;
  - batch summary metrics (`TotalRows`, `ValidRows`, `InvalidRows`) and status (`Uploaded`, `Processing`, `Validated`, `ValidatedWithErrors`, `ReadyForLotting`, `Rejected`, `Failed`);
  - new API controller:
    - `GET /api/imports/source-data/batches/template`;
    - `GET /api/imports/source-data/batches`;
    - `GET /api/imports/source-data/batches/{id}`;
    - `POST /api/imports/source-data/batches`;
    - `POST /api/imports/source-data/batches/queued`;
    - `POST /api/imports/source-data/batches/{id}/transition`;
    - `GET /api/imports/source-data/batches/{id}/history`;
    - `GET /api/imports/source-data/batches/{id}/validation-report`.
- authorization and UI shell slice:
  - permissions added: `imports.read`, `imports.write`;
  - policies wired in Web host and seeded for Commercial/Planner/Administrator roles;
  - navigation shell extended with `/imports` module;
  - `/imports` operator page includes CSV/XLSX parse preview, column mapping controls, local validation hints, queued upload action, batch details viewer, workflow action panel, validation-report download buttons, transition history, and automatic polling while batch is processing.
  - background hosted worker (`SourceDataImportProcessingWorker`) polls queued batches and runs asynchronous validation pipeline.
- testing and technical validation slice:
  - integration tests added for import service/controller flows, queued ingestion processing, workflow transitions, history APIs, and validation-report export;
  - permission matrix validation extended with import permissions;
  - `dotnet build Subcontractor.sln --no-restore` passed;
  - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` passed (`11` unit + `74` integration tests).
- import documentation slice:
  - `docs/import-specification-v1.md`;
  - `docs/import-data-contract-v1.md`;
  - `docs/validation-rules-source-data-v1.md`;
  - `docs/operator-guide-imports-v1.md`.

## Sprint 12 XML import and lot recommendation channel (in progress)

Implemented in this iteration:

- XML inbox and parsing slice:
  - new domain model `XmlSourceDataImportInboxItem` with statuses (`Received`, `Processing`, `Completed`, `Failed`);
  - migration `AddXmlSourceDataImportInbox0011` adds XML inbox table with reconciliation fields and link to created source-data batch;
  - `XmlSourceDataImportInboxService` introduced:
    - XML payload queueing and well-formedness validation;
    - XML parsing/mapping to source-data rows;
    - creation of queued source-data batches from parsed XML;
    - retry operation for failed XML inbox items.
- API slice:
  - new controller `SourceDataXmlImportsController` with endpoints:
    - `GET /api/imports/source-data/xml/inbox`;
    - `GET /api/imports/source-data/xml/inbox/{id}`;
    - `POST /api/imports/source-data/xml/inbox`;
    - `POST /api/imports/source-data/xml/inbox/{id}/retry`.
- scheduler/background slice:
  - existing `SourceDataImportProcessingWorker` extended:
    - process XML inbox queue;
    - then process queued source-data batches.
- operator UI slice:
  - `/imports` page now includes XML inbox panel:
    - manual XML queue form (`sourceSystem`, `externalDocumentId`, `fileName`, payload);
    - XML inbox status table with `View Batch` and `Retry` actions;
    - integration with existing batch details viewer.
- lot recommendations slice:
  - new application service `LotRecommendationsService`:
    - builds recommendation groups from `ReadyForLotting` source-data import batches;
    - grouping rule: `projectCode + disciplineCode`;
    - suggestion generation for lot code and lot name;
    - apply flow creates `Lot` (status `Draft`) and initial `LotStatusHistory`.
  - new API controller `LotRecommendationsController`:
    - `GET /api/lots/recommendations/import-batches/{batchId}`;
    - `POST /api/lots/recommendations/import-batches/{batchId}/apply`.
  - lot reconciliation traceability slice:
    - new domain model `SourceDataLotReconciliationRecord`;
    - migration `AddSourceDataLotReconciliation0012` adds persistent batch/group/lot traceability table;
    - every apply group result is persisted (`created`/`skipped`) with operation id, requested lot code/name, row count and man-hours;
    - new export endpoint:
      - `GET /api/imports/source-data/batches/{id}/lot-reconciliation-report`.
  - `/imports` page lot recommendation UX:
    - two-panel table workspace for recommendation selection and selected-group parameter editing;
    - editable draft lot code/name per selected recommendation group before apply;
    - apply result feedback with created/skipped summary;
    - reconciliation-report download action from batch details.
- testing and validation slice:
  - integration tests added for XML inbox service/controller flows and lot recommendation service/controller flows;
  - full solution build/test green on latest run:
    - `dotnet build Subcontractor.sln --no-restore`;
    - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` (`11` unit + `85` integration tests).
- documentation artifacts:
  - `docs/xml-contract-specification-v1.md`;
  - `docs/import-scheduler-design-v1.md`;
  - `docs/lot-recommendation-rules-v1.md`;
  - `docs/source-to-lot-mapping-design-v1.md`.

## Sprint 13 monitoring foundation (in progress)

Implemented in this iteration:

- monitoring domain and persistence slice:
  - new contract monitoring entities:
    - `ContractMonitoringControlPoint`;
    - `ContractMonitoringControlPointStage`;
    - `ContractMdrCard`;
    - `ContractMdrRow`;
  - migration `AddContractMonitoringFoundation0013` adds monitoring tables, FK links, and indexes.
- application/API slice:
  - `ContractsService` extended with monitoring use-cases:
    - `Get/UpsertMonitoringControlPointsAsync`;
    - `Get/UpsertMdrCardsAsync`;
    - update guard for monitoring writes (`Signed`/`Active` contracts only).
  - MDR analytics in read model:
    - row-level and card-level deviation percent (`plan vs forecast`, `plan vs fact`).
  - new contract monitoring endpoints:
    - `GET /api/contracts/{id}/monitoring/control-points`;
    - `PUT /api/contracts/{id}/monitoring/control-points`;
    - `GET /api/contracts/{id}/monitoring/mdr-cards`;
    - `PUT /api/contracts/{id}/monitoring/mdr-cards`;
    - `POST /api/contracts/{id}/monitoring/mdr-cards/import-forecast-fact`;
    - `GET /api/contracts/monitoring/templates/control-points`;
    - `GET /api/contracts/monitoring/templates/mdr-cards`.
- UI baseline slice:
  - `/contracts` page monitoring area switched to tabular operator mode:
    - control points grid + selected-control-point stage grid;
    - MDR cards grid + selected-card rows grid;
    - batch save button persists both grid payloads via monitoring APIs;
    - quick CSV template download links for KP and MDR.
  - MDR forecast/fact import slice:
    - CSV/XLSX parser on contracts page (SheetJS for workbook parsing);
    - required columns: `CardTitle`, `ReportingDate`, `RowCode`, `ForecastValue`, `FactValue`;
    - backend conflict report by matching key (`CardTitle + ReportingDate + RowCode`);
    - conflict modes: strict (cancel all updates) or skip conflicts (partial apply).
- testing and validation slice:
  - integration tests added for monitoring service/controller paths:
    - control-point persist/read flow;
    - MDR deviations calculation;
    - status-guard conflict behavior.
  - full solution build/test green on latest run:
    - `dotnet build Subcontractor.sln --no-restore`;
    - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` (`11` unit + `108` integration tests).
- monitoring documentation artifacts:
  - `docs/monitoring-kp-spec-v1.md`;
  - `docs/monitoring-mdr-spec-v1.md`;
  - `docs/monitoring-mdr-import-spec-v1.md`;
  - `docs/monitoring-data-model-v1.md`.

## Sprint 14 notifications and SLA control (in progress)

Implemented in this iteration:

- SLA domain and persistence slice:
  - new entities:
    - `SlaRule` (warning horizon by purchase type);
    - `SlaViolation` (warning/overdue registry, reason code, notification trace).
  - migration `AddSlaMonitoringFoundation0014` adds SLA tables and indexes:
    - unique key `(EntityType, EntityId, DueDate, Severity)`;
    - operational indexes for `IsResolved`, `Severity`, `DueDate`.
- SLA application/API slice:
  - `SlaMonitoringService` introduced with APIs:
    - `GetRulesAsync` / `UpsertRulesAsync`;
    - `ListViolationsAsync`;
    - `SetViolationReasonAsync`;
    - `RunMonitoringCycleAsync`.
  - monitoring cycle covers:
    - procedure `ProposalDueDate`;
    - procedure `RequiredSubcontractorDeadline`;
    - contract `EndDate`;
    - milestone `PlannedDate` (not completed).
  - reason classifier bound to reference-data type code `SLA_VIOLATION_REASON`.
  - new REST endpoints in `SlaController`:
    - `GET /api/sla/rules`;
    - `PUT /api/sla/rules`;
    - `GET /api/sla/violations`;
    - `PUT /api/sla/violations/{id}/reason`;
    - `POST /api/sla/run`.
- notification and worker slice:
  - `INotificationEmailSender` abstraction added to Application;
  - SMTP implementation (`SmtpNotificationEmailSender`) added in Infrastructure;
  - configuration sections:
    - `Smtp:*` (`Enabled`, `DryRun`, host/port/credentials);
    - `SlaMonitoring:*` (default warning days, worker interval, enabled flag);
  - SLA worker wired in both hosts:
    - `Subcontractor.Web` (`SlaMonitoringWorker`);
    - `Subcontractor.BackgroundJobs` (`SlaMonitorWorker`).
- UI slice:
  - new `/sla` page:
    - SLA rules editor;
    - SLA violations table;
    - inline reason assignment;
    - manual `Run SLA cycle` action.
  - top navigation and dashboard quick-link extended with SLA module.
- security slice:
  - new permissions:
    - `sla.read`;
    - `sla.write`;
  - policy registration and role seed matrix extended.
- testing and validation slice:
  - integration tests added:
    - `SlaMonitoringServiceTests`;
    - `SlaControllerTests`;
    - extended `PermissionMatrixValidationTests`.
  - latest technical validation:
    - `dotnet build Subcontractor.sln --no-restore` passed;
    - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` passed (`11` unit + `108` integration tests);
    - `node --check src/Subcontractor.Web/wwwroot/js/sla-page.js` passed.
- documentation artifacts:
  - `docs/sla-model-spec-v1.md`;
  - `docs/notification-event-catalog-v1.md`;
  - `docs/smtp-integration-guide-v1.md`;
  - `docs/email-template-pack-v1.md`;
  - `docs/ops-guide-notification-jobs-v1.md`.

## Sprint 15 auto shortlist and contractor load model (in progress)

Implemented in this iteration:

- contractor load model slice:
  - `ContractorsService.RecalculateCurrentLoadsAsync` introduced;
  - calculation source:
    - active contracts (`Signed`, `Active`);
    - lot man-hours (`LotItem.ManHours`) by contract lot;
  - `CurrentLoadPercent` persisted for active contractors;
  - API endpoint:
    - `POST /api/contractors/recalculate-load`.
- shortlist recommendation slice:
  - recommendation APIs:
    - `GET /api/procedures/{id}/shortlist/recommendations`;
    - `POST /api/procedures/{id}/shortlist/recommendations/apply`.
  - recommendation model includes explainability payload:
    - recommendation flag;
    - score;
    - missing discipline list;
    - decision factors.
  - eligibility baseline:
    - active contractor;
    - reliability class not `D`;
    - required qualifications matched;
    - load <= 100%.
- manual correction journal slice:
  - new domain entity `ProcedureShortlistAdjustmentLog`;
  - migration `AddProcedureShortlistAutomation0015` adds adjustment-log table and indexes;
  - shortlist update now persists change journal (previous/new values + reason + audit);
  - log API endpoint:
    - `GET /api/procedures/{id}/shortlist/adjustments`.
- procedures UI shortlist workspace slice:
  - `/procedures` page extended with dedicated shortlist workspace:
    - recommendation build action;
    - recommendation apply action with operator reason;
    - recommendation explainability grid;
    - adjustment log review grid.
  - workspace availability rules:
    - enabled for active workflow procedures;
    - disabled for `Completed`/`Canceled`.
- testing and technical validation slice:
  - new integration tests:
    - `ContractorLoadCalculationTests`;
    - `ProcedureShortlistRecommendationsTests`;
    - `ProcurementProceduresControllerShortlistTests`.
  - latest technical validation:
    - `dotnet build Subcontractor.sln --no-restore` passed;
    - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` passed (`11` unit + `108` integration tests);
    - `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js` passed.
- documentation artifacts:
  - `docs/load-calculation-rules-v1.md`;
  - `docs/auto-shortlist-rules-v1.md`;
  - `docs/shortlist-explainability-note-v1.md`;
  - `docs/test-cases-load-shortlist-v1.md`.

## Sprint 16 rating model foundation (completed)

Implemented in this iteration:

- rating domain and persistence slice:
  - new entities:
    - `ContractorRatingModelVersion`;
    - `ContractorRatingWeight`;
    - `ContractorRatingManualAssessment`;
    - `ContractorRatingHistoryEntry`;
  - migration `AddContractorRatingFoundation0016` adds rating tables, indexes, and foreign keys.
- rating application/API slice:
  - `ContractorRatingsService` introduced:
    - active model read/upsert with normalized weights;
    - targeted/all-contractor recalculation;
    - manual GIP assessment with immediate recalculation;
    - rating history and analytics read-models;
  - new contractor rating endpoints:
    - `GET /api/contractors/rating/model`;
    - `PUT /api/contractors/rating/model`;
    - `POST /api/contractors/rating/recalculate`;
    - `POST /api/contractors/{id}/rating/manual-assessment`;
    - `GET /api/contractors/{id}/rating/history`;
    - `GET /api/contractors/rating/analytics`.
- UI slice:
  - new `/contractors` page with:
    - contractors DevExpress grid;
    - rating model editor;
    - manual assessment form;
    - history and analytics grids.
- documentation artifacts:
  - `docs/rating-model-spec-v1.md`;
  - `docs/rating-formula-weights-note-v1.md`;
  - `docs/rating-history-schema-v1.md`;
  - `docs/test-cases-rating-v1.md`.

## Sprint 17 automated rating and contractor analytics (completed)

Implemented in this iteration:

- automation slice:
  - periodic rating workers wired:
    - `Subcontractor.Web` (`ContractorRatingWorker`);
    - `Subcontractor.BackgroundJobs` (`ContractorRatingRecalculationWorker`);
  - shared configuration section `ContractorRating:*` added for both hosts.
- contractor analytics slice:
  - rating analytics endpoint integrated into contractors workspace and dashboard context;
  - SQL analytical projection for latest rating snapshot:
    - `vwAnalytics_ContractorRatings`.
- documentation artifacts:
  - `docs/rating-recalculation-job-v1.md`;
  - `docs/contractor-analytics-views-v1.md`;
  - `docs/business-validation-report-rating-v1.md`.

## Sprint 18 KPI dashboard and analytical views (completed)

Implemented in this iteration:

- analytics application/API slice:
  - new `AnalyticsService` and controller `AnalyticsController`;
  - new endpoints:
    - `GET /api/analytics/kpi`;
    - `GET /api/analytics/views`.
- KPI dashboard UI slice:
  - home dashboard extended with analytical section:
    - lot funnel indicators;
    - contractor load/rating KPIs;
    - SLA open metrics;
    - contracting totals;
    - MDR fact coverage;
    - subcontracting share;
    - top contractors list.
- analytical SQL view layer:
  - migration `AddAnalyticsViews0017` adds views:
    - `vwAnalytics_LotFunnel`;
    - `vwAnalytics_ContractorLoad`;
    - `vwAnalytics_SlaMetrics`;
    - `vwAnalytics_ContractingAmounts`;
    - `vwAnalytics_MdrProgress`;
    - `vwAnalytics_SubcontractingShare`;
    - `vwAnalytics_ContractorRatings`.
- documentation artifacts:
  - `docs/analytical-data-mart-views-spec-v1.md`;
  - `docs/kpi-definitions-v1.md`;
  - `docs/reporting-validation-pack-v1.md`.

## Sprint 19 Power BI readiness and final analytical rollout (completed)

Implemented in this iteration:

- analytical access slice:
  - new permission/policy:
    - `analytics.read`;
    - `policy.analytics.read`;
  - role seed matrix updated for analytics-read capability.
- BI readiness artifacts:
  - `docs/power-bi-connectivity-guide-v1.md`;
  - `docs/analytics-access-model-v1.md`;
  - `docs/final-reporting-pack-v1.md`.
- testing and validation slice:
  - new integration tests:
    - `ContractorRatingsServiceTests`;
    - `ContractorsControllerRatingTests`;
    - `AnalyticsServiceTests`;
    - `AnalyticsControllerTests`;
    - extended `PermissionMatrixValidationTests`.
  - latest technical validation:
    - `dotnet build Subcontractor.sln --no-restore` passed;
    - `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal` passed (`11` unit + `119` integration tests);
    - `node --check src/Subcontractor.Web/wwwroot/js/dashboard-page.js` passed;
    - `node --check src/Subcontractor.Web/wwwroot/js/contractors-grid.js` passed.

## Remaining gaps against target stack

- DevExpress v24.1 and SheetJS asset delivery is now configurable (`UiAssets:*` CDN/local switch), but licensed local vendor files must be provisioned in deployment environments.
- CI/CD workflow templates are added, but environment secrets/approvals still need production onboarding.
- AD/LDAP-specific claim mapping must be validated against enterprise infrastructure before production rollout.
