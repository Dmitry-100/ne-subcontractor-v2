# Refactoring Notes — Lots UI (Wave 2)

Дата обновления: `2026-04-09`

## Цель

Снизить риски регрессий и стоимость изменений в `lots-grid.js` за счёт поэтапного выноса pure/helpers и API-слоёв в отдельные тестируемые модули.

## Baseline

- Исходный размер `lots-grid.js`: `614` строк.
- До текущей итерации JS unit-тестов для Lots UI не было.

## Выполнено (итерация 1)

Добавлены новые модули:

- `src/Subcontractor.Web/wwwroot/js/lots-helpers.js`
- `src/Subcontractor.Web/wwwroot/js/lots-api.js`

Что вынесено из `lots-grid.js`:

- helper/pure logic:
  - локализация статусов;
  - next/previous status rules;
  - normalize GUID;
  - man-hours aggregation;
  - list-item mapping;
  - items payload mapping;
  - transition error parsing;
  - API error-body parsing.
- transport/API layer:
  - request wrapper (`credentials: include`, `Accept`/`Content-Type`, `204/empty`);
  - lot endpoints (`list/create/update/delete/details/history/transition`).

`lots-grid.js` переведён на зависимости `LotsHelpers` + `LotsApi` и теперь выступает как orchestration слой.

Обновлено подключение скриптов:

- `src/Subcontractor.Web/Views/Home/Lots.cshtml`

Порядок загрузки:

1. `lots-helpers.js`
2. `lots-api.js`
3. `lots-grid.js`

## Тесты

Добавлены focused JS unit suites:

- `tests/js/lots-helpers.test.js`
- `tests/js/lots-api.test.js`

Покрытые сценарии:

- parse/localization/normalization helpers;
- status transition rules;
- request contract и endpoint URL/method verification;
- error/204 branches API-клиента.

Также расширен browser smoke:

- `tests/smoke/navigation-smoke.spec.js`
  - добавлена навигационная проверка `/Home/Lots` в core navigation;
  - добавлен отдельный smoke-тест на базовый рендер Lots widgets.

## Метрика после итерации 1

- `lots-grid.js`: `492` строки (было `614`, снижение на `122`);
- `lots-helpers.js`: `136` строк;
- `lots-api.js`: `148` строк;
- JS unit tests: `279/279`.

## Проверка после итерации 1

- `npm run test:js`: green (`279/279`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (SQL suite ожидаемо `skip` без `SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`7/7`).

## Выполнено (итерация 2)

Добавлены новые модули:

- `src/Subcontractor.Web/wwwroot/js/lots-grids.js`
- `src/Subcontractor.Web/wwwroot/js/lots-bootstrap.js`

Что вынесено из `lots-grid.js`:

- bootstrap/context слой:
  - поиск `data-lots-module`;
  - resolve всех обязательных controls;
  - проверка `DevExpress` runtime;
  - проверка dependency-контрактов (`LotsHelpers`, `LotsApi`, `LotsGrids`);
  - унифицированная выдача ошибок инициализации в status-блок.
- grid-конфигурации:
  - history grid columns/layout;
  - lots registry grid columns/layout/editing/search/paging;
  - toolbar refresh wiring;
  - `onEditorPreparing` правило read-only для `code`.

`lots-grid.js` переведён на `LotsBootstrap.createBootstrapContext()` + `LotsGrids.createGrids(...)` и стал thin orchestration entrypoint.

Обновлено подключение скриптов:

- `src/Subcontractor.Web/Views/Home/Lots.cshtml`

Порядок загрузки (актуальный):

1. `lots-helpers.js`
2. `lots-api.js`
3. `lots-grids.js`
4. `lots-bootstrap.js`
5. `lots-grid.js`

## Тесты (итерация 2)

Добавлены focused JS unit suites:

- `tests/js/lots-grids.test.js`
- `tests/js/lots-bootstrap.test.js`

Покрытые сценарии:

- dependency validation для grid/bootstrap модулей;
- callbacks wiring (`selection`, `data-error`, toolbar refresh);
- bootstrap contract (`missing module root`, `DevExpress missing`, `missing module dependency`, `happy path`).

## Метрика после итерации 2

- `lots-grid.js`: `313` строк (было `492`, снижение ещё на `179`; суммарно `-301` от baseline `614`);
- `lots-grids.js`: `257` строк;
- `lots-bootstrap.js`: `137` строк;
- `lots-helpers.js`: `136` строк;
- `lots-api.js`: `148` строк;
- JS unit tests: `287/287`.

## Проверка после итерации 2

- `npm run test:js`: green (`287/287`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (SQL suite ожидаемо `skip` без `SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`7/7`).

## Выполнено (итерация 3)

Добавлен новый модуль:

- `src/Subcontractor.Web/wwwroot/js/lots-data.js`

Что вынесено из `lots-grid.js`:

- data/store-runtime слой:
  - `CustomStore` (`load/insert/update/remove`);
  - кэш реестра и кэш details;
  - orchestration `selection/history`;
  - helper-методы `refreshLotsAndReselect`, `getSelectedLot`, `loadHistory`.

Что обновлено в wiring:

- `src/Subcontractor.Web/wwwroot/js/lots-bootstrap.js`
  - добавлена обязательная зависимость `LotsData.createDataRuntime`.
- `src/Subcontractor.Web/Views/Home/Lots.cshtml`
  - в scripts-order добавлен `lots-data.js`.
- `src/Subcontractor.Web/wwwroot/js/lots-grid.js`
  - переведён на thin-entrypoint orchestration:
    - инициализация helpers/api/data/grids;
    - UI-caption/buttons/update;
    - transition actions.

## Тесты (итерация 3)

Добавлена focused JS unit suite:

- `tests/js/lots-data.test.js`

Покрытые сценарии:

- валидация dependency-контракта `createDataRuntime`;
- store lifecycle (`load/insert/update/remove`);
- reselect-flow после refresh;
- history fallback при `null` selection;
- history-load error callback.

Также обновлена existing suite:

- `tests/js/lots-bootstrap.test.js`
  - дополнен контракт обязательной зависимости `LotsData`.

## Метрика после итерации 3

- `lots-grid.js`: `215` строк (было `313`, снижение ещё на `98`; суммарно `-399` от baseline `614`);
- `lots-data.js`: `233` строки;
- `lots-grids.js`: `257` строк;
- `lots-bootstrap.js`: `142` строки;
- `lots-helpers.js`: `136` строк;
- `lots-api.js`: `148` строк;
- JS unit tests: `291/291`.

## Проверка после итерации 3

- `npm run test:js`: green (`291/291`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (SQL suite ожидаемо `skip` без `SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`7/7`).

## Выполнено (итерация 4)

Добавлен новый модуль:

- `src/Subcontractor.Web/wwwroot/js/lots-actions.js`

Что вынесено из `lots-grid.js`:

- action/workflow слой:
  - `runTransition`;
  - обработчики кнопок `next`, `rollback`, `history-refresh`;
  - `bindEvents` wiring.

Что обновлено в wiring:

- `src/Subcontractor.Web/wwwroot/js/lots-bootstrap.js`
  - добавлена обязательная зависимость `LotsActions.createActions`.
- `src/Subcontractor.Web/Views/Home/Lots.cshtml`
  - в scripts-order добавлен `lots-actions.js`.
- `src/Subcontractor.Web/wwwroot/js/lots-grid.js`
  - переведён на orchestration bootstrap + data/grids/actions composition.

Актуальный порядок загрузки скриптов в `Lots.cshtml`:

1. `lots-helpers.js`
2. `lots-api.js`
3. `lots-grids.js`
4. `lots-data.js`
5. `lots-actions.js`
6. `lots-bootstrap.js`
7. `lots-grid.js`

## Тесты (итерация 4)

Добавлена focused JS unit suite:

- `tests/js/lots-actions.test.js`

Покрытые сценарии:

- dependency validation для `LotsActions`;
- transition flow (успешный переход + refresh/history);
- rollback reason validation;
- history refresh error handling.

Также обновлена existing suite:

- `tests/js/lots-bootstrap.test.js`
  - дополнен контракт обязательной зависимости `LotsActions`.

## Метрика после итерации 4

- `lots-grid.js`: `162` строки (было `215`, снижение ещё на `53`; суммарно `-452` от baseline `614`);
- `lots-actions.js`: `149` строк;
- `lots-data.js`: `233` строки;
- `lots-grids.js`: `257` строк;
- `lots-bootstrap.js`: `147` строк;
- `lots-helpers.js`: `136` строк;
- `lots-api.js`: `148` строк;
- JS unit tests: `295/295`.

## Проверка после итерации 4

- `npm run test:js`: green (`295/295`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (SQL suite ожидаемо `skip` без `SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`7/7`).

## Выполнено (итерация 5)

Добавлен новый модуль:

- `src/Subcontractor.Web/wwwroot/js/lots-ui-state.js`

Что вынесено из `lots-grid.js`:

- UI-state слой:
  - `setStatus`;
  - `setTransitionStatus`;
  - selection caption render;
  - action-buttons availability update.

Что обновлено в wiring:

- `src/Subcontractor.Web/wwwroot/js/lots-bootstrap.js`
  - добавлена обязательная зависимость `LotsUiState.createUiState`.
- `src/Subcontractor.Web/Views/Home/Lots.cshtml`
  - в scripts-order добавлен `lots-ui-state.js`.
- `src/Subcontractor.Web/wwwroot/js/lots-grid.js`
  - оставлен как composition entrypoint (`helpers + api + ui-state + data + grids + actions`).

Актуальный порядок загрузки скриптов в `Lots.cshtml`:

1. `lots-helpers.js`
2. `lots-api.js`
3. `lots-grids.js`
4. `lots-data.js`
5. `lots-actions.js`
6. `lots-ui-state.js`
7. `lots-bootstrap.js`
8. `lots-grid.js`

## Тесты (итерация 5)

Добавлена focused JS unit suite:

- `tests/js/lots-ui-state.test.js`

Покрытые сценарии:

- dependency validation для `LotsUiState`;
- `setStatus`/`setTransitionStatus` class toggle;
- `updateSelection(null)` branch;
- `updateSelection(selected)` branch и state кнопок.

Также обновлена existing suite:

- `tests/js/lots-bootstrap.test.js`
  - дополнен контракт обязательной зависимости `LotsUiState`.

## Метрика после итерации 5

- `lots-grid.js`: `143` строки (было `162`, снижение ещё на `19`; суммарно `-471` от baseline `614`);
- `lots-ui-state.js`: `100` строк;
- `lots-actions.js`: `149` строк;
- `lots-data.js`: `233` строки;
- `lots-grids.js`: `257` строк;
- `lots-bootstrap.js`: `152` строки;
- `lots-helpers.js`: `136` строк;
- `lots-api.js`: `148` строк;
- JS unit tests: `299/299`.

## Проверка после итерации 5

- `npm run test:js`: green (`299/299`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (SQL suite ожидаемо `skip` без `SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`7/7`).

## Выполнено (итерация 6)

Добавлена focused JS unit suite:

- `tests/js/lots-grid.test.js`

Покрытые сценарии:

- early-return при отсутствии `LotsBootstrap`;
- bootstrap composition contract:
  - `createHelpers` wiring;
  - `createDataRuntime/createStore` wiring;
  - `createGrids` callbacks wiring;
  - `createActions` + `bindEvents` wiring;
  - startup-call `applySelection(null)`.

## Метрика после итерации 6

- JS unit tests: `301/301`;
- Lots UI набор теперь покрывает все основные слои:
  - `lots-helpers`, `lots-api`, `lots-grids`, `lots-bootstrap`,
  - `lots-data`, `lots-actions`, `lots-ui-state`,
  - `lots-grid` entrypoint contract.

## Проверка после итерации 6

- `npm run test:js`: green (`301/301`).

## Выполнено (итерация 7)

Продолжена декомпозиция `lots-grids` слоя:

- `src/Subcontractor.Web/wwwroot/js/lots-grids.js` переведён в thin orchestrator с module-resolver;
- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/lots-grids-history.js`;
  - `src/Subcontractor.Web/wwwroot/js/lots-grids-registry.js`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Lots.cshtml`
  - (новые submodules подключаются перед `lots-grids.js`).

Что вынесено:

- history-grid config (`status transition journal`) в `lots-grids-history` module;
- registry-grid config (`Lots CRUD`, toolbar refresh, selection/data-error callbacks) в `lots-grids-registry` module.

Добавлены focused JS unit tests:

- `tests/js/lots-grids-history.test.js`;
- `tests/js/lots-grids-registry.test.js`.

Дополнительно:

- `tests/js/lots-grids.test.js` сохранён как integration-contract suite для итогового orchestrator API.

Актуальный порядок загрузки скриптов в `Lots.cshtml`:

1. `lots-helpers.js`
2. `lots-api.js`
3. `lots-grids-history.js`
4. `lots-grids-registry.js`
5. `lots-grids.js`
6. `lots-data.js`
7. `lots-actions.js`
8. `lots-ui-state.js`
9. `lots-bootstrap.js`
10. `lots-grid.js`

## Метрика после итерации 7

- `lots-grids.js`: `118` строк (было `257`, снижение на `139`);
- `lots-grids-history.js`: `83` строки;
- `lots-grids-registry.js`: `196` строк;
- JS unit tests (общий suite): `573/573`.

## Проверка после итерации 7

- `node --test tests/js/lots-grids-history.test.js tests/js/lots-grids-registry.test.js tests/js/lots-grids.test.js`: green (`6/6`);
- `npm run test:js`: green (`573/573`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 8)

Продолжена декомпозиция `lots-data` слоя:

- `src/Subcontractor.Web/wwwroot/js/lots-data.js` переведён в thin orchestrator с module-resolver;
- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/lots-data-core.js`;
  - `src/Subcontractor.Web/wwwroot/js/lots-data-store.js`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Lots.cshtml`
  - (новые submodules подключаются перед `lots-data.js`).

Что вынесено:

- cache/selection/history/runtime-операции в `lots-data-core` module;
- `CustomStore` CRUD orchestration (`load/insert/update/remove`) в `lots-data-store` module.

Добавлены focused JS unit tests:

- `tests/js/lots-data-core.test.js`;
- `tests/js/lots-data-store.test.js`.

Дополнительно:

- `tests/js/lots-data.test.js` сохранён как integration-contract suite для итогового orchestrator API.

Актуальный порядок загрузки скриптов в `Lots.cshtml`:

1. `lots-helpers.js`
2. `lots-api.js`
3. `lots-grids-history.js`
4. `lots-grids-registry.js`
5. `lots-grids.js`
6. `lots-data-core.js`
7. `lots-data-store.js`
8. `lots-data.js`
9. `lots-actions.js`
10. `lots-ui-state.js`
11. `lots-bootstrap.js`
12. `lots-grid.js`

## Метрика после итерации 8

- `lots-data.js`: `109` строк (было `233`, снижение на `124`);
- `lots-data-core.js`: `182` строки;
- `lots-data-store.js`: `132` строки;
- JS unit tests (общий suite): `578/578`.

## Проверка после итерации 8

- `node --test tests/js/lots-data-core.test.js tests/js/lots-data-store.test.js tests/js/lots-data.test.js`: green (`9/9`);
- `npm run test:js`: green (`578/578`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 9)

Продолжена декомпозиция entrypoint-слоя страницы лотов:

- добавлен runtime-модуль:
  - `src/Subcontractor.Web/wwwroot/js/lots-grid-runtime.js`;
- `src/Subcontractor.Web/wwwroot/js/lots-grid.js` переведён в thin entrypoint:
  - bootstrap context resolution;
  - runtime module loading/check;
  - делегирование в `initializeLotsGrid(...)`.

Что вынесено из `lots-grid.js`:

- composition orchestration:
  - helpers/api/data/grids/actions wiring;
  - callbacks routing (`selection`, `data-error`);
  - startup path `applySelection(null)`.

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Lots.cshtml`
  - добавлен `lots-grid-runtime.js` перед `lots-grid.js`.
- добавлен focused JS unit test suite:
  - `tests/js/lots-grid-runtime.test.js`.
- обновлён existing suite:
  - `tests/js/lots-grid.test.js` закрепляет entrypoint delegation-контракт.

Актуальный порядок загрузки скриптов в `Lots.cshtml`:

1. `lots-helpers.js`
2. `lots-api.js`
3. `lots-grids-history.js`
4. `lots-grids-registry.js`
5. `lots-grids.js`
6. `lots-data-core.js`
7. `lots-data-store.js`
8. `lots-data.js`
9. `lots-actions.js`
10. `lots-ui-state.js`
11. `lots-bootstrap.js`
12. `lots-grid-runtime.js`
13. `lots-grid.js`

## Метрика после итерации 9

- `lots-grid.js`: `48` строк (было `143`, снижение на `95`);
- `lots-grid-runtime.js`: `187` строк;
- JS unit tests (общий suite): `580/580`.

## Проверка после итерации 9

- `node --test tests/js/lots-grid.test.js tests/js/lots-grid-runtime.test.js`: green (`4/4`);
- `npm run test:js`: green (`580/580`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Следующий шаг (план)

1. Переключиться на следующий наиболее монолитный UI-модуль second-wave и повторить шаблон extraction + contract tests.
2. Для Lots UI оставить только support-fixes при регрессиях и бизнес-изменениях.
