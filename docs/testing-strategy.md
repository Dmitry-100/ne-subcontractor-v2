# Testing Strategy (v1)

Документ фиксирует текущую стратегию тестирования и целевой контур качества.

## Текущий baseline (Sprint 1)

Снимок baseline на `2026-04-08`:

- `Unit`: `20` тестов;
- `Fast integration (InMemory)`: `142` теста;
- `SQL-backed integration`: `78` тестов (`76 core` + `2 full`).

SQL-backed контур уже покрывает первую критичную волну модулей:

- `Contracts`;
- `ProcurementProcedures`;
- `SourceDataImports`;
- `XmlSourceDataImportInbox` (queue/process/failure/retry сценарии через SQL-backed сервисный контур);
- `SlaMonitoring`;
- `ContractorRatings`;
- `Analytics`;
- `Projects` (soft-delete + query filters);
- `Security` (`PermissionEvaluator` + `UserProvisioningService` SQL regression scenarios);
- delete behavior (`cascade`/`restrict`) в full subset;
- schema-level проверки миграций и ограничений.

Отдельно в последних итерациях усилены SQL regression gaps:

- `Procurement` attachment-binding error paths (`Create/Update/ExternalApproval/Offers/Outcome`) с явной проверкой отсутствия побочных эффектов;
- `SourceDataImports` queued pipeline (`CreateBatchQueued`, `ProcessQueued`) + статусная история;
- `SourceDataImports` transition rules/reason normalization вынесены в `SourceDataImportTransitionPolicy` с focused unit-тестами (`ReadyForLotting/Rejected guards`, `reason required`, `reason truncate/default`).
- `SourceDataImports` row normalization/validation rules вынесены в `SourceDataImportRowNormalizationPolicy` с focused unit-тестами (`sync/queued normalization`, `validation error aggregation`, `entity apply contract`).
- `SourceDataImports` read/report projection rules вынесены в `SourceDataImportReadProjectionPolicy` с focused unit-тестами (`details/history mapping`, `validation report`, `lot reconciliation report`, CSV escaping).
- `SourceDataImports` bootstrap/wiring контракт зафиксирован через DI alias (`ISourceDataImportsService -> SourceDataImportsService`) и integration tests на scoped-identity.
- `SourceDataImports` read/query слой выделен в `SourceDataImportReadQueryService`, queued-processing слой выделен в `SourceDataImportBatchProcessingWorkflowService`; добавлены focused integration-тесты на read-contract и queued workflow (`unknown-id/null`, `validation report filtering`, `uploaded -> processing -> validatedWithErrors`, `maxBatches guard`).
- `SourceDataImports` write-request normalization вынесен в `SourceDataImportBatchRequestPolicy` с focused unit-тестами (`fileName/notes trim`, `rows required`, `null-request guard`); `SourceDataImportWriteWorkflowService` переведён на policy delegation в `CreateBatch`/`CreateBatchQueued`.
- `XmlSourceDataImportInbox` request/xml policies вынесены в `XmlSourceDataImportInboxRequestPolicy` и `XmlSourceDataImportXmlParserPolicy` с focused unit-тестами (`normalize/guards`, `row parser`, `batch notes`, `error truncate`); дополнительно закрыт decimal edge-case для XML `manHours` (`12,5` -> `12.5`).
- `XmlSourceDataImportInbox` service-layer разделён на `XmlSourceDataImportInboxReadQueryService`, `XmlSourceDataImportInboxWriteWorkflowService`, `XmlSourceDataImportInboxProcessingWorkflowService`; обновлён DI wiring contract и добавлены focused integration-тесты на read/processing support-services.
- `XmlSourceDataImportInbox` success/failure processing flow;
- `ContractorRatings` guard-сценарий manual score validation + analytics delta SQL-сценарий.
- `ContractorRatings` active-only recalculation guard (inactive contractors are not mutated when `IncludeInactiveContractors = false`).
- `ContractorRatings` scoring-формулы и weight resolution вынесены в `ContractorRatingScoringPolicy` с focused unit-тестами (`weights fallback/normalization`, discipline scores, final score/rating conversion).
- `ContractorRatings` model request normalization + read model projection вынесены в отдельные policy-модули (`ContractorRatingModelRequestPolicy`, `ContractorRatingReadProjectionPolicy`) с focused unit-тестами на guards/normalization/order.
- `ContractorRatings` bootstrap/wiring контракт зафиксирован через DI alias (`IContractorRatingsService -> ContractorRatingsService`) и integration tests на scoped-identity + пустой analytics-path.
- `ContractorRatings` read/query слой вынесен в `ContractorRatingReadQueryService` с focused integration-тестами (`empty analytics`, `unknown contractor history guard`, `top clamp`).
- `ContractorRatings` write-side recalculation orchestration вынесена в `ContractorRatingRecalculationWorkflowService` с focused integration-тестами (`empty contractors -> 0`, `auto recalculation history`, `manual-assessment link`), а DI wiring закреплён в integration contract.
- `ContractorRatings` model lifecycle orchestration вынесена в `ContractorRatingModelLifecycleService` (`ensure active model`, `upsert model`, `unique version-code`, `default-weight backfill`), DI wiring закреплён в integration contract, а SQL contour дополнен отдельной проверкой backfill-пути.
- `ContractorRatings` facade write-path (`manual assessment` + `recalculate request`) вынесен в `ContractorRatingWriteWorkflowService` с focused integration/SQL-тестами (`manual-assessment persistence`, `unknown contractor guard`, `active-only recalculation`, SQL no-history-on-not-found) и обновлённым DI wiring contract.
- `Contractors` bootstrap/wiring контракт зафиксирован через DI alias (`IContractorsService -> ContractorsService`) и integration tests на scoped-identity + пустой registry-path; фасад переведён на thin-delegation через `ContractorReadQueryService` + `ContractorWriteWorkflowService`, а read/write слои покрыты focused integration-контрактами (`ContractorReadQueryServiceTests`, `ContractorWriteWorkflowServiceTests`).
- `Dashboard` bootstrap/wiring контракт зафиксирован через DI alias (`IDashboardService -> DashboardService`) и integration tests на scoped-identity + empty-summary path для unknown user.
- `Dashboard` import-pipeline aggregation вынесен в `DashboardImportPipelineQueryService` с focused integration-тестами (`empty pipeline`, `aggregated status/trace metrics`) и DI wiring contract.
- `Dashboard` my-tasks aggregation вынесен в `DashboardMyTasksQueryService` с focused integration-тестами (`disabled sources`, `approval+milestone ordering`, blocked-step guard) и обновлённым DI wiring contract.
- `Dashboard` overdue/kpi aggregation вынесен в `DashboardPerformanceMetricsQueryService` с focused integration-тестами (`overdue filters`, `kpi rates`) и обновлённым DI wiring contract.
- `Dashboard` user-context resolution вынесен в `DashboardUserContextResolverService` с focused integration-тестами (`system/unknown/inactive guards`, `roles+permissions aggregation`, `projects-global-scope derivation`) и обновлённым DI wiring contract.
- `Dashboard` counters/statuses aggregation вынесен в `DashboardCountersAndStatusesQueryService` с focused integration-тестами (`no-permissions zero`, `scoped/global project read`, `status-count projection`) и обновлённым DI wiring contract.
- `Dashboard UI` helper layer (`error parsing`, `kpi formatters`, `status/priority localization`, `lot status counter lookup`) вынесен в `dashboard-page-helpers.js` с отдельным unit test suite (`dashboard-page-helpers.test.js`).
- `Dashboard UI` formatter layer (`numeric normalization`, `compact percent/money formatting`) вынесен в `dashboard-page-formatters.js` с отдельным unit test suite (`dashboard-page-formatters.test.js`).
- `Dashboard UI` bootstrap/disclosure layer (`module bootstrapping`, `required-controls contract`, `helpers/formatters wiring guard`, `РАЗВЕРНУТЬ/СВЕРНУТЬ hint sync`) вынесен в `dashboard-page-bootstrap.js` с отдельным unit test suite (`dashboard-page-bootstrap.test.js`).
- `Dashboard UI` renderer layer (`summary/analytics/import/tasks projection`, `status-list/task/top-contractor render`, `KPI/overdue infographics apply`) вынесен в `dashboard-page-renderers.js` с отдельным unit test suite (`dashboard-page-renderers.test.js`).
- `LotRecommendations` policy-слой генерации и нормализации рекомендаций вынесен в `LotRecommendationPolicy` с focused unit-тестами (`group-key`, `suggested-code uniqueness`, `lot code/name normalization guards`).
- `LotRecommendations` grouping/query слой вынесен в `LotRecommendationGroupingService` + `LotRecommendationGroup/Item` models с focused integration-тестами (`valid-row grouping`, `deterministic sort`, `empty on no-valid-rows`) и обновлённым DI wiring contract.
- `LotRecommendations` projection/trace mapping вынесен в `LotRecommendationProjectionPolicy` с focused unit-тестами (`group DTO aggregation`, `reconciliation trace projection`).
- `LotsService` mutation/transition/projection блоки вынесены в `LotMutationPolicy`, `LotTransitionPolicy`, `LotReadProjectionPolicy` с focused unit-тестами (`normalization`, `date/transition guards`, `details sorting projection`), а сам фасад переведён на thin-delegation через `LotReadQueryService` + `LotWriteWorkflowService`; read/write слои дополнительно покрыты focused integration-контрактами (`LotReadQueryServiceTests`, `LotWriteWorkflowServiceTests`).
- `LotRecommendations` apply-orchestration вынесен в `LotRecommendationApplyWorkflowService` с focused integration-тестами (`ready apply happy-path`, `not-ready guard`), а DI wiring-контракт дополнен проверкой резолва apply-workflow в scope фасада.
- `Projects` bootstrap/wiring контракт зафиксирован через DI alias (`IProjectsService -> ProjectsService`) и integration tests на scoped-identity + пустой projects-list path.
- `Projects` facade переведён на thin-delegation через `ProjectReadQueryService` + `ProjectWriteWorkflowService`, а access-scope/read/write rules вынесены в `ProjectScopeResolverService`, `ProjectReadScopePolicy`, `ProjectRequestPolicy`; добавлены focused integration/unit-контракты (`ProjectScopeResolverServiceTests`, `ProjectReadQueryServiceTests`, `ProjectWriteWorkflowServiceTests`, `ProjectPoliciesTests`).
- `Analytics` bootstrap/wiring контракт зафиксирован через DI alias (`IAnalyticsService -> AnalyticsService`) и integration tests на scoped-identity + view-catalog path; фасад переведён на thin-delegation через `AnalyticsKpiDashboardQueryService` + `AnalyticsViewCatalogQueryService`, а support-services покрыты focused integration-контрактами (`empty KPI dataset`, `view-catalog contract`).
- `RegistryExport` bootstrap/wiring контракт зафиксирован через DI alias (`IRegistryExportService -> RegistryExportService`) и integration tests на scoped-identity + basic CSV export path.
- `RegistryExport` переведён на explicit DI factory composition (all upstream facade dependencies), а integration DI-контракт усилен проверкой полного dependency graph resolve в одном scope.
- `RegistryExport` csv formatting/building слой вынесен в `RegistryExportCsvPolicy` с focused unit-тестами (`RegistryExportCsvPolicyTests`), сервис оставлен как orchestrator с domain-row mapping.
- `Application` composition root декомпозирован на module-level registration extensions (`DependencyInjection.Modules.cs`), а `AddApplication(...)` оставлен тонким orchestrator-слоем для wiring-последовательности.
- `XML inbox imports` bootstrap/wiring контракт зафиксирован через DI alias (`IXmlSourceDataImportInboxService -> XmlSourceDataImportInboxService`) и integration tests на scoped-identity + empty-list path.
- `Lots` bootstrap/wiring контракт зафиксирован через DI alias (`ILotsService -> LotsService`) и integration tests на scoped-identity + empty registry path, дополнительно закреплён support-graph resolve contract (`LotReadQueryService`, `LotWriteWorkflowService`).
- `Lot recommendations` bootstrap/wiring контракт зафиксирован через DI alias (`ILotRecommendationsService -> LotRecommendationsService`) и integration tests на scoped-identity + unknown-batch null path.
- `ProcurementProcedures` bootstrap/wiring контракт зафиксирован через DI alias (`IProcurementProceduresService -> ProcurementProceduresService`) и integration tests на scoped-identity + support-graph resolve contract (all workflow dependencies registered in scope).
- `ReferenceData` bootstrap/wiring контракт зафиксирован через DI alias (`IReferenceDataService -> ReferenceDataService`) и integration tests на scoped-identity + empty-list path.
- `ReferenceData` facade переведён на thin-delegation через `ReferenceDataReadQueryService` + `ReferenceDataWriteWorkflowService`, code/request normalization вынесены в `ReferenceDataCodePolicy`; добавлены focused integration/unit-контракты (`ReferenceDataReadQueryServiceTests`, `ReferenceDataWriteWorkflowServiceTests`, `ReferenceDataCodePolicyTests`).
- `UsersAdministration` bootstrap/wiring контракт зафиксирован через DI alias (`IUsersAdministrationService -> UsersAdministrationService`) и integration tests на scoped-identity + empty users path.
- `UsersAdministration` facade переведён на thin-delegation через `UsersAdministrationReadQueryService` + `UsersAdministrationWriteWorkflowService`, role normalization/validation вынесены в `UsersAdministrationRolePolicy`, read projection вынесен в `UsersAdministrationReadProjectionPolicy`; добавлены focused integration/unit-контракты (`UsersAdministrationReadQueryServiceTests`, `UsersAdministrationWriteWorkflowServiceTests`, `UsersAdministrationRolePolicyTests`).
- `SlaMonitoring` negative notification paths (`sendNotifications=false`, missing recipient email, retry-attempt behavior).
- `SlaMonitoring` reason-code validation via reference data (`SetViolationReasonAsync` positive/negative SQL scenarios).
- `SlaMonitoring` rule/code/text normalization вынесены в `SlaRuleConfigurationPolicy` с focused unit-тестами (`rule normalization`, `warning-days guards`, `fallback resolution`).
- `SlaMonitoring` candidate loading/query orchestration вынесена в `SlaViolationCandidateQueryService`, а mail-formatting в `SlaNotificationPolicy`; добавлены unit/integration контракты на notification format и DI alias/wiring.
- `SlaMonitoring` rules/violations administration path вынесен в `SlaRuleAndViolationAdministrationService` (`rules get/upsert`, `violations list`, `reason set/clear`) с focused integration-тестами и DI wiring contract.
- `SlaMonitoring` monitoring-cycle orchestration вынесен в `SlaMonitoringCycleWorkflowService` с focused integration-тестами (`empty-cycle`, `sendNotifications=false path`) и обновлённым DI wiring contract.
- `Analytics` empty-dataset SQL scenario (нулевые KPI + `null`-проценты/средние без деления на ноль).
- `Analytics` SQL-проверка сортировки `TopContractors` и выбора последнего timestamp рейтинга (`GROUP BY + MAX` path).
- `Contracts` draft-generation flow (`CreateDraftFromProcedureAsync`): winner-offer happy path, missing winner offer, duplicate contract number conflict.
- `Contracts` execution/monitoring flow: milestones replace semantics, monitoring invalid-stage guard без побочных эффектов, MDR import (`AMBIGUOUS_TARGET` strict path + `SkipConflicts` partial update path).
- SQL-regression/fix: query filters для `ContractMilestone` / `ContractMonitoringControlPoint` / `ContractMonitoringControlPointStage` / `ContractMdrCard` / `ContractMdrRow` дополнены `!IsDeleted`, чтобы soft-deleted дочерние записи не попадали в read paths.
- SQL-constraint hardening для `ContractsSet`: уникальность активного `ContractNumber` и активного `ProcedureId` теперь зафиксирована на уровне БД через filtered unique indexes (`[IsDeleted] = 0`) + SQL regression tests на conflict и reuse после soft-delete.
- для rollout добавлен preflight-скрипт проверки дублей перед миграцией: `docs/sql-preflight-contract-uniqueness-check.sql`.
- `Procurement` shortlist orchestration добавлен в SQL contour: explainable recommendations, apply-flow persistence (`shortlist` + adjustment logs), `MaxIncluded` clamp behavior (`< 1 => 1`).
- `Procurement` shortlist apply-flow normalization/mapping вынесен в `ProcedureShortlistApplyPolicy` с focused unit-тестами (`max clamp`, `reason default/trim`, `selected-candidates`, `upsert-request mapping`).
- `Procurement` completion-transition guard в SQL contour усилен side-effects проверками: при ошибках (`no contract`, `contract lot mismatch`) не появляются history-записи в `Completed`/`Contracted`, и статусы процедуры/лота остаются неизменными.
- `Procurement` delete-rules добавлены в SQL + fast integration contour: удаление разрешено только для `Created/DocumentsPreparation/Canceled`, для `Sent` выбрасывается ошибка без побочных эффектов.
- `Contracts Monitoring` import-status logic вынесена в отдельный pure JS module с unit-тестами (`resolve mode`, `import preconditions`, `conflict preview`, `strict/partial/success status branches`).
- `Contracts Monitoring` import runtime orchestration вынесен в отдельный JS controller module с unit-тестами (`button state`, `import API payload`, `selected-card restore`, `status propagation`).
- `Contracts Monitoring` load/save data orchestration вынесена в отдельный JS service module с unit-тестами (`reset path`, `load normalization/status`, `read-only save guard`).
- `Contracts Monitoring` DevExpress grid configuration вынесена в отдельный JS module с unit-тестами (`selection callbacks`, `fallback data-error messages`, `parent-selection guards` для stage/MDR-row insert).
- `Contracts Monitoring` panel-controls/state logic вынесена в отдельный JS module с unit-тестами (`no-contract reset`, `editable mode`, `read-only mode`) и bootstrap-заглушкой missing-module diagnostics.
- `Contracts Monitoring` selection/sync orchestration вынесена в отдельный JS module с unit-тестами (`ensure default selection`, `dependent grid refresh`, `stage/row sync back to parent`) и bootstrap-заглушкой missing-module diagnostics.
- `Contracts Monitoring` grid config decomposition углублена: `KP` и `MDR` grid-конфигурации выделены в отдельные JS modules, а `contracts-monitoring-grids.js` переведён в thin orchestrator с контрактной валидацией submodules.
- `Contracts UI` helper-слой декомпозирован на `contracts-grid-filter-helpers`, `contracts-grid-payload-helpers`, `contracts-grid-import-helpers`; `contracts-grid-helpers.js` переведён в thin aggregator с backward-compatible API `ContractsGridHelpers`.
- `Imports UI` первая волна декомпозиции выполнена через выделение `imports-page-helpers.js` (CSV/date/mapping/row-validation/formatting pure-логика) с отдельными unit-тестами (`imports-page-helpers.test.js`).
- `Imports UI` API/request-слой вынесен в отдельный модуль `imports-page-api.js` с unit-тестами (`error parsing`, `request headers/credentials`, `204/empty`, `URL builders`).
- `Imports UI` lot-recommendations state/payload rules вынесены в `imports-page-lot-state.js` с unit-тестами (`selection map`, `action guards`, `apply payload`, `summary formatting`).
- `Imports UI` endpoint-specific HTTP orchestration (`batches/xml/lot`) вынесена в `imports-page-api.js` с unit-тестом URL/method/body contract.
- `Imports UI` workflow/transition rules вынесены в `imports-page-workflow.js` с unit-тестами (`targets`, `guidance branches`, `transition payload validation`, `auto-refresh`).
- `Imports UI` lot-selection event mutations (`group select`, `lot code/name edit`) вынесены в `imports-page-lot-state.js` с unit-тестами mutator-логики.
- `Imports UI` mapping-orchestration (`build/apply mapping`, required-fields guard, max-rows guard, summary texts) вынесена в `imports-page-mapping.js` с отдельным unit test suite.
- `Imports UI` file-parse orchestration (`extension detection`, parser path selection, unsupported/empty guards) вынесена в `imports-page-file-parser.js` с unit-тестами.
- `Imports UI` table-model слой (`preview/batches/invalid/history/xml inbox`) вынесен в `imports-page-table-models.js` с отдельными unit-тестами на cell/action mapping.
- `Imports UI` lot-table model слой (`lot groups`/`selected groups`) вынесен в `imports-page-lot-state.js` с unit-тестами на empty/data states и selected-only mapping.
- `Imports UI` lot-rule layer (`build/apply request guards`, `recommendations status text`) вынесена в `imports-page-lot-state.js` с unit-тестами по branch-покрытию.
- `Imports UI` XML helper layer (`queue payload defaults/validation`, `inbox normalization`, `status messages`) вынесена в `imports-page-xml.js` с отдельным unit test suite.
- `Imports UI` upload helper layer (`queued payload validation/defaults`, `status message builder`) вынесена в `imports-page-upload.js` с отдельным unit test suite.
- `Imports UI` workbook parser layer (`SheetJS runtime guard`, first-sheet parsing, empty-row filtering) вынесена в `imports-page-workbook.js` с отдельным unit test suite.
- `Imports UI` batches orchestration layer (`load/list/details`, auto-refresh polling, transition apply-flow`) вынесена в `imports-page-batches.js` с отдельным unit test suite.
- `Imports UI` reports/download layer (`validation/lot-reconciliation URL builders`, `window.open` orchestration) вынесена в `imports-page-reports.js` с отдельным unit test suite.
- `Imports UI` XML inbox orchestration layer (`load/queue/retry`, XML-table model rendering contract) вынесена в `imports-page-xml-inbox.js` с отдельным unit test suite.
- `Imports UI` lot orchestration layer (`build/apply recommendations`, selection mutation routing, action-state updates) вынесена в `imports-page-lot-orchestration.js` с отдельным unit test suite.
- `Imports UI` lot tables rendering layer (`groups/selected` table rendering + renderer contract) вынесена в `imports-page-lot-tables.js` с отдельным unit test suite.
- `Imports UI` batch/details/history tables rendering layer (`batches`, `invalid rows`, `history`) вынесена в `imports-page-batch-tables.js` с отдельным unit test suite.
- `Imports UI` mapping/preview UI layer (`mapping grid model`, `mapping read`, `preview rendering`) вынесена в `imports-page-mapping-ui.js` с отдельным unit test suite.
- `Imports UI` table interaction routing layer (`lot events`, `batch open`, `xml view/retry`) вынесена в `imports-page-interactions.js` с отдельным unit test suite.
- `Imports UI` status-notification layer (`upload/batches/mapping/transition/xml/lot`) вынесена в `imports-page-status.js` с отдельным unit test suite.
- `Imports UI` workflow-controls layer (`transition targets render`, `workflow actions enabled/disabled state`) вынесена в `imports-page-workflow-ui.js` с отдельным unit test suite.
- `Imports UI` mapping-flow orchestration layer (`parse file`, `rebuild mapping`, `apply mapping`) вынесена в `imports-page-mapping-orchestration.js` с отдельным unit test suite.
- `Imports UI` wizard/session layer (`upload batch`, `wizard reset and state clear`) вынесена в `imports-page-wizard-session.js` с отдельным unit test suite.
- `Imports UI` action-handlers layer (`toolbar/workflow/xml/lot/report handler logic`) вынесена в `imports-page-action-handlers.js` с отдельным unit test suite.
- `Imports UI` action-bindings layer (`toolbar/workflow/xml/lot/report button handlers`) вынесена в `imports-page-action-bindings.js` с отдельным unit test suite.
- `Imports UI` runtime/bootstrap layer (`batch history loading`, `startup initialization`) вынесена в `imports-page-runtime.js` с отдельным unit test suite.
- `Imports UI` bootstrap-context layer (`DOM resolve`, `endpoint resolve`, `submodule diagnostics`) вынесена в `imports-page-bootstrap.js` с отдельным unit test suite.
- `Imports UI` config layer (`row limits`, `status transitions/labels`, `field definitions`) вынесена в `imports-page-config.js` с отдельным unit test suite.
- `Imports UI` state layer (`parsed/mapping/source state`, `details poll handle`, `lot recommendations state`) вынесена в `imports-page-state.js` с отдельным unit test suite.
- `Imports UI` session-wiring layer (`mapping/wizard/action composition`, `bind stage`) вынесена в `imports-page-session-wiring.js` с отдельным unit test suite.
- `Imports UI` services-wiring layer (`status/workflow/batches/xml/lot/interactions/file-parser composition`) вынесена в `imports-page-services-wiring.js` с отдельным unit test suite.
- `Imports UI` services-wiring layer дополнительно декомпозирован на submodules (`imports-page-services-wiring-validation`, `imports-page-services-wiring-foundation`, `imports-page-services-wiring-orchestration`), а `imports-page-services-wiring.js` переведён в thin orchestrator.
- `Imports UI` entrypoint composition (`bootstrap -> state/config/services/session/runtime`) покрыта отдельным contract suite `imports-page-entrypoint.test.js`.
- `Contractors UI` helper layer (`localization`, `date/number normalization`, `rating delta formatting`, `model form fill/payload build`) вынесена в `contractors-grid-helpers.js` с отдельным unit test suite.
- `Contractors UI` API/transport layer (`request`, error parsing, endpoint helpers, rating endpoints`) вынесена в `contractors-api.js` с отдельным unit test suite.
- `Contractors UI` grid-factory layer (`registry/history/analytics dxDataGrid configs`, selection callback routing) вынесена в `contractors-grids.js` с отдельным unit test suite.
- `Contractors UI` ui-state layer (`status messages`, `busy toggle`, `selection summary`, `buttons enable/disable`) вынесена в `contractors-ui-state.js` с отдельным unit test suite.
- `Contractors UI` bootstrap-context layer (`DOM resolve`, `endpoints/controls resolve`, `DevExpress/submodule diagnostics`) вынесена в `contractors-bootstrap.js` с отдельным unit test suite.
- `Contractors UI` entrypoint composition (`bootstrap -> helpers/api/grids/data/model/actions`) покрыта отдельным contract suite `contractors-grid-entrypoint.test.js`.
- `Contractors UI` grid-factory layer дополнительно декомпозирован на submodules (`contractors-grids-registry`, `contractors-grids-history`, `contractors-grids-analytics`), а `contractors-grids.js` переведён в thin orchestrator с module-resolver.
- `Contractors UI` actions layer дополнительно декомпозирован на submodules (`contractors-actions-rating`, `contractors-actions-model`, `contractors-actions-manual`), а `contractors-actions.js` переведён в thin orchestrator с module-resolver.
- `Admin UI` grid-factory layer (`roles/users/reference dxDataGrid configs`, toolbar refresh, data-error callbacks) вынесена в `admin-grids.js` с отдельным unit test suite.
- `Admin UI` grid-factory layer дополнительно декомпозирован на submodules (`admin-grids-roles`, `admin-grids-users`, `admin-grids-reference`), а `admin-grids.js` переведён в thin orchestrator.
- `Admin UI` data/runtime layer (`roles/users/reference load`, `CustomStore` CRUD orchestration, status updates) вынесена в `admin-runtime.js` с отдельным unit test suite.
- `Admin UI` bootstrap-context layer (`DOM resolve`, `endpoints/controls resolve`, `DevExpress/submodule diagnostics`) вынесена в `admin-bootstrap.js` с отдельным unit test suite.
- `Admin UI` wiring layer (`search/reference state`, `event binding`, `API link sync`, input guards) вынесена в `admin-wiring.js` с отдельным unit test suite.
- `Admin UI` entrypoint composition layer (`bootstrap -> runtime/grids/wiring`) покрыта отдельным contract suite `admin-grid-entrypoint.test.js`.
- `Contracts UI` entrypoint composition (`bootstrap -> api/model/state/controllers`) покрыта отдельным contract suite `contracts-grid-entrypoint.test.js`.
- `Security` provisioning pipeline покрыт fast integration тестами:
  - `UserProvisioningService` (`create/update user`, `bootstrap admin role assign`, anonymous no-op);
  - `CurrentUserProvisioningMiddleware` (`authenticated -> provisioning call`, `anonymous -> skip`, `always-next` contract).
- `Security` authorization/identity infrastructure покрыт fast integration тестами:
  - `PermissionEvaluator` (login normalization для `DOMAIN\user`/`user@domain`, inactive user guard, missing permission path, soft-delete guards для `AppUser`/`AppRole`);
  - `PermissionAuthorizationHandler` (`success`/`no-login` ветки, evaluator call contract);
  - `CurrentUserService` (normalized login extraction + `system` fallback);
  - `SystemDateTimeProvider` (`UtcNow` UTC-contract).
- `Security` local-dev authentication покрыт fast integration тестами:
  - `LocalDevelopmentAuthenticationHandler` (`default claims` fallback при пустом config и `configured claims` path).
- `Infrastructure` SMTP notification adapter покрыт fast integration тестами:
  - `SmtpNotificationEmailSender` (`disabled`, `dry-run`, `host/from config guards`, `cancel-before-send` без реальной SMTP-сети).
- `Infrastructure` DI bootstrap layer покрыт fast integration тестами:
  - `AddInfrastructure(...)` (guard на отсутствующий `DefaultConnection`, service registration contract, options binding contract для `Security/Smtp`).
- `Web` authorization bootstrap/wiring слой покрыт fast integration тестами:
  - `AddSubcontractorAuthorization(...)` (policy-to-permission mapping contract, handler registration contract, полнота покрытия всех `PolicyCodes`).
- `Web` authentication bootstrap/wiring слой покрыт fast integration тестами:
  - `AddSubcontractorAuthentication(...)` (dev/prod default-scheme contract, scheme registration contract, null-guard).
- `Web` composition/pipeline bootstrap слой покрыт fast integration тестами:
  - `AddSubcontractorWebComposition(...)` (DemoSeed options binding, localization/json options wiring, hosted-worker registrations, demo-service registration).
  - `WebApplicationPipelineExtensions` (`supported cultures`, `request localization options`, `UseSubcontractorPipeline` return contract).
- `Projects UI` helper/API/runtime/grid/bootstrap слои выделены в отдельные модули (`projects-helpers/api/runtime/grids/bootstrap`) с unit-тестами и entrypoint contract suite.
- `Procedures UI` config layer (`status/transition dictionaries`, captions, lookup arrays) вынесена в `procedures-config.js` с отдельным unit test suite.
- `Procedures UI` services-composition layer (`helpers/api/workflow/columns/data service graph`) вынесена в `procedures-services.js` с отдельным unit test suite.
- `Procedures UI` helper layer (`URL filters`, localization captions, shortlist normalization/guards, payload normalization helpers и create/update payload builders`) вынесена в `procedures-grid-helpers.js` с отдельным unit test suite.
- `Procedures UI` helper layer дополнительно декомпозирован на submodules (`procedures-grid-localization-helpers`, `procedures-grid-filter-helpers`, `procedures-grid-payload-helpers`), а `procedures-grid-helpers.js` переведён в thin aggregator с backward-compatible API.
- `Procedures UI` API/transport layer (`request`, error parsing, endpoint helpers) вынесена в `procedures-api.js` с отдельным unit test suite.
- `Procedures UI` data/cache orchestration layer (`load/details cache`, `create/update/delete cache mutations`) вынесена в `procedures-data.js` с отдельным unit test suite.
- `Procedures UI` workflow layer (`transition validation`, `reason-required rules`, selection/shortlist status messages`) вынесена в `procedures-workflow.js` с отдельным unit test suite.
- `Procedures UI` grid-columns layer (history/shortlist/adjustments/registry column definitions) вынесена в `procedures-grid-columns.js` с отдельным unit test suite.
- `Procedures UI` grid-columns layer дополнительно декомпозирован на submodules (`procedures-grid-columns-history`, `procedures-grid-columns-shortlist`, `procedures-grid-columns-registry`), а `procedures-grid-columns.js` переведён в thin orchestrator.
- `Procedures UI` grid-factory layer (`history/shortlist/adjustments/registry dxDataGrid configs`) вынесена в `procedures-grids.js` с отдельным unit test suite.
- `Procedures UI` store layer (`CustomStore load/create/update/delete orchestration`, selection-reset on delete) вынесен в `procedures-store.js` с отдельным unit test suite.
- `Procedures UI` registry-events layer (`editor/selection/toolbar/data-error callbacks`) вынесен в `procedures-registry-events.js` с отдельным unit test suite.
- `Procedures UI` shortlist-workspace layer (`controls state`, `recommendations/adjustments load`, `apply-flow`, `events bind`) вынесена в `procedures-shortlist.js` с отдельным unit test suite.
- `Procedures UI` transition-controller layer (`target render`, `apply transition flow`, `history load/refresh`, `events bind`) вынесена в `procedures-transition.js` с отдельным unit test suite.
- `Procedures UI` selection/sync layer (`selected procedure state`, `summary sync`, `history/shortlist coordination`) вынесена в `procedures-selection.js` с отдельным unit test suite.
- `Procedures UI` bootstrap-context layer (`DOM resolve`, `DevExpress readiness`, `submodule diagnostics`) вынесена в `procedures-bootstrap.js` с отдельным unit test suite.
- `Procedures UI` entrypoint composition (`bootstrap -> services/store/grids/controllers/workspace`) покрыта отдельным contract suite `procedures-grid-entrypoint.test.js`.
- `Contracts backend` validation/transition/normalization/import policies вынесены в отдельные unit-testable modules:
  - `ContractRequestValidationPolicy`;
  - `ContractTransitionPolicy`;
  - `ContractMilestoneNormalizationPolicy`.
  - `ContractMonitoringControlPointNormalizationPolicy`;
  - `ContractMdrNormalizationPolicy`.
  - `ContractReadModelProjectionPolicy`.
  - `ContractExecutionSummaryPolicy`.
  - `ContractMdrImportResolutionPolicy`.
  - `ContractDataAccessPolicy` (DB guard/query helper extraction layer).
  - `ContractEntityMutationPolicy`.
  - `ContractReadQueryService` (read/query extraction layer).
  - `ContractExecutionWorkflowService` (write/execution extraction layer).
  - `ContractLifecycleWorkflowService` (create/update/delete/transition/draft extraction layer).
- `Imports UI` helper layer дополнительно декомпозирован на submodules (`imports-page-helpers-parsing`, `imports-page-helpers-row-mapper`), а `imports-page-helpers.js` переведён в thin aggregator с backward-compatible API.
- `Imports UI` services/session wiring слои дополнительно декомпозированы на submodules:
  - `imports-page-services-wiring-validation/foundation/orchestration`;
  - `imports-page-session-wiring-validation/composition`;
  - orchestrator-файлы `imports-page-services-wiring.js` и `imports-page-session-wiring.js` оставлены thin composition entrypoints с контрактными guards.
- `Imports UI` bootstrap layer дополнительно декомпозирован на:
  - `imports-page-bootstrap-validation` (селекторы + module requirements + resolvers);
  - `imports-page-bootstrap-composition` (context/endpoint composition);
  - `imports-page-bootstrap.js` сохранён как thin orchestrator с module-resolver.
- `Imports UI` lot-state layer дополнительно декомпозирован на:
  - `imports-page-lot-state-core` (recommendations/actions/payload/mutations rules);
  - `imports-page-lot-state-table-models` (table projections);
  - `imports-page-lot-state.js` сохранён как thin orchestrator с module-resolver.
- `Imports UI` action-handlers layer дополнительно декомпозирован на:
  - `imports-page-action-handlers-validation` (control/callback/state contracts);
  - `imports-page-action-handlers-composition` (runtime click/action handlers);
  - `imports-page-action-handlers.js` сохранён как thin orchestrator с module-resolver.
- `Dashboard UI` renderer layer дополнительно декомпозирован на `dashboard-page-renderers-core` + `dashboard-page-renderers-infographics`, а `dashboard-page-renderers.js` оставлен как thin orchestrator.
- `Contracts Monitoring UI` runtime-orchestration вынесена в `contracts-monitoring-runtime.js`, `contracts-monitoring.js` переведён в thin controller, а read-only smoke path переведён в strict-fail mode (без skip fallback).
- `Contracts Monitoring UI` model-layer дополнительно декомпозирован на submodules (`contracts-monitoring-model-normalization`, `contracts-monitoring-model-metrics`, `contracts-monitoring-model-payload`), а `contracts-monitoring-model.js` переведён в thin orchestrator с module-resolver.
- `Contracts UI` import-helper слой дополнительно декомпозирован на submodules (`contracts-grid-import-file-parsing`, `contracts-grid-import-mdr-rows`), а `contracts-grid-import-helpers.js` переведён в thin orchestrator с backward-compatible API.
- `Contracts UI` entrypoint/runtime слой дополнительно декомпозирован: orchestration вынесена в `contracts-grid-runtime.js`, а `contracts-grid.js` переведён в thin delegating entrypoint; контракт покрыт парой suites `contracts-grid-entrypoint.test.js` + `contracts-grid-runtime.test.js`.
- `Contracts UI` runtime foundation слой дополнительно выделен в `contracts-grid-runtime-foundation.js`, а `contracts-grid-runtime.js` переведён на thin orchestration; добавлен dedicated unit suite `contracts-grid-runtime-foundation.test.js`.
- `Contracts UI` runtime controller-composition слой дополнительно выделен в `contracts-grid-runtime-controllers.js`, а `contracts-grid-runtime.js` переведён на thin orchestration поверх `foundation + controllers`; добавлен dedicated unit suite `contracts-grid-runtime-controllers.test.js`.
- `SLA UI` helper/API слои вынесены в `sla-page-helpers.js` + `sla-page-api.js`, `sla-page.js` переведён в thin orchestrator, добавлены dedicated JS unit suites и browser smoke сценарий для страницы `/Home/Sla`.

## Последний сквозной прогон

Снимок последнего full gate прогона на `2026-04-10`:

- `Build`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `378/378`.
- `SQL Core`: `78/78` (при `SUBCONTRACTOR_SQL_TESTS=1`);
- `SQL Full`: `80/80` (при `SUBCONTRACTOR_SQL_TESTS=1`).
- `Coverage Raw (line)`: `19.1%` (`7354 / 38335`);
- `Coverage Meaningful (line)`: `79.3%` (`7354 / 9262`).

Дополнительный partial rerun после UI-итераций дашборда и выделения `dashboard-page-formatters.js` + `dashboard-page-bootstrap.js` + `dashboard-page-renderers.js` на `2026-04-11`:

- `Build (Subcontractor.sln)`: `green`;
- `Frontend JS unit`: `393/393`;
- `Browser smoke`: `11/11`.

Дополнительный partial rerun после декомпозиции `contracts-monitoring-grids-kp` на `columns/events` submodules на `2026-04-11`:

- `Build (Subcontractor.sln)`: `green`;
- `Frontend JS unit`: `404/404`;
- `Browser smoke`: `10 passed`, `1 skipped`.

Дополнительный partial rerun после добавления `contracts-monitoring entrypoint` contract suite на `2026-04-11`:

- `Frontend JS unit`: `407/407`.

Дополнительный partial rerun после `contracts-monitoring bootstrap/wiring extraction` на `2026-04-11`:

- `Build (Subcontractor.sln)`: `green`;
- `Frontend JS unit`: `415/415`;
- `Browser smoke`: `10 passed`, `1 skipped`.

Дополнительный partial rerun после `contracts-registry columns/events/store extraction` на `2026-04-11`:

- `Build (Subcontractor.sln)`: `green`;
- `Frontend JS unit`: `427/427`;
- `Browser smoke`: `10 passed`, `1 skipped`.

Дополнительный partial rerun после `contracts-execution-panel grid/events extraction` на `2026-04-11`:

- `Build (Subcontractor.sln)`: `green`;
- `Frontend JS unit`: `437/437`;
- `Browser smoke`: `10 passed`, `1 skipped`.

Дополнительный partial rerun после `contracts-workflow history-grid/events extraction` на `2026-04-11`:

- `Build (Subcontractor.sln)`: `green`;
- `Frontend JS unit`: `449/449`;
- `Browser smoke`: `10 passed`, `1 skipped`.

Дополнительный partial rerun после `contracts-draft events extraction` на `2026-04-11`:

- `Build (Subcontractor.sln)`: `green`;
- `Frontend JS unit`: `455/455`;
- `Browser smoke`: `10 passed`, `1 skipped`.

Дополнительный partial rerun после `contracts-bootstrap elements/modules extraction` на `2026-04-12`:

- `Build (Subcontractor.sln)`: `green`;
- `Frontend JS unit`: `459/459`;
- `Browser smoke`: `10 passed`, `1 skipped`.

Последний полный локальный rerun после residual second-wave декомпозиции (`imports-page-helpers parsing/row-mapper`, `dashboard renderers core/infographics`, `contracts-monitoring runtime`) на `2026-04-12`:

- `Build (Subcontractor.sln)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `471/471`;
- `Browser smoke`: `11/11` (green на `BASE_URL=http://127.0.0.1:5081`);
- `SQL Core`: `78/78` (при `SUBCONTRACTOR_SQL_TESTS=1`);
- `SQL Full`: `80/80` (при `SUBCONTRACTOR_SQL_TESTS=1`);
- `Coverage Raw (line)`: `20.9%` (`8134 / 38860`);
- `Coverage Meaningful (line)`: `83.1%` (`8134 / 9787`).

Дополнительный partial rerun после `SLA UI helpers/api extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `477/477`;
- `Browser smoke`: `12/12` (green на `BASE_URL=http://127.0.0.1:5081`).

Дополнительный partial rerun после `Contractors grids submodule decomposition` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `483/483`;
- `Browser smoke`: `12/12` (green на `BASE_URL=http://127.0.0.1:5081`).

Дополнительный partial rerun после `Contractors actions submodule decomposition` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `492/492`;
- `Browser smoke`: `12/12` (green на `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081`).

Дополнительный partial rerun после `Imports services-wiring submodule decomposition` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `498/498`;
- `Browser smoke`: `12/12` (green на `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081`).

Дополнительный partial rerun после `Imports session-wiring submodule decomposition` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `502/502`;
- `Browser smoke`: `12/12` (green на `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081`).

Дополнительный partial rerun после `Imports bootstrap validation/composition extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `510/510`;
- `Browser smoke`: `12/12` (green на контролируемом host с `ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`, `BASE_URL=http://127.0.0.1:5081`).

Дополнительный partial rerun после `Imports lot-state core/table-models extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `517/517`;
- `Browser smoke`: `12/12` (green на контролируемом host с `ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`, `BASE_URL=http://127.0.0.1:5081`).

Дополнительный partial rerun после `Imports action-handlers validation/composition extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `523/523`;
- `Browser smoke`: `12/12` (green на контролируемом host с `ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`, `BASE_URL=http://127.0.0.1:5081`).

Дополнительный partial rerun после `Contracts monitoring model normalization/metrics/payload extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `532/532`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Contracts import helpers file-parsing/MDR-rows extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Frontend JS unit`: `538/538`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Procedures shortlist validation/runtime extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `543/543`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Procedures grid runtime foundation extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `550/550`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `SLA page rules/violations extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `558/558`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `SLA page runtime extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `563/563`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Imports bootstrap-validation controls/modules extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `569/569`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Lots grids history/registry submodule decomposition` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `573/573`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Lots data core/store submodule decomposition` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `578/578`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Lots grid runtime extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `580/580`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Dashboard runtime extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `585/585`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Contracts grid runtime extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `586/586`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Contracts grid runtime foundation extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `588/588`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Contracts grid runtime controllers extraction` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `590/590`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Contracts runtime controllers submodules wiring + browser script-order fix` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `598/598`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Contracts.cshtml script-order regression guard` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `599/599`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Dashboard runtime field collectors extraction + script-order guard` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `602/602`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Procedures runtime bindings extraction + script-order guard` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `605/605`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Procedures runtime workspace extraction + script-order guard` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `607/607`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Procedures grids config extraction + script-order guard` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `610/610`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Procedures shortlist runtime data extraction + script-order guard` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `613/613`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Дополнительный partial rerun после `Procedures payload-normalization extraction + script-order guard` на `2026-04-12`:

- `Build (Subcontractor.Web)`: `green`;
- `Unit`: `173/173`;
- `Fast integration`: `301/301`;
- `Frontend JS unit`: `616/616`;
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

Последний известный CI-full snapshot на `2026-04-09`:

- `SQL Core`: `73/73`;
- `SQL Full`: `2/2`;
- `Browser smoke (CI strict mode)`: `5/5`.

## Слои тестов

1. Unit tests
   - Быстрые тесты бизнес-логики без реальной БД.
   - Проект: `tests/Subcontractor.Tests.Unit`.

2. Fast integration tests (`EF Core InMemory`)
   - Быстрая проверка сервисов и контроллеров.
   - Проект: `tests/Subcontractor.Tests.Integration`.
   - Ограничение: не ловят SQL-специфику (`FK`, `cascade paths`, query translation).
   - Runtime stability: в test csproj зафиксирован `UseAppHost=false`, чтобы исключить `apphost` file-lock/signing сбои на путях с облачной синхронизацией.

3. SQL-backed integration tests
   - Реальный SQL Server контур.
   - Проект: `tests/Subcontractor.Tests.SqlServer`.
   - Текущий режим запуска: последовательный (без параллелизации) для снижения flaky-рисков на старте.
   - Разделение наборов:
     - `SqlSuite=Core` для PR/develop;
     - `SqlSuite=Full` для main/nightly/manual.
   - Проверяют миграции, ограничения схемы, SQL-совместимость и критичные сценарии.

4. Frontend JS unit tests (pure logic)
   - Минимальный Node.js stack на встроенном `node:test`.
   - Каталог: `tests/js`.
   - Фокус: helper/model функции без браузерной среды (`payload builders`, импорт-валидация, расчётные функции).
   - Запуск: `npm run test:js`.

5. Browser smoke tests
   - Минимальный Playwright барьер для ключевых страниц и навигации.
   - Каталог: `tests/smoke`.
   - Фокус: рендер главных страниц (`/`, `/Home/Procedures`, `/Home/Contracts`, `/Home/Imports`, `/Home/Admin`, `/Home/Projects`, `/Home/Sla`), русские заголовки, базовая навигация и наличие `?`-подсказок.
   - Дополнительно: проверка достижимости `actionUrl` ссылок задач на дашборде (`Мои задачи`), чтобы не допускать регрессии 404 по кнопке `Открыть`.
   - Дополнительно: проверка disclosure-переключателей на дашборде (`РАЗВЕРНУТЬ/СВЕРНУТЬ`) и заголовка секции `Рейтинг подрядчиков`.
   - Дополнительно: smoke-проверка инфографики дашборда (`KPI rings`, `overdue rates`, `analytics status`, import disclosure data visibility), чтобы ловить регрессии после UI-декомпозиции.
   - Дополнительно: функциональный сценарий импорта (`CSV parse` + `queue source-data batch`) на странице `/Home/Imports`.
   - Дополнительно: базовый smoke-сценарий админки (`apply/reset` server search, `reference type` reload, `Open API` link update).
   - Дополнительно: smoke-проверка страницы проектов (`projects module/grid/status`).
   - Дополнительно: smoke-проверка страницы SLA (`SLA module/status/rules+violations refresh controls`).
   - Дополнительно: read-only проверка реакции workflow/execution/monitoring панелей на выбор строки в реестре договоров.
   - В сценарии read-only реализован auto-seed минимального набора данных:
     - сначала через `POST /api/demo/contracts/smoke-seed` (если endpoint включён);
     - затем fallback на legacy API-chain (`project` + `lot` + `procedure` + `contractor` + `contract`).
   - Для уменьшения 401/credential проблем на внешних стендах сидинг выполняется через `page.request` (в auth-контексте браузерной страницы), а не через изолированный `request` fixture.
   - Для read-only smoke используется strict-режим: если auto-seed не удался или строка так и не появилась в grid, тест падает как `failed` (без fallback `skip`).
   - Запуск: `npm run test:smoke` (требует запущенный web-host + SQL).

## Цель SQL-backed контура

- закрыть главный quality gap fast integration тестов;
- детектировать SQL-специфичные проблемы до ручного запуска приложения;
- обеспечить стабильную регрессию для критичных модулей.

## Метрики покрытия

Смотреть две метрики:

1. Raw coverage по всему `src`.
2. Meaningful coverage по handwritten production code без:
   - `src/**/Migrations/**`;
   - `*.Designer.cs`;
   - `AppDbContextModelSnapshot.cs`.

## Минимальный quality gate (текущее целевое состояние)

Для pull request:

- build;
- unit tests;
- fast integration tests;
- frontend js unit tests;
- browser smoke tests;
- core SQL-backed tests.

В CI это реализовано отдельными job-ами:

- `build`;
- `unit-tests`;
- `fast-inmemory-integration`;
- `frontend-js-unit`;
- `browser-smoke`;
- `sqlserver-integration-core`;
- `sqlserver-integration-full`;
- `dbmigrator-dry-run`;
- `coverage-report`.

Для main/nightly:

- полный SQL-backed suite;
- migrator dry-run;
- расширенный regression run.
