# Refactoring Notes — Admin UI

Дата обновления: `2026-04-10`

## Цель

Пошагово уменьшить связность `admin-grid.js`, вынести повторно используемые части в отдельные модули и покрыть их unit-тестами.

## Выполнено (итерация 1)

Выделен отдельный модуль конфигурации DevExpress-гридов:

- `src/Subcontractor.Web/wwwroot/js/admin-grids.js`

Что вынесено из `admin-grid.js`:

- конфигурация `roles` grid;
- конфигурация `users` grid (включая popup-редактирование ролей);
- конфигурация `reference` grid;
- toolbar refresh handlers;
- data-error routing callbacks.

Обновления точки входа:

- `src/Subcontractor.Web/wwwroot/js/admin-grid.js` теперь использует `window.AdminGrids.createGrids(...)`;
- добавлена проверка доступности `AdminGrids` с диагностикой загрузки;
- `src/Subcontractor.Web/Views/Home/Admin.cshtml` обновлён порядком подключения скриптов:
  - `admin-helpers.js`
  - `admin-api.js`
  - `admin-grids.js`
  - `admin-grid.js`

Добавлены JS unit-тесты:

- `tests/js/admin-grids.test.js`

Покрытые проверки:

- валидация обязательных зависимостей (`jQueryImpl`, `stores`, `rolesDataSource`, callbacks);
- корректная сборка трёх гридов;
- обработчики `toolbar refresh`;
- обработчики `onDataErrorOccurred`;
- read-only правило для `itemCode` при редактировании существующей записи.

## Проверка после итерации 1

- `npm run test:js -- --runInBand`: green (`312/312`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green
  - SQL suite ожидаемо `Skipped` без `SUBCONTRACTOR_SQL_TESTS=1`.

## Выполнено (итерация 2)

Выделен data/runtime слой админ-модуля:

- `src/Subcontractor.Web/wwwroot/js/admin-runtime.js`

Что вынесено из `admin-grid.js`:

- кэши пользователей/ролей/справочника;
- серверные загрузчики (`roles/users/reference`);
- `CustomStore` для пользователей;
- `CustomStore` для справочника;
- status-messages для CRUD и загрузок.

Обновления wiring:

- `admin-grid.js` создаёт runtime через `window.AdminRuntime.createRuntime(...)`;
- в `Admin.cshtml` добавлено подключение:
  - `admin-runtime.js` перед `admin-grids.js` и `admin-grid.js`.

Добавлены JS unit-тесты:

- `tests/js/admin-runtime.test.js`

Покрытые проверки:

- валидация обязательных зависимостей runtime;
- корректная работа `loadRoles/loadUsers/loadReferenceItems`;
- side-effects `usersStore.update`;
- side-effects `referenceStore.insert/update/remove`;
- guard для пустого `referenceTypeCode`.

## Проверка после итерации 2

- `npm run test:js -- --runInBand`: green (`315/315`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`).

## Выполнено (итерация 3)

Выделены bootstrap/wiring слои админ-модуля:

- `src/Subcontractor.Web/wwwroot/js/admin-bootstrap.js`
- `src/Subcontractor.Web/wwwroot/js/admin-wiring.js`

Что вынесено из `admin-grid.js`:

- bootstrap-контекст (`DOM controls`, endpoints, runtime diagnostics);
- проверка обязательных module dependencies (`AdminHelpers/AdminApi/AdminRuntime/AdminGrids/AdminWiring`);
- event binding и пользовательские действия:
  - apply/reset user search;
  - apply reference type (`click`/`Enter`/`change`);
  - обновление ссылки `Открыть API`.

Результат:

- `admin-grid.js` стал thin composition entrypoint для `bootstrap + wiring + runtime + grids`.
- текущий размер entrypoint:
  - `243` строк → `151` строк.

Обновления подключения скриптов:

- `src/Subcontractor.Web/Views/Home/Admin.cshtml`:
  - добавлены `admin-wiring.js` и `admin-bootstrap.js` перед `admin-grid.js`.

Добавлены JS unit-тесты:

- `tests/js/admin-bootstrap.test.js`
- `tests/js/admin-wiring.test.js`

Покрытые проверки:

- bootstrap contracts (`document`, required controls, endpoints);
- диагностика missing dependencies и DevExpress runtime errors;
- wiring contracts (required controls/functions);
- state sync и событие-маршрутизация (`click`/`keydown Enter`/`change`);
- guard для невалидного `referenceTypeCode`.

## Проверка после итерации 3

- `npm run test:js -- --runInBand`: green (`323/323`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`).

## Выполнено (итерация 4)

Вынесен словарь статусных/диагностических сообщений:

- `src/Subcontractor.Web/wwwroot/js/admin-messages.js`

Что изменено:

- `admin-runtime.js` переведён на message-builders из `AdminMessages` вместо inline строк;
- `admin-grid.js` использует `AdminMessages` для:
  - loading статусов;
  - fallback ошибок (`users/reference operation error`);
  - bootstrap fallback error;
  - default invalid reference type message;
- `admin-bootstrap.js` теперь валидирует наличие `AdminMessages` как обязательной зависимости.

Дополнительно:

- `Admin.cshtml` обновлён порядком подключения:
  - `admin-messages.js` перед остальными admin-модулями.

Добавлены JS unit-тесты:

- `tests/js/admin-messages.test.js`

Покрытые проверки:

- консистентность всех текстов loading/error/status;
- корректная интерполяция параметризованных сообщений;
- регрессия на локализацию текстов после декомпозиции.

## Проверка после итерации 4

- `npm run test:js -- --runInBand`: green (`325/325`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`).

## Выполнено (итерация 5)

Добавлен browser smoke сценарий для админки:

- `tests/smoke/navigation-smoke.spec.js`

Что проверяет новый smoke:

- рендер `/Home/Admin` и основных блоков (`users/roles/reference`);
- `apply/reset` server-search контролов;
- обновление `Open API` ссылки при смене `reference type` и `activeOnly`.

Обновлена документация тест-стратегии:

- `docs/testing-strategy.md` (расширен фокус browser smoke и добавлен admin smoke сценарий).

## Проверка после итерации 5

- `node --check tests/smoke/navigation-smoke.spec.js`: green;
- `npx playwright test --list`: green (`8` smoke tests обнаружены, включая admin smoke).

## Выполнено (итерация 6)

Добавлен entrypoint contract suite для thin-композиции админки:

- `tests/js/admin-grid-entrypoint.test.js`

Что покрыто:

- graceful early-return при отсутствии `AdminBootstrap`;
- early-return при `createBootstrapContext() -> null`;
- wiring contracts между слоями:
  - bootstrap -> api/runtime/grids/wiring;
  - проброс endpoint/options;
  - порядок инициализации (`initialize -> loadRoles -> createGrids -> bindEvents -> refresh`);
- fallback поведение при ошибке bootstrap/runtime с обновлением всех status-блоков.

## Проверка после итерации 6

- `npm run test:js -- --runInBand`: green (`329/329`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`).

## Следующие шаги

1. Поддерживать admin smoke и entrypoint test в pre-release чеклисте как обязательный барьер.
2. При следующей волне правок оценить вынос admin endpoint/constants в отдельный config module.

## Выполнено (итерация 7)

Продолжена декомпозиция grid-factory слоя админки:

- `src/Subcontractor.Web/wwwroot/js/admin-grids.js` переведён в thin orchestrator;
- выделены submodules:
  - `src/Subcontractor.Web/wwwroot/js/admin-grids-roles.js`;
  - `src/Subcontractor.Web/wwwroot/js/admin-grids-users.js`;
  - `src/Subcontractor.Web/wwwroot/js/admin-grids-reference.js`.

Что вынесено из `admin-grids.js`:

- конфигурация и создание roles grid;
- конфигурация и создание users grid;
- конфигурация и создание reference grid.

Дополнительно:

- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Admin.cshtml`
  - submodule scripts подключены перед `admin-grids.js`;
- добавлен focused JS unit test suite:
  - `tests/js/admin-grids-modules.test.js`.

Покрытые сценарии:

- module-level контракты roles/users/reference grid factories;
- backward-compatible поведение существующего `admin-grids.test.js` через aggregator `AdminGrids.createGrids(...)`.

## Метрика после итерации 7

- `admin-grids.js`: `126` строк (было `361`, снижение на `235`);
- `admin-grids-roles.js`: `77` строк;
- `admin-grids-users.js`: `193` строки;
- `admin-grids-reference.js`: `153` строки;
- JS unit tests: `378/378` (было `375/375`).

## Проверка после итерации 7

- `npm run test:js`: green (`378/378`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`173/173`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`301/301`).
