# Refactoring Notes — Application Bootstrap (DI)

Дата обновления: `2026-04-11`

## Итерация 1 (facade alias hardening)

### Что сделано

В `src/Subcontractor.Application/DependencyInjection.cs` завершена унификация facade-регистраций:

- concrete + alias для `RegistryExportService`;
- concrete + alias для `XmlSourceDataImportInboxService`;
- concrete + alias для `LotsService`;
- concrete + alias для `LotRecommendationsService`;
- concrete + alias для `ReferenceDataService`;
- concrete + alias для `UsersAdministrationService`.

То есть все перечисленные интерфейсы теперь резолвятся через alias к concrete facade в одном scoped-lifetime:

- `IRegistryExportService -> RegistryExportService`;
- `IXmlSourceDataImportInboxService -> XmlSourceDataImportInboxService`;
- `ILotsService -> LotsService`;
- `ILotRecommendationsService -> LotRecommendationsService`;
- `IReferenceDataService -> ReferenceDataService`;
- `IUsersAdministrationService -> UsersAdministrationService`.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Exports/RegistryExportDependencyInjectionTests.cs`;
- `tests/Subcontractor.Tests.Integration/Imports/XmlSourceDataImportInboxDependencyInjectionTests.cs`;
- `tests/Subcontractor.Tests.Integration/Lots/LotsDependencyInjectionTests.cs`;
- `tests/Subcontractor.Tests.Integration/Lots/LotRecommendationsDependencyInjectionTests.cs`;
- `tests/Subcontractor.Tests.Integration/ReferenceData/ReferenceDataDependencyInjectionTests.cs`;
- `tests/Subcontractor.Tests.Integration/Admin/UsersAdministrationDependencyInjectionTests.cs`.

Покрытые контракты:

- scoped alias identity (`interface` и `concrete facade` — один инстанс);
- базовый рабочий вызов фасада на пустой БД (empty-list/null/CSV export path).

### Зачем

- сделать `Application` composition root полностью консистентным;
- упростить дальнейшую декомпозицию модулей без риска скрытых DI-регрессий;
- зафиксировать bootstrap-поведение быстрыми regression тестами.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`216/216`);
- `npm run test:js` — green (`363/363`).

## Итерация 2 (test runtime stabilization)

### Что сделано

Для тестовых проектов зафиксирован `UseAppHost=false`:

- `tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj`;
- `tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj`;
- `tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj`.

### Зачем

- убрать периодические `apphost` ошибки (`NETSDK1177`/`MSB3030`) на окружениях с облачной синхронизацией;
- сделать локальный прогон тестов стабильным без ручного флага `-p:UseAppHost=false`.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`216/216`);
- `npm run test:js` — green (`363/363`).

## Итерация 3 (imports support services wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs` для import-декомпозиции:

- добавлены scoped registrations для:
  - `SourceDataImportReadQueryService`;
  - `SourceDataImportBatchProcessingWorkflowService`.

Также обновлен DI-контракт тестами в imports наборе:

- `tests/Subcontractor.Tests.Integration/Imports/SourceDataImportsDependencyInjectionTests.cs` (резолвинг support services в одном scope).

### Зачем

- зафиксировать bootstrap-contract для новых support services после extraction из `SourceDataImportsService`;
- исключить regressions, где сервис собирается напрямую, но нужные внутренние зависимости отсутствуют в DI-графе.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`222/222`);
- `npm run test:js` — green (`363/363`).

## Итерация 4 (contractor-ratings workflow support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `ContractorRatingRecalculationWorkflowService`.

Обновлён integration-контракт DI:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingsDependencyInjectionTests.cs`
  - теперь проверяет резолв:
    - `ContractorRatingReadQueryService`;
    - `ContractorRatingRecalculationWorkflowService`.

### Зачем

- зафиксировать в composition root новый support service после декомпозиции `ContractorRatingsService`;
- исключить regressions, где facade резолвится, но внутренний workflow dependency не зарегистрирован.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`225/225`);
- `npm run test:js` — green (`363/363`).

## Итерация 5 (sla administration support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `SlaRuleAndViolationAdministrationService`;
- `SlaMonitoringService` factory расширен новой dependency `SlaRuleAndViolationAdministrationService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Sla/SlaDependencyInjectionTests.cs`
  - проверяет резолв:
    - `SlaRuleAndViolationAdministrationService`;
    - `SlaViolationCandidateQueryService`;
    - alias `ISlaMonitoringService -> SlaMonitoringService`.

### Зачем

- закрепить в composition root новый support service после декомпозиции SLA facade;
- исключить regressions, где SLA-фасад резолвится, но administration dependency отсутствует в DI-графе.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`228/228`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`76/76`);
- `npm run test:js` — green (`363/363`).

## Итерация 6 (sla cycle support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `SlaMonitoringCycleWorkflowService`;
- `SlaMonitoringService` factory переведён на explicit composition:
  - `SlaRuleAndViolationAdministrationService`;
  - `SlaMonitoringCycleWorkflowService`;
  - `IOptions<SlaMonitoringOptions>`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Sla/SlaDependencyInjectionTests.cs`
  - проверяет резолв:
    - `SlaRuleAndViolationAdministrationService`;
    - `SlaMonitoringCycleWorkflowService`;
    - `SlaViolationCandidateQueryService`;
    - alias `ISlaMonitoringService -> SlaMonitoringService`.

### Зачем

- закрепить новую SLA composition-model в DI bootstrap;
- исключить regressions, где thin-facade резолвится без полного workflow-графа.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`230/230`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`76/76`);
- `npm run test:js` — green (`363/363`).

## Итерация 7 (contractor-ratings lifecycle support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `ContractorRatingModelLifecycleService`;
- `ContractorRatingsService` переведён на explicit factory composition с полным graph:
  - `IApplicationDbContext`;
  - `IDateTimeProvider`;
  - `ContractorRatingReadQueryService`;
  - `ContractorRatingRecalculationWorkflowService`;
  - `ContractorRatingModelLifecycleService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingsDependencyInjectionTests.cs`
  - теперь проверяет резолв:
    - `ContractorRatingReadQueryService`;
    - `ContractorRatingRecalculationWorkflowService`;
    - `ContractorRatingModelLifecycleService`;
    - alias `IContractorRatingsService -> ContractorRatingsService`.

### Зачем

- закрепить новую decomposition-model `ContractorRatings` в composition root;
- исключить regressions, где facade резолвится без lifecycle support service;
- сохранить единый explicit bootstrap pattern для всех крупных backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`233/233`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`77/77`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 8 (contractor-ratings write workflow wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `ContractorRatingWriteWorkflowService`;
- `ContractorRatingsService` factory переведён на thin-facade composition:
  - `ContractorRatingReadQueryService`;
  - `ContractorRatingModelLifecycleService`;
  - `ContractorRatingWriteWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingsDependencyInjectionTests.cs`
  - теперь проверяет резолв:
    - `ContractorRatingReadQueryService`;
    - `ContractorRatingRecalculationWorkflowService`;
    - `ContractorRatingModelLifecycleService`;
    - `ContractorRatingWriteWorkflowService`;
    - alias `IContractorRatingsService -> ContractorRatingsService`.

### Зачем

- зафиксировать финальную decomposition-model `ContractorRatings` в DI;
- исключить regressions, где facade резолвится без write workflow dependency;
- сохранить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`236/236`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false --filter "SqlSuite=Core"` — green (`78/78`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 9 (dashboard import-pipeline support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `DashboardImportPipelineQueryService`;
- `DashboardService` переведён на explicit factory composition:
  - `IApplicationDbContext`;
  - `ICurrentUserService`;
  - `IDateTimeProvider`;
  - `DashboardImportPipelineQueryService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardDependencyInjectionTests.cs`
  - теперь проверяет резолв:
    - `DashboardImportPipelineQueryService`;
    - alias `IDashboardService -> DashboardService`.

### Зачем

- закрепить extraction import-pipeline query слоя в composition root;
- исключить regressions, где `DashboardService` резолвится без query dependency;
- сохранить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`238/238`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false --filter "SqlSuite=Core"` — green (`78/78`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 10 (dashboard my-tasks support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `DashboardMyTasksQueryService`;
- `DashboardService` factory переведён на explicit composition:
  - `IApplicationDbContext`;
  - `ICurrentUserService`;
  - `IDateTimeProvider`;
  - `DashboardImportPipelineQueryService`;
  - `DashboardMyTasksQueryService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardDependencyInjectionTests.cs`
  - теперь проверяет резолв:
    - `DashboardImportPipelineQueryService`;
    - `DashboardMyTasksQueryService`;
    - alias `IDashboardService -> DashboardService`.

### Зачем

- закрепить extraction my-tasks query слоя в composition root;
- исключить regressions, где `DashboardService` резолвится без task-query dependency;
- сохранить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`240/240`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 11 (dashboard performance-metrics support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `DashboardPerformanceMetricsQueryService`;
- `DashboardService` factory переведён на explicit composition:
  - `IApplicationDbContext`;
  - `ICurrentUserService`;
  - `IDateTimeProvider`;
  - `DashboardImportPipelineQueryService`;
  - `DashboardMyTasksQueryService`;
  - `DashboardPerformanceMetricsQueryService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardDependencyInjectionTests.cs`
  - теперь проверяет резолв:
    - `DashboardImportPipelineQueryService`;
    - `DashboardMyTasksQueryService`;
    - `DashboardPerformanceMetricsQueryService`;
    - alias `IDashboardService -> DashboardService`.

### Зачем

- закрепить extraction overdue/kpi query слоя в composition root;
- исключить regressions, где `DashboardService` резолвится без performance-metrics dependency;
- сохранить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`242/242`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 12 (dashboard user-context resolver wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `DashboardUserContextResolverService`;
- `DashboardService` factory переведён на explicit composition:
  - `IApplicationDbContext`;
  - `ICurrentUserService`;
  - `IDateTimeProvider`;
  - `DashboardImportPipelineQueryService`;
  - `DashboardMyTasksQueryService`;
  - `DashboardPerformanceMetricsQueryService`;
  - `DashboardUserContextResolverService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardDependencyInjectionTests.cs`
  - теперь проверяет резолв:
    - `DashboardImportPipelineQueryService`;
    - `DashboardMyTasksQueryService`;
    - `DashboardPerformanceMetricsQueryService`;
    - `DashboardUserContextResolverService`;
    - alias `IDashboardService -> DashboardService`.

### Зачем

- закрепить extraction user-context resolver слоя в composition root;
- исключить regressions, где `DashboardService` резолвится без identity/permissions dependency;
- сохранить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`246/246`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 13 (dashboard counters/statuses support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для `DashboardCountersAndStatusesQueryService`;
- `DashboardService` factory переведён на explicit composition:
  - `IApplicationDbContext`;
  - `ICurrentUserService`;
  - `IDateTimeProvider`;
  - `DashboardImportPipelineQueryService`;
  - `DashboardMyTasksQueryService`;
  - `DashboardPerformanceMetricsQueryService`;
  - `DashboardUserContextResolverService`;
  - `DashboardCountersAndStatusesQueryService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardDependencyInjectionTests.cs`
  - теперь проверяет резолв:
    - `DashboardImportPipelineQueryService`;
    - `DashboardMyTasksQueryService`;
    - `DashboardPerformanceMetricsQueryService`;
    - `DashboardUserContextResolverService`;
    - `DashboardCountersAndStatusesQueryService`;
    - alias `IDashboardService -> DashboardService`.

### Зачем

- закрепить extraction counters/statuses query слоя в composition root;
- исключить regressions, где `DashboardService` резолвится без counters aggregation dependency;
- сохранить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`249/249`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 14 (imports write-workflow support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для:
  - `SourceDataImportWriteWorkflowService`;
- `SourceDataImportsService` factory переведён на explicit composition с полным imports-support graph:
  - `SourceDataImportReadQueryService`;
  - `SourceDataImportBatchProcessingWorkflowService`;
  - `SourceDataImportWriteWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Imports/SourceDataImportsDependencyInjectionTests.cs`
  - подтверждает резолв:
    - `SourceDataImportReadQueryService`;
    - `SourceDataImportBatchProcessingWorkflowService`;
    - `SourceDataImportWriteWorkflowService`;
    - alias `ISourceDataImportsService -> SourceDataImportsService`.

### Зачем

- закрепить финальную composition-model imports фасада в bootstrap;
- исключить regressions, где фасад резолвится без write dependency;
- сохранить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~SourceDataImportsDependencyInjectionTests"` — green (`2/2`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`117/117`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`252/252`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 15 (lot-recommendations grouping support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для:
  - `LotRecommendationGroupingService`;
- `LotRecommendationsService` переведён на explicit factory composition:
  - `IApplicationDbContext`;
  - `LotRecommendationGroupingService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Lots/LotRecommendationsDependencyInjectionTests.cs`
  - дополнен проверкой резолва `LotRecommendationGroupingService` в scope с фасадом.

### Зачем

- закрепить extraction grouping-слоя в composition root;
- исключить regressions, где `LotRecommendationsService` резолвится без grouping dependency;
- сохранить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`12/12`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`125/125`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`254/254`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 16 (lot-recommendations apply-workflow support wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлена scoped registration для:
  - `LotRecommendationApplyWorkflowService`;
- `LotRecommendationsService` factory переведён на explicit composition:
  - `IApplicationDbContext`;
  - `LotRecommendationGroupingService`;
  - `LotRecommendationApplyWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Lots/LotRecommendationsDependencyInjectionTests.cs`
  - дополнен проверкой резолва `LotRecommendationApplyWorkflowService` в одном scope с фасадом.

### Зачем

- закрепить extraction apply-слоя в composition root;
- исключить regressions, где `LotRecommendationsService` резолвится без apply dependency;
- продолжить единый explicit bootstrap pattern для backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`14/14`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`127/127`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`256/256`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 17 (procurement support-graph DI contract hardening)

### Что сделано

Усилен DI integration-контракт для `ProcurementProcedures`:

- `tests/Subcontractor.Tests.Integration/Procurement/ProcurementProceduresDependencyInjectionTests.cs`
  - расширен сценарий alias-identity проверкой резолва всего support-graph:
    - `ProcedureLifecycleService`;
    - `ProcedureStatusMutationService`;
    - `ProcedureTransitionWorkflowService`;
    - `ProcedureShortlistWorkflowService`;
    - `ProcedureShortlistOrchestrationService`;
    - `ProcedureApprovalWorkflowService`;
    - `ProcedureExternalApprovalWorkflowService`;
    - `ProcedureOffersWorkflowService`;
    - `ProcedureOutcomeWorkflowService`;
    - `ProcedureAttachmentBindingService`;
    - `ProcedureLotWorkflowService`.

Изменений в runtime-registrations не потребовалось: текущий DI-graph уже корректно собран, тест закрепляет контракт от регрессий.

### Зачем

- повысить надёжность bootstrap/wiring контура для самого нагруженного procurement-фасада;
- сделать regressions заметными, если один из support-services будет удалён/переименован в DI;
- сохранить единый стиль "facade alias + support graph contract" для backend-модулей.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~ProcurementProceduresDependencyInjectionTests"` — green (`2/2`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`10/10`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`14/14`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`127/127`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`256/256`).

## Итерация 18 (xml inbox support-services wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлены scoped registrations для:
  - `XmlSourceDataImportInboxReadQueryService`;
  - `XmlSourceDataImportInboxWriteWorkflowService`;
  - `XmlSourceDataImportInboxProcessingWorkflowService`;
- `XmlSourceDataImportInboxService` переведён на explicit factory composition:
  - `XmlSourceDataImportInboxReadQueryService`;
  - `XmlSourceDataImportInboxWriteWorkflowService`;
  - `XmlSourceDataImportInboxProcessingWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Imports/XmlSourceDataImportInboxDependencyInjectionTests.cs`
  - дополнен проверками резолва всех трёх support-services в scope фасада.

### Зачем

- закрепить extraction read/write/processing-слоёв XML inbox в composition root;
- исключить regressions, где alias-фасад резолвится без одного из workflow dependencies;
- продолжить единый explicit bootstrap pattern по backend-модулям.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~XmlSourceDataImportInbox"` — green (`11/11`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`134/134`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`261/261`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 19 (lots facade support-services wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлены scoped registrations для:
  - `LotReadQueryService`;
  - `LotWriteWorkflowService`;
- `LotsService` переведён на explicit factory composition:
  - `LotReadQueryService`;
  - `LotWriteWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Lots/LotsDependencyInjectionTests.cs`
  - дополнен проверками резолва обоих support-services в scope фасада.

### Зачем

- закрепить extraction read/write-слоёв `Lots` в composition root;
- исключить regressions, где alias-фасад резолвится без одного из зависимых workflow/query services;
- продолжить единый explicit bootstrap pattern по backend-модулям.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotsDependencyInjectionTests" -p:UseAppHost=false` — green (`2/2`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Lot" -p:UseAppHost=false` — green (`31/31`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`139/139`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`268/268`).

## Итерация 20 (contractors facade support-services wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлены scoped registrations для:
  - `ContractorReadQueryService`;
  - `ContractorWriteWorkflowService`;
- `ContractorsService` переведён на explicit factory composition:
  - `ContractorReadQueryService`;
  - `ContractorWriteWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorsDependencyInjectionTests.cs`
  - дополнен проверками резолва обоих support-services в scope фасада.

### Зачем

- закрепить extraction read/write-слоёв `Contractors` в composition root;
- исключить regressions, где alias-фасад резолвится без одного из зависимых query/workflow services;
- продолжить единый explicit bootstrap pattern по backend-модулям.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~ContractorsDependencyInjectionTests" -p:UseAppHost=false` — green (`2/2`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Contractor" -p:UseAppHost=false` — green (`276/276`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`145/145`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`276/276`).

## Итерация 21 (analytics facade support-services wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлены scoped registrations для:
  - `AnalyticsKpiDashboardQueryService`;
  - `AnalyticsViewCatalogQueryService`;
- `AnalyticsService` переведён на explicit factory composition:
  - `AnalyticsKpiDashboardQueryService`;
  - `AnalyticsViewCatalogQueryService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Analytics/AnalyticsDependencyInjectionTests.cs`
  - дополнен проверками резолва обоих support-services в scope фасада.

### Зачем

- закрепить extraction KPI/view-catalog query-слоёв `Analytics` в composition root;
- исключить regressions, где alias-фасад резолвится без одного из аналитических support-services;
- продолжить единый explicit bootstrap pattern по backend-модулям.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~AnalyticsDependencyInjectionTests" -p:UseAppHost=false` — green (`2/2`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Analytics" -p:UseAppHost=false` — green (`12/12`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`145/145`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`278/278`).

## Итерация 22 (projects facade support-services wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлены scoped registrations для:
  - `ProjectScopeResolverService`;
  - `ProjectReadQueryService`;
  - `ProjectWriteWorkflowService`;
- `ProjectsService` переведён на explicit factory composition:
  - `ProjectReadQueryService`;
  - `ProjectWriteWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Projects/ProjectsDependencyInjectionTests.cs`
  - дополнен проверками резолва:
    - `ProjectScopeResolverService`;
    - `ProjectReadQueryService`;
    - `ProjectWriteWorkflowService`;
    - alias `IProjectsService -> ProjectsService`.

### Зачем

- закрепить extraction read/write/scope-слоёв `Projects` в composition root;
- исключить regressions, где alias-фасад резолвится без одного из support-services;
- продолжить единый explicit bootstrap pattern по backend-модулям.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Project" -p:UseAppHost=false` — green (`21/21`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`150/150`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`287/287`).

## Итерация 23 (users-administration facade support-services wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлены scoped registrations для:
  - `UsersAdministrationReadQueryService`;
  - `UsersAdministrationWriteWorkflowService`;
- `UsersAdministrationService` переведён на explicit factory composition:
  - `UsersAdministrationReadQueryService`;
  - `UsersAdministrationWriteWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Admin/UsersAdministrationDependencyInjectionTests.cs`
  - дополнен проверками резолва:
    - `UsersAdministrationReadQueryService`;
    - `UsersAdministrationWriteWorkflowService`;
    - alias `IUsersAdministrationService -> UsersAdministrationService`.

### Зачем

- закрепить extraction read/write-слоёв `UsersAdministration` в composition root;
- исключить regressions, где alias-фасад резолвится без одного из support-services;
- продолжить единый explicit bootstrap pattern по backend-модулям.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~UsersAdministration" -p:UseAppHost=false` — green (`3/3`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~UsersAdministration" -p:UseAppHost=false` — green (`12/12`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`153/153`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`294/294`).

## Итерация 24 (reference-data facade support-services wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- добавлены scoped registrations для:
  - `ReferenceDataReadQueryService`;
  - `ReferenceDataWriteWorkflowService`;
- `ReferenceDataService` переведён на explicit factory composition:
  - `ReferenceDataReadQueryService`;
  - `ReferenceDataWriteWorkflowService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/ReferenceData/ReferenceDataDependencyInjectionTests.cs`
  - дополнен проверками резолва:
    - `ReferenceDataReadQueryService`;
    - `ReferenceDataWriteWorkflowService`;
    - alias `IReferenceDataService -> ReferenceDataService`.

### Зачем

- закрепить extraction read/write-слоёв `ReferenceData` в composition root;
- исключить regressions, где alias-фасад резолвится без одного из support-services;
- продолжить единый explicit bootstrap pattern по backend-модулям.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~ReferenceData" -p:UseAppHost=false` — green (`5/5`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~ReferenceData" -p:UseAppHost=false` — green (`15/15`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`158/158`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`300/300`).

## Итерация 25 (registry-export explicit facade wiring)

### Что сделано

Обновлен `src/Subcontractor.Application/DependencyInjection.cs`:

- `RegistryExportService` переведён с implicit constructor activation на explicit factory composition:
  - `IProjectsService`;
  - `IContractorsService`;
  - `ILotsService`;
  - `IProcurementProceduresService`;
  - `IContractsService`.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Exports/RegistryExportDependencyInjectionTests.cs`
  - дополнен проверками резолва всех upstream facade-зависимостей export-сервиса в одном scope.

### Зачем

- унифицировать bootstrap-паттерн для всех backend-фасадов (explicit factory + alias);
- исключить regressions, где export-фасад резолвится, но часть upstream graph зависимостей не зарегистрирована.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~RegistryExport" -p:UseAppHost=false` — green (`4/4`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`158/158`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`300/300`).

## Итерация 26 (application composition root modularization)

### Что сделано

`src/Subcontractor.Application/DependencyInjection.cs` переведён на тонкий orchestration-слой:

- `AddApplication(...)` теперь только координирует module-level registrations;
- сам composition root разделён по bounded-context в новом файле:
  - `src/Subcontractor.Application/DependencyInjection.Modules.cs`.

В `DependencyInjection.Modules.cs` выделены модульные registration-блоки:

- `AddProjectsModule`;
- `AddAnalyticsModule`;
- `AddContractsModule`;
- `AddContractorsModule`;
- `AddContractorRatingsModule`;
- `AddDashboardModule`;
- `AddExportsModule`;
- `AddImportsModule`;
- `AddXmlInboxImportsModule`;
- `AddLotsModule`;
- `AddLotRecommendationsModule`;
- `AddProcurementProceduresModule`;
- `AddReferenceDataModule`;
- `AddUsersAdministrationModule`;
- `AddSlaModule`.

Поведение DI не изменено: сохранены существующие facade aliases и explicit factory registrations.

### Зачем

- убрать концентрацию всего application bootstrap в одном длинном методе;
- снизить стоимость следующих DI-итераций (локальные изменения в одном module-блоке вместо большого общего diff);
- повысить читаемость composition root и облегчить review DI-регистраций по доменам.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`173/173`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`301/301`);
- `npm run test:js` — green (`366/366`).
