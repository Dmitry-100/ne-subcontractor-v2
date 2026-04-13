# Refactoring Notes — Projects UI

Дата обновления: `2026-04-10`

## Цель

Убрать монолитную связность `projects-grid.js`, выделить повторно используемые слои и добавить тестовый quality-barrier по шаблону других UI-модулей.

## Выполнено (итерация 1)

Выполнена bootstrap/runtime-декомпозиция `Projects UI` с сохранением текущего поведения.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/projects-helpers.js`
- `src/Subcontractor.Web/wwwroot/js/projects-api.js`
- `src/Subcontractor.Web/wwwroot/js/projects-runtime.js`
- `src/Subcontractor.Web/wwwroot/js/projects-grids.js`
- `src/Subcontractor.Web/wwwroot/js/projects-bootstrap.js`

Изменена точка входа:

- `src/Subcontractor.Web/wwwroot/js/projects-grid.js`
  - переведён в thin entrypoint-композицию:
    - bootstrap context;
    - helpers/api/runtime сборка;
    - grid initialization;
    - fallback status при ошибках инициализации.

Обновлён порядок подключения скриптов:

- `src/Subcontractor.Web/Views/Home/Projects.cshtml`
  - `projects-helpers.js`
  - `projects-api.js`
  - `projects-runtime.js`
  - `projects-grids.js`
  - `projects-bootstrap.js`
  - `projects-grid.js`

## Добавленные тесты

Node unit tests:

- `tests/js/projects-helpers.test.js`
- `tests/js/projects-api.test.js`
- `tests/js/projects-runtime.test.js`
- `tests/js/projects-grids.test.js`
- `tests/js/projects-bootstrap.test.js`
- `tests/js/projects-grid-entrypoint.test.js`

Browser smoke:

- `tests/smoke/navigation-smoke.spec.js`
  - добавлен navigation-check страницы `/Home/Projects`;
  - добавлен отдельный smoke-сценарий рендера core widgets для Projects.

## Метрика после итерации 1

- `projects-grid.js`: `274` -> `62` строки;
- JS unit tests: `329` -> `351`;
- browser smoke scenarios: `8` -> `9`.

## Проверка после итерации 1

- `npm run test:js -- --runInBand`: green (`351/351`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`);
- `npx playwright test --list`: green (`9` smoke tests обнаружены).

## Следующие шаги

1. При необходимости добавить focused Projects smoke на CRUD-path (create/update/delete) с pre-seeded test data.
2. Если появится поиск/фильтрация на странице Projects, вынести UI-wiring в отдельный `projects-wiring.js`.
