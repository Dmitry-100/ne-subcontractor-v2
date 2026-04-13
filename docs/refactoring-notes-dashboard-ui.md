# Refactoring Notes — Dashboard UI

Дата обновления: `2026-04-12`

## Итерация 1 (helpers extraction)

### Что сделано

Из `src/Subcontractor.Web/wwwroot/js/dashboard-page.js` вынесен pure helper-слой:

- добавлен модуль `src/Subcontractor.Web/wwwroot/js/dashboard-page-helpers.js`;
- в helper-модуле сосредоточены:
  - `parseErrorBody(...)`;
  - `formatPercent(...)`;
  - `formatMoney(...)`;
  - `formatDate(...)`;
  - `localizeStatus(...)`;
  - `localizePriority(...)`;
  - `getLotCountByStatus(...)`.

`dashboard-page.js` переведён на helper delegation:

- request error parsing;
- форматирование KPI/аналитики/задач;
- локализация статусов/приоритетов;
- lot-funnel status counters.

Подключение скриптов в dashboard view обновлено:

- `src/Subcontractor.Web/Views/Home/Index.cshtml`
  - helper подключается перед entrypoint скриптом:
    - `~/js/dashboard-page-helpers.js`
    - `~/js/dashboard-page.js`

### Тесты

Добавлен отдельный JS suite:

- `tests/js/dashboard-page-helpers.test.js`

Покрытые ветки:

- приоритизация `detail/error/title` в ошибках API;
- percent/money/date formatting;
- status/priority localization;
- lot-funnel status counter lookup.

### Проверка после итерации

- `npm run test:js` — green (`366/366`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`173/173`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`301/301`).

## Итерация 2 (formatters extraction)

### Что сделано

Из `src/Subcontractor.Web/wwwroot/js/dashboard-page.js` вынесен formatter-слой:

- добавлен модуль `src/Subcontractor.Web/wwwroot/js/dashboard-page-formatters.js`;
- в модуле сосредоточены:
  - `toFiniteNumber(...)`;
  - `clampPercent(...)`;
  - `formatCompactPercent(...)`;
  - `formatCompactMoney(...)`.

`dashboard-page.js` переведён на formatter delegation:

- нормализация numeric-значений;
- clamp процентов;
- compact-format для процентов и денежных сумм в аналитических блоках.

### Тесты

Добавлен отдельный JS suite:

- `tests/js/dashboard-page-formatters.test.js`.

Покрытые ветки:

- parsing/normalization numeric input;
- `clamp`-граничные значения;
- compact `%` и money formatting.

## Итерация 3 (bootstrap + disclosure wiring extraction)

### Что сделано

Из `src/Subcontractor.Web/wwwroot/js/dashboard-page.js` вынесен bootstrap/disclosure слой:

- добавлен модуль `src/Subcontractor.Web/wwwroot/js/dashboard-page-bootstrap.js`;
- в bootstrap-модуле сосредоточены:
  - `createBootstrapContext(...)` (module root, required controls, helpers/formatters wiring guards);
  - `initializeDisclosureHints(...)` (синхронизация `развернуть/свернуть` на `toggle`).

`dashboard-page.js` переведён на bootstrap delegation:

- entrypoint инициализируется только через `DashboardPageBootstrap`;
- проверка зависимостей helper/formatter делается до старта основной логики;
- disclosure-hints инициализируются через общий bootstrap API.

Подключение скриптов в dashboard view обновлено:

- `src/Subcontractor.Web/Views/Home/Index.cshtml`
  - helper/formatter/bootstrap подключаются перед entrypoint:
    - `~/js/dashboard-page-helpers.js`
    - `~/js/dashboard-page-formatters.js`
    - `~/js/dashboard-page-bootstrap.js`
    - `~/js/dashboard-page.js`

### Тесты

Добавлен отдельный JS suite:

- `tests/js/dashboard-page-bootstrap.test.js`.

Покрытые ветки:

- guard на отсутствующий `document`;
- module root/required controls guards;
- helper/formatter dependency guards + статус-ошибки;
- endpoint/control/module root resolve contract;
- `развернуть/свернуть` hint sync при `toggle`.

### Проверка после итераций 2-3

- `dotnet build Subcontractor.sln` — green;
- `npm run test:js` — green (`389/389`);
- `npm run test:smoke` — green (`10/10`).

## Итерация 4 (renderers extraction)

### Что сделано

Из `src/Subcontractor.Web/wwwroot/js/dashboard-page.js` вынесен renderer/apply слой:

- добавлен модуль `src/Subcontractor.Web/wwwroot/js/dashboard-page-renderers.js`;
- в модуле сосредоточены:
  - `setStatus(...)`, `setAnalyticsStatus(...)`;
  - `renderStatusList(...)`, `renderTasks(...)`, `renderTopContractors(...)`;
  - `applySummary(...)`, `applyAnalytics(...)`;
  - `applyOverdueInfographics(...)`, `applyKpiInfographics(...)`.

`dashboard-page.js` переведён в thin orchestrator:

- bootstrap/init и API-request orchestration остались в entrypoint;
- projection/rendering логика summary/analytics/import/tasks делегирована в renderer module;
- сохранён backward-compatible контракт по CSS-классам задач (`dashboard-task__link`) и по данным (`tasks` + `myTasks` fallback).

Подключение скриптов в dashboard view обновлено:

- `src/Subcontractor.Web/Views/Home/Index.cshtml`
  - renderer подключается перед entrypoint:
    - `~/js/dashboard-page-renderers.js`
    - `~/js/dashboard-page.js`

### Тесты

Добавлен отдельный JS suite:

- `tests/js/dashboard-page-renderers.test.js`.

Покрытые ветки:

- dependency guards для renderer factory;
- status/analytics status toggling;
- `applySummary` projection (counters/statuses/tasks/import/KPI/overdue);
- `applyAnalytics` projection (highlights/bars/top contractors).

### Проверка после итерации 4

- `dotnet build Subcontractor.sln` — green;
- `npm run test:js` — green (`393/393`);
- `npm run test:smoke` — green (`11/11`).

## Итерация 5 (renderers core/infographics extraction)

### Что сделано

Продолжена декомпозиция renderer-слоя dashboard:

- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/dashboard-page-renderers-core.js`;
  - `src/Subcontractor.Web/wwwroot/js/dashboard-page-renderers-infographics.js`;
- `src/Subcontractor.Web/wwwroot/js/dashboard-page-renderers.js` переведён в thin orchestrator поверх `core/infographics`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Index.cshtml`
  - теперь `core` и `infographics` подключаются до `dashboard-page-renderers.js`.

Что вынесено:

- из renderers-модуля в `core`:
  - status/analytics-status setters;
  - status-list/tasks/top-contractors rendering;
  - summary/import/analytics projection;
- в `infographics`:
  - overdue/kpi infographic apply-logic;
  - progress/ring style synchronization.

### Тесты

Добавлены отдельные JS suites:

- `tests/js/dashboard-page-renderers-core.test.js`;
- `tests/js/dashboard-page-renderers-infographics.test.js`.

Покрытые ветки:

- dependency guards для обоих submodules;
- non-empty/empty projection paths для summary/analytics;
- infographic style/value sync для KPI/overdue.

### Проверка после итерации 5

- `dotnet build Subcontractor.sln` — green;
- `npm run test:js` — green (`471/471`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke` — green (`11/11`).

## Итерация 6 (runtime extraction + thin entrypoint)

### Что сделано

Продолжена декомпозиция dashboard entrypoint-слоя:

- добавлен runtime-модуль:
  - `src/Subcontractor.Web/wwwroot/js/dashboard-page-runtime.js`;
- `src/Subcontractor.Web/wwwroot/js/dashboard-page.js` переведён в thin entrypoint:
  - bootstrap context resolution;
  - runtime module loading/check;
  - делегирование в `initializeDashboardPage(...)`.

Что вынесено из `dashboard-page.js`:

- selectors/wiring блоки для counters/overdue/kpi/import/analytics полей;
- network request flow (`summary + analytics`);
- refresh-button event wiring;
- bootstrap disclosure init + initial load startup.

Подключение скриптов в dashboard view обновлено:

- `src/Subcontractor.Web/Views/Home/Index.cshtml`
  - добавлен `~/js/dashboard-page-runtime.js` перед `~/js/dashboard-page.js`.

### Тесты

Добавлены отдельные JS suites:

- `tests/js/dashboard-page-entrypoint.test.js`;
- `tests/js/dashboard-page-runtime.test.js`.

Покрытые ветки:

- entrypoint early-return при отсутствии bootstrap;
- delegation-контракт `bootstrap -> runtime`;
- runtime guards (`window/document/context`);
- runtime renderer-missing fallback status;
- runtime happy-path (`summary + analytics + refresh + disclosure wiring`).

### Метрика после итерации 6

- `dashboard-page.js`: `59` строк (было `243`, снижение на `184`);
- `dashboard-page-runtime.js`: `283` строки;
- JS unit tests: `585/585`.

### Проверка после итерации 6

- `node --test tests/js/dashboard-page-entrypoint.test.js tests/js/dashboard-page-runtime.test.js tests/js/dashboard-page-bootstrap.test.js tests/js/dashboard-page-renderers.test.js`: green (`16/16`);
- `npm run test:js`: green (`585/585`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Итерация 7 (runtime field collectors extraction)

### Что сделано

Продолжена декомпозиция dashboard runtime-слоя:

- добавлен submodule:
  - `src/Subcontractor.Web/wwwroot/js/dashboard-page-runtime-field-collectors.js`;
- `src/Subcontractor.Web/wwwroot/js/dashboard-page-runtime.js` переведён на thin orchestration поверх `field collectors`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Index.cshtml`
  - добавлен `~/js/dashboard-page-runtime-field-collectors.js` перед `~/js/dashboard-page-runtime.js`.

Что вынесено из `dashboard-page-runtime.js`:

- selectors map для counters/overdue/kpi/import/analytics;
- базовая агрегация `controls + querySelector fields`;
- словарь `statusCaptions` для helper layer.

### Тесты

Добавлены отдельные JS suites:

- `tests/js/dashboard-page-runtime-field-collectors.test.js`;
- `tests/js/dashboard-script-order.test.js`.

Покрытые ветки:

- dependency guards field-collector модуля;
- contract map по основным selector groups и `statusCaptions`;
- guard на script-order (`renderers -> field-collectors -> runtime -> entrypoint`) в dashboard view.

### Метрика после итерации 7

- `dashboard-page-runtime.js`: `191` строка (было `283`, снижение на `92`);
- `dashboard-page-runtime-field-collectors.js`: `163` строки;
- `dashboard-page-runtime-field-collectors.test.js`: `61` строка;
- `dashboard-script-order.test.js`: `38` строк;
- JS unit tests: `602/602` (было `599/599`).

### Проверка после итерации 7

- `node --test tests/js/dashboard-page-runtime-field-collectors.test.js tests/js/dashboard-script-order.test.js tests/js/dashboard-page-runtime.test.js tests/js/dashboard-page-entrypoint.test.js`: green (`8/8`);
- `npm run test:js`: green (`602/602`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).
