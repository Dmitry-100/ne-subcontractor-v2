# Refactoring Notes — SLA UI (Wave 2)

Дата обновления: `2026-04-12`

## Итерация 1 (helpers + api extraction)

### Что сделано

Из монолитного `src/Subcontractor.Web/wwwroot/js/sla-page.js` выделены самостоятельные модули:

- `src/Subcontractor.Web/wwwroot/js/sla-page-helpers.js`
  - `localizeSeverity(...)`;
  - `formatDate(...)`;
  - `parseApiError(...)`;
  - `getErrorMessage(...)`;
  - `escapeHtml(...)`;
  - `cssEscape(...)`.
- `src/Subcontractor.Web/wwwroot/js/sla-page-api.js`
  - `createApiClient(...)` c методами:
    - `getRules`;
    - `saveRules`;
    - `getViolations`;
    - `runMonitoring`;
    - `saveViolationReason`.

`sla-page.js` переведён в thin orchestrator:

- UI state/render/events остались в entrypoint;
- HTTP и API-error parsing делегированы в `sla-page-api`;
- форматирование/локализация/escape делегированы в `sla-page-helpers`;
- добавлены явные guards на отсутствие helper/api скриптов с диагностическим статусом.

Подключение скриптов в view обновлено:

- `src/Subcontractor.Web/Views/Home/Sla.cshtml`
  - `~/js/sla-page-helpers.js`;
  - `~/js/sla-page-api.js`;
  - `~/js/sla-page.js`.

### Тесты

Добавлены JS unit suites:

- `tests/js/sla-page-helpers.test.js`;
- `tests/js/sla-page-api.test.js`.

Покрытые ветки:

- localize/format/error parsing helpers;
- html/css escaping и fallback behavior;
- SLA API contract (methods/urls/body/query flags/204 path/error path).

Добавлен browser smoke coverage:

- `tests/smoke/navigation-smoke.spec.js`
  - новый сценарий `sla page renders core widgets and supports violation refresh flow`.

### Проверка после итерации

- `node --check src/Subcontractor.Web/wwwroot/js/sla-page-helpers.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/sla-page-api.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/sla-page.js`: green;
- `npm run test:js`: green (`477/477`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`12/12`).

## Итерация 2 (rules + violations module extraction)

### Что сделано

Из `src/Subcontractor.Web/wwwroot/js/sla-page.js` дополнительно выделены модули:

- `src/Subcontractor.Web/wwwroot/js/sla-page-rules.js`
  - `createDraftRule(...)`;
  - `renderRulesMarkup(...)`;
  - `collectRulesFromRows(...)`.
- `src/Subcontractor.Web/wwwroot/js/sla-page-violations.js`
  - `renderViolationsMarkup(...)`;
  - `buildViolationReasonPayload(...)`.

`sla-page.js` обновлён:

- добавлены guards на наличие `SlaPageRules`/`SlaPageViolations`;
- рендер таблиц правил и нарушений делегирован в соответствующие модули;
- сбор `rules` payload из формы и payload причины нарушения делегирован в submodules.

Подключение скриптов обновлено:

- `src/Subcontractor.Web/Views/Home/Sla.cshtml`
  - добавлены `~/js/sla-page-rules.js` и `~/js/sla-page-violations.js` перед `~/js/sla-page.js`.

### Тесты

Добавлены JS unit suites:

- `tests/js/sla-page-rules.test.js`;
- `tests/js/sla-page-violations.test.js`.

Покрытые ветки:

- default rule draft contract;
- rules empty-state + escaped markup rendering;
- rules form rows -> payload normalization/filtering;
- violations empty-state + severity/status rendering;
- violation reason payload normalization (trim/null fallback).

### Метрика после итерации 2

- `sla-page.js`: `204` строки (было `262`, снижение на `58`);
- `sla-page-rules.js`: `73` строки;
- `sla-page-violations.js`: `60` строк;
- JS unit tests: `558/558`.

### Проверка после итерации 2

- `node --test tests/js/sla-page-rules.test.js tests/js/sla-page-violations.test.js tests/js/sla-page-helpers.test.js tests/js/sla-page-api.test.js`: green;
- `npm run test:js`: green (`558/558`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Итерация 3 (runtime extraction + thin entrypoint)

### Что сделано

`sla-page.js` переведён в thin entrypoint, а orchestration-логика вынесена в отдельный runtime:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/sla-page-runtime.js`;
- `src/Subcontractor.Web/wwwroot/js/sla-page.js` теперь отвечает за:
  - поиск `data-sla-module`;
  - status presenter;
  - загрузку runtime-модуля;
  - передачу module roots и запуск `initializeSlaPage(...)`.

Что вынесено из entrypoint:

- bootstrap/validation module-roots (`helpers/api/rules/violations`);
- UI controls binding;
- initial data loading (`rules + violations`);
- events orchestration:
  - add/save/reload rules;
  - run monitoring;
  - refresh violations;
  - save violation reason.

Подключение скриптов обновлено:

- `src/Subcontractor.Web/Views/Home/Sla.cshtml`
  - добавлен `~/js/sla-page-runtime.js` перед `~/js/sla-page.js`.

### Тесты

Добавлены JS unit suites:

- `tests/js/sla-page-runtime.test.js`;
- `tests/js/sla-page-entrypoint.test.js`.

Покрытые ветки:

- runtime required module-root guards;
- runtime composition contract (`helpers/api/rules/violations`, controls, fetch, statuses);
- runtime event handlers (add-rule/save-rules/run-monitoring);
- entrypoint early-return без module root;
- entrypoint runtime delegation;
- entrypoint error-status propagation при runtime exception.

### Метрика после итерации 3

- `sla-page.js`: `76` строк (было `204`, снижение на `128`);
- `sla-page-runtime.js`: `236` строк;
- `sla-page-rules.js`: `73` строки;
- `sla-page-violations.js`: `60` строк;
- JS unit tests: `563/563`.

### Проверка после итерации 3

- `node --test tests/js/sla-page-entrypoint.test.js tests/js/sla-page-runtime.test.js tests/js/sla-page-rules.test.js tests/js/sla-page-violations.test.js tests/js/sla-page-helpers.test.js tests/js/sla-page-api.test.js`: green;
- `npm run test:js`: green (`563/563`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).
