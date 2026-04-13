# Refactoring Notes — Projects Service

Дата обновления: `2026-04-11`

## Итерация 1 (bootstrap/wiring extraction в DI)

### Что сделано

`ProjectsService` переведён на explicit DI alias composition:

- обновлён `src/Subcontractor.Application/DependencyInjection.cs`;
- `ProjectsService` регистрируется как отдельный scoped facade;
- `IProjectsService` резолвится через alias к `ProjectsService`.

Добавлен integration-контракт:

- `tests/Subcontractor.Tests.Integration/Projects/ProjectsDependencyInjectionTests.cs`.

Покрытые проверки:

- DI-резолв фасада работает, `ListAsync(...)` на пустой БД возвращает empty list;
- интерфейс и facade-алиас резолвятся как один и тот же scoped instance.

### Зачем

- унифицировать composition root для сервисов `Projects/Contracts/Procurement/Imports/SLA`;
- закрепить registration/alias контракт для проекта отдельным regression-тестом;
- снизить риск тихих поломок при изменениях в `Application` DI bootstrap.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`112/112`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`199/199`);
- `npm run test:js` — green (`363/363`).

## Итерация 2 (projects service decomposition + scope/read/write extraction)

### Что сделано

`ProjectsService` переведён в thin facade с делегированием в support-сервисы:

- `ProjectScopeResolverService` (определение access scope по текущему пользователю/ролям);
- `ProjectReadQueryService` (read/query контур: list/get с учётом scope);
- `ProjectWriteWorkflowService` (create/update/delete + policy/guard контур).

Добавлены/выделены policy-модули:

- `ProjectRequestPolicy` (валидация/normalization create/update);
- `ProjectReadScopePolicy` (filter access scope).

Обновлён DI bootstrap в `src/Subcontractor.Application/DependencyInjection.cs`:

- scoped registrations для `ProjectScopeResolverService`, `ProjectReadQueryService`, `ProjectWriteWorkflowService`;
- explicit factory composition для `ProjectsService`.

Обновлён integration DI-контракт:

- `tests/Subcontractor.Tests.Integration/Projects/ProjectsDependencyInjectionTests.cs`
  - проверка резолва новых support-services в scope фасада.

Добавлены focused tests:

- unit: `tests/Subcontractor.Tests.Unit/Projects/ProjectPoliciesTests.cs`;
- integration:
  - `tests/Subcontractor.Tests.Integration/Projects/ProjectScopeResolverServiceTests.cs`;
  - `tests/Subcontractor.Tests.Integration/Projects/ProjectReadQueryServiceTests.cs`;
  - `tests/Subcontractor.Tests.Integration/Projects/ProjectWriteWorkflowServiceTests.cs`.

### Зачем

- снизить связанность фасада `Projects` и упростить точечные изменения без каскадных регрессий;
- изолировать правила доступа и правила модификации в отдельные тестируемые слои;
- закрепить DI wiring-контракт extraction-модели для дальнейшего bootstrap hardening.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~ProjectPoliciesTests" -p:UseAppHost=false` — green (`5/5`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~Project" -p:UseAppHost=false` — green (`21/21`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`150/150`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`287/287`).
