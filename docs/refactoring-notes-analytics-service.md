# Refactoring Notes — Analytics Service

Дата обновления: `2026-04-11`

## Итерация 1 (bootstrap/wiring extraction в DI)

### Что сделано

`AnalyticsService` переведён на explicit DI alias composition:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`;
- `AnalyticsService` регистрируется как отдельный scoped facade;
- `IAnalyticsService` резолвится через alias к `AnalyticsService`.

Добавлен integration-контракт:

- `tests/Subcontractor.Tests.Integration/Analytics/AnalyticsDependencyInjectionTests.cs`.

Покрытые проверки:

- DI-резолв фасада работает, `GetViewCatalogAsync(...)` возвращает непустой каталог;
- интерфейс и facade-алиас резолвятся как один и тот же scoped instance.

### Зачем

- расширить единый bootstrap/wiring паттерн на аналитический фасад;
- зафиксировать registration/alias контракт analytics-модуля regression-тестом;
- снизить риск скрытых поломок в composition root.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`201/201`);
- `npm run test:js` — green (`363/363`).

## Итерация 2 (facade split: KPI/ViewCatalog extraction)

### Что сделано

`AnalyticsService` переведён в thin-facade:

- `src/Subcontractor.Application/Analytics/AnalyticsService.cs`
  - KPI-path делегируется в `AnalyticsKpiDashboardQueryService`;
  - view-catalog path делегируется в `AnalyticsViewCatalogQueryService`;
  - сохранён public fallback-конструктор `AnalyticsService(IApplicationDbContext, IDateTimeProvider)` для совместимости;
  - добавлен internal constructor для explicit composition.

Добавлены extracted support-services:

- `src/Subcontractor.Application/Analytics/AnalyticsKpiDashboardQueryService.cs`
  - вынесена KPI-агрегация (`LotFunnel`, `ContractorLoad`, `SlaMetrics`, `ContractingAmounts`, `MdrProgress`, `SubcontractingShare`, `TopContractors`) и helper-проценты/округления.
- `src/Subcontractor.Application/Analytics/AnalyticsViewCatalogQueryService.cs`
  - вынесен catalog дескрипторов аналитических представлений.

Обновлён composition root:

- `src/Subcontractor.Application/DependencyInjection.cs`
  - scoped registration для `AnalyticsKpiDashboardQueryService`;
  - scoped registration для `AnalyticsViewCatalogQueryService`;
  - `AnalyticsService` переведён на explicit factory composition через support-services.

Усилен DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Analytics/AnalyticsDependencyInjectionTests.cs`
  - добавлены проверки резолва `AnalyticsKpiDashboardQueryService` и `AnalyticsViewCatalogQueryService` в scope фасада.

Добавлены focused integration tests:

- `tests/Subcontractor.Tests.Integration/Analytics/AnalyticsKpiDashboardQueryServiceTests.cs`
  - empty-dataset KPI contract.
- `tests/Subcontractor.Tests.Integration/Analytics/AnalyticsViewCatalogQueryServiceTests.cs`
  - view-catalog contract.

### Зачем

- убрать монолитность `AnalyticsService` и закрепить границы аналитических query-path;
- сделать KPI/view-catalog логику independently testable;
- продолжить единый шаблон декомпозиции backend-фасадов.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Analytics" -p:UseAppHost=false` — green (`12/12`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`145/145`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`278/278`).
