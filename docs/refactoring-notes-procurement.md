# Refactoring Notes — Procurement (Sprint 3)

Дата обновления: `2026-04-07`

## Цель

Пошагово уменьшить связность `ProcurementProceduresService` без `big-bang` переписывания и без потери текущей функциональности.

## Выполнено (итерация 1)

Из `ProcurementProceduresService` вынесена policy-логика shortlist-рекомендаций в отдельный модуль:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureShortlistRecommendationPolicy.cs`

Вынесенные функции:

- `CalculateRecommendationScore(...)`
- `BuildDecisionFactors(...)`
- `CalculateLoadPercent(...)`

`ProcurementProceduresService` теперь использует этот policy-модуль вместо встроенных private static методов.

Дополнительно:

- добавлен `InternalsVisibleTo` для тестовых проектов в:
  - `src/Subcontractor.Application/Properties/AssemblyInfo.cs`
- добавлены unit-тесты policy-модуля:
  - `tests/Subcontractor.Tests.Unit/Procurement/ProcedureShortlistRecommendationPolicyTests.cs`

## Проверка после итерации 1

- `ProcedureShortlistRecommendationPolicyTests`: green
- `ProcedureShortlistRecommendationsTests` (integration): green
- `SqlSuite=Core`: green

## Выполнено (итерация 2)

Из `ProcurementProceduresService` дополнительно вынесены чистые policy units:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureTransitionPolicy.cs`
- `src/Subcontractor.Application/ProcurementProcedures/ProcedureApprovalStepNormalizationPolicy.cs`

Что вынесено:

- правила допустимых переходов статусов процедуры;
- нормализация и валидация маршрута согласования.

Добавлены unit-тесты:

- `tests/Subcontractor.Tests.Unit/Procurement/ProcedureTransitionPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Procurement/ProcedureApprovalStepNormalizationPolicyTests.cs`

## Выполнено (итерация 3)

Выделен отдельный orchestration service для in-system approval:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureApprovalWorkflowService.cs`

Что перенесено из `ProcurementProceduresService`:

- `GetApprovalStepsAsync(...)`
- `ConfigureApprovalStepsAsync(...)`
- `DecideApprovalStepAsync(...)`
- `PrepareForApprovalAsync(...)`

`ProcurementProceduresService` сохранён как фасад и делегирует in-system approval операции в новый сервис.

Дополнительно добавлены регрессионные тесты approval-flow:

- integration:
  - `tests/Subcontractor.Tests.Integration/Procurement/ProcedureApprovalWorkflowTests.cs`
- sql-backed:
  - `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlApprovalTests.cs`

## Проверка после итераций 2-3

- unit policy tests: green
- `ProcedureApprovalWorkflowTests` (integration): green
- `ProcedureCompletionGuardTests` + `ProcedureShortlistRecommendationsTests` (integration): green
- `ProcurementProceduresSqlApprovalTests` + `ProcurementProceduresSqlTransitionTests` (sql core): green

## Выполнено (итерация 4)

Выделены `Offer/Outcome` orchestration и offer normalization policy:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureOfferNormalizationPolicy.cs`
- `src/Subcontractor.Application/ProcurementProcedures/ProcedureOfferOutcomeWorkflowService.cs`

Что перенесено из `ProcurementProceduresService`:

- `GetOffersAsync(...)`
- `UpsertOffersAsync(...)`
- `GetComparisonAsync(...)`
- `GetOutcomeAsync(...)`
- `UpsertOutcomeAsync(...)`
- нормализация и валидация offer payload

`ProcurementProceduresService` сохранён как фасад и делегирует offer/outcome операции в новый сервис.

Дополнительно добавлены регрессионные тесты offer/outcome flow:

- integration:
  - `tests/Subcontractor.Tests.Integration/Procurement/ProcedureOfferOutcomeWorkflowTests.cs`
- sql-backed:
  - `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlOfferOutcomeTests.cs`

## Проверка после итерации 4

- `ProcedureOfferOutcomeWorkflowTests` (integration): green
- `ProcurementProceduresSqlOfferOutcomeTests` (sql core): green
- `ProcurementProceduresSqlTransitionTests` + `ProcurementProceduresSqlApprovalTests` + `ProcurementProceduresSqlOfferOutcomeTests` (sql core): green
- `dotnet test Subcontractor.sln`: green (SQL suite ожидаемо skip без `SUBCONTRACTOR_SQL_TESTS=1`)

## Выполнено (итерация 5)

Сокращены file-binding responsibilities в отдельный сервис:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureAttachmentBindingService.cs`

Что вынесено из `ProcurementProceduresService`:

- `RebindRequestAttachmentsAsync(...)`
- `RebindExternalApprovalProtocolAsync(...)`
- `RebindOfferFilesAsync(...)`
- `RebindOutcomeProtocolAsync(...)`
- `LoadAttachmentsAsync(...)`

`ProcurementProceduresService` теперь использует `ProcedureAttachmentBindingService` как dependency и остаётся orchestration facade.

## Проверка после итерации 5

- `ProcedureApprovalWorkflowTests` + `ProcedureOfferOutcomeWorkflowTests` + `ProcedureShortlistRecommendationsTests` + `ProcedureCompletionGuardTests` (integration): green
- `ProcurementProceduresSqlTransitionTests` + `ProcurementProceduresSqlApprovalTests` + `ProcurementProceduresSqlOfferOutcomeTests` (sql core): green
- `dotnet test Subcontractor.sln`: green (SQL suite ожидаемо skip без `SUBCONTRACTOR_SQL_TESTS=1`)

## Следующая итерация (план)

1. Добавить focused tests на rebind rules (`request`, `external approval`, `offers`, `outcome`) и ошибки повторного bind.
2. Рассмотреть вынос `ExternalApproval` блока в отдельный workflow service для симметрии со `Shortlist/Approval/OfferOutcome`.
3. Дальше переходить к декомпозиции фронтенд-монолита `contracts-grid.js` по roadmap.

## Выполнено (итерация 6)

Добавлен отдельный workflow service для external approval:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureExternalApprovalWorkflowService.cs`

Что перенесено из `ProcurementProceduresService`:

- `GetExternalApprovalAsync(...)`
- `UpsertExternalApprovalAsync(...)`

`ProcurementProceduresService` теперь делегирует и этот блок в отдельный сервис.

Дополнительно добавлены focused tests на attachment rebind rules:

- integration:
  - `tests/Subcontractor.Tests.Integration/Procurement/ProcedureAttachmentBindingRulesTests.cs`
- sql-backed:
  - `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlAttachmentBindingTests.cs`

Покрытые сценарии:

- запрет bind файла, уже занятого другим owner entity type;
- корректный rebind external approval protocol со снятием старой привязки;
- ошибки привязки для request/external approval/offers/outcome.

## Проверка после итерации 6

- `ProcedureAttachmentBindingRulesTests` + `ProcedureApprovalWorkflowTests` + `ProcedureOfferOutcomeWorkflowTests` (integration): green
- `ProcurementProceduresSqlAttachmentBindingTests` + `ProcurementProceduresSqlApprovalTests` + `ProcurementProceduresSqlTransitionTests` + `ProcurementProceduresSqlOfferOutcomeTests` (sql core): green
- `dotnet test Subcontractor.sln`: green (SQL suite ожидаемо skip без `SUBCONTRACTOR_SQL_TESTS=1`)

## Следующая итерация (план)

1. Перейти к декомпозиции фронтенд-монолита `contracts-grid.js` на модули по roadmap.
2. Добавить minimal JS unit test stack для pure logic модулей (`formatters`, `validation`, `payload builders`).
3. Подготовить browser smoke barrier для ключевых страниц и навигации.

## Выполнено (итерация 7)

После декомпозиции фронтенда дополнительно усилен SQL-backed regression для `Offer/Outcome` сценариев:

- обновлён `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlOfferOutcomeTests.cs`;
- добавлен сценарий `retender/cancel`:
  - переход процедуры в `Retender`;
  - откат статуса лота в `InProcurement`;
  - сброс winner-решения по офферам;
  - проверка persistence history для процедуры и лота;
- добавлен guard-сценарий:
  - `winner` без оффера в процедуре даёт `ArgumentException`;
  - проверка отсутствия побочных эффектов (outcome/status/history не меняются).

## Проверка после итерации 7

- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlOfferOutcomeTests"`: green (`4/4`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "SqlSuite=Core"`: green (`31/31`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ...` (full SQL suite): green (`33/33`).

## Следующая итерация (план)

1. Продолжить backend quality tightening по оставшимся SQL risk-гепам (transaction/side-effects в критичных workflow).
2. Для внешних демо-стендов добавить стабильный seed-путь (endpoint или управляемая seed-процедура), чтобы убрать `skip` в non-CI smoke.

## Выполнено (итерация 8)

Дополнительно усилен SQL-backed contour для `ExternalApproval` сценариев:

- обновлён `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlApprovalTests.cs`;
- добавлен позитивный approve-flow сценарий:
  - переход процедуры `OnApproval -> Sent`;
  - запись status-history с reason;
  - биндинг protocol file к owner `PROC_EXTERNAL_APPROVAL`;
- усилен негативный сценарий `negative decision without comment`:
  - подтверждено отсутствие побочных эффектов (status/outcome/history не меняются).

## Проверка после итерации 8

- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlApprovalTests"`: green (`3/3`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "SqlSuite=Core"`: green (`32/32`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ...` (full SQL suite): green (`34/34`).

## Выполнено (итерация 9)

Закрыт transaction/side-effects risk-gap для создания процедуры с request attachments:

- обновлён `src/Subcontractor.Application/ProcurementProcedures/ProcurementProceduresService.cs`;
- в `CreateAsync(...)` убран промежуточный `SaveChangesAsync` между созданием процедуры и `RebindRequestAttachmentsAsync(...)`;
- теперь создание процедуры, запись initial status-history и привязка request-файлов фиксируются одним `SaveChangesAsync` (атомарно в рамках одной транзакции EF Core).

Добавлен SQL-regression тест:

- `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlAttachmentBindingTests.cs`;
- сценарий `CreateAsync_WhenRequestAttachmentAlreadyBoundToAnotherEntity_ShouldThrow_AndPersistNothing`.

Добавлен fast integration regression тест:

- `tests/Subcontractor.Tests.Integration/Procurement/ProcedureAttachmentBindingRulesTests.cs`;
- сценарий `CreateAsync_WhenRequestAttachmentAlreadyBoundToAnotherEntity_ShouldThrow_AndPersistNothing`.

Что проверяет тест:

- при конфликтующем файле (`OwnerEntityType != PROC_REQUEST/UNASSIGNED`) сервис выбрасывает ошибку;
- новая процедура не появляется в БД;
- запись в `ProcedureStatusHistory` не создаётся;
- исходная привязка конфликтующего файла не изменяется.

## Проверка после итерации 9

- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlAttachmentBindingTests"`: green (`3/3`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlTransitionTests"`: green (`2/2`);
- `dotnet test ...Integration... --filter "FullyQualifiedName~ProcedureAttachmentBindingRulesTests"`: green (`6/6`).

## Выполнено (итерация 10)

Усилены side-effects assertions для offer-file binding error path:

- обновлён `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlAttachmentBindingTests.cs`;
- обновлён `tests/Subcontractor.Tests.Integration/Procurement/ProcedureAttachmentBindingRulesTests.cs`.

Что добавлено в сценарий `UpsertOffersAsync_WhenOfferFileAlreadyBoundToAnotherEntity_ShouldThrow`:

- перед конфликтным вызовом сидится baseline-offer в процедуре;
- после ошибки проверяется, что:
  - статус процедуры остаётся `Sent`;
  - baseline-offer не удалён и не перезаписан;
  - history-переход в `OffersReceived` не создаётся.

## Проверка после итерации 10

- `dotnet test ...Integration... --filter "FullyQualifiedName~ProcedureAttachmentBindingRulesTests"`: green (`6/6`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlAttachmentBindingTests"`: green (`3/3`).

## Выполнено (итерация 11)

Дополнительно усилены side-effects assertions для external-approval binding error path:

- `tests/Subcontractor.Tests.Integration/Procurement/ProcedureAttachmentBindingRulesTests.cs`;
- `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlAttachmentBindingTests.cs`.

В сценарии `UpsertExternalApprovalAsync_WhenProtocolAlreadyBoundToAnotherEntity_ShouldThrow` теперь явно проверяется, что после ошибки:

- статус процедуры остаётся `OnApproval`;
- запись `ProcedureExternalApproval` не создаётся;
- history-переходы в `Sent`/`DocumentsPreparation` отсутствуют;
- исходная привязка конфликтующего файла не меняется.

## Проверка после итерации 11

- `dotnet test ...Integration... --filter "FullyQualifiedName~ProcedureAttachmentBindingRulesTests"`: green (`6/6`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlAttachmentBindingTests"`: green (`3/3`).

## Выполнено (итерация 12)

Закрыт ещё один side-effects gap в `Outcome` path для конфликтующего protocol file:

- в SQL-контур добавлен сценарий
  `UpsertOutcomeAsync_WhenProtocolAlreadyBoundToAnotherEntity_ShouldThrow_AndPersistNothing`
  (`tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlAttachmentBindingTests.cs`);
- в fast integration сценарий `UpsertOutcomeAsync_WhenProtocolAlreadyBoundToAnotherEntity_ShouldThrow`
  усилен persistence assertions
  (`tests/Subcontractor.Tests.Integration/Procurement/ProcedureAttachmentBindingRulesTests.cs`).

После ошибки подтверждается, что:

- процедура остаётся в `OffersReceived`;
- лот остаётся `InProcurement`;
- `ProcedureOutcome` не создаётся;
- winner в офферах не проставляется;
- history по `DecisionMade/Retender` и `LotStatusHistory` не создаются;
- конфликтующий файл сохраняет исходного owner.

## Проверка после итерации 12

- `dotnet test ...Integration... --filter "FullyQualifiedName~ProcedureAttachmentBindingRulesTests"`: green (`6/6`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlAttachmentBindingTests"`: green (`4/4`).

## Выполнено (итерация 13)

Усилен `Update` path для конфликтующего request-file:

- в SQL-контур добавлен новый сценарий
  `UpdateAsync_WhenRequestAttachmentAlreadyBoundToAnotherEntity_ShouldThrow_AndPersistNothing`;
- в fast integration существующий сценарий `UpdateAsync_WhenRequestAttachmentAlreadyBoundToAnotherEntity_ShouldThrow`
  дополнен persistence assertions.

Проверяется, что после ошибки:

- поля процедуры не обновляются;
- конфликтующий файл сохраняет исходного owner;
- скрытых побочных эффектов не возникает.

## Проверка после итерации 13

- `dotnet test ...Integration... --filter "FullyQualifiedName~ProcedureAttachmentBindingRulesTests"`: green (`6/6`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlAttachmentBindingTests"`: green (`5/5`).

## Выполнено (итерация 14)

Закрыт SQL-backed gap по shortlist orchestration:

- добавлен новый SQL test suite:
  - `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlShortlistTests.cs`.

Покрытые сценарии:

- explainable recommendations (`BuildShortlistRecommendationsAsync`) с проверкой decision-factors и missing disciplines;
- apply flow persistence (`ApplyShortlistRecommendationsAsync`) с проверкой фактического shortlist и adjustment logs;
- guard/normalization поведения `MaxIncluded` (`< 1` автоматически приводится к `1`).

## Проверка после итерации 14

- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlShortlistTests"`: green (`3/3`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "SqlSuite=Core"`: green (`68/68`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "SqlSuite=Full"`: green (`2/2`).

## Выполнено (итерация 15)

Усилен SQL-backed transition contour для completion guard:

- обновлён `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlTransitionTests.cs`.

Что добавлено:

- в сценарий `TransitionToCompleted_WithoutContract_ShouldThrow` добавлены side-effects assertions:
  - не создаётся переход процедуры в `Completed`;
  - не создаётся переход лота в `Contracted`;
- добавлен новый сценарий
  `TransitionToCompleted_WithContractBoundToDifferentLot_ShouldThrow_AndPersistNothing`.
- симметрично усилен fast integration contour:
  - обновлён `tests/Subcontractor.Tests.Integration/Procurement/ProcedureCompletionGuardTests.cs`;
  - добавлен сценарий `TransitionToCompleted_WithContractBoundToDifferentLot_ShouldThrow_AndPersistNothing`.

Новый сценарий проверяет, что при рассинхроне `contract.LotId` и `procedure.LotId`:

- выбрасывается `InvalidOperationException` с сообщением
  `Bound contract lot does not match procedure lot.`;
- статус процедуры остаётся `DecisionMade`;
- статус исходного лота процедуры остаётся `ContractorSelected`;
- внешний (чужой) лот не мутируется;
- не создаются записи history по `Completed` и `Contracted`.

## Проверка после итерации 15

- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlTransitionTests"`: green (`3/3`);
- `dotnet test ...Integration... --filter "FullyQualifiedName~ProcedureCompletionGuardTests"`: green (`4/4`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "SqlSuite=Core"`: green (`68/68`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "SqlSuite=Full"`: green (`2/2`).

## Выполнено (итерация 16)

Закрыт оставшийся backend gap по правилам удаления процедур:

- добавлен новый fast integration suite:
  - `tests/Subcontractor.Tests.Integration/Procurement/ProcedureDeleteRulesTests.cs`;
- добавлен новый SQL-backed suite:
  - `tests/Subcontractor.Tests.SqlServer/Procurement/ProcurementProceduresSqlDeleteRulesTests.cs`.

Покрытые сценарии:

- `DeleteAsync` для несуществующей процедуры возвращает `false`;
- `DeleteAsync` для `Sent`-процедуры выбрасывает
  `InvalidOperationException("Only draft/canceled procedures can be deleted.")` и не меняет состояние;
- `DeleteAsync` для `Created` удаляет процедуру;
- `DeleteAsync` для `Canceled` удаляет процедуру.

## Проверка после итерации 16

- `dotnet test ...Integration... --filter "FullyQualifiedName~ProcedureDeleteRulesTests"`: green (`4/4`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "FullyQualifiedName~ProcurementProceduresSqlDeleteRulesTests"`: green (`4/4`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "SqlSuite=Core"`: green (`73/73`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test ... --filter "SqlSuite=Full"`: green (`2/2`).

## Статус Sprint 3 (backend)

Backend-часть Sprint 3 закрыта:

- ключевые workflow-блоки вынесены из монолита в отдельные сервисы/policy units;
- SQL-backed regression покрывает основные risk-классы (`state/transaction/constraints/side-effects`);
- точечные quality-gaps последних итераций закрыты (completion guard, delete rules, attachment conflict paths, shortlist orchestration).

## Выполнено (итерация 17)

Дополнительно проведена структурная декомпозиция `ProcurementProceduresService` без изменения поведения:

Новые policy-модули:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureRequestValidationPolicy.cs`
- `src/Subcontractor.Application/ProcurementProcedures/ProcedureRequestMappingPolicy.cs`
- `src/Subcontractor.Application/ProcurementProcedures/ProcedureShortlistMutationPolicy.cs`

Что вынесено из `ProcurementProceduresService`:

- валидация `Create/Update` request;
- маппинг `Create/Update` request -> `ProcurementProcedure`;
- shortlist normalization + adjustment logs builder.

Технический эффект:

- `ProcurementProceduresService.cs`: `819 -> 603` строк (`-216`).

Добавлены unit-тесты на новые policy-модули:

- `tests/Subcontractor.Tests.Unit/Procurement/ProcedureRequestValidationPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Procurement/ProcedureRequestMappingPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Procurement/ProcedureShortlistMutationPolicyTests.cs`

## Проверка после итерации 17

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj`: green (`28/28`);
- `dotnet test Subcontractor.sln`: green (unit + integration, SQL suite ожидаемо `skip` без `SUBCONTRACTOR_SQL_TESTS=1`).

## Выполнено (итерация 18)

Продолжена структурная декомпозиция orchestration-слоя:

Новый сервис:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureLotWorkflowService.cs`

Что перенесено из `ProcurementProceduresService`:

- completion guard:
  - проверка контракта(ов) перед переходом в `Completed`;
  - валидация соответствия `contract.LotId == procedure.LotId`;
  - перевод лота в `Contracted` при валидном completion-path.
- синхронизация статуса лота:
  - guard по допустимым переходам `LotStatus`;
  - запись `LotStatusHistory`.

`ProcurementProceduresService` сохранён фасадом и делегирует lot/completion workflow в `ProcedureLotWorkflowService`.

Технический эффект:

- `ProcurementProceduresService.cs`: `603 -> 537` строк (`-66`).

## Проверка после итерации 18

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj`: green (`28/28`);
- `dotnet test Subcontractor.sln`: green (unit + integration; SQL suite ожидаемо `skip` без `SUBCONTRACTOR_SQL_TESTS=1`).

## Выполнено (итерация 19)

Продолжена структурная декомпозиция `ProcurementProceduresService` в shortlist-блоке:

Новый сервис:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureShortlistWorkflowService.cs`

Что перенесено из `ProcurementProceduresService`:

- `GetShortlistAsync(...)`;
- `UpsertShortlistAsync(...)`;
- validation/guard-логика shortlist edit для `Canceled/Completed`;
- проверка активных подрядчиков shortlist;
- persistence-логика shortlist items + adjustment logs.

`ProcurementProceduresService` сохранён фасадом и делегирует shortlist CRUD-операции в `ProcedureShortlistWorkflowService`.

Технический эффект:

- `ProcurementProceduresService.cs`: `537 -> 457` строк (`-80`);
- новый `ProcedureShortlistWorkflowService.cs`: `113` строк.

## Проверка после итерации 19

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`);
- `npm run test:js -- --runInBand`: green (`363/363`).

## Выполнено (итерация 20)

Продолжена декомпозиция lifecycle-блока в отдельный сервис:

Новый сервис:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureLifecycleService.cs`

Что перенесено из `ProcurementProceduresService`:

- `ListAsync(...)`;
- `GetByIdAsync(...)`;
- `CreateAsync(...)`;
- `UpdateAsync(...)`;
- `DeleteAsync(...)`;
- `GetHistoryAsync(...)`.

`ProcurementProceduresService` сохранён фасадом:

- lifecycle-операции делегируются в `ProcedureLifecycleService`;
- orchestration transition/approval/shortlist/offer/outcome остаётся в фасаде.

Технический эффект:

- `ProcurementProceduresService.cs`: `457 -> 293` строк (`-164`);
- новый `ProcedureLifecycleService.cs`: `227` строк.

## Проверка после итерации 20

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green (`0 errors`, `0 warnings`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`);
- `npm run test:js -- --runInBand`: green (`363/363`).

## Выполнено (итерация 21)

Продолжена декомпозиция transition/status-mutation блока:

Новые сервисы:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureTransitionWorkflowService.cs`
- `src/Subcontractor.Application/ProcurementProcedures/ProcedureStatusMutationService.cs`

Что перенесено из `ProcurementProceduresService`:

- `TransitionAsync(...)` orchestration (fetch + guards + OnApproval/Completed hooks + persistence);
- `UpdateProcedureStatusAsync(...)` мутация статуса + запись history;
- mapping `ProcedureStatusHistory -> ProcedureStatusHistoryItemDto`.

`ProcurementProceduresService` сохранён фасадом:

- transition делегирован в `ProcedureTransitionWorkflowService`;
- approval/external-approval/offers/outcome workflow теперь используют общий `ProcedureStatusMutationService.UpdateProcedureStatusAsync`.

Технический эффект:

- `ProcurementProceduresService.cs`: `293 -> 228` строк (`-65`);
- `ProcedureTransitionWorkflowService.cs`: `66` строк;
- `ProcedureStatusMutationService.cs`: `56` строк.

## Проверка после итерации 21

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green (`0 errors`, `0 warnings`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`);
- `npm run test:js -- --runInBand`: green (`363/363`).

## Выполнено (итерация 22)

Завершена декомпозиция `Offer/Outcome` блока из фасада:

- удалён legacy-комбинированный сервис:
  - `src/Subcontractor.Application/ProcurementProcedures/ProcedureOfferOutcomeWorkflowService.cs`
- фасад переведён на два специализированных workflow-сервиса:
  - `src/Subcontractor.Application/ProcurementProcedures/ProcedureOffersWorkflowService.cs`
  - `src/Subcontractor.Application/ProcurementProcedures/ProcedureOutcomeWorkflowService.cs`
  - `src/Subcontractor.Application/ProcurementProcedures/ProcurementProceduresService.cs`

Что изменено в `ProcurementProceduresService`:

- `GetOffersAsync/UpsertOffersAsync/GetComparisonAsync` делегируются в `ProcedureOffersWorkflowService`;
- `GetOutcomeAsync/UpsertOutcomeAsync` делегируются в `ProcedureOutcomeWorkflowService`;
- удалена зависимость фасада от объединённого `ProcedureOfferOutcomeWorkflowService`.

Технический эффект:

- `ProcurementProceduresService.cs`: `228 -> 229` строк (фасад остаётся тонким, изменение только из-за форматирования полей);
- устранён дублирующий/устаревший слой orchestration между фасадом и профильными workflow-сервисами.

## Выполнено (итерация 23)

Сделан bootstrap/wiring extraction для procurement facade в DI-слой:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`:
  - добавлены scoped-регистрации внутренних workflow-сервисов procurement;
  - добавлена explicit-композиция `ProcurementProceduresService` в factory registration;
  - `IProcurementProceduresService` теперь резолвится через уже собранный `ProcurementProceduresService`.

Изменения в фасаде:

- в `src/Subcontractor.Application/ProcurementProcedures/ProcurementProceduresService.cs` добавлен internal constructor для dependency-wired композиции;
- существующий публичный конструктор (`dbContext/currentUser/contractorsService`) сохранён для совместимости тестового контура и прямых instantiation-path.

Технический эффект:

- wiring состава `ProcurementProceduresService` перенесён на уровень DI bootstrap;
- фасад получил явный composition contract и стал проще для дальнейших итераций по testability/replaceability зависимостей.

## Проверка после итерации 23

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green (`0 errors`, `0 warnings`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`);
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (`unit+integration pass`, `sql suite skipped by design without SUBCONTRACTOR_SQL_TESTS=1`);
- `npm run test:js -- --runInBand`: green (`363/363`).

## Выполнено (итерация 24)

Добавлен regression-контур на DI/bootstrap wiring фасада procurement:

- новый integration suite:
  - `tests/Subcontractor.Tests.Integration/Procurement/ProcurementProceduresDependencyInjectionTests.cs`

Что проверяется:

- `AddApplication()` действительно резолвит `IProcurementProceduresService` через `ProcurementProceduresService` после вынесения composition в DI;
- alias-регистрация `IProcurementProceduresService -> ProcurementProceduresService` в рамках scope возвращает один и тот же инстанс;
- базовый вызов `ListAsync(...)` на резолвленном сервисе выполняется успешно (контракт wiring не сломан).

Технический эффект:

- bootstrap/wiring extraction из итерации 23 закреплён автоматическим тестом на DI-контракт;
- снижен риск “тихой” поломки composition-слоя при следующих рефакторингах `DependencyInjection`.

## Проверка после итерации 24

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~ProcurementProceduresDependencyInjectionTests" -p:UseAppHost=false`: green (`2/2`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green (`0 errors`, `0 warnings`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`144/144`);
- `npm run test:js -- --runInBand`: green (`363/363`).

## Выполнено (итерация 25)

Сделан policy extraction для shortlist apply-flow:

- новый policy:
  - `src/Subcontractor.Application/ProcurementProcedures/ProcedureShortlistApplyPolicy.cs`
- обновлён orchestration слой:
  - `src/Subcontractor.Application/ProcurementProcedures/ProcedureShortlistOrchestrationService.cs`

Что вынесено из orchestration:

- clamp-правило `MaxIncluded` (`1..30`);
- нормализация/дефолт `AdjustmentReason` (`Auto shortlist apply`);
- selection recommended-кандидатов c `Take(maxIncluded)`;
- mapping selected-кандидатов в `UpdateProcedureShortlistRequest` (sequential `SortOrder`, `IsIncluded=true`).
- ordering/projection кандидатов в итоговые `ProcedureShortlistRecommendationDto` вынесены в `ProcedureShortlistRecommendationOrderingPolicy`.

Усилен integration regression-контур:

- `tests/Subcontractor.Tests.Integration/Procurement/ProcedureShortlistRecommendationsTests.cs`
  - добавлен сценарий: `MaxIncluded = 0` + пустой `AdjustmentReason` -> clamp до `1` + default reason `Auto shortlist apply`.

Добавлены focused unit tests:

- `tests/Subcontractor.Tests.Unit/Procurement/ProcedureShortlistApplyPolicyTests.cs`
- `tests/Subcontractor.Tests.Unit/Procurement/ProcedureShortlistRecommendationOrderingPolicyTests.cs`

Покрытые ветки:

- `MaxIncluded` boundary-values;
- reason normalization/default;
- selection recommended candidates;
- upsert request mapping contract.
- deterministic ordering (`recommended -> score -> load -> name`);
- suggested sort order sequencing only for recommended rows.

Технический эффект:

- снижена плотность бизнес-правил в `ProcedureShortlistOrchestrationService`;
- apply-flow стал полностью повторно используемым и unit-testable без интеграционного графа.

## Проверка после итерации 25

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~ProcedureShortlist" -p:UseAppHost=false` — green (`18/18`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~ProcedureShortlistRecommendations" -p:UseAppHost=false` — green (`3/3`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`173/173`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`301/301`).
