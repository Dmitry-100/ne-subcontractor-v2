# Refactoring Notes — SLA Monitoring

Дата обновления: `2026-04-10`

## Итерация 1 (rule configuration policy extraction)

### Что сделано

Из `SlaMonitoringService` вынесен pure policy-слой:

- `src/Subcontractor.Application/Sla/SlaRuleConfigurationPolicy.cs`

Вынесенные блоки:

- `NormalizeRuleItems(...)`;
- `ResolveWarningDays(...)`;
- `NormalizeWarningDays(...)`;
- `NormalizeCode(...)`;
- `NormalizeNullableCode(...)`;
- `NormalizeNullableText(...)`.

`SlaMonitoringService` переведён на делегирование в `SlaRuleConfigurationPolicy` в path:

- `UpsertRulesAsync`;
- `SetViolationReasonAsync`;
- `LoadWarningDaysByPurchaseTypeAsync`;
- `LoadActiveCandidatesAsync`.

### Зачем

- убрать rules/text/code normalization логику из большого orchestration-сервиса;
- зафиксировать SLA-правила и guard-ограничения отдельными unit-тестами;
- снизить риск регрессий при дальнейшей декомпозиции `SlaMonitoringService`.

### Новые unit tests

- `tests/Subcontractor.Tests.Unit/Sla/SlaRuleConfigurationPolicyTests.cs`

Покрытые сценарии:

- normalize code/description contract;
- duplicate/empty `PurchaseTypeCode` guard;
- `WarningDaysBeforeDue` range guard;
- warning-days resolution (mapped + fallback);
- nullable text/code normalization contract.

### Проверка после итерации

- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`104/104`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`187/187`);
- `npm run -s test:js -- --runInBand` — green (`363/363`).

## Итерация 2 (candidate query + notification policy + DI wiring extraction)

### Что сделано

Из `SlaMonitoringService` вынесены query/notification responsibility слои:

- `src/Subcontractor.Application/Sla/SlaViolationCandidateQueryService.cs`
  - `LoadWarningDaysByPurchaseTypeAsync(...)`
  - `LoadActiveCandidatesAsync(...)`
- `src/Subcontractor.Application/Sla/SlaNotificationPolicy.cs`
  - `BuildNotificationMessage(...)`
- `src/Subcontractor.Application/Sla/SlaActiveViolationCandidate.cs`
  - internal candidate-model с детерминированным `Key`.

`SlaMonitoringService` переведён на делегирование в новые модули:

- warnings/candidates загрузка -> `SlaViolationCandidateQueryService`;
- формирование письма -> `SlaNotificationPolicy`.

Также выполнена bootstrap/wiring декомпозиция:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`;
- добавлены explicit registrations:
  - `SlaViolationCandidateQueryService`;
  - `SlaMonitoringService` factory;
  - alias `ISlaMonitoringService -> SlaMonitoringService`.

### Зачем

- отделить DB-query слой от orchestration-слоя мониторинга;
- зафиксировать notification-formatting отдельно от workflow;
- сделать DI-контракт SLA-фасада явным и проверяемым тестами.

### Новые тесты

- unit:
  - `tests/Subcontractor.Tests.Unit/Sla/SlaNotificationPolicyTests.cs`
- integration:
  - `tests/Subcontractor.Tests.Integration/Sla/SlaDependencyInjectionTests.cs`

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`189/189`);
- `npm run test:js` — green (`363/363`).

## Итерация 3 (administration workflow extraction)

### Что сделано

Из `SlaMonitoringService` вынесен administration-слой правил/нарушений:

- `src/Subcontractor.Application/Sla/SlaRuleAndViolationAdministrationService.cs`
  - `GetRulesAsync(...)`;
  - `UpsertRulesAsync(...)`;
  - `ListViolationsAsync(...)`;
  - `SetViolationReasonAsync(...)`.

`SlaMonitoringService` переведён на делегирование этих path-ов в новый сервис и оставлен как monitoring-orchestrator для `RunMonitoringCycleAsync(...)`.

Также обновлён DI bootstrap:

- `src/Subcontractor.Application/DependencyInjection.cs`
  - `AddScoped<SlaRuleAndViolationAdministrationService>()`;
  - `SlaMonitoringService` factory теперь получает administration dependency.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Sla/SlaRuleAndViolationAdministrationServiceTests.cs`
  - rules upsert/normalization contract;
  - violations list filtering (`includeResolved`);
  - reason assignment/clear flow.

Обновлён DI-контракт:

- `tests/Subcontractor.Tests.Integration/Sla/SlaDependencyInjectionTests.cs`
  - добавлена проверка резолва `SlaRuleAndViolationAdministrationService`.

### Зачем

- дополнительно уменьшить связность `SlaMonitoringService`;
- изолировать CRUD/reason-flow SLA в отдельный testable слой;
- снизить риск регрессий при изменениях monitoring-cycle и rules/reason функций одновременно.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`228/228`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`76/76`);
- `npm run test:js` — green (`363/363`).

## Итерация 4 (monitoring-cycle workflow extraction)

### Что сделано

Из `SlaMonitoringService` вынесен monitoring-cycle orchestration слой:

- `src/Subcontractor.Application/Sla/SlaMonitoringCycleWorkflowService.cs`
  - `RunMonitoringCycleAsync(...)`.

`SlaMonitoringService` дополнительно упрощён:

- rules/violations administration path делегируется в `SlaRuleAndViolationAdministrationService`;
- monitoring-cycle path делегируется в `SlaMonitoringCycleWorkflowService`;
- фасад сохранён и остаётся контрактной точкой `ISlaMonitoringService`.

Также обновлён DI bootstrap:

- `src/Subcontractor.Application/DependencyInjection.cs`
  - `AddScoped<SlaMonitoringCycleWorkflowService>()`;
  - `SlaMonitoringService` factory теперь собирается из:
    - `SlaRuleAndViolationAdministrationService`;
    - `SlaMonitoringCycleWorkflowService`.

### Новые integration tests

- `tests/Subcontractor.Tests.Integration/Sla/SlaMonitoringCycleWorkflowServiceTests.cs`
  - empty-data run (`0` violations/notifications);
  - `sendNotifications=false` path (violation создаётся, email send не выполняется).

Обновлён DI-контракт:

- `tests/Subcontractor.Tests.Integration/Sla/SlaDependencyInjectionTests.cs`
  - добавлена проверка резолва `SlaMonitoringCycleWorkflowService`.

### Зачем

- завершить декомпозицию SLA-фасада до thin-orchestrator;
- отделить monitoring-cycle side-effects от CRUD/reason path;
- снизить риск регрессий при изменениях правил SLA и notification orchestration.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`230/230`);
- `SUBCONTRACTOR_SQL_TESTS=1 dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core"` — green (`76/76`);
- `npm run test:js` — green (`363/363`).
