# Refactoring Notes — Contractor Ratings

Дата обновления: `2026-04-10`

## Итерация 1 (scoring policy extraction)

### Что сделано

Из `ContractorRatingsService` вынесен pure scoring/policy слой:

- `src/Subcontractor.Application/ContractorRatings/ContractorRatingScoringPolicy.cs`

Вынесенные блоки:

- default weights contract;
- normalized weight resolution (`ResolveWeights`);
- discipline/manual/workload score rules;
- final weighted score calculation;
- percent clamp и conversion `score -> rating`.

`ContractorRatingsService` переведён на делегирование в `ContractorRatingScoringPolicy` в recalculation-path.

### Зачем

- уменьшить связность и размер `ContractorRatingsService`;
- изолировать математические правила рейтинга в unit-testable модуле;
- упростить дальнейшие изменения scoring-модели без риска побочных эффектов в orchestration/data-access слоях.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Contractors/ContractorRatingScoringPolicyTests.cs`

Покрытые сценарии:

- default weight fallback;
- fallback при нулевой сумме весов;
- delivery discipline overdue-ratio formula;
- reliability-class mapping;
- final score/rating conversion.

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`73/73`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`187/187`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 2 (model-request + read-projection policy extraction)

### Что сделано

Из `ContractorRatingsService` вынесены дополнительные pure policy-слои:

- `src/Subcontractor.Application/ContractorRatings/ContractorRatingModelRequestPolicy.cs`
- `src/Subcontractor.Application/ContractorRatings/ContractorRatingReadProjectionPolicy.cs`

Вынесенные блоки:

- request normalization:
  - `NormalizeRequiredText(...)`
  - `NormalizeOptionalText(...)`
  - `NormalizeVersionCode(...)`
  - `NormalizeWeights(...)`
- read projection:
  - `ToModelDto(...)`.

`ContractorRatingsService` переведён на делегирование в эти policy-модули в path:

- `GetActiveModelAsync`;
- `UpsertActiveModelAsync`;
- `UpsertManualAssessmentAsync`;
- `RecalculateRatingsAsync`.

### Зачем

- убрать из сервиса большой pure normalization/mapping блок;
- зафиксировать контракт нормализации model-request отдельными unit-тестами;
- снизить риск регрессий при дальнейшей декомпозиции `ContractorRatingsService`.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Contractors/ContractorRatingModelRequestPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Contractors/ContractorRatingReadProjectionPolicyTests.cs`

Покрытые сценарии:

- trim/uppercase normalization для версии и текстовых полей;
- default/fill/normalize weights contracts;
- duplicate factor / out-of-range / zero-sum guards;
- deterministic weights ordering в model DTO.

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`95/95`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`187/187`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 3 (bootstrap/wiring extraction в DI)

### Что сделано

`ContractorRatingsService` переведён на explicit DI alias composition:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`;
- `ContractorRatingsService` зарегистрирован как отдельный scoped facade;
- `IContractorRatingsService` резолвится через alias к `ContractorRatingsService`.

Добавлен integration-контракт на DI wiring:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingsDependencyInjectionTests.cs`.

Покрытые проверки:

- DI-резолв фасада работает, `GetAnalyticsAsync(...)` возвращает empty result на пустой базе;
- интерфейс и facade-алиас дают один и тот же scoped instance.

### Зачем

- выровнять bootstrap-подход для рейтингов с `Contracts/Procurement/Imports/SLA`;
- сделать registration/alias контракт явным и защищённым regression-тестом;
- снизить риск silent-regressions при дальнейшей декомпозиции рейтингового модуля.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`193/193`);
- `npm run test:js` — green (`363/363`).

## Итерация 4 (read-query extraction)

### Что сделано

Из `ContractorRatingsService` вынесен read/query слой:

- `src/Subcontractor.Application/ContractorRatings/ContractorRatingReadQueryService.cs`
  - `GetHistoryAsync(...)`
  - `GetAnalyticsAsync(...)`

`ContractorRatingsService` переведён на делегирование read-операций в `ContractorRatingReadQueryService`.

В DI добавлена явная регистрация read-query dependency:

- `src/Subcontractor.Application/DependencyInjection.cs`
  - `AddScoped<ContractorRatingReadQueryService>()`.

Обновлён DI-контракт:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingsDependencyInjectionTests.cs`
  - добавлена проверка резолва `ContractorRatingReadQueryService`.

Добавлены focused integration tests для нового read-query слоя:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingReadQueryServiceTests.cs`
  - empty analytics path;
  - unknown contractor history guard;
  - `top` clamp behavior.

### Зачем

- дополнительно разгрузить `ContractorRatingsService`;
- изолировать read-side контракт рейтингов в отдельный модуль;
- уменьшить риск побочных эффектов между read и recalculation workflow.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`216/216`);
- `npm run test:js` — green (`363/363`).

## Итерация 5 (recalculation workflow extraction)

### Что сделано

Из `ContractorRatingsService` вынесен write/recalculation workflow слой:

- `src/Subcontractor.Application/ContractorRatings/ContractorRatingRecalculationWorkflowService.cs`
  - `RecalculateAsync(...)`.

`ContractorRatingsService` переведен на делегирование recalculation-path в новый workflow service:

- `UpsertManualAssessmentAsync(...)`;
- `RecalculateRatingsAsync(...)`.

Также обновлен DI bootstrap:

- `src/Subcontractor.Application/DependencyInjection.cs`
  - `AddScoped<ContractorRatingRecalculationWorkflowService>()`.

И обновлён DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingsDependencyInjectionTests.cs`
  - добавлена проверка резолва `ContractorRatingRecalculationWorkflowService`.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingRecalculationWorkflowServiceTests.cs`

Покрытые сценарии:

- `RecalculateAsync` c пустым списком подрядчиков возвращает `0`;
- `AutoRecalculation` путь обновляет рейтинг и пишет history;
- `ManualAssessment` путь связывает history с переданной manual assessment.

### Зачем

- дополнительно уменьшить размер и связанность `ContractorRatingsService`;
- изолировать write-side recalculation orchestration от фасада;
- снизить риск regressions при доработке формул, источников данных и history persistence.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`225/225`);
- `npm run test:js` — green (`363/363`).

## Итерация 6 (model lifecycle extraction)

### Что сделано

Из `ContractorRatingsService` вынесен model lifecycle orchestration слой:

- `src/Subcontractor.Application/ContractorRatings/ContractorRatingModelLifecycleService.cs`
  - `EnsureActiveModelAsync(...)`
  - `UpsertActiveModelAsync(...)`
  - `EnsureUniqueVersionCodeAsync(...)`

`ContractorRatingsService` переведён на делегирование lifecycle-path в новый support service:

- `GetActiveModelAsync(...)`;
- `UpsertActiveModelAsync(...)`;
- `UpsertManualAssessmentAsync(...)` (получение активной модели);
- `RecalculateRatingsAsync(...)` (получение активной модели).

Дополнительно исправлен latent EF concurrency edge-case в backfill-пути active-модели без весов:

- backfill default weights выполняется через явную вставку `ContractorRatingWeight` по `ModelVersionId`;
- lookup active-model в `EnsureActiveModelAsync(...)` переведён на `AsNoTracking`, чтобы исключить лишний update tracked principal в этом repair-path.

### Новые/обновлённые тесты

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingModelLifecycleServiceTests.cs`
  - missing-model baseline create path;
  - duplicate version-code upsert path;
  - default-weights backfill path.
- `tests/Subcontractor.Tests.SqlServer/Contractors/ContractorRatingModelLifecycleSqlServiceTests.cs`
  - SQL regression на backfill default weights для active-model без весов.

### Зачем

- дополнительно уменьшить размер и связанность `ContractorRatingsService`;
- изолировать model lifecycle контракт в отдельный модуль с focused tests;
- закрыть concurrency-риск в repair-path и зафиксировать его SQL-регрессией.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`233/233`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`77/77`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`79/79`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 7 (write-workflow extraction)

### Что сделано

Из `ContractorRatingsService` вынесен write-orchestration слой:

- `src/Subcontractor.Application/ContractorRatings/ContractorRatingWriteWorkflowService.cs`
  - `UpsertManualAssessmentAsync(...)`
  - `RecalculateRatingsAsync(...)`

`ContractorRatingsService` переведён на делегирование write-path в новый support service:

- `UpsertManualAssessmentAsync(...)`;
- `RecalculateRatingsAsync(...)`.

### Новые/обновлённые тесты

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingWriteWorkflowServiceTests.cs`
  - manual assessment persistence + history link;
  - unknown contractor guard in recalculation;
  - active-only recalculation guard for inactive contractors.
- `tests/Subcontractor.Tests.SqlServer/Contractors/ContractorRatingWriteWorkflowSqlServiceTests.cs`
  - SQL guard: unknown contractor path throws and writes no history rows.
- `tests/Subcontractor.Tests.Integration/Contractors/ContractorRatingsDependencyInjectionTests.cs`
  - DI contract дополнен резолвом `ContractorRatingWriteWorkflowService`.

### Зачем

- сделать `ContractorRatingsService` ещё тоньше (facade-only);
- изолировать write-side orchestration в отдельном модуле с focused regression tests;
- снизить риск regressions при изменениях manual assessment/recalculation flow.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`236/236`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).
