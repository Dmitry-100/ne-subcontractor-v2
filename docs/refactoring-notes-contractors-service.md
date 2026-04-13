# Refactoring Notes — Contractors Service

Дата обновления: `2026-04-11`

## Итерация 1 (bootstrap/wiring extraction в DI)

### Что сделано

`ContractorsService` переведён на explicit DI alias composition:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`;
- `ContractorsService` регистрируется как отдельный scoped facade;
- `IContractorsService` резолвится через alias к `ContractorsService`.

Добавлен integration-контракт:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorsDependencyInjectionTests.cs`.

Покрытые проверки:

- DI-резолв фасада работает, базовый вызов `ListAsync(...)` на пустой БД возвращает empty list;
- интерфейс и facade-алиас резолвятся как один и тот же scoped instance.

### Зачем

- унифицировать bootstrap-подход фасадов в `Application` слое;
- зафиксировать registration/alias контракт для `Contractors` отдельным regression-test;
- снизить риск silent-regressions при дальнейшей декомпозиции backend-модулей.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj` — green (`195/195`);
- `npm run test:js` — green (`363/363`).

## Итерация 2 (read/write split + policy extraction)

### Что сделано

`ContractorsService` переведён в thin-facade:

- `src/Subcontractor.Application/Contractors/ContractorsService.cs`
  - read-path делегируется в `ContractorReadQueryService`;
  - write/load-recalc path делегируется в `ContractorWriteWorkflowService`;
  - сохранён public fallback-конструктор `ContractorsService(IApplicationDbContext)` для совместимости текущих test/bootstrap путей;
  - добавлен internal constructor для explicit composition.

Добавлены extracted support-services и policy-модули:

- `src/Subcontractor.Application/Contractors/ContractorReadQueryService.cs`
- `src/Subcontractor.Application/Contractors/ContractorWriteWorkflowService.cs`
- `src/Subcontractor.Application/Contractors/ContractorRequestPolicy.cs`
- `src/Subcontractor.Application/Contractors/ContractorReadProjectionPolicy.cs`
- `src/Subcontractor.Application/Contractors/ContractorLoadCalculationPolicy.cs`

Обновлён composition root:

- `src/Subcontractor.Application/DependencyInjection.cs`
  - scoped registration для `ContractorReadQueryService`;
  - scoped registration для `ContractorWriteWorkflowService`;
  - `ContractorsService` переведён на explicit factory composition через read/write support-services.

Усилен DI integration-контракт:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorsDependencyInjectionTests.cs`
  - добавлены проверки резолва `ContractorReadQueryService` и `ContractorWriteWorkflowService` в scope фасада.

Добавлены focused integration tests:

- `tests/Subcontractor.Tests.Integration/Contractors/ContractorReadQueryServiceTests.cs`
  - unknown-id guard;
  - search filtering;
  - sorted discipline projection.
- `tests/Subcontractor.Tests.Integration/Contractors/ContractorWriteWorkflowServiceTests.cs`
  - create normalization/qualification dedup;
  - duplicate INN guard;
  - update unknown-id guard;
  - update qualification sync;
  - delete unknown + soft-delete persisted entity.

### Зачем

- сократить связность `ContractorsService` и упростить дальнейшие точечные изменения;
- закрепить read/write контракты отдельными integration-тестами;
- выровнять `Contractors` модуль по единому шаблону декомпозиции (`facade + support services + explicit DI composition`).

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Contractor" -p:UseAppHost=false` — green (`276/276`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`276/276`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`145/145`).
