# Refactoring Notes — LotRecommendations Service

Дата обновления: `2026-04-11`

## Итерация 1 (recommendation policy extraction)

### Что сделано

Из `LotRecommendationsService` вынесен pure policy-слой рекомендаций:

- `src/Subcontractor.Application/Lots/LotRecommendationPolicy.cs`
  - `BuildGroupKey(...)`;
  - `BuildSuggestedLotCode(...)`;
  - `EnsureUniqueSuggestedCode(...)`;
  - `BuildSuggestedLotName(...)`;
  - `NormalizeLotCode(...)`;
  - `NormalizeLotName(...)`.

`LotRecommendationsService` переведён на делегирование в policy в путях:

- рекомендаций по группам (`group key`, `suggested code`, `suggested name`);
- apply-path (`lot code/name normalization`).

Из сервиса удалены дублирующие private static helper-блоки.

### Зачем

- уменьшить размер/связанность самого крупного backend-модуля wave (`LotRecommendationsService`);
- зафиксировать правила генерации/нормализации рекомендаций отдельными unit-тестами;
- подготовить безопасную базу для следующих extraction-итераций (`group-build`/`trace/projection`).

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Lots/LotRecommendationPolicyTests.cs`

Покрытые сценарии:

- стабильный `group key`;
- нормализация токенов в `suggested lot code`;
- уникализация `suggested code` с suffix;
- trim/limit для `suggested lot name`;
- `lot code`/`lot name` fallback + guards.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~LotRecommendationPolicyTests"` — green (`8/8`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotRecommendations"` — green (`10/10`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`125/125`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`252/252`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 2 (grouping service extraction)

### Что сделано

Из `LotRecommendationsService` вынесен query/grouping слой:

- `src/Subcontractor.Application/Lots/LotRecommendationGroupingService.cs`
  - `BuildGroupsAsync(...)` (valid rows -> grouped recommendations);
  - `GetGroupDateRange(...)`.
- `src/Subcontractor.Application/Lots/LotRecommendationGroupingModels.cs`
  - `LotRecommendationGroup`;
  - `LotRecommendationItem`.

`LotRecommendationsService` переведён на делегирование:

- `BuildFromImportBatchAsync` -> `_groupingService.BuildGroupsAsync(...)`;
- `ApplyFromImportBatchAsync` -> `_groupingService.BuildGroupsAsync(...)`.

Также фасад получил explicit composition-конструктор:

- `LotRecommendationsService(IApplicationDbContext, LotRecommendationGroupingService)`.

Технический эффект:

- `LotRecommendationsService.cs`: `396 -> 279` строк (`-117`).

### Зачем

- продолжить декомпозицию самого крупного backend-модуля wave;
- изолировать data-grouping/query-логику от apply-orchestration фасада;
- подготовить сервис к следующим extraction-итерациям (`trace/projection`).

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Lots/LotRecommendationGroupingServiceTests.cs`

Покрытые сценарии:

- grouping valid rows (`project+discipline`) с детерминированной сортировкой;
- исключение invalid rows;
- empty result при отсутствии valid rows.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`8/8`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`12/12`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`125/125`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`254/254`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 3 (projection + trace policy extraction)

### Что сделано

Из `LotRecommendationsService` вынесен projection/trace слой:

- `src/Subcontractor.Application/Lots/LotRecommendationProjectionPolicy.cs`
  - `ToGroupDto(...)`;
  - `CreateTraceRecord(...)`.

`LotRecommendationsService` переведён на делегирование:

- `BuildFromImportBatchAsync` -> `LotRecommendationProjectionPolicy.ToGroupDto(...)`;
- `ApplyFromImportBatchAsync` -> `LotRecommendationProjectionPolicy.CreateTraceRecord(...)`.

Из фасада удалены private helper-блоки DTO/trace mapping.

Технический эффект:

- `LotRecommendationsService.cs`: `279 -> 219` строк (`-60`).

### Зачем

- убрать из фасада mapping-детали и сохранить его как orchestration-слой;
- зафиксировать DTO/reconciliation projection-контракт отдельными unit-тестами;
- упростить следующие extraction-итерации в apply-path.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Lots/LotRecommendationProjectionPolicyTests.cs`

Покрытые сценарии:

- агрегирующий group->DTO projection (`RowsCount`, `TotalManHours`, `date range`);
- reconciliation trace-record mapping (`batch/apply/group/lot fields`, `lot reference`, `skip reason`).

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`10/10`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`12/12`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`127/127`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`254/254`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 4 (apply workflow extraction + DI wiring)

### Что сделано

Из `LotRecommendationsService` вынесен apply-orchestration слой:

- `src/Subcontractor.Application/Lots/LotRecommendationApplyWorkflowService.cs`
  - `ApplyAsync(...)`:
    - selection/filtering requested groups;
    - duplicate code guard;
    - lot entity creation + draft status history;
    - reconciliation trace persistence для `created/skipped` веток.

`LotRecommendationsService` переведён в thin-facade orchestration:

- `ApplyFromImportBatchAsync(...)` теперь:
  - загружает batch;
  - делегирует grouping в `LotRecommendationGroupingService`;
  - делегирует apply-path в `LotRecommendationApplyWorkflowService`.

Технический эффект:

- `LotRecommendationsService.cs`: `219 -> 77` строк (`-142`).

### Зачем

- убрать write/apply-ветку из фасада и оставить его orchestration-точкой;
- зафиксировать отдельный workflow-контракт для apply-операций;
- продолжить унификацию decomposition-паттерна с явным bootstrap/wiring support-service в DI.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Lots/LotRecommendationApplyWorkflowServiceTests.cs`

Покрытые сценарии:

- apply happy-path (`ReadyForLotting` -> draft lot + reconciliation trace);
- guard-path (`NotReadyForLotting` -> `InvalidOperationException`).

Также обновлён DI-контракт:

- `tests/Subcontractor.Tests.Integration/Lots/LotRecommendationsDependencyInjectionTests.cs`
  - добавлена проверка резолва `LotRecommendationApplyWorkflowService` в scope фасада.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`10/10`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`14/14`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`127/127`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`256/256`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 5 (facade constructor visibility hardening)

### Что сделано

`LotRecommendationsService` переведён на internal-only constructor visibility:

- `internal LotRecommendationsService(IApplicationDbContext dbContext)`;
- `internal LotRecommendationsService(IApplicationDbContext, LotRecommendationGroupingService, LotRecommendationApplyWorkflowService)`.

Публичный API сервиса остаётся доступным через контракт:

- `ILotRecommendationsService` (DI alias).

### Зачем

- зафиксировать expected usage фасада через composition root;
- убрать неявный внешний `new` как основной integration path;
- привести `LotRecommendationsService` к тому же bootstrap-паттерну, что уже используется в `SourceDataImportsService`.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`10/10`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotRecommendation"` — green (`14/14`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`127/127`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`256/256`).
