# Refactoring Notes — Lots Service

Дата обновления: `2026-04-11`

## Итерация 1 (policy/projection extraction)

### Что сделано

Из `LotsService` вынесены pure policy/projection блоки:

- `src/Subcontractor.Application/Lots/LotMutationPolicy.cs`
  - `NormalizeCode(...)`;
  - `NormalizeName(...)`;
  - `NormalizeItems(...)`;
  - `ToEntity(...)`.
- `src/Subcontractor.Application/Lots/LotTransitionPolicy.cs`
  - `EnsureTransitionAllowed(...)`.
- `src/Subcontractor.Application/Lots/LotReadProjectionPolicy.cs`
  - `ToDetailsDto(...)`;
  - `ToHistoryDto(...)`.

`LotsService` переведён на делегирование во всех соответствующих ветках:

- create/update normalization + entity mapping;
- status transition rules;
- details/history projection.

Технический эффект:

- `LotsService.cs`: `339 -> 201` строк (`-138`).

### Зачем

- уменьшить связность `LotsService` и оставить в нём orchestration;
- зафиксировать mutation/transition/projection контракты отдельными unit-тестами;
- подготовить основу для следующей extraction-волны (read/write split при необходимости).

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Lots/LotPoliciesTests.cs`

Покрытые сценарии:

- code normalization trim;
- items normalization (`discipline` uppercase);
- date-range guard (`start <= finish`);
- non-sequential forward transition guard;
- details projection sorting by `ObjectWbs/Discipline`.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~LotPoliciesTests|FullyQualifiedName~LotRecommendation" -p:UseAppHost=false` — green (`15/15`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Lot" -p:UseAppHost=false` — green (`24/24`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`139/139`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`261/261`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 2 (facade split: read/write extraction)

### Что сделано

`LotsService` переведён в thin-facade:

- `src/Subcontractor.Application/Lots/LotsService.cs`
  - read-path делегируется в `LotReadQueryService`;
  - write-path делегируется в `LotWriteWorkflowService`;
  - сохранён public fallback-конструктор `LotsService(IApplicationDbContext)` для совместимости существующих тестовых bootstrap-путей;
  - добавлен internal constructor для explicit composition (`LotReadQueryService`, `LotWriteWorkflowService`).

Обновлён composition root:

- `src/Subcontractor.Application/DependencyInjection.cs`
  - scoped registration для `LotReadQueryService`;
  - scoped registration для `LotWriteWorkflowService`;
  - `LotsService` переведён на explicit factory composition через read/write support-services.

Обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Lots/LotsDependencyInjectionTests.cs`
  - добавлены проверки резолва `LotReadQueryService` и `LotWriteWorkflowService` в scope фасада.

### Зачем

- завершить extraction-волну для `LotsService` и убрать дублирование read/write логики в фасаде;
- закрепить wiring-контракт support-services на уровне DI-tests;
- выровнять `Lots` с уже принятым шаблоном (`facade + read/write services + explicit factory composition`).

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~Lots|FullyQualifiedName~LotPoliciesTests" -p:UseAppHost=false` — green (`15/15`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Lot" -p:UseAppHost=false` — green (`24/24`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`139/139`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`268/268`).

## Итерация 3 (read/write integration tests + update-flow hardening)

### Что сделано

Добавлены focused integration-тесты для extracted lot-сервисов:

- `tests/Subcontractor.Tests.Integration/Lots/LotReadQueryServiceTests.cs`
  - `GetByIdAsync` unknown guard;
  - `ListAsync` c комбинированными фильтрами (`search + status + project`);
  - `GetHistoryAsync` сортировка по времени (newest first).
- `tests/Subcontractor.Tests.Integration/Lots/LotWriteWorkflowServiceTests.cs`
  - `CreateAsync` normalization + persistence + history;
  - `UpdateAsync` persistence-path;
  - `TransitionAsync` forward-path;
  - rollback guard без причины (`ArgumentException`) + отсутствие side-effects.

По результатам тестов доработан update-path:

- `src/Subcontractor.Application/Lots/LotWriteWorkflowService.cs`
  - обновление переведено на явный remove/add через `LotItems` set по `LotId`;
  - итоговый read-model после update формируется через `AsNoTracking + Include(Items)`.

### Зачем

- зафиксировать поведение новых `LotReadQueryService` и `LotWriteWorkflowService` отдельными контрактами;
- закрыть риск скрытых регрессий после facade split;
- стабилизировать update-flow на уровне persistence orchestration.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~LotReadQueryServiceTests|FullyQualifiedName~LotWriteWorkflowServiceTests" -p:UseAppHost=false` — green (`7/7`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Lot" -p:UseAppHost=false` — green (`31/31`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`139/139`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`268/268`).
