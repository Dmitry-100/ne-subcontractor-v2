# Refactoring Notes — Dashboard Service

Дата обновления: `2026-04-11`

## Итерация 1 (bootstrap/wiring extraction в DI)

### Что сделано

`DashboardService` переведён на explicit DI alias composition:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`;
- `DashboardService` регистрируется как отдельный scoped facade;
- `IDashboardService` резолвится через alias к `DashboardService`.

Добавлен integration-контракт:

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardDependencyInjectionTests.cs`.

Покрытые проверки:

- DI-резолв фасада работает, `GetSummaryAsync(...)` возвращает empty summary для неизвестного пользователя;
- интерфейс и facade-алиас резолвятся как один и тот же scoped instance.

### Зачем

- завершать унификацию bootstrap/wiring-паттерна по backend-фасадам;
- зафиксировать registration/alias контракт dashboard-модуля regression-тестом;
- уменьшить риск скрытых поломок при дальнейших изменениях в `Application` composition root.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --no-build` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`197/197`);
- `npm run test:js` — green (`363/363`).

## Итерация 2 (import-pipeline query extraction)

### Что сделано

Из `DashboardService` вынесен import-pipeline query слой:

- `src/Subcontractor.Application/Dashboard/DashboardImportPipelineQueryService.cs`
  - `BuildAsync(...)`
  - `CreateEmpty()`

`DashboardService` переведён на делегирование import-pipeline path в новый support service.

Дополнительно обновлён DI bootstrap:

- `src/Subcontractor.Application/DependencyInjection.cs`
  - добавлена scoped registration `DashboardImportPipelineQueryService`;
  - `DashboardService` переведён на explicit factory composition с этой dependency.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardImportPipelineQueryServiceTests.cs`
  - empty-pipeline path;
  - aggregated status/rows/trace metrics path.
- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardDependencyInjectionTests.cs`
  - дополнен проверкой резолва `DashboardImportPipelineQueryService`.

### Зачем

- уменьшить размер и связанность `DashboardService`;
- изолировать import-pipeline aggregation в отдельный query-модуль;
- зафиксировать DI/wiring контракт и регрессионно покрыть счётчики pipeline.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`238/238`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 3 (my-tasks query extraction)

### Что сделано

Из `DashboardService` вынесен query-слой блока `Мои задачи`:

- `src/Subcontractor.Application/Dashboard/DashboardMyTasksQueryService.cs`
  - `BuildAsync(...)`
  - internal query-paths:
    - pending approval steps;
    - overdue contract milestones;
    - приоритизация/сортировка/лимит задач.

`DashboardService` переведён на делегирование my-tasks path в новый support service.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardMyTasksQueryServiceTests.cs`
  - disabled-sources path (`includeProcedureTasks=false`, `includeMilestoneTasks=false`);
  - aggregated my-tasks path (`procedure + milestone`, priority ordering, blocked-approval-step guard).

### Зачем

- дополнительно уменьшить размер и связанность `DashboardService`;
- изолировать task-list query-логику в отдельный модуль для безопасной эволюции UI/filters;
- зафиксировать регрессионно приоритетные branch-правила блока `Мои задачи`.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`240/240`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 4 (overdue+kpi query extraction)

### Что сделано

Из `DashboardService` вынесен query-слой метрик `Просрочки` и `KPI`:

- `src/Subcontractor.Application/Dashboard/DashboardPerformanceMetricsQueryService.cs`
  - `BuildOverdueAsync(...)`
  - `BuildKpiAsync(...)`

`DashboardService` переведён на делегирование overdue/kpi path в новый support service.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardPerformanceMetricsQueryServiceTests.cs`
  - overdue aggregation path;
  - kpi-rate calculation path (`procedures/contracts/milestones`).

### Зачем

- продолжить декомпозицию `DashboardService` в сторону thin-facade;
- изолировать вычислительную query-логику метрик в отдельный модуль;
- зафиксировать регрессионно формулы/фильтры для overdue и KPI.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`242/242`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 5 (user-context resolver extraction)

### Что сделано

Из `DashboardService` вынесен user-context/permission resolution слой:

- `src/Subcontractor.Application/Dashboard/DashboardUserContextResolverService.cs`
  - `ResolveAsync(...)`
  - login normalization + active-user lookup;
  - roles/permissions aggregation;
  - `HasProjectsGlobalRead` derivation.
- `src/Subcontractor.Application/Dashboard/DashboardUserContext.cs`
  - shared context model для facade/support-services.

`DashboardService` переведён на делегирование user-context path в resolver support service.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardUserContextResolverServiceTests.cs`
  - `system` login guard;
  - unknown/inactive user guards;
  - roles/permissions aggregation + `HasProjectsGlobalRead` positive/negative paths.

### Зачем

- убрать из `DashboardService` identity/permissions-resolution query логику;
- изолировать правила user-context derivation для безопасной эволюции security-pathов;
- сохранить thin-facade направление декомпозиции dashboard-модуля.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`246/246`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 6 (counters-and-statuses query extraction)

### Что сделано

Из `DashboardService` вынесен query-слой счётчиков и статусных агрегаций:

- `src/Subcontractor.Application/Dashboard/DashboardCountersAndStatusesQueryService.cs`
  - `BuildAsync(...)`
  - project-scope filtering (`global`/`scoped`);
  - status-count aggregation для `Lots/Procedures/Contracts`;
  - counters/statuses projection.
- `src/Subcontractor.Application/Dashboard/DashboardCountersAndStatusesQueryResult.cs`
  - контракт результата для facade + KPI path.

`DashboardService` переведён на делегирование counters/statuses path в новый support service.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Dashboard/DashboardCountersAndStatusesQueryServiceTests.cs`
  - no-permissions path (`zero counters`, `empty statuses`);
  - scoped project-read path (`own projects only`, status counts);
  - global project-read path (`all projects`).

### Зачем

- убрать из `DashboardService` оставшиеся data-aggregation query-paths;
- изолировать status/counters правила в отдельный модуль с focused тестами;
- продолжить движение к thin-facade архитектуре dashboard-модуля.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`249/249`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 7 (facade constructor simplification)

### Что сделано

В `DashboardService` сокращён набор промежуточных конструкторов:

- оставлен базовый `3-arg` конструктор (для integration paths);
- оставлен полный explicit composition конструктор (для DI factory);
- удалены промежуточные overload-цепочки, накопившиеся после последовательных extraction-итераций.

### Зачем

- уменьшить служебную сложность фасада;
- сделать composition-границы прозрачнее;
- снизить риск ошибок при дальнейших DI-изменениях.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`249/249`).
