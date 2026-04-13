# Refactoring Notes — Contracts UI (Sprint 3)

Дата обновления: `2026-04-12`

## Цель

Пошагово декомпозировать фронтенд-монолит `contracts-grid.js` без `big-bang` переписывания и без изменения пользовательского поведения.

## Выполнено (итерация 1)

Выделен первый reusable helper-модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-helpers.js`

Что вынесено в helper:

- URL-фильтры (`readUrlFilterState`, `buildStatusFilter`, `describeUrlFilters`, `appendFilterHint`, `clearUrlFilters`);
- базовые преобразования (`normalizeGuid`, `isGuid`, `toNullableDate`, `toNumber`);
- MDR-import parsing/validation (`parseMdrImportFile`, `parseMdrImportItemsFromRows`);
- API error parsing (`parseErrorBody`);
- milestones payload builder (`buildMilestonesPayload`).

`contracts-grid.js` переведён на thin wrappers к helper-модулю и уменьшен в размере.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки:

1. `contracts-grid-helpers.js`
2. `contracts-grid.js`

## Метрика после итерации 1

- `contracts-grid.js`: `2668` строк (было `3087`, снижение на `419` строк)
- `contracts-grid-helpers.js`: `503` строки

## Выполнено (итерация 2)

Выделен отдельный модуль API-клиента:

- `src/Subcontractor.Web/wwwroot/js/contracts-api.js`

Что вынесено из `contracts-grid.js`:

- базовый HTTP request wrapper (`fetch`, `credentials: include`, обработка JSON/204);
- разбор API-ошибок через `helpers.parseErrorBody`;
- операции по договорам (list/create/update/delete);
- переход статуса и создание черновика из процедуры;
- загрузка/сохранение истории, исполнения, мониторинга КП/MDR;
- импорт MDR forecast/fact.

`contracts-grid.js` переведён на вызовы `apiClient` и больше не содержит прямых `fetch` вызовов.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки:

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-grid.js`

## Метрика после итерации 2

- `contracts-grid.js`: `2610` строк (было `2668`, снижение ещё на `58` строк)
- `contracts-api.js`: `163` строки
- `contracts-grid-helpers.js`: `503` строки

## Выполнено (итерация 3)

Выделен модуль мониторинговой модели:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model.js`

Что вынесено из `contracts-grid.js`:

- нормализация данных мониторинга (`normalizeControlPoint`, `normalizeMdrCard`);
- расчёты метрик MDR (`calculateDeviationPercent`, `calculateMdrCardMetrics`);
- сборка и валидация payload для сохранения КП/MDR (`buildControlPointsPayload`, `buildMdrCardsPayload`);
- генерация client-side идентификаторов для строк мониторинга.

`contracts-grid.js` переведён на thin wrappers к `monitoringModel`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки:

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-monitoring-model.js`
4. `contracts-grid.js`

## Метрика после итерации 3

- `contracts-grid.js`: `2343` строки (было `2610`, снижение ещё на `267` строк)
- `contracts-monitoring-model.js`: `310` строк
- `contracts-api.js`: `163` строки
- `contracts-grid-helpers.js`: `503` строки

## Выполнено (итерация 4)

Выделен модуль состояния страницы договоров:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-state.js`

Что вынесено из `contracts-grid.js`:

- кэш договоров (`set/get/add/replace/remove`);
- выбранный договор (`selectedContractId`);
- выбранные элементы мониторинга (`selectedMonitoringControlPointClientId`, `selectedMonitoringMdrCardClientId`);
- единые операции сброса/чтения текущего выбора.

`contracts-grid.js` переведён на единый `gridState` и больше не держит разбросанные глобальные state-переменные.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки:

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-monitoring-model.js`
4. `contracts-grid-state.js`
5. `contracts-grid.js`

## Метрика после итерации 4

- `contracts-grid.js`: `2350` строк (было `2343`, +`7` строк за счёт обвязки интеграции модуля состояния)
- `contracts-grid-state.js`: `91` строка
- `contracts-monitoring-model.js`: `311` строк
- `contracts-api.js`: `163` строки
- `contracts-grid-helpers.js`: `503` строки

## Выполнено (итерация 5)

Выделен модуль исполнения договора:

- `src/Subcontractor.Web/wwwroot/js/contracts-execution.js`

Что вынесено из `contracts-grid.js`:

- правило редактирования этапов (`canEditMilestones`);
- форматирование сводки исполнения (`formatExecutionSummary`);
- загрузка сводки и этапов (`loadExecutionSummary`, `loadMilestones`, `loadExecutionData`);
- сохранение этапов исполнения (`persistMilestones`) с перезагрузкой summary/milestones.

`contracts-grid.js` переведён на вызовы `executionModule`, UI-обвязка и обработчики DevExpress остались в странице.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки:

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-monitoring-model.js`
4. `contracts-grid-state.js`
5. `contracts-execution.js`
6. `contracts-grid.js`

## Метрика после итерации 5

- `contracts-grid.js`: `2314` строк (было `2350`, снижение ещё на `36` строк)
- `contracts-execution.js`: `137` строк
- `contracts-grid-state.js`: `91` строка
- `contracts-monitoring-model.js`: `311` строк
- `contracts-api.js`: `163` строки
- `contracts-grid-helpers.js`: `503` строки

## Выполнено (итерация 6)

Выделены модули runtime-логики мониторинга:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-kp.js`
- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-mdr.js`

Что вынесено из `contracts-grid.js`:

- KP: выбор и поиск контрольной точки, источник этапов, синхронизация этапов в выбранную КП, текст статуса выбора;
- MDR: выбор и поиск карточки, источник строк, синхронизация строк в выбранную карточку, ключ восстановления выбранной карточки после импорта, текст статуса выбора;
- унификация `ensure selection` через module helpers вместо локальной реализации в `grid`.

`contracts-grid.js` переведён на `monitoringKpModule`/`monitoringMdrModule`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки:

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-monitoring-model.js`
4. `contracts-monitoring-kp.js`
5. `contracts-monitoring-mdr.js`
6. `contracts-grid-state.js`
7. `contracts-execution.js`
8. `contracts-grid.js`

## Метрика после итерации 6

- `contracts-grid.js`: `2275` строк (было `2314`, снижение ещё на `39` строк)
- `contracts-monitoring-kp.js`: `66` строк
- `contracts-monitoring-mdr.js`: `78` строк
- `contracts-execution.js`: `137` строк
- `contracts-grid-state.js`: `91` строка
- `contracts-monitoring-model.js`: `311` строк
- `contracts-api.js`: `163` строки
- `contracts-grid-helpers.js`: `503` строки

## Проверка

- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj`: green
- `dotnet test Subcontractor.sln`: green (SQL tests ожидаемо skip без `SUBCONTRACTOR_SQL_TESTS=1`)

## Выполнено (итерация 7)

Добавлен minimal JS unit test stack для pure logic модулей:

- `tests/js/contracts-grid-helpers.test.js`
- `tests/js/contracts-monitoring-model.test.js`

Техническая реализация:

- используется встроенный Node.js test runner (`node:test`);
- добавлен npm-скрипт `test:js` в `package.json` (`node --test tests/js`);
- `contracts-grid-helpers.js` и `contracts-monitoring-model.js` расширены безопасным `module.exports` для запуска в Node-тестах без изменения browser-поведения;
- в CI добавлен отдельный job `frontend-js-unit`.

Покрытые сценарии:

- URL/filter parsing и milestones payload validation;
- MDR import row parsing/validation;
- monitoring deviation/metrics calculations;
- payload validation guard-условий для KP/MDR.

## Выполнено (итерация 8)

Добавлен browser smoke barrier для ключевой пользовательской навигации:

- `tests/smoke/navigation-smoke.spec.js`
- `playwright.config.js`

Что проверяется smoke-тестом:

- открытие `/` и рендер русскоязычного заголовка;
- переходы через верхнее меню на `/Home/Procedures` и `/Home/Contracts`;
- рендер ключевых заголовков страниц;
- наличие `?`-подсказок (`_FieldHelp`) на обеих страницах.

CI-интеграция:

- новый job `browser-smoke` в `.github/workflows/ci.yml`;
- job поднимает SQL Server service container, применяет миграции, стартует `Subcontractor.Web` и выполняет `npm run test:smoke`.

## Выполнено (итерация 9)

Выделен отдельный модуль-контроллер monitoring runtime:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring.js`

Что вынесено из `contracts-grid.js`:

- загрузка/сохранение мониторинга (`loadData`, `saveData`);
- импорт MDR (разбор, применение, режим конфликтов, статусные сообщения);
- управление блоком мониторинга и доступностью контролов;
- инициализация и обработчики всех monitoring grid'ов:
  - контрольные точки;
  - этапы контрольной точки;
  - карточки MDR;
  - строки MDR.

`contracts-grid.js` переведён на orchestration через `monitoringController`:

- `monitoringController.init()`;
- `monitoringController.updateControls()`;
- `monitoringController.loadData(...)`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки (актуальный):

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-monitoring-model.js`
4. `contracts-monitoring-kp.js`
5. `contracts-monitoring-mdr.js`
6. `contracts-monitoring.js`
7. `contracts-grid-state.js`
8. `contracts-execution.js`
9. `contracts-grid.js`

## Метрика после итерации 9

- `contracts-grid.js`: `1076` строк (было `2275`, снижение на `1199` строк)
- `contracts-monitoring.js`: `1290` строк

Проверка:

- `node --check src/Subcontractor.Web/wwwroot/js/contracts-grid.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-monitoring.js`: green
- `npm run test:js`: green
- `BASE_URL=https://ne-subcontractor-demo.ru.tuna.am npm run test:smoke`: green

## Выполнено (итерация 10)

Дополнительно выделены отдельные модули оркестрации:

- `src/Subcontractor.Web/wwwroot/js/contracts-workflow.js`
- `src/Subcontractor.Web/wwwroot/js/contracts-draft.js`

Что вынесено из `contracts-grid.js`:

- workflow panel:
  - переход статуса;
  - валидация правил отката;
  - загрузка/обновление истории переходов;
  - управление availability контролов transition/history;
- draft panel:
  - валидация `procedureId`;
  - формирование payload для create draft;
  - статусные сообщения и очистка формы.

`contracts-grid.js` теперь делегирует:

- `workflowController.init()/updateControls()/loadHistory(...)`;
- `draftController.init()`;
- `monitoringController.*` (из итерации 9);
- `executionModule.*`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки (актуальный):

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-monitoring-model.js`
4. `contracts-monitoring-kp.js`
5. `contracts-monitoring-mdr.js`
6. `contracts-monitoring.js`
7. `contracts-grid-state.js`
8. `contracts-execution.js`
9. `contracts-workflow.js`
10. `contracts-draft.js`
11. `contracts-grid.js`

## Метрика после итерации 10

- `contracts-grid.js`: `909` строк (было `1076`, снижение ещё на `167` строк)
- `contracts-workflow.js`: `236` строк
- `contracts-draft.js`: `76` строк

Проверка:

- `node --check src/Subcontractor.Web/wwwroot/js/contracts-grid.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-workflow.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-draft.js`: green
- `npm run test:js`: green
- `BASE_URL=https://ne-subcontractor-demo.ru.tuna.am npm run test:smoke`: green

## Выполнено (итерация 11)

Доведена декомпозиция remaining UI orchestration в отдельные модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-registry.js`
- `src/Subcontractor.Web/wwwroot/js/contracts-execution-panel.js`

Что вынесено/завершено:

- полностью удалён legacy registry-блок из `contracts-grid.js` (старый `store`/CRUD/grid builder);
- execution panel вынесен в `contracts-execution-panel.js`:
  - инициализация execution grid;
  - загрузка/сохранение этапов;
  - статусные сообщения и управление доступностью редактирования;
  - обработка refresh action;
- `contracts-grid.js` теперь выступает как thin entrypoint/orchestrator и делегирует:
  - `registryController.*`;
  - `executionController.*`;
  - `workflowController.*`;
  - `draftController.*`;
  - `monitoringController.*`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки (актуальный):

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-monitoring-model.js`
4. `contracts-monitoring-kp.js`
5. `contracts-monitoring-mdr.js`
6. `contracts-monitoring.js`
7. `contracts-grid-state.js`
8. `contracts-execution.js`
9. `contracts-execution-panel.js`
10. `contracts-workflow.js`
11. `contracts-draft.js`
12. `contracts-registry.js`
13. `contracts-grid.js`

## Метрика после итерации 11

- `contracts-grid.js`: `363` строки (было `909`, снижение на `546` строк)
- `contracts-registry.js`: `414` строк
- `contracts-execution-panel.js`: `276` строк

Проверка:

- `node --check src/Subcontractor.Web/wwwroot/js/contracts-grid.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-registry.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-execution-panel.js`: green
- `npm run test:js`: green
- `BASE_URL=https://ne-subcontractor-demo.ru.tuna.am npm run test:smoke`: green

## Выполнено (итерация 12)

Добавлен отдельный pure-модуль payload-логики реестра:

- `src/Subcontractor.Web/wwwroot/js/contracts-registry-payload.js`

Что сделано:

- из `contracts-registry.js` вынесены:
  - create/update payload builders;
  - GUID/суммовые validation rules;
- `contracts-registry.js` переведён на зависимость `ContractsRegistryPayload.createBuilder(...)`;
- `contracts-grid.js` дополнен проверкой наличия `ContractsRegistryPayload` и прокидыванием модуля в registry-controller;
- обновлён порядок скриптов в `Contracts.cshtml` (добавлен `contracts-registry-payload.js` перед `contracts-registry.js`).

Добавлены focused JS unit tests:

- `tests/js/contracts-registry-payload.test.js`

Покрытые сценарии:

- нормализация create payload;
- валидация GUID полей;
- update payload с сохранением omitted полей и explicit `null` дат;
- валидация суммы (`amountWithoutVat + vatAmount = totalAmount`).

## Метрика после итерации 12

- `contracts-grid.js`: `371` строка
- `contracts-registry.js`: `342` строки
- `contracts-registry-payload.js`: `111` строк
- `contracts-execution-panel.js`: `276` строк

Проверка:

- `node --check src/Subcontractor.Web/wwwroot/js/contracts-grid.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-registry.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-registry-payload.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-execution-panel.js`: green
- `npm run test:js`: green (`15`/`15`)
- `BASE_URL=https://ne-subcontractor-demo.ru.tuna.am npm run test:smoke`: green

## Выполнено (итерация 13)

Вынесен bootstrap/wiring слой contracts page:

- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`

Что сделано:

- в новый модуль вынесены:
  - сбор DOM-контекста страницы (`[data-contracts-*]`);
  - проверка загрузки DevExpress/jQuery;
  - резолв и валидация зависимостей модулей (`api`, `monitoring`, `workflow`, `draft`, `registry`, `execution-panel`);
  - унифицированная выдача ошибок инициализации в status-блок;
- `contracts-grid.js` переписан как thin entrypoint-orchestrator, который:
  - получает bootstrap context;
  - собирает контроллеры;
  - связывает cross-module callbacks;
  - запускает `init()` контроллеров.
- добавлены unit-тесты bootstrap-слоя:
  - `tests/js/contracts-bootstrap.test.js`
  - проверяются сценарии `no module root`, `DevExpress missing`, `happy path context build`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`

Порядок загрузки (актуальный):

1. `contracts-grid-helpers.js`
2. `contracts-api.js`
3. `contracts-monitoring-model.js`
4. `contracts-monitoring-kp.js`
5. `contracts-monitoring-mdr.js`
6. `contracts-monitoring.js`
7. `contracts-grid-state.js`
8. `contracts-execution.js`
9. `contracts-execution-panel.js`
10. `contracts-workflow.js`
11. `contracts-draft.js`
12. `contracts-registry-payload.js`
13. `contracts-registry.js`
14. `contracts-bootstrap.js`
15. `contracts-grid.js`

## Метрика после итерации 13

- `contracts-grid.js`: `227` строк (было `371`, снижение ещё на `144` строки)
- `contracts-bootstrap.js`: `218` строк
- `contracts-registry.js`: `342` строки
- `contracts-registry-payload.js`: `111` строк
- `contracts-execution-panel.js`: `276` строк

Проверка:

- `node --check src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-grid.js`: green
- `node --check src/Subcontractor.Web/wwwroot/js/contracts-registry.js`: green
- `npm run test:js`: green (`18`/`18`)
- `BASE_URL=https://ne-subcontractor-demo.ru.tuna.am npm run test:smoke`: green

## Выполнено (итерация 14)

Расширен browser smoke barrier по Contracts UI:

- обновлён `tests/smoke/navigation-smoke.spec.js`;
- добавлен smoke-сценарий проверки core widgets на `/Home/Contracts`:
  - реестр договоров;
  - workflow/history блок;
  - execution grid;
  - monitoring grids (КП/MDR);
  - ключевые action-кнопки (transition/draft/execution/monitoring/import).

Проверка:

- `BASE_URL=https://ne-subcontractor-demo.ru.tuna.am npm run test:smoke`: green (`2`/`2`)
- `npm run test:js`: green (`18`/`18`)

## Выполнено (итерация 15)

Расширен smoke-сценарий read-only выбора записи на странице договоров:

- обновлён `tests/smoke/navigation-smoke.spec.js`;
- добавлен сценарий `contracts page updates read-only panels when a registry row is selected`;
- сценарий проверяет реакцию UI после выбора строки реестра:
  - переход панели workflow в состояние `Выбрано: ...`;
  - обновление execution/monitoring selected-summary;
  - доступность refresh-кнопок history/execution/monitoring;
  - загрузку истории переходов по кнопке refresh.
- добавлен auto-seed smoke-данных через API при пустом реестре:
  - `project` -> `lot` -> `procedure` -> `contractor` -> `contract`;
  - процедура автоматически доводится до `DecisionMade`;
  - создаётся договор в `Draft` для выбора строки в grid.

Режимы выполнения:

- `CI`: strict mode, тест падает, если auto-seed не удался или строка не появилась после подготовки данных;
- local/external non-CI: допускается `skip` с диагностическим сообщением, если окружение не позволяет сидинг.

Проверка:

- `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke`: `3 passed`
- `BASE_URL=https://ne-subcontractor-demo.ru.tuna.am npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для внешнего стенда без доступного сидинга)
- `npm run test:js`: green (`18`/`18`)

## Следующая итерация (план)

1. Перейти к оставшимся задачам Sprint 3 по backend quality tightening (приоритизировать узкие regression gaps).
2. Для внешних демо-стендов добавить отдельный seed endpoint/процедуру подготовки данных (или cron-seed), чтобы убрать `skip` вне CI.

## Выполнено (итерация 16)

Для внешних демо-стендов добавлен стабильный demo-seed контур:

- новый endpoint: `POST /api/demo/contracts/smoke-seed` (`src/Subcontractor.Web/Controllers/DemoController.cs`);
- новый seed-сервис: `src/Subcontractor.Web/Services/DemoContractsSmokeSeedService.cs`;
- конфигурация `DemoSeed`:
  - `EnableApi` — включает demo seed endpoint;
  - `EnableStartupSeed` — включает стартовый автосидинг через worker;
  - `ContractsPrefix` — префикс договоров для smoke/demo;
- добавлен стартовый worker:
  - `src/Subcontractor.Web/Workers/DemoContractsSeedWorker.cs`.

Обновлён browser smoke сценарий `tests/smoke/navigation-smoke.spec.js`:

- сидинг сначала пробует `POST /api/demo/contracts/smoke-seed`;
- при недоступности endpoint используется fallback на legacy API-chain;
- API-вызовы сидинга переведены на `page.request` (auth-контекст страницы), чтобы снизить 401/credential проблемы на внешних стендах.

Дополнительно добавлены integration tests:

- `tests/Subcontractor.Tests.Integration/Demo/DemoContractsSmokeSeedControllerTests.cs`
  - endpoint disabled -> `404 ProblemDetails`;
  - endpoint enabled -> seed создаётся и повторный вызов идемпотентен.

## Выполнено (итерация 17)

Финализирован closing-run Sprint 3 после backend quality-hardening:

- подтверждён стабильный локальный smoke в strict-режиме:
  - `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke` -> `3 passed`;
- подтверждён JS unit contour:
  - `npm run test:js` -> `18/18`.

Статус по UI quality-barrier:

- thin entrypoint сохранён (`contracts-grid.js`);
- browser smoke и JS unit stack стабильны;
- Sprint 3 по UI части закрыт.

## Выполнено (итерация 18)

Начата вторая волна декомпозиции `contracts-monitoring.js` (post-roadmap hardening):

- выделен новый pure-модуль статусов импорта MDR:
  - `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-import-status.js`;
- из `contracts-monitoring.js` вынесена логика:
  - нормализация режима импорта (`strict/skip`);
  - валидация preconditions импорта (`выбран договор`, `статус допускает редактирование`, `файл выбран`);
  - построение preview конфликтов;
  - формирование итоговых status-сообщений для strict/partial/success сценариев;
- обновлён wiring:
  - `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`;
  - `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`;
  - `src/Subcontractor.Web/Views/Home/Contracts.cshtml`.

Добавлены focused JS unit tests:

- `tests/js/contracts-monitoring-import-status.test.js`.

Покрытые сценарии:

- mode normalization (`skip`/fallback `strict`);
- import preconditions validation;
- conflict preview formatting;
- strict-конфликты (`applied=false`) -> error status;
- partial/success status-ветки.

Метрика после итерации 18:

- `contracts-monitoring.js`: `1260` строк (было `1290`, снижение на `30`);
- `contracts-monitoring-import-status.js`: `88` строк;
- JS unit tests: `23/23`.

Проверка:

- `node --check` для `contracts-monitoring-import-status.js`, `contracts-monitoring.js`, `contracts-bootstrap.js`, `contracts-grid.js`: green;
- `npm run test:js`: green (`23/23`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke`: `3 passed`.

## Выполнено (итерация 19)

Продолжена декомпозиция `contracts-monitoring.js`: runtime-часть импорта вынесена в отдельный контроллер.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-import.js`
  - управление кнопками импорта/сброса;
  - обработчики событий `file/reset/apply`;
  - orchestration импорта (`parse -> API -> normalize cards -> restore selection -> statuses`).

Что изменено:

- `contracts-monitoring.js` больше не содержит import event/runtime блок, а использует `monitoringImportModule.createController(...)`;
- обновлён bootstrap/wiring:
  - `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`;
  - `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`;
  - `src/Subcontractor.Web/Views/Home/Contracts.cshtml` (новый `<script>`).

Добавлены focused JS unit tests:

- `tests/js/contracts-monitoring-import.test.js`
  - проверка `updateButtons` от состояния выбранного договора/файла;
  - happy-path импорт + восстановление выбранной MDR карточки + status updates.

Метрика после итерации 19:

- `contracts-monitoring.js`: `1204` строки (было `1260`, снижение ещё на `56`; суммарно `-86` от `1290`);
- `contracts-monitoring-import.js`: `133` строки;
- JS unit tests: `25/25`.

Проверка:

- `node --check` для `contracts-monitoring-import.js`, `contracts-monitoring.js`, `contracts-bootstrap.js`, `contracts-grid.js`: green;
- `npm run test:js`: green (`25/25`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke`: `3 passed`.

## Выполнено (итерация 20)

Продолжена декомпозиция `contracts-monitoring.js`: load/save orchestration вынесена в отдельный data-сервис.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-data.js`
  - `loadData(showStatusMessage)`:
    - загрузка КП/MDR через API;
    - нормализация данных;
    - первичное восстановление selection;
    - safe-reset при ошибке загрузки;
  - `saveData()`:
    - guard на read-only статусы;
    - сбор payload из grid data;
    - сохранение КП/MDR;
    - reconciliation selection после сохранения;
    - status update.

Что изменено:

- `contracts-monitoring.js` переведён на `monitoringDataService.loadData/saveData`;
- обновлён bootstrap/wiring:
  - `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`;
  - `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`;
  - `src/Subcontractor.Web/Views/Home/Contracts.cshtml` (добавлен `contracts-monitoring-data.js`).

Добавлены focused JS unit tests:

- `tests/js/contracts-monitoring-data.test.js`
  - reset view-state, когда договор не выбран;
  - load path с нормализацией и status message;
  - save guard для read-only статуса.

Метрика после итерации 20:

- `contracts-monitoring.js`: `1115` строк (было `1204`, снижение ещё на `89`; суммарно `-175` от `1290`);
- `contracts-monitoring-data.js`: `150` строк;
- JS unit tests: `28/28`.

Проверка:

- `node --check` для `contracts-monitoring-data.js`, `contracts-monitoring-import.js`, `contracts-monitoring.js`, `contracts-bootstrap.js`, `contracts-grid.js`: green;
- `npm run test:js`: green (`28/28`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke`: `3 passed`.

## Выполнено (итерация 21)

Продолжена вторая волна декомпозиции `contracts-monitoring.js`: heavy DevExpress grid initialization вынесена в отдельный модуль.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids.js`
  - конфигурация и инициализация всех 4 monitoring grid’ов:
    - контрольные точки;
    - этапы контрольной точки;
    - карточки MDR;
    - строки MDR;
  - event wiring (`onSelectionChanged`, `onInitNewRow`, `onRowInserting/Updating`, `onDataErrorOccurred`) сохранён без изменения поведения.

Что изменено:

- `contracts-monitoring.js` больше не содержит длинный блок DevExpress-конфигурации и использует `monitoringGridsModule.createGrids(...)`;
- обновлён bootstrap/wiring:
  - `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`;
  - `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`;
  - `src/Subcontractor.Web/Views/Home/Contracts.cshtml` (добавлен `contracts-monitoring-grids.js`).

Добавлены focused JS unit tests:

- `tests/js/contracts-monitoring-grids.test.js`
  - проверка selection callbacks + fallback data-error message;
  - проверка guard-ограничений на вставку stage/MDR-row без выбранной parent-сущности.
- `tests/js/contracts-bootstrap.test.js`
  - добавлен negative-case: отсутствие `ContractsMonitoringGrids` корректно блокирует bootstrap и выдаёт диагностическое сообщение.

Метрика после итерации 21:

- `contracts-monitoring.js`: `389` строк (было `1115`, снижение ещё на `726`; суммарно `-901` от `1290`);
- `contracts-monitoring-grids.js`: `800` строк;
- JS unit tests: `31/31`.

Проверка:

- `node --check` для `contracts-monitoring-grids.js`, `contracts-monitoring.js`, `contracts-bootstrap.js`, `contracts-grid.js`: green;
- `npm run test:js`: green (`31/31`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke`: `3 passed`.

## Выполнено (итерация 22)

Продолжена декомпозиция `contracts-monitoring.js`: panel-controls/state orchestration вынесена в отдельный модуль.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-controls.js`
  - управление состоянием панели мониторинга при `no contract`/`editable`/`read-only`;
  - переключение `editing.allow*` для monitoring grid’ов;
  - обновление selection label’ов для КП/MDR;
  - управление статусными сообщениями и состоянием импорта.

Что изменено:

- `contracts-monitoring.js` переведён на `monitoringUiController` (`ContractsMonitoringControls.createController(...)`) и использует thin-wrapper вызовы:
  - `setMonitoringGridEditing(...)`;
  - `refreshMonitoringSelectionStatus()`;
  - `updateControls()`;
- обновлён bootstrap/wiring:
  - `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`;
  - `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`;
  - `src/Subcontractor.Web/Views/Home/Contracts.cshtml` (добавлен `contracts-monitoring-controls.js`).

Добавлены focused JS unit tests:

- `tests/js/contracts-monitoring-controls.test.js`
  - `no-contract reset` path;
  - `editable mode` path;
  - `read-only mode` path.
- `tests/js/contracts-bootstrap.test.js`
  - добавлен negative-case для отсутствующего `ContractsMonitoringControls`.

Метрика после итерации 22:

- `contracts-monitoring.js`: `384` строки (было `389`);
- `contracts-monitoring-controls.js`: `131` строка;
- JS unit tests: `35/35`.

Проверка:

- `node --check` для `contracts-monitoring-controls.js`, `contracts-monitoring.js`, `contracts-bootstrap.js`, `contracts-grid.js`: green;
- `npm run test:js`: green (`35/35`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke`: `3 passed`.

## Выполнено (итерация 23)

Продолжена декомпозиция `contracts-monitoring.js`: selection/sync orchestration вынесена в отдельный модуль.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-selection.js`
  - выбор и чтение текущей КП/MDR карточки;
  - refresh зависимых grid’ов (stages/rows) от текущего selection;
  - синхронизация stage/row данных обратно в выбранную parent-сущность;
  - `ensureSelection` (восстановление выбранных clientId + select/clear в grid + refresh зависимых таблиц).

Что изменено:

- `contracts-monitoring.js` переведён на `monitoringSelectionController` (`ContractsMonitoringSelection.createController(...)`);
- monitoring-controller оставлен как orchestration layer с thin-wrapper вызовами к selection module;
- обновлён bootstrap/wiring:
  - `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`;
  - `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`;
  - `src/Subcontractor.Web/Views/Home/Contracts.cshtml` (добавлен `contracts-monitoring-selection.js`).

Добавлены focused JS unit tests:

- `tests/js/contracts-monitoring-selection.test.js`
  - `ensure default selection` + refresh зависимых таблиц;
  - sync stage/row в выбранные parent-сущности + refresh parent grid.
- `tests/js/contracts-bootstrap.test.js`
  - добавлен negative-case для отсутствующего `ContractsMonitoringSelection`.

Метрика после итерации 23:

- `contracts-monitoring.js`: `373` строки (было `384`, снижение ещё на `11`);
- `contracts-monitoring-selection.js`: `159` строк;
- JS unit tests: `38/38`.

Проверка:

- `node --check` для `contracts-monitoring-selection.js`, `contracts-monitoring.js`, `contracts-bootstrap.js`, `contracts-grid.js`: green;
- `npm run test:js`: green (`38/38`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke`: `3 passed`.

## Выполнено (итерация 24)

Продолжена декомпозиция monitoring-grid слоя: крупный модуль `contracts-monitoring-grids.js` разделён на подмодули KPI/MDR с тонким orchestrator-слоем.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-kp.js`
  - конфигурация и инициализация grid’ов:
    - контрольные точки;
    - этапы контрольной точки.
- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-mdr.js`
  - конфигурация и инициализация grid’ов:
    - карточки MDR;
    - строки MDR.
- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids.js`
  - переведён в thin orchestrator:
    - делегирует создание grid’ов в KPI/MDR submodules;
    - выполняет контрактную валидацию зависимостей (`kpGridsModule`, `mdrGridsModule`).

Что изменено:

- `contracts-monitoring.js` теперь прокидывает `monitoringKpGridsModule`/`monitoringMdrGridsModule` в `monitoringGridsModule.createGrids(...)`;
- обновлён bootstrap/wiring:
  - `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`;
  - `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`;
  - `src/Subcontractor.Web/Views/Home/Contracts.cshtml` (добавлены `contracts-monitoring-grids-kp.js` и `contracts-monitoring-grids-mdr.js` перед orchestrator script).

Добавлены/обновлены JS unit tests:

- `tests/js/contracts-bootstrap.test.js`
  - добавлены negative-cases для отсутствующих:
    - `ContractsMonitoringKpGrids`;
    - `ContractsMonitoringMdrGrids`.
- `tests/js/contracts-monitoring-grids.test.js`
  - адаптирован к submodule orchestration;
  - добавлен контрактный negative-test на обязательность `kpGridsModule`/`mdrGridsModule`.

Метрика после итерации 24:

- `contracts-monitoring.js`: `377` строк;
- `contracts-monitoring-grids.js`: `70` строк (было `800`);
- `contracts-monitoring-grids-kp.js`: `380` строк;
- `contracts-monitoring-grids-mdr.js`: `450` строк;
- JS unit tests: `41/41`.

Проверка:

- `node --check` для `contracts-monitoring-grids-kp.js`, `contracts-monitoring-grids-mdr.js`, `contracts-monitoring-grids.js`, `contracts-monitoring.js`, `contracts-bootstrap.js`, `contracts-grid.js`: green;
- `npm run test:js`: green (`41/41`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `CI=1 BASE_URL=http://127.0.0.1:5099 npm run test:smoke`: `3 passed`.

## Выполнено (итерация 25)

Добавлен entrypoint composition contract suite для `contracts-grid.js`:

- `tests/js/contracts-grid-entrypoint.test.js`

Покрытые ветки:

- early-return при отсутствии `ContractsGridBootstrap`;
- early-return при `createBootstrapContext() -> null`;
- контрактная композиция:
  - `bootstrap -> api/model/state/controllers`;
  - инициализация `registry/execution/workflow/draft/monitoring`;
  - wiring callbacks:
    - `registry.onSelectionChanged`;
    - `workflow.onTransitionCompleted`;
    - `draft.onDraftCreated`.
- контрактный вызов `parseMdrImportFile` с `window.XLSX` через monitoring-controller options.

Метрика после итерации 25:

- JS unit tests: `359/359` (было `356/356`).

Проверка:

- `node --check tests/js/contracts-grid-entrypoint.test.js`: green;
- `npm run test:js -- --runInBand`: green (`359/359`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`).

## Выполнено (итерация 26)

Продолжена декомпозиция helper-слоя договоров: `contracts-grid-helpers.js` переведён в thin composition-layer, а бизнес-утилиты выделены в подмодули.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-filter-helpers.js`
  - URL/filter логика (`buildStatusFilter`, `readUrlFilterState`, `describeUrlFilters`, `appendFilterHint`, `clearUrlFilters`);
- `src/Subcontractor.Web/wwwroot/js/contracts-grid-payload-helpers.js`
  - payload/normalization/error логика (`normalizeGuid`, `isGuid`, `toNullableDate`, `toNumber`, `parseErrorBody`, `buildMilestonesPayload`);
- `src/Subcontractor.Web/wwwroot/js/contracts-grid-import-helpers.js`
  - MDR import parsing (`parseDelimitedText`/`parseWorkbookRows`, header mapping, row validation, `parseMdrImportItemsFromRows`, `parseMdrImportFile`).

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-helpers.js`
  - уменьшен до composition-wrapper;
  - агрегирует подмодули в backward-compatible API `window.ContractsGridHelpers`;
  - добавляет контрактную валидацию required methods для submodules.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order: новые submodules подключаются перед `contracts-grid-helpers.js`.

Добавлены focused JS unit tests:

- `tests/js/contracts-grid-helper-modules.test.js`
  - контракт `filter helpers`;
  - контракт `payload helpers`;
  - контракт `import helpers`.

Метрика после итерации 26:

- `contracts-grid-helpers.js`: `61` строка (было `511`, снижение на `450`);
- `contracts-grid-filter-helpers.js`: `110` строк;
- `contracts-grid-payload-helpers.js`: `118` строк;
- `contracts-grid-import-helpers.js`: `311` строк;
- JS unit tests: `369/369` (было `366/366`).

Проверка:

- `npm run test:js`: green (`369/369`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`173/173`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`301/301`).

## Выполнено (итерация 27)

Продолжена декомпозиция KPI-grid слоя мониторинга договоров: `contracts-monitoring-grids-kp.js` переведён в thin orchestrator, а columns/events логика выделена в submodules.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-kp-columns.js`
  - конфигурация колонок grid’ов:
    - контрольные точки;
    - этапы контрольной точки.
- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-kp-events.js`
  - event-handlers grid’ов:
    - selection/init/update/error flow для контрольных точек;
    - init/insert-guard/update/sync/error flow для этапов.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-kp.js`
  - добавлен module-resolver с контрактной проверкой зависимостей;
  - вынесены form-items builders;
  - grid-конфигурация теперь собирается через `columns/events` submodules.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-monitoring-grids-kp-columns.js`;
    - `contracts-monitoring-grids-kp-events.js`;
    - `contracts-monitoring-grids-kp.js`.

Добавлены focused JS unit tests:

- `tests/js/contracts-monitoring-grids-kp-columns.test.js`
  - контракт по колонкам KPI-grid’ов (включая stage counter и progress-range validation).
- `tests/js/contracts-monitoring-grids-kp-events.test.js`
  - dependency guards;
  - selection/update/sync/dirty-state callbacks;
  - guard на вставку этапов без выбранной контрольной точки.

Метрика после итерации 27:

- `contracts-monitoring-grids-kp.js`: `205` строк (было `380`, снижение на `175`);
- `contracts-monitoring-grids-kp-columns.js`: `178` строк;
- `contracts-monitoring-grids-kp-events.js`: `142` строки;
- JS unit tests: `404/404` (было `399/399`).

Проверка:

- `dotnet build Subcontractor.sln`: green;
- `npm run test:js`: green (`404/404`);
- `npm run test:smoke`: `10 passed`, `1 skipped`.

## Выполнено (итерация 28)

Усилено тестовое покрытие entrypoint-слоя мониторинга договоров без изменения пользовательского поведения.

Добавлен отдельный contract suite:

- `tests/js/contracts-monitoring-entrypoint.test.js`

Покрытые ветки:

- композиция `contracts-monitoring` контроллера при `init()`:
  - инициализация `grids`/`ui-controller`/`selection-controller`/`data-service`/`import-controller`;
  - корректный wiring зависимостей между слоями;
  - подписка на кнопки refresh/save.
- error-path для save handler:
  - rejected `saveData()` транслируется в `setMonitoringStatus(..., true)`.
- публичные методы `updateControls/loadData/saveData` делегируют вызовы в соответствующие runtime-компоненты.

Метрика после итерации 28:

- JS unit tests: `407/407` (было `404/404`).

Проверка:

- `npm run test:js`: green (`407/407`).

## Выполнено (итерация 29)

Сделана декомпозиция bootstrap/wiring слоя мониторинга договоров (`contracts-monitoring`) с сохранением текущего UI-поведения.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-bootstrap.js`
  - валидация composition-контракта для `contracts-monitoring`:
    - required elements;
    - required service/module methods;
    - required callback dependencies.
- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-wiring.js`
  - wiring-функции:
    - `bindCoreEvents(...)` для refresh/save handlers;
    - `createGridDataBinders(...)` для безопасного grid dataSource binding.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring.js`
  - переведён на module-resolver (`ContractsMonitoringBootstrap` + `ContractsMonitoringWiring`);
  - `init` использует вынесенные wiring/data-binder функции;
  - сохранён backward-compatible public API (`init`, `loadData`, `saveData`, `updateControls`).
- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`
  - добавлены bootstrap checks для:
    - `ContractsMonitoringBootstrap`;
    - `ContractsMonitoringWiring`.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-monitoring-bootstrap.js`;
    - `contracts-monitoring-wiring.js`;
    - `contracts-monitoring.js`.

Добавлены focused JS unit tests:

- `tests/js/contracts-monitoring-bootstrap.test.js`
  - composition-context contract + required dependency guards.
- `tests/js/contracts-monitoring-wiring.test.js`
  - refresh/save wiring contract + error propagation;
  - grid data binders contract.
- `tests/js/contracts-bootstrap.test.js`
  - добавлены negative-cases для отсутствующих:
    - `ContractsMonitoringBootstrap`;
    - `ContractsMonitoringWiring`.

Метрика после итерации 29:

- `contracts-monitoring.js`: `387` строк;
- `contracts-monitoring-bootstrap.js`: `94` строки;
- `contracts-monitoring-wiring.js`: `89` строк;
- JS unit tests: `415/415` (было `407/407`).

Проверка:

- `dotnet build Subcontractor.sln`: green;
- `npm run test:js`: green (`415/415`);
- `npm run test:smoke`: `10 passed`, `1 skipped`.

## Выполнено (итерация 30)

Продолжена декомпозиция реестра договоров: `contracts-registry.js` переведён в thin orchestration-layer с выделением columns/events/store submodules.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-registry-columns.js`
  - schema-конфигурация:
    - popup form items;
    - grid columns с `statusLookup`.
- `src/Subcontractor.Web/wwwroot/js/contracts-registry-events.js`
  - event handlers:
    - selection sync;
    - editor read-only rules;
    - toolbar refresh/clear URL filters;
    - data-error reporting.
- `src/Subcontractor.Web/wwwroot/js/contracts-registry-store.js`
  - `CustomStore` orchestration:
    - `load/insert/update/remove`;
    - cache/status/update callbacks;
    - payload-builder integration.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-registry.js`
  - добавлен module-resolver и dependency guards;
  - controller собирает grid config через `columns/events/store` submodules;
  - сохранён backward-compatible API (`init`, `refreshAndSelect`).
- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`
  - добавлены bootstrap checks для:
    - `ContractsRegistryColumns`;
    - `ContractsRegistryEvents`;
    - `ContractsRegistryStore`.
- `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`
  - registry-controller получает `columnsModule/eventsModule/storeModule` из bootstrap context.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-registry-columns.js`;
    - `contracts-registry-events.js`;
    - `contracts-registry-store.js`;
    - `contracts-registry.js`.

Добавлены/обновлены JS unit tests:

- `tests/js/contracts-registry-columns.test.js`
- `tests/js/contracts-registry-events.test.js`
- `tests/js/contracts-registry-store.test.js`
- `tests/js/contracts-registry.test.js`
- `tests/js/contracts-bootstrap.test.js`
  - добавлены negative-cases для отсутствующих registry submodules.
- `tests/js/contracts-grid-entrypoint.test.js`
  - проверка передачи `registryColumnsModule/registryEventsModule/registryStoreModule`.

Метрика после итерации 30:

- `contracts-registry.js`: `186` строк (было `342`, снижение на `156`);
- `contracts-registry-columns.js`: `139` строк;
- `contracts-registry-events.js`: `99` строк;
- `contracts-registry-store.js`: `91` строк;
- JS unit tests: `427/427` (было `415/415`).

Проверка:

- `dotnet build Subcontractor.sln`: green;
- `npm run test:js`: green (`427/427`);
- `npm run test:smoke`: `10 passed`, `1 skipped`.

## Выполнено (итерация 31)

Продолжена декомпозиция execution-панели договоров: из `contracts-execution-panel.js` вынесены grid schema/configuration и events-handlers в отдельные submodules.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-execution-panel-grid.js`
  - schema-конфигурация:
    - popup form items;
    - columns definition;
    - default dxDataGrid config (`createGridConfig`).
- `src/Subcontractor.Web/wwwroot/js/contracts-execution-panel-events.js`
  - event handlers:
    - `onInitNewRow`;
    - `onRowInserted/onRowUpdated/onRowRemoved` с persist/error handling;
    - `onDataErrorOccurred`.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-execution-panel.js`
  - переведён в thin orchestration-layer с module-resolver;
  - собирает grid через `gridModule + eventsModule`;
  - сохранён backward-compatible API (`init`, `updateControls`, `loadExecutionData`).
- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`
  - добавлены bootstrap checks для:
    - `ContractsExecutionPanelGrid`;
    - `ContractsExecutionPanelEvents`.
- `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`
  - execution-controller получает `gridModule/eventsModule` из bootstrap context.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-execution-panel-grid.js`;
    - `contracts-execution-panel-events.js`;
    - `contracts-execution-panel.js`.

Добавлены/обновлены JS unit tests:

- `tests/js/contracts-execution-panel-grid.test.js`
- `tests/js/contracts-execution-panel-events.test.js`
- `tests/js/contracts-execution-panel.test.js`
- `tests/js/contracts-bootstrap.test.js`
  - добавлены negative-cases для отсутствующих execution-panel submodules.
- `tests/js/contracts-grid-entrypoint.test.js`
  - проверка передачи `executionPanelGridModule/executionPanelEventsModule`.

Метрика после итерации 31:

- `contracts-execution-panel.js`: `182` строки (было `276`, снижение на `94`);
- `contracts-execution-panel-grid.js`: `136` строк;
- `contracts-execution-panel-events.js`: `57` строк;
- JS unit tests: `437/437` (было `427/427`).

Проверка:

- `dotnet build Subcontractor.sln`: green;
- `npm run test:js`: green (`437/437`);
- `npm run test:smoke`: `10 passed`, `1 skipped`.

## Выполнено (итерация 32)

Продолжена декомпозиция workflow-панели договоров: из `contracts-workflow.js` вынесены history grid configuration и workflow event-handlers.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-workflow-history-grid.js`
  - history-grid schema/config:
    - columns;
    - default dxDataGrid config (`createGridConfig`).
- `src/Subcontractor.Web/wwwroot/js/contracts-workflow-events.js`
  - обработчики workflow-действий:
    - apply transition click-handler с валидацией выбранного договора, target-status и причины отката;
    - history refresh click-handler.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-workflow.js`
  - переведён в thin orchestration-layer с module-resolver;
  - controller собирает history-grid через `historyGridModule` и события через `eventsModule`;
  - сохранён backward-compatible API (`init`, `loadHistory`, `updateControls`).
- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`
  - добавлены bootstrap checks для:
    - `ContractsWorkflowHistoryGrid`;
    - `ContractsWorkflowEvents`.
- `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`
  - workflow-controller получает `historyGridModule/eventsModule` из bootstrap context.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-workflow-history-grid.js`;
    - `contracts-workflow-events.js`;
    - `contracts-workflow.js`.

Добавлены/обновлены JS unit tests:

- `tests/js/contracts-workflow-history-grid.test.js`
- `tests/js/contracts-workflow-events.test.js`
- `tests/js/contracts-workflow.test.js`
- `tests/js/contracts-bootstrap.test.js`
  - добавлены negative-cases для отсутствующих workflow submodules.
- `tests/js/contracts-grid-entrypoint.test.js`
  - проверка передачи `workflowHistoryGridModule/workflowEventsModule`.

Метрика после итерации 32:

- `contracts-workflow.js`: `193` строки (было `236`, снижение на `43`);
- `contracts-workflow-history-grid.js`: `89` строк;
- `contracts-workflow-events.js`: `86` строк;
- JS unit tests: `449/449` (было `437/437`).

Проверка:

- `dotnet build Subcontractor.sln`: green;
- `npm run test:js`: green (`449/449`);
- `npm run test:smoke`: `10 passed`, `1 skipped`.

## Выполнено (итерация 33)

Проведена декомпозиция draft-панели договоров: из `contracts-draft.js` вынесены event-handlers в отдельный submodule.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-draft-events.js`
  - обработчик создания черновика:
    - валидация GUID процедуры;
    - вызов API `createDraftFromProcedure`;
    - success/error status handling;
    - clear inputs + callback `onDraftCreated`.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-draft.js`
  - переведён в thin orchestration-layer с module-resolver;
  - собирает click-handler через `eventsModule`;
  - сохранён backward-compatible API (`init`).
- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`
  - добавлен bootstrap check для:
    - `ContractsDraftEvents`.
- `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`
  - draft-controller получает `eventsModule` из bootstrap context.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-draft-events.js`;
    - `contracts-draft.js`.

Добавлены/обновлены JS unit tests:

- `tests/js/contracts-draft-events.test.js`
- `tests/js/contracts-draft.test.js`
- `tests/js/contracts-bootstrap.test.js`
  - добавлен negative-case для отсутствующего `ContractsDraftEvents`.
- `tests/js/contracts-grid-entrypoint.test.js`
  - проверка передачи `draftEventsModule`.

Метрика после итерации 33:

- `contracts-draft.js`: `101` строка (было `76`, рост за счёт resolver/wiring);
- `contracts-draft-events.js`: `60` строк;
- JS unit tests: `455/455` (было `449/449`).

Проверка:

- `dotnet build Subcontractor.sln`: green;
- `npm run test:js`: green (`455/455`);
- `npm run test:smoke`: `10 passed`, `1 skipped`.

## Выполнено (итерация 34)

Продолжена декомпозиция bootstrap-слоя contracts page: `contracts-bootstrap.js` переведён в thin orchestrator, а сбор DOM-элементов и module-resolution вынесены в отдельные submodules.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap-elements.js`
  - единый каталог селекторов `[data-contracts-*]`;
  - `collectElements(...)`;
  - `hasRequiredElements(...)`.
- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap-modules.js`
  - декларативный registry зависимостей (`moduleDescriptors`);
  - унифицированный resolve-проход по всем contracts modules;
  - сохранены прежние diagnostic/error messages для отсутствующих модулей.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js`
  - переведён на thin orchestration;
  - добавлен support-module resolver (`window`/`require` fallback) для Node/browser совместимости;
  - сохранён backward-compatible API (`createBootstrapContext`).
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-bootstrap-elements.js`;
    - `contracts-bootstrap-modules.js`;
    - `contracts-bootstrap.js`.

Добавлены/обновлены JS unit tests:

- `tests/js/contracts-bootstrap-elements.test.js`
- `tests/js/contracts-bootstrap-modules.test.js`
- `tests/js/contracts-bootstrap.test.js`
  - существующие negative-cases продолжают подтверждать диагностический контракт bootstrap-слоя без изменений поведения.

Метрика после итерации 34:

- `contracts-bootstrap.js`: `98` строк (было `346`, снижение на `248`);
- `contracts-bootstrap-elements.js`: `73` строки;
- `contracts-bootstrap-modules.js`: `251` строка;
- JS unit tests: `459/459` (было `455/455`).

Проверка:

- `dotnet build Subcontractor.sln`: green;
- `npm run test:js`: green (`459/459`);
- `npm run test:smoke`: `10 passed`, `1 skipped`.

## Выполнено (итерация 35)

Продолжена декомпозиция monitoring-слоя contracts page и закрыт residual smoke-gap:

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-runtime.js`
  - runtime orchestration monitoring-блока:
    - refresh orchestration;
    - status propagation;
    - controller-to-controller coordination contract.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring.js`
  - переведён на thin orchestration поверх `bootstrap/wiring/runtime` submodules;
  - сохранён backward-compatible API для entrypoint wiring.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-monitoring-runtime.js` подключается перед `contracts-monitoring.js`.
- `tests/smoke/navigation-smoke.spec.js`
  - снят `skip` с read-only contracts smoke path;
  - сценарий теперь strict-fail, если auto-seed не дал доступных строк для выбора.

Добавлены/обновлены JS unit tests:

- `tests/js/contracts-monitoring-runtime.test.js`;
- `tests/js/contracts-monitoring.test.js` (обновлён contract coverage для runtime module wiring);
- `tests/js/contracts-grid-entrypoint.test.js` (runtime module propagation contract).

Метрика после итерации 35:

- `contracts-monitoring.js`: `247` строк;
- `contracts-monitoring-runtime.js`: `234` строки;
- JS unit tests: `471/471`.

Проверка:

- `dotnet build Subcontractor.sln`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `npm run test:js`: green (`471/471`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`11/11`);
- `SUBCONTRACTOR_SQL_TESTS=1 ./.dotnet/dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false --no-build --filter "SqlSuite=Core"`: green (`78/78`);
- `SUBCONTRACTOR_SQL_TESTS=1 ./.dotnet/dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj -p:UseAppHost=false --no-build`: green (`80/80`).

## Выполнено (итерация 36)

Продолжена декомпозиция monitoring-model слоя contracts page: `contracts-monitoring-model.js` переведён в thin orchestrator, а normalization/metrics/payload логика вынесена в отдельные submodules.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model-normalization.js`
  - `fallbackToNumber`/`fallbackToNullableDate`;
  - `createClientIdFactory`;
  - `normalizeControlPoint`/`normalizeMdrCard`;
  - request-item converters (`toControlPointStageRequestItem`, `toMdrRowRequestItem`).
- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model-metrics.js`
  - `calculateDeviationPercent`;
  - `calculateMdrCardMetrics`.
- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model-payload.js`
  - `buildControlPointsPayload`;
  - `buildMdrCardsPayload`.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model.js`
  - переведён в thin orchestrator с module-resolver;
  - сохранён backward-compatible API (`createModel` -> `normalize/build/calculate` methods).
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-monitoring-model-normalization.js`;
    - `contracts-monitoring-model-metrics.js`;
    - `contracts-monitoring-model-payload.js`;
    - `contracts-monitoring-model.js`.

Добавлены JS unit tests:

- `tests/js/contracts-monitoring-model-normalization.test.js`;
- `tests/js/contracts-monitoring-model-metrics.test.js`;
- `tests/js/contracts-monitoring-model-payload.test.js`.

Метрика после итерации 36:

- `contracts-monitoring-model.js`: `145` строк (было `319`, снижение на `174`);
- `contracts-monitoring-model-normalization.js`: `185` строк;
- `contracts-monitoring-model-metrics.js`: `68` строк;
- `contracts-monitoring-model-payload.js`: `211` строк;
- JS unit tests: `532/532` (было `523/523`).

Проверка:

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `npm run test:js`: green (`532/532`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: blocked на текущем хосте (SQL Server `localhost:1433` недоступен, страницы возвращают `500` до рендера UI).

## Выполнено (итерация 37)

Продолжена декомпозиция import-helper слоя contracts page: `contracts-grid-import-helpers.js` переведён в thin orchestrator, а file-parsing/MDR-row mapping логика вынесена в отдельные submodules.

Новые модули:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-import-file-parsing.js`
  - `isRowEmpty`;
  - delimited parser (`detectDelimiter`, `parseCsvLine`, `parseDelimitedText`);
  - workbook parser (`parseWorkbookRows`);
  - import file dispatcher (`parseMdrImportFile`).
- `src/Subcontractor.Web/wwwroot/js/contracts-grid-import-mdr-rows.js`
  - header normalization/mapping;
  - date/number parsing (`parseImportDate`, `parseImportNumber`);
  - `parseMdrImportItemsFromRows` validation/projection.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-import-helpers.js`
  - переведён в thin orchestrator с module-resolver;
  - сохранён backward-compatible API (`isRowEmpty`, `parseDelimitedText`, `parseMdrImportFile`, `parseMdrImportItemsFromRows`).
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-grid-import-file-parsing.js`;
    - `contracts-grid-import-mdr-rows.js`;
    - `contracts-grid-import-helpers.js`.

Добавлены JS unit tests:

- `tests/js/contracts-grid-import-file-parsing.test.js`;
- `tests/js/contracts-grid-import-mdr-rows.test.js`.

Метрика после итерации 37:

- `contracts-grid-import-helpers.js`: `53` строки (было `311`, снижение на `258`);
- `contracts-grid-import-file-parsing.js`: `140` строк;
- `contracts-grid-import-mdr-rows.js`: `192` строки;
- JS unit tests: `538/538` (было `532/532`).

Проверка:

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `npm run test:js`: green (`538/538`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: blocked на текущем хосте (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

## Выполнено (итерация 38)

Продолжена декомпозиция entrypoint-слоя contracts page: `contracts-grid.js` переведён в thin delegating entrypoint, а runtime orchestration вынесена в отдельный модуль.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime.js`
  - orchestration контур contracts page:
    - composition `api/model/state/controllers`;
    - cross-controller refresh координация (`registry/workflow/execution/monitoring`);
    - URL-filter bootstrap (`read/clear filter state`);
    - monitoring MDR import parser binding через `window.XLSX`.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid.js`
  - переведён в thin entrypoint (`bootstrap -> runtime`);
  - добавлен runtime module resolver (`window`/`require` fallback) с обязательным методом `initializeContractsGrid`.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-grid-runtime.js` подключается перед `contracts-grid.js`.

Добавлены/обновлены JS unit tests:

- `tests/js/contracts-grid-entrypoint.test.js`
  - компактный contract suite на bootstrap/runtime delegation.
- `tests/js/contracts-grid-runtime.test.js`
  - перенесён orchestration-contract coverage из старого entrypoint-теста:
    - module composition;
    - callbacks (`onSelectionChanged`, `onTransitionCompleted`, `onDraftCreated`);
    - MDR parse binding (`window.XLSX`);
    - URL filter clear flow.

Метрика после итерации 38:

- `contracts-grid.js`: `48` строк (было `259`, снижение на `211`);
- `contracts-grid-runtime.js`: `319` строк;
- `contracts-grid-entrypoint.test.js`: `56` строк;
- `contracts-grid-runtime.test.js`: `343` строки;
- JS unit tests: `586/586` (было `585/585`).

Проверка:

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `npm run test:js`: green (`586/586`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: blocked на текущем хосте (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

## Выполнено (итерация 39)

Продолжена декомпозиция runtime-слоя contracts page: базовый bootstrap/state/filter/status контур вынесен в отдельный foundation-модуль.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-foundation.js`
  - базовый runtime foundation:
    - dependency guards (`helpers/api/model/state/execution`);
    - `apiClient`/`monitoringModel`/`gridState` bootstrap;
    - status/catalog/filter bootstrap (`statusValues/statusLookup/urlFilterState`);
    - UI status writers и URL filter helpers (`append/clear`);
    - shared selectors (`localizeStatus/getStatusRank/getSelectedContract/canEditMilestones`).

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime.js`
  - переведён на thin orchestration поверх `contracts-grid-runtime-foundation`;
  - добавлен module resolver для foundation submodule (`window`/`require` fallback).
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-grid-runtime-foundation.js` подключается перед `contracts-grid-runtime.js`.

Добавлены JS unit tests:

- `tests/js/contracts-grid-runtime-foundation.test.js`
  - contract coverage foundation-слоя:
    - required options;
    - api/model/state bootstrap;
    - status writers;
    - URL filter clear flow.

Метрика после итерации 39:

- `contracts-grid-runtime.js`: `281` строка (было `319`, снижение на `38`);
- `contracts-grid-runtime-foundation.js`: `155` строк;
- `contracts-grid-runtime-foundation.test.js`: `142` строки;
- JS unit tests: `588/588` (было `586/586`).

Проверка:

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `npm run test:js`: green (`588/588`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: blocked на текущем хосте (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

## Выполнено (итерация 40)

Продолжена декомпозиция runtime-слоя contracts page: controller-composition вынесена в отдельный submodule.

Новый модуль:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers.js`
  - controller composition:
    - сборка `monitoring/workflow/draft/execution/registry` контроллеров;
    - shared callback orchestration (`onSelectionChanged`, `onTransitionCompleted`, `onDraftCreated`);
    - единый lifecycle hook `initAll()`.

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime.js`
  - переведён на thin orchestration поверх `foundation + controllers`;
  - добавлен module resolver для `contracts-grid-runtime-controllers`.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - обновлён script-order:
    - `contracts-grid-runtime-controllers.js` подключается перед `contracts-grid-runtime.js`.

Добавлены JS unit tests:

- `tests/js/contracts-grid-runtime-controllers.test.js`
  - contract coverage controller-composition:
    - required dependencies;
    - composition/wiring опций в каждый controller;
    - orchestration callbacks и `initAll` lifecycle.

Метрика после итерации 40:

- `contracts-grid-runtime.js`: `94` строки (было `281`, снижение на `187`);
- `contracts-grid-runtime-controllers.js`: `257` строк;
- `contracts-grid-runtime-controllers.test.js`: `313` строк;
- JS unit tests: `590/590` (было `588/588`).

Проверка:

- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `npm run test:js`: green (`590/590`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: blocked на текущем хосте (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

## Выполнено (итерация 41)

Завершена декомпозиция controller-runtime слоя contracts page: orchestration оставлена в `contracts-grid-runtime-controllers.js`, а сборка конкретных controller wiring-вариантов перенесена в отдельные submodules с явным подключением в браузерном script-order.

Новые/актуализированные submodules:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-monitoring.js`
  - factory сборки monitoring controller (`createMonitoringController`).
- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-workflow.js`
  - factory сборки workflow + draft controllers (`createWorkflowAndDraftControllers`).
- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-execution.js`
  - factory сборки execution controller (`createExecutionController`).
- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-registry.js`
  - factory сборки registry controller (`createRegistryController`).

Что изменено:

- `src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers.js`
  - оставлен thin orchestration/composition слой;
  - module-resolver переведён на явную загрузку 4 submodules.
- `src/Subcontractor.Web/Views/Home/Contracts.cshtml`
  - исправлен script-order для браузерного окружения:
    - `contracts-grid-runtime-controllers-monitoring.js`;
    - `contracts-grid-runtime-controllers-workflow.js`;
    - `contracts-grid-runtime-controllers-execution.js`;
    - `contracts-grid-runtime-controllers-registry.js`;
    - затем `contracts-grid-runtime-controllers.js` и `contracts-grid-runtime.js`.

Добавлены JS unit tests:

- `tests/js/contracts-grid-runtime-controllers-monitoring.test.js`;
- `tests/js/contracts-grid-runtime-controllers-workflow.test.js`;
- `tests/js/contracts-grid-runtime-controllers-execution.test.js`;
- `tests/js/contracts-grid-runtime-controllers-registry.test.js`.

Метрика после итерации 41:

- `contracts-grid-runtime-controllers.js`: `157` строк (было `257`, снижение на `100`);
- `contracts-grid-runtime-controllers-monitoring.js`: `98` строк;
- `contracts-grid-runtime-controllers-workflow.js`: `100` строк;
- `contracts-grid-runtime-controllers-execution.js`: `67` строк;
- `contracts-grid-runtime-controllers-registry.js`: `81` строк;
- JS unit tests: `598/598` (было `590/590`).

Проверка:

- `node --test tests/js/contracts-grid-runtime-foundation.test.js tests/js/contracts-grid-runtime-controllers-monitoring.test.js tests/js/contracts-grid-runtime-controllers-workflow.test.js tests/js/contracts-grid-runtime-controllers-execution.test.js tests/js/contracts-grid-runtime-controllers-registry.test.js tests/js/contracts-grid-runtime-controllers.test.js tests/js/contracts-grid-runtime.test.js tests/js/contracts-grid-entrypoint.test.js`: green (`16/16`);
- `npm run test:js`: green (`598/598`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: blocked на текущем хосте (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).

## Выполнено (итерация 42)

Добавлен frontend regression guard на порядок подключения runtime-скриптов contracts page, чтобы исключить повторную деградацию `browser-only` сценария (когда submodule существует, но не подключён в Razor view).

Что изменено:

- `tests/js/contracts-script-order.test.js`
  - проверяет наличие и строгий порядок script references в `Contracts.cshtml`:
    - `contracts-grid-runtime-foundation.js`;
    - `contracts-grid-runtime-controllers-monitoring.js`;
    - `contracts-grid-runtime-controllers-workflow.js`;
    - `contracts-grid-runtime-controllers-execution.js`;
    - `contracts-grid-runtime-controllers-registry.js`;
    - `contracts-grid-runtime-controllers.js`;
    - `contracts-grid-runtime.js`;
    - `contracts-grid.js`.

Метрика после итерации 42:

- `contracts-script-order.test.js`: `42` строки;
- JS unit tests: `599/599` (было `598/598`).

Проверка:

- `node --test tests/js/contracts-script-order.test.js`: green (`1/1`);
- `npm run test:js`: green (`599/599`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: blocked на текущем хосте (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering).
