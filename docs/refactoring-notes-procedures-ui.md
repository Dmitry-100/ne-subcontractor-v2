# Refactoring Notes — Procedures UI

Дата обновления: `2026-04-09`

## Цель

Пошагово декомпозировать `procedures-grid.js` без изменения пользовательского поведения и с сохранением regression-barrier.

## Выполнено (итерация 1)

Выделен helper-модуль для pure-логики страницы процедур:

- `src/Subcontractor.Web/wwwroot/js/procedures-grid-helpers.js`

Что вынесено из `procedures-grid.js`:

- URL filter helpers:
  - `buildStatusFilter`;
  - `readUrlFilterState`;
  - `describeUrlFilters`;
  - `appendFilterHint`;
  - `buildUrlWithoutFilters`;
- localization helpers:
  - `localizeStatus`;
  - `localizeContractorStatus`;
  - `localizeReliabilityClass`;
  - `localizeBoolean`;
- shortlist rules:
  - `supportsShortlistWorkspace`;
  - `normalizeMaxIncluded`;
  - `normalizeAdjustmentReason`.

`procedures-grid.js` переведён на `ProceduresGridHelpers` через thin-wrapper вызовы.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Procedures.cshtml`

Порядок загрузки (актуальный):

1. `procedures-grid-helpers.js`
2. `procedures-grid.js`

Добавлены focused JS unit tests:

- `tests/js/procedures-grid-helpers.test.js`

Покрытые сценарии:

- URL search parsing (`status` + `search`) с нормализацией/дедупликацией статусов;
- user-facing filter hint formatting;
- URL cleanup для action `Сбросить URL-фильтры`;
- localization helpers + fallback ветки;
- shortlist guard/normalization rules.

## Метрика после итерации 1

- `procedures-grid.js`: `1343` строки (было `1414`, снижение на `71`);
- `procedures-grid-helpers.js`: `157` строк;
- JS unit tests: `104/104`.

## Проверка после итерации 1

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid-helpers.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`104/104`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green.

## Выполнено (итерация 2)

Продолжена декомпозиция payload normalization слоя `procedures-grid.js` в `procedures-grid-helpers.js`.

Дополнительно вынесено:

- payload/building helpers:
  - `normalizeGuid`;
  - `isGuid`;
  - `toIsoDate`;
  - `toNullableNumber`;
  - `normalizeRequiredString`;
  - `normalizeNullableString`;
  - `normalizeApprovalMode`;
  - `pickValue`.

`procedures-grid.js` переведён на эти helper-функции через thin-wrapper вызовы.

Расширены unit tests:

- `tests/js/procedures-grid-helpers.test.js`

Новые покрытые сценарии:

- GUID/date/number normalization ветки;
- required/nullable string normalization;
- approval-mode fallback;
- `pickValue` для объектов и `null`.

## Метрика после итерации 2

- `procedures-grid.js`: `1314` строк (было `1343`, снижение ещё на `29`; суммарно `-100` от `1414`);
- `procedures-grid-helpers.js`: `232` строки;
- JS unit tests: `105/105`.

## Проверка после итерации 2

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid-helpers.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`105/105`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green.

## Выполнено (итерация 3)

Продолжена декомпозиция payload build-layer:

- в `procedures-grid-helpers.js` вынесены:
  - `createPayload`;
  - `updatePayload`;
- `procedures-grid.js` переведён на вызовы этих helper-функций;
- локальные дублирующие normalization wrappers (`normalizeGuid/isGuid/toIsoDate/...`) удалены из `procedures-grid.js`.

Расширены unit tests:

- `tests/js/procedures-grid-helpers.test.js`

Новые покрытые сценарии:

- `createPayload`:
  - GUID validation;
  - required fields validation;
  - нормализация payload и defaults;
- `updatePayload`:
  - merge `details` + partial `values`;
  - нормализация чисел/строк;
  - сохранение `attachmentFileIds` из `details.attachments`.

## Метрика после итерации 3

- `procedures-grid.js`: `1179` строк (было `1314`, снижение ещё на `135`; суммарно `-235` от `1414`);
- `procedures-grid-helpers.js`: `361` строка;
- JS unit tests: `107/107`.

## Проверка после итерации 3

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid-helpers.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`107/107`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green.

## Выполнено (итерация 4)

Продолжена декомпозиция transport/API-слоя страницы процедур:

- добавлен отдельный API-клиент:
  - `src/Subcontractor.Web/wwwroot/js/procedures-api.js`;
- `procedures-grid.js` переведён на вызовы `apiClient` и больше не содержит локальные `request`/`parseError` реализации;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`.

Что вынесено в `procedures-api.js`:

- `parseErrorBody`;
- базовый `request` wrapper (`credentials: include`, `Accept`/`Content-Type`, `204/empty`, error parsing);
- endpoint helpers:
  - `getProcedures`,
  - `createProcedure`,
  - `updateProcedure`,
  - `deleteProcedure`,
  - `getProcedureDetails`,
  - `getProcedureHistory`,
  - `transitionProcedure`,
  - `getShortlistRecommendations`,
  - `getShortlistAdjustments`,
  - `applyShortlistRecommendations`.

Добавлен focused JS unit test suite:

- `tests/js/procedures-api.test.js`.

Покрытые сценарии:

- `parseErrorBody` (detail/error/title/fallback);
- `request` contract (`credentials/include`, headers, JSON parsing, `204/empty` handling);
- error branch с parsed сообщением;
- URL/method/body contract всех endpoint helper-методов.

## Метрика после итерации 4

- `procedures-grid.js`: `1110` строк (было `1179`, снижение ещё на `69`; суммарно `-304` от `1414`);
- `procedures-grid-helpers.js`: `361` строка;
- `procedures-api.js`: `156` строк;
- JS unit tests: `112/112`.

## Проверка после итерации 4

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-api.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`112/112`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green.

## Выполнено (итерация 5)

Продолжена декомпозиция workflow-слоя страницы процедур:

- добавлен отдельный модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-workflow.js`;
- `procedures-grid.js` переведён на вызовы workflow-модуля для:
  - валидации запроса перехода статуса;
  - формирования success/error текстов переходов;
  - построения текстов выбранной процедуры;
  - построения status-текстов shortlist-рекомендаций и apply-result;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`.

Что вынесено:

- `reasonRequired` (через rank статусов);
- `validateTransitionRequest`;
- `buildTransitionSuccessMessage`;
- `buildProcedureSelectionSummary`;
- `buildShortlistSelectionSummary`;
- `buildRecommendationsStatus`;
- `buildApplyResultStatus`.

Добавлен focused JS unit test suite:

- `tests/js/procedures-workflow.test.js`.

Покрытые сценарии:

- обязательность причины для rollback/cancel;
- валидация входных данных перехода + payload normalization;
- стабильность selection/shortlist summary сообщений;
- детерминированность текстов по shortlist recommendations/apply;
- success message ветка с локализацией статусов.

## Метрика после итерации 5

- `procedures-grid.js`: `1092` строки (было `1110`, снижение ещё на `18`; суммарно `-322` от `1414`);
- `procedures-workflow.js`: `115` строк;
- `procedures-grid-helpers.js`: `361` строка;
- `procedures-api.js`: `156` строк;
- JS unit tests: `119/119`.

## Проверка после итерации 5

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-workflow.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`119/119`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `SUBCONTRACTOR_SQL_TESTS=1 ./.dotnet/dotnet test ... --filter "SqlSuite=Core"`: green (`73/73`);
- `SUBCONTRACTOR_SQL_TESTS=1 ./.dotnet/dotnet test ... --filter "SqlSuite=Full"`: green (`2/2`).

## Выполнено (итерация 6)

Продолжена декомпозиция UI-конфигурации `procedures-grid.js`:

- добавлен отдельный модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-columns.js`;
- из `procedures-grid.js` вынесены все основные наборы колонок:
  - history grid columns;
  - shortlist recommendations grid columns;
  - shortlist adjustments grid columns;
  - procedures registry grid columns;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`.

`procedures-grid.js` теперь использует `ProceduresGridColumns.createColumns(...)` и больше не держит в себе большие column-definition блоки.

Добавлен focused JS unit test:

- `tests/js/procedures-grid-columns.test.js`.

Покрытые сценарии:

- корректная сборка всех column-set массивов;
- работа `customizeText` localizer-веток;
- `calculateCellValue` ветки для дисциплин/факторов;
- корректное пробрасывание `statusLookup` и `approvalModeLookup`.

## Метрика после итерации 6

- `procedures-grid.js`: `759` строк (было `1092`, снижение ещё на `333`; суммарно `-655` от `1414`);
- `procedures-grid-columns.js`: `389` строк;
- `procedures-workflow.js`: `115` строк;
- `procedures-grid-helpers.js`: `361` строка;
- `procedures-api.js`: `156` строк;
- JS unit tests: `120/120`.

## Проверка после итерации 6

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid-columns.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`120/120`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green.

## Выполнено (итерация 7)

Продолжена декомпозиция data/cache orchestration страницы процедур:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-data.js`;
- `procedures-grid.js` переведён на `ProceduresData.createDataService(...)` для:
  - загрузки списка процедур;
  - кэширования деталей (`getDetails` + forceReload);
  - create/update/delete cache mutations;
  - `findProcedureById` при reselect после refresh;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`.

Что вынесено из `procedures-grid.js`:

- `toListItem`;
- `proceduresCache/detailsCache` и операции с ними;
- блок CRUD-кэш-мутаций из `CustomStore` (`load/create/update/delete` side);
- details-cache стратегия.

Добавлен focused JS unit test:

- `tests/js/procedures-data.test.js`.

Покрытые сценарии:

- валидация обязательных зависимостей data-service;
- `toListItem` mapping;
- `load/create/update/delete` cache behavior;
- `getDetails` cache-hit/cache-miss + force-reload ветка.

## Метрика после итерации 7

- `procedures-grid.js`: `712` строк (было `759`, снижение ещё на `47`; суммарно `-702` от `1414`);
- `procedures-data.js`: `120` строк;
- `procedures-grid-columns.js`: `389` строк;
- `procedures-workflow.js`: `115` строк;
- `procedures-grid-helpers.js`: `361` строка;
- `procedures-api.js`: `156` строк;
- JS unit tests: `124/124`.

## Проверка после итерации 7

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-data.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`124/124`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (`unit 20/20`, `fast integration 142/142`, `sql 75 skipped by design without SUBCONTRACTOR_SQL_TESTS=1`).

## Выполнено (итерация 8)

Продолжена декомпозиция shortlist-workspace блока страницы процедур:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-shortlist.js`;
- `procedures-grid.js` переведён на `ProceduresShortlist.createShortlistWorkspace(...)` для:
  - shortlist controls state (`busy/disabled`);
  - загрузки shortlist recommendations/adjustments;
  - apply-flow shortlist рекомендаций;
  - bind событий controls (`maxIncluded/build/apply/refresh`);
  - UI-status оркестрации по shortlist блоку.

Что вынесено из `procedures-grid.js`:

- `updateShortlistControls`;
- `clearShortlistData`;
- `loadShortlistRecommendations`;
- `loadShortlistAdjustments`;
- `shortlist` event handlers и `busy` state-machine.

Дополнительно:

- добавлена runtime-проверка dependency-модуля `ProceduresShortlist`;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml` (добавлен `procedures-shortlist.js` перед `procedures-grid.js`);
- добавлен focused JS unit test suite:
  - `tests/js/procedures-shortlist.test.js`.

Покрытые сценарии:

- dependency validation shortlist workspace;
- null-selection reset path (данные/статусы);
- selection-change path c загрузкой adjustments;
- build/apply path c payload normalization;
- bindEvents wiring контракт.

## Метрика после итерации 8

- `procedures-grid.js`: `577` строк (было `712`, снижение ещё на `135`; суммарно `-837` от `1414`);
- `procedures-shortlist.js`: `288` строк;
- `procedures-data.js`: `120` строк;
- `procedures-grid-columns.js`: `389` строк;
- `procedures-workflow.js`: `115` строк;
- `procedures-grid-helpers.js`: `361` строка;
- `procedures-api.js`: `156` строк;
- JS unit tests: `203/203`.

## Проверка после итерации 8

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-shortlist.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`203/203`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host.

## Выполнено (итерация 9)

Продолжена декомпозиция transition/history блока страницы процедур:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-transition.js`;
- `procedures-grid.js` переведён на `ProceduresTransition.createTransitionController(...)` для:
  - рендера доступных transition-targets;
  - обработки apply transition flow;
  - загрузки и refresh истории статусов;
  - bind событий transition-controls.

Что вынесено из `procedures-grid.js`:

- `updateTransitionTargets`;
- `loadHistory`;
- `applyButton` handler;
- `historyRefreshButton` handler.

Дополнительно:

- добавлена runtime-проверка dependency-модуля `ProceduresTransition`;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml` (добавлен `procedures-transition.js` перед `procedures-grid.js`);
- добавлен focused JS unit test suite:
  - `tests/js/procedures-transition.test.js`.

Покрытые сценарии:

- dependency validation transition-controller;
- null-selection и target-render ветки;
- loadHistory empty/non-empty ветки;
- apply transition success/validation-error ветки;
- bindEvents wiring для apply/history actions.

## Метрика после итерации 9

- `procedures-grid.js`: `521` строка (было `577`, снижение ещё на `56`; суммарно `-893` от `1414`);
- `procedures-shortlist.js`: `288` строк;
- `procedures-transition.js`: `200` строк;
- JS unit tests: `210/210`.

## Проверка после итерации 9

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-transition.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`210/210`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host.

## Выполнено (итерация 10)

Продолжена декомпозиция selection/sync orchestration блока страницы процедур:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-selection.js`;
- `procedures-grid.js` переведён на `ProceduresSelection.createSelectionController(...)` для:
  - синхронизации выбранной процедуры и текстовых summary;
  - координации между `transition controller` и `shortlist workspace` при смене выбора;
  - централизованного reset path при `null`-выборе;
  - обработки history-load ошибок для selected/null веток.

Что вынесено из `procedures-grid.js`:

- `selectedProcedure` state;
- `applySelection`;
- связка `loadHistory` + refresh shortlist/selection summary.

Дополнительно:

- добавлена runtime-проверка dependency-модуля `ProceduresSelection`;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml` (добавлен `procedures-selection.js` перед `procedures-grid.js`);
- добавлен focused JS unit test suite:
  - `tests/js/procedures-selection.test.js`.

Покрытые сценарии:

- dependency validation selection-controller;
- null-selection reset/sync path;
- selected-procedure sync path;
- history-load error branch;
- fallback callback для null-history reset failure.

## Метрика после итерации 10

- `procedures-grid.js`: `524` строки (было `521`, +`3` из-за wiring; суммарно `-890` от `1414`);
- `procedures-selection.js`: `125` строк;
- `procedures-shortlist.js`: `288` строк;
- `procedures-transition.js`: `200` строк;
- JS unit tests: `216/216`.

## Проверка после итерации 10

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-selection.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`216/216`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`).

## Выполнено (итерация 11)

Продолжена декомпозиция bootstrap/dependency-resolution блока страницы процедур:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-bootstrap.js`;
- `procedures-grid.js` переведён на `ProceduresBootstrap.createBootstrapContext(...)` для:
  - централизованного resolve DOM-контролов страницы процедур;
  - проверки готовности DevExpress runtime;
  - проверки наличия и контрактов модулей (`helpers/api/workflow/columns/data/shortlist/selection/transition`);
  - единообразной выдачи диагностики по отсутствующим зависимостям.

Что вынесено из `procedures-grid.js`:

- DOM selector-resolution и required-controls guards;
- runtime-проверка DevExpress;
- runtime-проверки всех dependency-модулей.

Дополнительно:

- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml` (добавлен `procedures-bootstrap.js` перед `procedures-grid.js`);
- добавлен focused JS unit test suite:
  - `tests/js/procedures-bootstrap.test.js`.

Покрытые сценарии:

- валидация обязательного `document.querySelector`;
- missing module-root и missing control ветки;
- DevExpress missing-diagnostic ветка;
- missing dependency module diagnostic ветка;
- успешный bootstrap-context path (`endpoint` + `controls` + `moduleRoots`).

## Метрика после итерации 11

- `procedures-grid.js`: `497` строк (было `524`, снижение ещё на `27`; суммарно `-917` от `1414`);
- `procedures-bootstrap.js`: `138` строк;
- `procedures-selection.js`: `125` строк;
- `procedures-shortlist.js`: `288` строк;
- `procedures-transition.js`: `200` строк;
- JS unit tests: `222/222`.

## Проверка после итерации 11

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-bootstrap.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`222/222`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (`unit 20/20`, `fast integration 142/142`, `sql 75 skipped by design without SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`).

## Выполнено (итерация 12)

Продолжена декомпозиция DevExpress grid-конфигурации страницы процедур:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grids.js`;
- `procedures-grid.js` переведён на `ProceduresGrids`-фабрики для:
  - `history` grid;
  - `shortlist` grid;
  - `shortlist adjustments` grid;
  - основного registry grid.

Что вынесено из `procedures-grid.js`:

- статические `dxDataGrid` конфигурации;
- popup form items для реестра процедур;
- `search/filter/paging/editing` конфигурация registry grid;
- `shortlist` row-highlighting (recommended rows).

Дополнительно:

- `procedures-bootstrap.js` расширен проверкой dependency-модуля `ProceduresGrids`;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml` (добавлен `procedures-grids.js` перед `procedures-bootstrap.js`);
- добавлен focused JS unit test suite:
  - `tests/js/procedures-grids.test.js`;
- расширен bootstrap test suite:
  - `tests/js/procedures-bootstrap.test.js` (новый модуль-контракт).

Покрытые сценарии:

- dependency validation для grid-фабрик;
- contract-проверка create-путей для history/shortlist/registry;
- row-highlighting behavior (`isRecommended`);
- callback wiring для editor/selection/toolbar/data-error у registry grid.

## Метрика после итерации 12

- `procedures-grid.js`: `390` строк (было `497`, снижение ещё на `107`; суммарно `-1024` от `1414`);
- `procedures-grids.js`: `240` строк;
- `procedures-bootstrap.js`: `144` строки;
- `procedures-selection.js`: `125` строк;
- `procedures-shortlist.js`: `288` строк;
- `procedures-transition.js`: `200` строк;
- JS unit tests: `225/225`.

## Проверка после итерации 12

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grids.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-bootstrap.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`225/225`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (`unit 20/20`, `fast integration 142/142`, `sql 75 skipped by design without SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`).

## Выполнено (итерация 13)

Продолжена декомпозиция конфигурационного слоя страницы процедур:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-config.js`;
- `procedures-grid.js` переведён на `ProceduresConfig.createConfig()` для:
  - `statusOrder`;
  - `transitionMap`;
  - captions (status/contractor/reliability);
  - approval modes;
  - prebuilt lookup arrays (`statusLookup`, `approvalModeLookup`).

Что вынесено из `procedures-grid.js`:

- статические справочники статусов/подписей;
- карту переходов процедур;
- локальные lookup-builder блоки.

Дополнительно:

- `procedures-bootstrap.js` расширен проверкой dependency-модуля `ProceduresConfig`;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml` (добавлен `procedures-config.js` перед `procedures-grid-helpers.js`);
- добавлен focused JS unit test suite:
  - `tests/js/procedures-config.test.js`;
- расширен bootstrap test suite:
  - `tests/js/procedures-bootstrap.test.js` (проверка `proceduresConfigRoot`).

Покрытые сценарии:

- стабильность конфигурации статусов/переходов и lookup-caption mapping;
- copy-on-read contract: `createConfig()` возвращает независимые копии данных;
- bootstrap-контракт по новому module-root.

## Метрика после итерации 13

- `procedures-grid.js`: `336` строк (было `390`, снижение ещё на `54`; суммарно `-1078` от `1414`);
- `procedures-config.js`: `125` строк;
- `procedures-grids.js`: `240` строк;
- `procedures-bootstrap.js`: `150` строк;
- JS unit tests: `227/227`.

## Проверка после итерации 13

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-config.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grids.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-bootstrap.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`227/227`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (`unit 20/20`, `fast integration 142/142`, `sql 75 skipped by design without SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`).

## Выполнено (итерация 14)

Продолжена декомпозиция orchestration-слоя реестра процедур:

- добавлены модули:
  - `src/Subcontractor.Web/wwwroot/js/procedures-store.js`;
  - `src/Subcontractor.Web/wwwroot/js/procedures-registry-events.js`;
- `procedures-grid.js` переведён на эти модули для:
  - создания `CustomStore` (`load/create/update/delete`);
  - wiring grid callbacks (`editor/selection/toolbar/data-error`).

Что вынесено из `procedures-grid.js`:

- `CustomStore` CRUD-блок;
- `onSelectionChanged`/`onToolbarPreparing`/`onDataErrorOccurred`/`onEditorPreparing` callbacks.

Дополнительно:

- `procedures-bootstrap.js` расширен проверками `ProceduresStore` и `ProceduresRegistryEvents`;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml` (добавлены `procedures-store.js` и `procedures-registry-events.js` перед `procedures-bootstrap.js`);
- добавлены focused JS unit test suites:
  - `tests/js/procedures-store.test.js`;
  - `tests/js/procedures-registry-events.test.js`;
- расширен bootstrap test suite:
  - `tests/js/procedures-bootstrap.test.js` (контракты `proceduresStoreRoot` и `proceduresRegistryEventsRoot`).

Покрытые сценарии:

- validation контрактов для store/events;
- CRUD-store поведение + status side-effects;
- selection-clear поведение при удалении выбранной процедуры;
- registry toolbar action wiring (refresh/clear URL filters);
- error/status callback behavior.

## Метрика после итерации 14

- `procedures-grid.js`: `293` строки (было `336`, снижение ещё на `43`; суммарно `-1121` от `1414`);
- `procedures-store.js`: `80` строк;
- `procedures-registry-events.js`: `87` строк;
- `procedures-bootstrap.js`: `162` строки;
- JS unit tests: `234/234`.

## Проверка после итерации 14

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-store.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-registry-events.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`234/234`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (`unit 20/20`, `fast integration 142/142`, `sql 75 skipped by design without SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`).

## Выполнено (итерация 15)

Продолжена декомпозиция service-composition слоя страницы процедур:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-services.js`;
- `procedures-grid.js` переведён на `ProceduresServices.createServices(...)` для централизованного создания:
  - `gridHelpers`;
  - `urlFilterState`;
  - `apiClient`;
  - `workflow`;
  - `columns`;
  - `dataService`.

Что вынесено из `procedures-grid.js`:

- сборка `helpers/api/workflow/columns/data` из module roots;
- конфигурация передачи `proceduresConfig` в слой сервисов.

Дополнительно:

- `procedures-bootstrap.js` расширен проверкой dependency-модуля `ProceduresServices`;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml` (добавлен `procedures-services.js` перед `procedures-grid-helpers.js`);
- добавлен focused JS unit test suite:
  - `tests/js/procedures-services.test.js`;
- расширен bootstrap test suite:
  - `tests/js/procedures-bootstrap.test.js` (контракт `proceduresServicesRoot`).

Покрытые сценарии:

- validation контрактов required factories в services-layer;
- корректный pass-through contracts (`statusOrder`, `locationSearch`, localizers, endpoint/api-client) при создании service graph;
- стабильность возвращаемого service bundle.

## Метрика после итерации 15

- `procedures-grid.js`: `259` строк (было `293`, снижение ещё на `34`; суммарно `-1155` от `1414`);
- `procedures-services.js`: `69` строк;
- `procedures-store.js`: `80` строк;
- `procedures-registry-events.js`: `87` строк;
- `procedures-bootstrap.js`: `168` строк;
- JS unit tests: `236/236`.

## Проверка после итерации 15

- `node --check src/Subcontractor.Web/wwwroot/js/procedures-services.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-bootstrap.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/procedures-grid.js`: green;
- `npm run test:js`: green (`236/236`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test Subcontractor.sln -p:UseAppHost=false`: green (`unit 20/20`, `fast integration 142/142`, `sql 75 skipped by design without SUBCONTRACTOR_SQL_TESTS=1`);
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`).

## Выполнено (итерация 16)

Добавлен entrypoint composition contract suite для `procedures-grid.js`:

- `tests/js/procedures-grid-entrypoint.test.js`

Покрытые ветки:

- early-return, если `data-procedures-module` не найден;
- bootstrap error path при отсутствии `window.ProceduresBootstrap` (русский status + error class);
- контрактная композиция:
  - `bootstrap -> config/services/store/grids/controllers/workspace/registry-events`;
  - binding transition/shortlist controllers;
  - startup `applySelection(null)` path.

## Проверка после итерации 16

- `npm run test:js -- --runInBand`: green (`356/356`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`).

## Выполнено (итерация 17)

Продолжена декомпозиция helper-слоя страницы процедур:

- `src/Subcontractor.Web/wwwroot/js/procedures-grid-helpers.js` переведён в thin-aggregator с backward-compatible API `ProceduresGridHelpers.createHelpers(...)`;
- выделены подмодули:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-localization-helpers.js`;
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-filter-helpers.js`;
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-payload-helpers.js`.

Что вынесено из `procedures-grid-helpers.js`:

- localization layer (`status/contractor/reliability captions`, `boolean caption`);
- URL/filter layer (`status filter`, `read state from query`, `filter hint`, `strip URL filters`);
- payload/normalization layer (`shortlist guards`, GUID/date/number normalization, create/update request payload builders).

Дополнительно:

- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - новые submodule scripts подключены перед `procedures-grid-helpers.js`;
- добавлен focused JS unit test suite:
  - `tests/js/procedures-grid-helper-modules.test.js`.

Покрытые сценарии:

- module-level контракты для localization/filter/payload helper submodules;
- backward-compatible поведение существующего `procedures-grid-helpers.test.js` через aggregator.

## Метрика после итерации 17

- `procedures-grid-helpers.js`: `75` строк (было `361`, снижение на `286`);
- `procedures-grid-localization-helpers.js`: `45` строк;
- `procedures-grid-filter-helpers.js`: `116` строк;
- `procedures-grid-payload-helpers.js`: `247` строк;
- JS unit tests: `372/372` (было `369/369`).

## Проверка после итерации 17

- `npm run test:js`: green (`372/372`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`173/173`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`301/301`).

## Выполнено (итерация 18)

Продолжена декомпозиция column-definition слоя процедур:

- `src/Subcontractor.Web/wwwroot/js/procedures-grid-columns.js` переведён в thin orchestrator;
- выделены submodules:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-columns-history.js`;
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-columns-shortlist.js`;
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-columns-registry.js`.

Что вынесено из `procedures-grid-columns.js`:

- history columns;
- shortlist + shortlist-adjustments columns;
- registry (main procedures) columns.

Дополнительно:

- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - submodule scripts подключены перед `procedures-grid-columns.js`;
- добавлен focused JS unit test suite:
  - `tests/js/procedures-grid-columns-modules.test.js`.

Покрытые сценарии:

- module-level контракты history/shortlist/registry columns;
- backward-compatible поведение существующего `procedures-grid-columns.test.js` через aggregator.

## Метрика после итерации 18

- `procedures-grid-columns.js`: `76` строк (было `389`, снижение на `313`);
- `procedures-grid-columns-history.js`: `66` строк;
- `procedures-grid-columns-shortlist.js`: `210` строк;
- `procedures-grid-columns-registry.js`: `161` строка;
- JS unit tests: `375/375` (было `372/372`).

## Проверка после итерации 18

- `npm run test:js`: green (`375/375`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`173/173`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`301/301`).

## Выполнено (итерация 19)

Продолжена декомпозиция shortlist-workspace слоя процедур:

- `src/Subcontractor.Web/wwwroot/js/procedures-shortlist.js` переведён в thin orchestrator;
- выделены submodules:
  - `src/Subcontractor.Web/wwwroot/js/procedures-shortlist-validation.js`;
  - `src/Subcontractor.Web/wwwroot/js/procedures-shortlist-runtime.js`.

Что вынесено:

- в `procedures-shortlist-validation.js`:
  - контроль required-controls contract;
  - API/workflow/callback dependencies contract;
  - нормализация входного options-object в runtime settings.
- в `procedures-shortlist-runtime.js`:
  - selection/build/apply/refresh orchestration;
  - busy-state и controls enable/disable logic;
  - shortlist/adjustments status propagation и grid refresh flow.

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - submodule scripts подключены перед `procedures-shortlist.js`.

Добавлены focused JS unit tests:

- `tests/js/procedures-shortlist-validation.test.js`;
- `tests/js/procedures-shortlist-runtime.test.js`.

Существующий suite:

- `tests/js/procedures-shortlist.test.js`
  - продолжает подтверждать backward-compatible поведение через orchestrator API `createShortlistWorkspace`.

## Метрика после итерации 19

- `procedures-shortlist.js`: `55` строк (было `288`, снижение на `233`);
- `procedures-shortlist-validation.js`: `114` строк;
- `procedures-shortlist-runtime.js`: `230` строк;
- JS unit tests: `543/543` (было `538/538`).

## Проверка после итерации 19

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `npm run test:js`: green (`543/543`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 20)

Продолжена декомпозиция entrypoint-слоя страницы процедур:

- добавлен runtime-модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime.js`;
- `src/Subcontractor.Web/wwwroot/js/procedures-grid.js` переведён в thin entrypoint:
  - bootstrap context resolution;
  - module-root loading/check;
  - делегирование в `initializeProceduresGrid(...)`.

Что вынесено из `procedures-grid.js`:

- создание `services/store/grids/controllers/workspace`;
- привязка callbacks для registry-toolbar/selection;
- startup `applySelection(null)` path.

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - добавлен `procedures-grid-runtime.js` перед `procedures-grid.js`.
- добавлен focused JS unit test suite:
  - `tests/js/procedures-grid-runtime.test.js`.

Покрытые сценарии:

- validation required host dependencies;
- composition contract (`services/store/grids/controllers/workspace`);
- startup selection initialization path.

## Метрика после итерации 20

- `procedures-grid.js`: `80` строк (было `259`, снижение на `179`);
- `procedures-grid-runtime.js`: `270` строк;
- JS unit tests: `545/545` (было `543/543`).

## Проверка после итерации 20

- `node --test tests/js/procedures-grid-runtime.test.js`: green;
- `npm run test:js`: green (`545/545`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 21)

Продолжена декомпозиция runtime-слоя страницы процедур:

- добавлен foundation-модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime-foundation.js`;
- `src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime.js` переведён на foundation API:
  - `resolveRuntimeOptions(...)`;
  - `createUiState(...)`.

Что вынесено из `procedures-grid-runtime.js`:

- валидация host-window и module-roots;
- normalized runtime options resolution;
- UI/navigation helpers:
  - `appendFilterHint`;
  - `clearUrlFilters`;
  - `setStatus`;
  - `setTransitionStatus`;
  - `setShortlistStatus`;
  - `setShortlistAdjustmentsStatus`.

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - `procedures-grid-runtime-foundation.js` подключён перед `procedures-grid-runtime.js`.
- добавлен focused JS unit test suite:
  - `tests/js/procedures-grid-runtime-foundation.test.js`.

Покрытые сценарии:

- required-dependencies contract для foundation validate-layer;
- runtime options normalization;
- navigation/status setter behavior (включая CSS error class toggles).

## Метрика после итерации 21

- `procedures-grid-runtime.js`: `267` строк (было `270`, снижение на `3`);
- `procedures-grid-runtime-foundation.js`: `106` строк;
- JS unit tests: `550/550` (было `545/545`).

## Проверка после итерации 21

- `node --test tests/js/procedures-grid-runtime-foundation.test.js`: green;
- `node --test tests/js/procedures-grid-runtime.test.js tests/js/procedures-grid-entrypoint.test.js`: green;
- `npm run test:js`: green (`550/550`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 22)

Продолжена декомпозиция runtime-слоя страницы процедур:

- добавлен bindings-модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime-bindings.js`;
- `src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime.js` переведён на bindings API:
  - `createCompositionContext(...)`.

Что вынесено из `procedures-grid-runtime.js`:

- mapping module-roots для composition:
  - `proceduresServicesRoot`;
  - `proceduresGridsRoot`;
  - `proceduresStoreRoot`;
  - `proceduresRegistryEventsRoot`;
  - `proceduresShortlistRoot`;
  - `proceduresSelectionRoot`;
  - `proceduresTransitionRoot`;
- mapping UI-control references:
  - grid/history/transition/shortlist controls;
- `transitionMap` binding from `proceduresConfig`.

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - `procedures-grid-runtime-bindings.js` подключён перед `procedures-grid-runtime.js`.
- добавлены focused JS unit tests:
  - `tests/js/procedures-grid-runtime-bindings.test.js`;
  - `tests/js/procedures-script-order.test.js`.

Покрытые сценарии:

- required-dependencies contract для runtime-bindings;
- корректное отображение module roots/control refs/transition map в composition context;
- guard на script-order (`foundation -> bindings -> runtime -> entrypoint`) в procedures view.

## Метрика после итерации 22

- `procedures-grid-runtime.js`: `251` строка (было `267`, снижение на `16`);
- `procedures-grid-runtime-bindings.js`: `58` строк;
- `procedures-grid-runtime-bindings.test.js`: `78` строк;
- `procedures-script-order.test.js`: `38` строк;
- JS unit tests: `605/605` (было `602/602`).

## Проверка после итерации 22

- `node --test tests/js/procedures-grid-runtime-foundation.test.js tests/js/procedures-grid-runtime-bindings.test.js tests/js/procedures-grid-runtime.test.js tests/js/procedures-grid-entrypoint.test.js tests/js/procedures-script-order.test.js`: green (`13/13`);
- `npm run test:js`: green (`605/605`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 23)

Продолжена декомпозиция runtime-слоя страницы процедур:

- добавлен workspace-модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime-workspace.js`;
- `src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime.js` переведён на workspace API:
  - `createWorkspaceComposition(...)`.

Что вынесено из `procedures-grid-runtime.js`:

- создание `historyGrid`;
- создание и связывание `selectionController`;
- создание `transitionController` + `bindEvents`;
- создание `shortlistGrid`/`shortlistAdjustmentsGrid`;
- создание `shortlistWorkspace` + `bindEvents`;
- связывание `selectionController <-> transitionController <-> shortlistWorkspace`.

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - `procedures-grid-runtime-workspace.js` подключён перед `procedures-grid-runtime.js`.
- расширены focused JS unit tests:
  - добавлен `tests/js/procedures-grid-runtime-workspace.test.js`;
  - обновлён `tests/js/procedures-script-order.test.js` (теперь включает `workspace` script guard).

Покрытые сценарии:

- required-dependencies contract для workspace-модуля;
- корректная композиция history/transition/shortlist runtime компонентов;
- корректный `bindEvents` lifecycle;
- guard на script-order (`foundation -> bindings -> workspace -> runtime -> entrypoint`) в procedures view.

## Метрика после итерации 23

- `procedures-grid-runtime.js`: `202` строки (было `251`, снижение на `49`);
- `procedures-grid-runtime-workspace.js`: `137` строк;
- `procedures-grid-runtime-workspace.test.js`: `157` строк;
- `procedures-script-order.test.js`: `39` строк;
- JS unit tests: `607/607` (было `605/605`).

## Проверка после итерации 23

- `node --test tests/js/procedures-grid-runtime-foundation.test.js tests/js/procedures-grid-runtime-bindings.test.js tests/js/procedures-grid-runtime-workspace.test.js tests/js/procedures-grid-runtime.test.js tests/js/procedures-grid-entrypoint.test.js tests/js/procedures-script-order.test.js`: green (`15/15`);
- `npm run test:js`: green (`607/607`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 24)

Продолжена декомпозиция grid-контура страницы процедур:

- добавлен конфигурационный модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grids-config.js`;
- `src/Subcontractor.Web/wwwroot/js/procedures-grids.js` переведён на config API:
  - `buildHistoryGridConfig(...)`;
  - `buildShortlistGridConfig(...)`;
  - `buildShortlistAdjustmentsGridConfig(...)`;
  - `buildProceduresGridConfig(...)`.

Что вынесено в config-модуль:

- стандартные `dxDataGrid`-параметры для history/shortlist/shortlist-adjustments;
- конфигурация реестра процедур (`search/filter/paging/editing/popup/form/callback wiring`);
- единый список `form.items` для popup-редактирования процедуры.

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - добавлен `procedures-grids-config.js` перед `procedures-grids.js`;
- добавлены focused JS unit tests:
  - `tests/js/procedures-grids-config.test.js`;
  - обновлён `tests/js/procedures-script-order.test.js` (guard на `transition -> grids-config -> grids`).

Покрытые сценарии:

- required-options contract для конфиг-билдеров;
- стабильность row-highlighting в shortlist grid (`isRecommended`);
- корректная прокладка url-фильтров и callback-обработчиков в registry grid;
- guard на порядок script-подключений для нового config-модуля.

## Метрика после итерации 24

- `procedures-grids.js`: `161` строка;
- `procedures-grids-config.js`: `212` строк;
- `procedures-grids-config.test.js`: `109` строк;
- `procedures-script-order.test.js`: `42` строки;
- JS unit tests: `610/610` (было `607/607`).

## Проверка после итерации 24

- `node --test tests/js/procedures-grids-config.test.js tests/js/procedures-grids.test.js tests/js/procedures-script-order.test.js`: green (`7/7`);
- `npm run test:js`: green (`610/610`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 25)

Продолжена декомпозиция shortlist-runtime слоя страницы процедур:

- добавлен data-controller модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-shortlist-runtime-data.js`;
- `src/Subcontractor.Web/wwwroot/js/procedures-shortlist-runtime.js` переведён на delegation к `createDataController(...)`.

Что вынесено из `procedures-shortlist-runtime.js`:

- состояние busy-флагов shortlist/adjustments;
- `updateControls(...)` и `clearData(...)`;
- загрузка данных:
  - `loadShortlistRecommendations(...)`;
  - `loadShortlistAdjustments(...)`;
- запись shortlist/adjustments статусов при успешной загрузке.

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - добавлен `procedures-shortlist-runtime-data.js` перед `procedures-shortlist-runtime.js`;
- расширен guard в:
  - `tests/js/procedures-script-order.test.js`
  - теперь фиксирует порядок `shortlist-validation -> shortlist-runtime-data -> shortlist-runtime -> shortlist`.
- добавлен focused JS unit suite:
  - `tests/js/procedures-shortlist-runtime-data.test.js`.

Покрытые сценарии:

- required-dependencies contract для shortlist runtime data-controller;
- контроль enable/disable поведения shortlist-controls по selection и busy-флагам;
- guard на согласование selection-id при асинхронных shortlist-load вызовах;
- сохранён contract у публичного shortlist runtime API.

## Метрика после итерации 25

- `procedures-shortlist-runtime.js`: `212` строк (было `230`, снижение на `18`);
- `procedures-shortlist-runtime-data.js`: `139` строк;
- `procedures-shortlist-runtime-data.test.js`: `158` строк;
- `procedures-script-order.test.js`: `47` строк;
- JS unit tests: `613/613` (было `610/610`).

## Проверка после итерации 25

- `node --test tests/js/procedures-shortlist-runtime-data.test.js tests/js/procedures-shortlist-runtime.test.js tests/js/procedures-shortlist-validation.test.js tests/js/procedures-shortlist.test.js tests/js/procedures-script-order.test.js`: green (`14/14`);
- `npm run test:js`: green (`613/613`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).

## Выполнено (итерация 26)

Продолжена декомпозиция payload-helpers слоя страницы процедур:

- добавлен normalization-модуль:
  - `src/Subcontractor.Web/wwwroot/js/procedures-grid-payload-normalization.js`;
- `src/Subcontractor.Web/wwwroot/js/procedures-grid-payload-helpers.js` переведён в thin facade с delegation к normalization helpers.

Что вынесено из `procedures-grid-payload-helpers.js`:

- GUID/date/number/string normalizers;
- approval-mode/pick-value helpers;
- `createPayload(...)` и `updatePayload(...)` (включая attachment mapping).

Дополнительно:

- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Procedures.cshtml`
  - добавлен `procedures-grid-payload-normalization.js` перед `procedures-grid-payload-helpers.js`;
- расширен guard в:
  - `tests/js/procedures-script-order.test.js`
  - теперь фиксирует порядок `filter-helpers -> payload-normalization -> payload-helpers`;
- добавлен focused JS unit suite:
  - `tests/js/procedures-grid-payload-normalization.test.js`.

Покрытые сценарии:

- deterministic-контракт scalar-normalizers (`guid/date/number/string/approval-mode`);
- create/update payload contract c required-field guards и attachment-id projection;
- прозрачная интеграция facade-модуля `payload-helpers` после выноса normalization слоя.

## Метрика после итерации 26

- `procedures-grid-payload-helpers.js`: `76` строк (было `247`, снижение на `171`);
- `procedures-grid-payload-normalization.js`: `226` строк;
- `procedures-grid-payload-normalization.test.js`: `100` строк;
- `procedures-script-order.test.js`: `50` строк;
- JS unit tests: `616/616` (было `613/613`).

## Проверка после итерации 26

- `node --test tests/js/procedures-grid-payload-normalization.test.js tests/js/procedures-grid-helper-modules.test.js tests/js/procedures-grid-helpers.test.js tests/js/procedures-script-order.test.js`: green (`15/15`);
- `npm run test:js`: green (`616/616`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).
