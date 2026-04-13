# Refactoring Notes: Contracts Service

## Итерация 1 (validation + transition policy extraction)

### Что сделано

Из `ContractsService` вынесены policy-слои:

- `src/Subcontractor.Application/Contracts/ContractRequestValidationPolicy.cs`
  - `ValidateCreateRequest`
  - `ValidateUpdateRequest`
  - `ValidateDraftRequest`
- `src/Subcontractor.Application/Contracts/ContractTransitionPolicy.cs`
  - `EnsureTransitionAllowed`
  - `EnsureTransitionStateData`
- `src/Subcontractor.Application/Contracts/ContractMilestoneNormalizationPolicy.cs`
  - `NormalizeMilestoneItems`

`ContractsService` переведён на делегирование в эти policy-классы.

### Зачем

- уменьшить концентрацию business-rules в одном классе;
- сделать rules unit-testable без поднятия `DbContext`;
- снизить риск регрессий при дальнейшей декомпозиции `ContractsService`.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Contracts/ContractRequestValidationPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Contracts/ContractTransitionPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Contracts/ContractMilestoneNormalizationPolicyTests.cs`

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`44/44`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "FullyQualifiedName~Contracts|FullyQualifiedName~SecuritySqlServicesTests" -p:UseAppHost=false` — green (`skip` без `SUBCONTRACTOR_SQL_TESTS=1`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 2 (control-points + MDR normalization/import extraction)

### Что сделано

Из `ContractsService` вынесены normalization/import-policy слои:

- `src/Subcontractor.Application/Contracts/ContractMonitoringControlPointNormalizationPolicy.cs`
  - `NormalizeControlPointItems`
  - nested stage normalization
- `src/Subcontractor.Application/Contracts/ContractMdrNormalizationPolicy.cs`
  - `NormalizeMdrCardItems`
  - `NormalizeMdrForecastFactImportItems`
  - `BuildImportRowIndex`
  - `BuildImportKey`

`ContractsService` переведён на делегирование в эти policy-классы в блоках:

- `UpsertMonitoringControlPointsAsync`
- `UpsertMdrCardsAsync`
- `ImportMdrForecastFactAsync`

### Зачем

- сократить размер и связанность `ContractsService`;
- изолировать pure normalization/import-правила от orchestration-логики сервиса;
- зафиксировать поведение ключей/ambiguous-detection и входной валидации отдельными unit-тестами.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Contracts/ContractMonitoringControlPointNormalizationPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Contracts/ContractMdrNormalizationPolicyTests.cs`

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`54/54`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 3 (read-model projection extraction)

### Что сделано

Из `ContractsService` вынесен projection/metrics слой:

- `src/Subcontractor.Application/Contracts/ContractReadModelProjectionPolicy.cs`
  - `ToListItemDto`
  - `ToDetailsDto`
  - `ToHistoryDto`
  - `ToMilestoneDto`
  - `ToControlPointDto`
  - `ToMdrCardDto`
  - `ToMdrRowDto`
  - delay/deviation helper logic

`ContractsService` переведён на делегирование в `ContractReadModelProjectionPolicy` для всех read-model DTO map-конверсий.

### Зачем

- убрать из сервиса большой pure mapping-блок;
- зафиксировать read-model правила (delay/deviation/sort) unit-тестами;
- снизить риск побочных эффектов при следующих extraction-итерациях.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Contracts/ContractReadModelProjectionPolicyTests.cs`

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`57/57`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 4 (execution + import resolution policy extraction)

### Что сделано

Из `ContractsService` вынесены дополнительные pure policy-слои:

- `src/Subcontractor.Application/Contracts/ContractExecutionSummaryPolicy.cs`
  - `BuildSummary` (агрегация milestone-метрик и next planned date)
- `src/Subcontractor.Application/Contracts/ContractMdrImportResolutionPolicy.cs`
  - `Resolve` (duplicate/ambiguous/not-found conflict resolution)
  - `ApplyUpdates` (forecast/fact mutation with changed-rows counter)

`ContractsService` переведён на делегирование:

- `BuildExecutionSummaryAsync` -> `ContractExecutionSummaryPolicy.BuildSummary`
- `ImportMdrForecastFactAsync` -> `ContractMdrImportResolutionPolicy.Resolve/ApplyUpdates`

### Зачем

- сократить orchestration-метод `ImportMdrForecastFactAsync`;
- вынести конфликтный MDR import contract в отдельно тестируемый модуль;
- зафиксировать execution-summary формулы unit-тестами.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Contracts/ContractExecutionSummaryPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Contracts/ContractMdrImportResolutionPolicyTests.cs`

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`61/61`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 11 (bootstrap/wiring extraction в DI)

### Что сделано

`ContractsService` переведён на explicit DI-composition в application bootstrap:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`:
  - добавлена explicit-регистрация `ContractsService` через factory-конструктор:
    - `ContractReadQueryService`
    - `ContractExecutionWorkflowService`
    - `ContractLifecycleWorkflowService`
  - `IContractsService` теперь резолвится через alias к уже собранному `ContractsService`.

Почему это важно:

- wiring фасада перестал зависеть от внутреннего `new ...` в runtime-конструкторе;
- composition-контракт стал явным и контролируемым на уровне DI bootstrap;
- снижён риск неявной поломки при следующей декомпозиции workflow/query слоёв.

### Усиление regression-контракта

Обновлён integration suite:

- `tests/Subcontractor.Tests.Integration/Contracts/ContractsDependencyInjectionTests.cs`

Добавлена проверка alias-контракта:

- `IContractsService` и `ContractsService` резолвятся как один и тот же scoped-инстанс;
- отдельные workflow/query зависимости фасада резолвятся корректно;
- базовый вызов `ListAsync(...)` на DI-резолвленном сервисе остаётся рабочим.

### Проверка после итерации 11

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~ContractsDependencyInjectionTests" -p:UseAppHost=false` — green (`2/2`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`65/65`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`187/187`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 6 (entity mutation extraction)

### Что сделано

Из `ContractsService` вынесен pure entity-mutation слой:

- `src/Subcontractor.Application/Contracts/ContractEntityMutationPolicy.cs`
  - `BuildNewContract`
  - `ApplyUpdate`
  - `BuildDraftContract`
  - `BuildInitialStatusHistory`

`ContractsService` переведён на делегирование в `ContractEntityMutationPolicy` в сценариях:

- `CreateAsync`
- `UpdateAsync`
- `CreateDraftFromProcedureAsync`

### Зачем

- убрать field-by-field присваивания из orchestration слоя;
- централизовать mutation-правила для create/update/draft;
- зафиксировать mapping-contract unit-тестами перед дальнейшей декомпозицией.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Contracts/ContractEntityMutationPolicyTests.cs`

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`65/65`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 8 (execution workflow service extraction)

### Что сделано

Execution/write workflow блоки вынесены из `ContractsService` в отдельный сервис:

- `src/Subcontractor.Application/Contracts/ContractExecutionWorkflowService.cs`
  - `UpsertMilestonesAsync`
  - `UpsertMonitoringControlPointsAsync`
  - `UpsertMdrCardsAsync`
  - `ImportMdrForecastFactAsync`

`ContractsService` переведён на delegation в `ContractExecutionWorkflowService` для всех execution-веток.

### Зачем

- разделить write/execution и orchestration-facade слои;
- снизить связанность `ContractsService`;
- упростить дальнейший перенос отдельных контрактных workflow в отдельные компоненты.

### Результат по размеру фасада

- `ContractsService`: `331` строка (было `510` на предыдущей итерации и `824` на старте wave).

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`65/65`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 9 (lifecycle workflow service extraction)

### Что сделано

Lifecycle/write методы вынесены из `ContractsService` в отдельный сервис:

- `src/Subcontractor.Application/Contracts/ContractLifecycleWorkflowService.cs`
  - `CreateAsync`
  - `UpdateAsync`
  - `DeleteAsync`
  - `TransitionAsync`
  - `CreateDraftFromProcedureAsync`

`ContractsService` переведён на delegation в `ContractLifecycleWorkflowService`.

### Зачем

- завершить разделение фасада на узкие workflow/query/execution блоки;
- оставить `ContractsService` как тонкий orchestration-composer;
- снизить риск побочных эффектов в дальнейших изменениях.

### Результат по размеру фасада

- `ContractsService`: `143` строки (было `331` на предыдущей итерации и `824` на старте wave).

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`65/65`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

Примечание: на одном из integration-прогонов был transient MSBuild file-lock warning (`Subcontractor.Infrastructure.csproj.AssemblyReference.cache`), повторный run прошёл green без функциональных ошибок.

## Итерация 10 (execution-summary read relocation)

### Что сделано

- `GetExecutionSummaryAsync` перенесён в `ContractReadQueryService` как часть read-side слоя.
- У `ContractsService` убрана прямая field-зависимость на `_dbContext`; фасад стал композицией workflow/query сервисов.

### Результат по размеру фасада

- `ContractsService`: `140` строк (было `143` на предыдущей итерации и `824` на старте wave).

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`65/65`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 7 (read-query service extraction)

### Что сделано

Read-side методы вынесены из `ContractsService` в отдельный query-service:

- `src/Subcontractor.Application/Contracts/ContractReadQueryService.cs`
  - `ListAsync`
  - `GetByIdAsync`
  - `GetHistoryAsync`
  - `GetMilestonesAsync`
  - `GetMonitoringControlPointsAsync`
  - `GetMdrCardsAsync`

`ContractsService` теперь использует `ContractReadQueryService` как read-facade dependency (internal composition), сохраняя прежний публичный контракт `IContractsService`.

### Зачем

- отделить read/query ветки от write/orchestration веток;
- упростить дальнейшее разделение `ContractsService` на workflow-компоненты;
- снизить размер фасада: `ContractsService` уменьшен до `510` строк (с `824` строк на старте wave).

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`65/65`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 5 (data-access helper extraction)

### Что сделано

Из `ContractsService` вынесен DB guard/query helper слой:

- `src/Subcontractor.Application/Contracts/ContractDataAccessPolicy.cs`
  - `EnsureProcedureContractAvailableAsync`
  - `EnsureContractNumberAvailableAsync`
  - `EnsureContractExistsAsync`
  - `EnsureNoOverdueMilestonesBeforeCloseAsync`
  - `BuildExecutionSummaryAsync`
  - `GenerateDraftContractNumberAsync`
  - `ResolveContractorNamesAsync`
  - `ResolveContractorNameAsync`

`ContractsService` переведён на делегирование в `ContractDataAccessPolicy`, дублирующие private-методы удалены.

### Зачем

- дополнительно уменьшить размер и связанность `ContractsService`;
- изолировать доступ к данным/guard-правила в отдельном слое перед дальнейшей декомпозицией workflow-методов;
- упростить дальнейший перенос orchestration-веток в отдельные workflow services.

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`61/61`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`185/185`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).
