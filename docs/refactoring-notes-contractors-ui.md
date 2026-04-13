# Contractors UI Refactoring Notes

## Цель

Снизить риски регрессий и стоимость изменений в `contractors-grid.js` за счёт поэтапного выноса слоёв в изолированные JS-модули с unit-тестами.

## Baseline

- Исходный размер `contractors-grid.js`: `756` строк.
- Текущий размер после итерации 9: `234` строки.
- Основной риск: смешение transport/UI/grid orchestration/форматирования в одном файле.

## Итерации

### Итерация 1 - helper layer

- Вынесены pure helpers в `contractors-grid-helpers.js`.
- Добавлен unit suite: `tests/js/contractors-grid-helpers.test.js`.

### Итерация 2 - API/transport layer

- Вынесен transport-контур в `contractors-api.js`.
- `contractors-grid.js` переведён на `apiClient` вместо локальных `request/parseError`.
- Добавлен unit suite: `tests/js/contractors-api.test.js`.
- В `Contractors.cshtml` добавлено подключение `~/js/contractors-api.js`.

### Итерация 3 - grid-factory layer

- Вынесены конфигурации dxDataGrid в `contractors-grids.js`.
- `contractors-grid.js` переведён на `ContractorsGrids.createGrids(...)`.
- Добавлен unit suite: `tests/js/contractors-grids.test.js`.
- В `Contractors.cshtml` добавлено подключение `~/js/contractors-grids.js`.

### Итерация 4 - bootstrap-context layer

- Вынесен bootstrap-контекст в `contractors-bootstrap.js`.
- В `contractors-grid.js` убран inline DOM/dependency resolve, подключён `createBootstrapContext()`.
- Добавлен unit suite: `tests/js/contractors-bootstrap.test.js`.
- В `Contractors.cshtml` добавлено подключение `~/js/contractors-bootstrap.js`.

### Итерация 5 - ui-state layer

- Вынесен UI-state orchestration в `contractors-ui-state.js`.
- `contractors-grid.js` переведён на `ContractorsUiState.createUiState(...)`.
- Добавлен unit suite: `tests/js/contractors-ui-state.test.js`.
- В `Contractors.cshtml` добавлено подключение `~/js/contractors-ui-state.js`.

### Итерация 6 - actions orchestration layer

- Вынесен action-flow страницы подрядчиков в `contractors-actions.js`.
- Из `contractors-grid.js` убраны inline handlers для:
  - refresh;
  - recalculate-all;
  - recalculate-selected;
  - reload/save rating model;
  - manual assessment save.
- Добавлен unit suite: `tests/js/contractors-actions.test.js`.
- В `Contractors.cshtml` добавлено подключение `~/js/contractors-actions.js`.

### Итерация 7 - data/selection/history layer

- Вынесен data runtime модуль в `contractors-data.js`.
- Из `contractors-grid.js` вынесены:
  - загрузка реестра подрядчиков;
  - загрузка истории рейтинга;
  - загрузка аналитики;
  - reselect после refresh;
  - selection/history orchestration.
- `contractors-bootstrap.js` расширен обязательной зависимостью `ContractorsData`.
- Добавлен unit suite: `tests/js/contractors-data.test.js`.
- В `Contractors.cshtml` добавлено подключение `~/js/contractors-data.js`.

## Метрика после итерации 7

- `contractors-grid.js`: `248` строк (было `389`, снижение ещё на `141`; суммарно `-508` от `756`).
- `contractors-data.js`: `139` строк.
- `contractors-actions.js`: `251` строк.
- JS unit tests: `266/266`.

## Проверка после итерации 7

- `npm run test:js`: green (`266/266`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (SQL suite ожидаемо `skip` без `SUBCONTRACTOR_SQL_TESTS=1`).

### Итерация 8 - smoke barrier для Contractors page

- Расширен browser smoke suite:
  - `tests/smoke/navigation-smoke.spec.js`;
- добавлены проверки:
  - навигация на `/Home/Contractors` через верхнее меню;
  - базовый рендер workspace (registry/history/analytics/actions);
  - сценарий выбора строки в реестре подрядчиков с проверкой включения действий.

## Проверка после итерации 8

- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`6/6`).

### Итерация 9 - rating-model service layer

- Вынесен model-flow в отдельный модуль:
  - `src/Subcontractor.Web/wwwroot/js/contractors-model.js`.
- Из `contractors-grid.js` вынесены:
  - `fillModelForm(...)`;
  - `buildModelPayload(...)`;
  - `loadModel(...)`.
- `contractors-bootstrap.js` расширен обязательной зависимостью `ContractorsModel`.
- Добавлен unit suite:
  - `tests/js/contractors-model.test.js`.
- Обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Contractors.cshtml`.

## Метрика после итерации 9

- `contractors-grid.js`: `234` строки (было `248`, снижение ещё на `14`; суммарно `-522` от `756`);
- `contractors-model.js`: `99` строк;
- `contractors-data.js`: `139` строк;
- `contractors-actions.js`: `251` строк;
- JS unit tests: `269/269`.

## Проверка после итерации 9

- `npm run test:js`: green (`269/269`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`6/6`).

### Итерация 10 - entrypoint composition contract

- Добавлен отдельный entrypoint-contract suite:
  - `tests/js/contractors-grid-entrypoint.test.js`.
- Покрытые ветки:
  - early-return при отсутствии `ContractorsBootstrap`;
  - композиция `bootstrap -> helpers/api/grids/data/model/ui-state/actions`;
  - инициализационный async-flow (`setUiBusy`, startup `Promise.all`, status updates);
  - маршрутизация `onContractorSelectionChanged` из grids в data-runtime.

## Проверка после итерации 10

- `npm run test:js -- --runInBand`: green (`353/353`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`).

### Итерация 11 - grids submodule decomposition

- `contractors-grids.js` переведён в thin orchestrator с module-resolver и контрактными guards.
- Вынесены submodules:
  - `src/Subcontractor.Web/wwwroot/js/contractors-grids-registry.js`;
  - `src/Subcontractor.Web/wwwroot/js/contractors-grids-history.js`;
  - `src/Subcontractor.Web/wwwroot/js/contractors-grids-analytics.js`.
- Обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Contractors.cshtml`
  - (submodules подключаются перед `contractors-grids.js`).
- Добавлены unit suites:
  - `tests/js/contractors-grids-registry.test.js`;
  - `tests/js/contractors-grids-history.test.js`;
  - `tests/js/contractors-grids-analytics.test.js`.

## Метрика после итерации 11

- `contractors-grid.js`: `234` строки (без изменений);
- `contractors-grids.js`: `107` строк (было `347`, снижение на `240`);
- `contractors-grids-registry.js`: `138` строк;
- `contractors-grids-history.js`: `141` строка;
- `contractors-grids-analytics.js`: `121` строка;
- JS unit tests: `483/483`.

## Проверка после итерации 11

- `npm run test:js`: green (`483/483`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`12/12`).

### Итерация 12 - actions submodule decomposition

- `contractors-actions.js` переведён в thin orchestrator с module-resolver и контрактными guards.
- Вынесены submodules:
  - `src/Subcontractor.Web/wwwroot/js/contractors-actions-rating.js`;
  - `src/Subcontractor.Web/wwwroot/js/contractors-actions-model.js`;
  - `src/Subcontractor.Web/wwwroot/js/contractors-actions-manual.js`.
- Обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Contractors.cshtml`
  - (submodules подключаются перед `contractors-actions.js`).
- Добавлены unit suites:
  - `tests/js/contractors-actions-rating.test.js`;
  - `tests/js/contractors-actions-model.test.js`;
  - `tests/js/contractors-actions-manual.test.js`.
- Актуализирован orchestrator suite:
  - `tests/js/contractors-actions.test.js`.

## Метрика после итерации 12

- `contractors-grid.js`: `234` строки (без изменений);
- `contractors-actions.js`: `178` строк (было `251`, снижение на `73`);
- `contractors-actions-rating.js`: `136` строк;
- `contractors-actions-model.js`: `89` строк;
- `contractors-actions-manual.js`: `108` строк;
- JS unit tests: `492/492`.

## Проверка после итерации 12

- `npm run test:js`: green (`492/492`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`12/12`).

## Следующие шаги

1. Перейти к следующему крупному UI-модулю второй волны (`imports-page-bootstrap.js` или `imports-page-lot-state.js`) и применить тот же шаблон submodule decomposition.
2. Поддерживать browser smoke в strict-режиме после каждой итерации.
