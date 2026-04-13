# Refactoring Notes — SourceDataImports Service

Дата обновления: `2026-04-11`

## Итерация 1 (transition policy extraction)

### Что сделано

Из `SourceDataImportsService` вынесен pure transition/policy слой:

- `src/Subcontractor.Application/Imports/SourceDataImportTransitionPolicy.cs`

Вынесенные блоки:

- `NormalizeTransitionReason(...)`;
- `EnsureTransitionAllowed(...)`;
- `TruncateReason(...)`.

`SourceDataImportsService` переведён на делегирование в `SourceDataImportTransitionPolicy` для:

- ручного transition path (`TransitionBatchStatusAsync`);
- async validation-failure path (`ProcessQueuedAsync`).

### Зачем

- убрать status-transition правила из большого orchestration-сервиса;
- изолировать правила переходов и reason-guard в unit-testable модуль;
- снизить риск регрессий в workflow при дальнейшей декомпозиции imports backend.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Imports/SourceDataImportTransitionPolicyTests.cs`

Покрытые сценарии:

- default reason для пустого комментария;
- разрешённый переход `Validated -> ReadyForLotting`;
- запрет `ReadyForLotting` при `InvalidRows > 0`;
- запрет недопустимого перехода (`Uploaded -> Rejected`);
- обязательность комментария для `-> Rejected`;
- trim/truncate reason до `1024` символов.

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`79/79`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`187/187`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 2 (row normalization policy extraction)

### Что сделано

Из `SourceDataImportsService` вынесен pure row-normalization слой:

- `src/Subcontractor.Application/Imports/SourceDataImportRowNormalizationPolicy.cs`

Вынесенные блоки:

- `NormalizeForValidation(...)`;
- `NormalizeForQueuedUpload(...)`;
- `ToEntity(...)`;
- `ApplyToEntity(...)`.

`SourceDataImportsService` переведён на делегирование в policy в трёх путях:

- sync create (`CreateBatchAsync`);
- queued create (`CreateBatchQueuedAsync`);
- async revalidation (`ValidateBatchRowsAsync`).

### Зачем

- убрать дубли нормализации полей и validation-rules из orchestration-сервиса;
- получить единый контракт нормализации строк для sync/queued/processing веток;
- упростить дальнейшую декомпозицию `SourceDataImportsService`.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Imports/SourceDataImportRowNormalizationPolicyTests.cs`

Покрытые сценарии:

- trim/uppercase + fallback row-number;
- multi-error validation message (`unknown project`, `objectWbs`, `disciplineCode`, `manHours`, `dates`);
- queued-normalization без validation-фейла;
- apply-to-entity overwrite contract.

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`83/83`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`187/187`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 3 (read/report projection policy extraction)

### Что сделано

Из `SourceDataImportsService` вынесен read/report projection слой:

- `src/Subcontractor.Application/Imports/SourceDataImportReadProjectionPolicy.cs`

Вынесенные блоки:

- `ToDetailsDto(...)`;
- `ToHistoryDto(...)`;
- `BuildValidationReport(...)`;
- `BuildLotReconciliationReport(...)`;
- `EscapeCsv(...)` + report snapshot rows.

`SourceDataImportsService` переведён на делегирование в projection policy в путях:

- `GetBatchByIdAsync`;
- `CreateBatchAsync` / `CreateBatchQueuedAsync` return dto;
- `TransitionBatchStatusAsync` return history dto;
- `GetValidationReportAsync`;
- `GetLotReconciliationReportAsync`.

### Зачем

- убрать из сервиса объёмный read/report formatting блок;
- сделать DTO/report контракты отдельным unit-testable слоем;
- снизить размер и связность `SourceDataImportsService` перед следующими extraction-итерациями.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Imports/SourceDataImportReadProjectionPolicyTests.cs`

Покрытые сценарии:

- `ToDetailsDto` сортирует строки по `RowNumber`;
- `ToHistoryDto` корректно маппит changed-by/changed-at поля;
- `BuildValidationReport` учитывает `includeValidRows` и корректно формирует имя файла;
- `BuildLotReconciliationReport` строит CSV с экранированием значений и корректным именем файла.

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`87/87`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`187/187`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 4 (bootstrap/wiring extraction в DI)

### Что сделано

`SourceDataImportsService` переведён на explicit DI alias composition:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`:
  - `SourceDataImportsService` регистрируется как отдельный scoped facade;
  - `ISourceDataImportsService` резолвится через alias к `SourceDataImportsService`.

Добавлен integration-контракт на DI wiring:

- `tests/Subcontractor.Tests.Integration/Imports/SourceDataImportsDependencyInjectionTests.cs`.

Покрытые проверки:

- `AddApplication` резолвит facade как `SourceDataImportsService`;
- интерфейс и facade-алиас дают один и тот же scoped instance;
- базовый вызов `ListBatchesAsync(...)` на DI-резолвленном сервисе остаётся рабочим.

### Зачем

- сделать bootstrap-контракт imports фасада явным и единообразным с `Contracts/Procurement/SLA`;
- снизить риск silent-regressions при дальнейшей декомпозиции imports backend;
- зафиксировать alias/wiring правила отдельным integration-suite.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`191/191`);
- `npm run test:js` — green (`363/363`).

## Итерация 5 (read/workflow extraction)

### Что сделано

`SourceDataImportsService` переведен в thin-orchestrator в части read/queued-processing:

- добавлен `src/Subcontractor.Application/Imports/SourceDataImportReadQueryService.cs`;
- добавлен `src/Subcontractor.Application/Imports/SourceDataImportBatchProcessingWorkflowService.cs`;
- обновлен `src/Subcontractor.Application/Imports/SourceDataImportsService.cs`:
  - read-path делегирован в `SourceDataImportReadQueryService`:
    - `ListBatchesAsync`;
    - `GetBatchByIdAsync`;
    - `GetBatchHistoryAsync`;
    - `GetValidationReportAsync`;
    - `GetLotReconciliationReportAsync`;
  - queued-processing path делегирован в `SourceDataImportBatchProcessingWorkflowService`:
    - `ProcessQueuedBatchesAsync`.

Также обновлен DI bootstrap:

- `src/Subcontractor.Application/DependencyInjection.cs`:
  - `AddScoped<SourceDataImportReadQueryService>()`;
  - `AddScoped<SourceDataImportBatchProcessingWorkflowService>()`.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Imports/SourceDataImportReadQueryServiceTests.cs`;
- `tests/Subcontractor.Tests.Integration/Imports/SourceDataImportBatchProcessingWorkflowServiceTests.cs`.

Покрытые контракты:

- `SourceDataImportReadQueryService`:
  - `GetBatchByIdAsync` unknown-id -> `null`;
  - `ListBatchesAsync` read-path для mixed-status батчей;
  - `GetValidationReportAsync(includeValidRows:false)` исключает валидные строки.
- `SourceDataImportBatchProcessingWorkflowService`:
  - queued batch -> `Processing -> ValidatedWithErrors` с историей;
  - empty queue -> `0`;
  - `maxBatches <= 0` -> `ArgumentException`.

### Зачем

- уменьшить связность `SourceDataImportsService`;
- изолировать read/query и queued-processing логику в отдельные unit/integration-testable слои;
- зафиксировать декомпозицию контракта тестами и снизить риск регрессий при дальнейшем рефакторинге imports backend.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`222/222`);
- `npm run test:js` — green (`363/363`).

## Итерация 6 (write-request policy extraction)

### Что сделано

Дополнительно уменьшена связность write-path в `SourceDataImportWriteWorkflowService`:

- добавлен новый policy-модуль:
  - `src/Subcontractor.Application/Imports/SourceDataImportBatchRequestPolicy.cs`
    - `Normalize(...)` (fileName/notes/rows normalization + guards).

`SourceDataImportWriteWorkflowService` переведён на делегирование request-normalization в новый policy в обоих create-path:

- `CreateBatchAsync(...)`;
- `CreateBatchQueuedAsync(...)`.

Из workflow-сервиса удалены дублирующие private helper-методы:

- `NormalizeFileName(...)`;
- `NormalizeNotes(...)`.

### Зачем

- убрать дубли подготовки create-request из двух write-path;
- зафиксировать контракт входной нормализации и guard-правил в отдельном unit-testable слое;
- продолжить движение `SourceDataImports` к тонкому orchestration-фасаду.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Imports/SourceDataImportBatchRequestPolicyTests.cs`

Покрытые сценарии:

- trim fileName/notes + rows pass-through;
- whitespace notes -> `null`;
- fileName required guard;
- rows required guard;
- null-request guard.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~SourceDataImportBatchRequestPolicyTests|FullyQualifiedName~SourceDataImportRowNormalizationPolicyTests|FullyQualifiedName~SourceDataImportTransitionPolicyTests|FullyQualifiedName~SourceDataImportReadProjectionPolicyTests"` — green (`19/19`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Imports"` — green (`45/45`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "FullyQualifiedName~SourceDataImportsSqlServiceTests|FullyQualifiedName~XmlSourceDataImportInboxSqlServiceTests"` — green (`10/10`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`117/117`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`252/252`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 7 (facade constructor visibility hardening)

### Что сделано

В `src/Subcontractor.Application/Imports/SourceDataImportsService.cs` ограничена внешняя инстанциация фасада:

- конструктор `SourceDataImportsService(IApplicationDbContext dbContext)` переведён в `internal`;
- explicit composition-конструктор (`read + processing + write`) переведён в `internal`.

Фасад по-прежнему остаётся `public` и доступен через DI alias `ISourceDataImportsService`.

### Зачем

- зафиксировать правило, что production composition идёт через `AddApplication()`/DI bootstrap;
- снизить риск обхода composition root через прямой `new` из внешних assembly;
- сохранить тестовую совместимость через `InternalsVisibleTo` для test-проектов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~SourceDataImports|FullyQualifiedName~XmlSourceDataImportInbox"` — green (`30/30`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "FullyQualifiedName~SourceDataImportsSqlServiceTests|FullyQualifiedName~XmlSourceDataImportInboxSqlServiceTests"` — green (`10/10`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`117/117`).

## Итерация 8 (xml inbox policy extraction + decimal parsing hardening)

### Что сделано

Из `XmlSourceDataImportInboxService` вынесены policy-слои:

- `src/Subcontractor.Application/Imports/XmlSourceDataImportInboxRequestPolicy.cs`
  - `NormalizeFileName(...)`
  - `NormalizeSourceSystem(...)`
  - `NormalizeExternalDocumentId(...)`
  - `NormalizeXmlContent(...)`
  - `EnsureWellFormedXml(...)`
  - `BuildBatchNotes(...)`
  - `TruncateError(...)`
- `src/Subcontractor.Application/Imports/XmlSourceDataImportXmlParserPolicy.cs`
  - `ParseRows(...)` + private XML parsing helpers (`value lookup`, `int/decimal/date parse`).

`XmlSourceDataImportInboxService` переведён на делегирование:

- queue normalization/validation;
- parse-rows шаг в `ProcessQueuedAsync`;
- notes/error formatting.

Технический эффект:

- `XmlSourceDataImportInboxService.cs`: `368 -> 175` строк (`-193`).

Дополнительно исправлен decimal-parse edge-case для XML (`manHours`):

- значение вида `12,5` теперь обрабатывается как десятичное (`12.5`), а не как `125`.

### Зачем

- уменьшить связность `XmlSourceDataImportInboxService` и оставить его orchestration-фасадом;
- зафиксировать XML-политики отдельными unit-тестами;
- закрыть функциональный риск некорректной интерпретации man-hours при запятой в десятичной части.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Imports/XmlSourceDataImportInboxPoliciesTests.cs`

Покрытые сценарии:

- normalize/guard для file/xml request fields;
- malformed XML guard;
- parse rows из `row/item/work` + root-row fallback;
- decimal/date normalization;
- batch notes formatting;
- error truncate/fallback behavior.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~XmlSourceDataImportInboxPoliciesTests"` — green (`7/7`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~XmlSourceDataImportInbox|FullyQualifiedName~SourceDataXmlImports"` — green (`11/11`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "FullyQualifiedName~XmlSourceDataImportInboxSqlServiceTests"` — green (`3/3`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`134/134`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`256/256`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 9 (xml inbox read/write/processing service extraction)

### Что сделано

`XmlSourceDataImportInboxService` переведён в thin-facade orchestration.

Добавлены отдельные support-services:

- `src/Subcontractor.Application/Imports/XmlSourceDataImportInboxReadQueryService.cs`
  - `ListAsync(...)`;
  - `GetByIdAsync(...)`.
- `src/Subcontractor.Application/Imports/XmlSourceDataImportInboxWriteWorkflowService.cs`
  - `QueueAsync(...)`;
  - `RetryAsync(...)`.
- `src/Subcontractor.Application/Imports/XmlSourceDataImportInboxProcessingWorkflowService.cs`
  - `ProcessQueuedAsync(...)`.
- `src/Subcontractor.Application/Imports/XmlSourceDataImportInboxProjectionPolicy.cs`
  - единый `ToDto(...)` mapping.

`XmlSourceDataImportInboxService` теперь делегирует:

- read-path в `ReadQueryService`;
- queue/retry-path в `WriteWorkflowService`;
- processing-path в `ProcessingWorkflowService`.

Технический эффект:

- `XmlSourceDataImportInboxService.cs`: `175 -> 62` строк (`-113`).

### Зачем

- продолжить унификацию backend-паттерна (`facade + support services`);
- упростить дальнейшие изменения в XML inbox без роста фасада;
- сделать read/write/processing контракты точечно тестируемыми и прозрачными для DI wiring.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Imports/XmlSourceDataImportInboxReadQueryServiceTests.cs`
  - `GetById unknown -> null`;
  - list returns persisted rows.
- `tests/Subcontractor.Tests.Integration/Imports/XmlSourceDataImportInboxProcessingWorkflowServiceTests.cs`
  - `maxItems` guard;
  - empty queue -> `0`;
  - valid XML -> `Completed` + linked batch id.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~XmlSourceDataImportInboxPoliciesTests"` — green (`7/7`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~XmlSourceDataImportInbox"` — green (`11/11`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "FullyQualifiedName~XmlSourceDataImportInboxSqlServiceTests"` — green (`3/3`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`134/134`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`261/261`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj` — green (`80/80`);
- `npm run test:js -- --runInBand` — green (`363/363`).

## Итерация 10 (xml inbox facade constructor visibility hardening)

### Что сделано

В `src/Subcontractor.Application/Imports/XmlSourceDataImportInboxService.cs` ограничена внешняя инстанциация фасада:

- конструктор `XmlSourceDataImportInboxService(IApplicationDbContext, ISourceDataImportsService, IDateTimeProvider)` переведён в `internal`;
- explicit composition-конструктор (`read + write + processing`) оставлен `internal`.

Фасад остаётся `public` и доступен через DI alias `IXmlSourceDataImportInboxService`.

### Зачем

- зафиксировать правило использования XML inbox фасада через composition root;
- снизить риск обхода DI bootstrap прямым `new` во внешних сборках;
- выровнять visibility-паттерн с уже hardening-модулями (`SourceDataImports`, `LotRecommendations`).

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --filter "FullyQualifiedName~XmlSourceDataImportInbox"` — green (`11/11`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false --filter "FullyQualifiedName~XmlSourceDataImportInboxSqlServiceTests"` — green (`3/3`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`134/134`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`261/261`).
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false` — green (`80/80`).
