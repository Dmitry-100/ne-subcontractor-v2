# Refactoring Notes — Imports UI (Wave 2)

Дата обновления: `2026-04-12`

## Цель

Пошагово декомпозировать `imports-page.js` без изменения пользовательского поведения, начиная с выделения pure-логики в отдельные тестируемые модули.

## Выполнено (итерация 1)

Выделен helper-модуль с pure-логикой импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-helpers.js`

Что вынесено из `imports-page.js`:

- парсинг/нормализация текста и CSV:
  - `normalizeText`, `isRowEmpty`, `detectDelimiter`, `parseCsvLine`, `parseDelimitedText`;
- преобразование данных:
  - `parseNumber`, `formatDateIso`, `parseDate`;
- mapping utilities:
  - `ensureUniqueColumnNames`, `deriveColumns`, `findColumnIndex`, `buildAutoMapping`;
- row mapping/валидация:
  - `mapRawRow`;
- форматирование для UI:
  - `formatNumber`, `formatShortDate`, `formatDateRange`;
- служебные utilities:
  - `localizeImportStatus`, `buildDefaultXmlFileName`.

`imports-page.js` переведён на thin wrappers к helper-модулю.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки:

1. `imports-page-helpers.js`
2. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-helpers.test.js`

Покрытые сценарии:

- локализация статусов;
- parse delimited content;
- unique columns derivation;
- auto mapping (header/no-header);
- valid/invalid `mapRawRow`;
- formatter branches + default XML filename builder.

## Метрика после итерации 1

- `imports-page.js`: `1682` строки (было `1959`, снижение на `277` строк);
- `imports-page-helpers.js`: `403` строки;
- JS unit tests: `47/47`.

## Проверка

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-helpers.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`47/47`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для non-CI режима read-only seed сценария).

## Выполнено (итерация 2)

Выделен API/request модуль страницы импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-api.js`

Что вынесено из `imports-page.js`:

- `request` и разбор API-ошибок;
- URL-builders для отчётов:
  - `validation-report`;
  - `lot-reconciliation-report`.

`imports-page.js` переведён на thin wrappers к `imports-page-api.js`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-api.js`
3. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-api.test.js`

Покрытые сценарии:

- `parseErrorBody` (detail/error/title/fallback);
- URL builders;
- `request` header/credentials behavior;
- `204/empty` response handling;
- error branch с parsed сообщением.

## Метрика после итерации 2

- `imports-page.js`: `1634` строки (было `1682`, снижение ещё на `48`);
- `imports-page-helpers.js`: `403` строки;
- `imports-page-api.js`: `117` строк;
- JS unit tests: `52/52`.

## Проверка после итерации 2

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-api.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`52/52`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для non-CI режима read-only seed сценария).

## Выполнено (итерация 3)

Выделен lot-state модуль страницы импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-lot-state.js`

Что вынесено из `imports-page.js`:

- выбор/подготовка рекомендационных групп:
  - `getRecommendationGroups`,
  - `getSelectedRecommendationGroups`,
  - `buildSelectionMap`;
- rules/guards для actions:
  - `resolveActionState`,
  - `shouldResetRecommendations`;
- payload/summary:
  - `buildLotApplyPayload`,
  - `buildApplySummary`.

`imports-page.js` переведён на thin wrappers к `imports-page-lot-state.js` в логике lot recommendations.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-api.js`
3. `imports-page-lot-state.js`
4. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-lot-state.test.js`

Покрытые сценарии:

- derivation recommendation/selected groups;
- selection map defaults + reuse previous values;
- action availability rules;
- reset guards by batch/status;
- apply payload validation/mapping;
- apply summary message formatting.

## Метрика после итерации 3

- `imports-page.js`: `1590` строк (было `1634`, снижение ещё на `44`);
- `imports-page-helpers.js`: `403` строки;
- `imports-page-api.js`: `117` строк;
- `imports-page-lot-state.js`: `139` строк;
- JS unit tests: `58/58`.

## Проверка после итерации 3

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-lot-state.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`58/58`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для non-CI режима read-only seed сценария).

## Выполнено (итерация 4)

Углублена декомпозиция API-слоя: endpoint-specific HTTP orchestration вынесена из `imports-page.js` в `imports-page-api.js`.

Что вынесено:

- batches:
  - `getBatches`,
  - `getBatchDetails`,
  - `getBatchHistory`,
  - `createQueuedBatch`,
  - `transitionBatch`;
- XML inbox:
  - `getXmlInbox`,
  - `queueXmlInboxItem`,
  - `retryXmlInboxItem`;
- lot recommendations:
  - `getLotRecommendations`,
  - `applyLotRecommendations`.

`imports-page.js` переведён на вызовы endpoint-методов `apiClient`, прямые URL-конкатенации для этих операций удалены из UI-слоя.

Добавлены/расширены JS unit tests:

- `tests/js/imports-page-api.test.js`

Новый покрытый сценарий:

- валидация URL/method/body для всех endpoint helper-методов API-клиента.

## Метрика после итерации 4

- `imports-page.js`: `1590` строк;
- `imports-page-api.js`: `184` строки (было `117`, +`67`);
- `imports-page-lot-state.js`: `139` строк;
- `imports-page-helpers.js`: `403` строки;
- JS unit tests: `59/59`.

## Проверка после итерации 4

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-api.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`59/59`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для non-CI режима read-only seed сценария).

## Выполнено (итерация 5)

Выделен workflow-модуль страницы импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-workflow.js`

Что вынесено из `imports-page.js`:

- rules переходов статусов:
  - `getTransitionTargets`,
  - `buildTransitionStatus`;
- auto-refresh rule:
  - `shouldAutoRefreshDetails`;
- validation/payload для transition action:
  - `validateTransitionRequest`;
- summary formatting:
  - `buildBatchDetailsSummary`.

`imports-page.js` переведён на thin wrappers к `imports-page-workflow.js` в блоке batch workflow/transition.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-api.js`
3. `imports-page-lot-state.js`
4. `imports-page-workflow.js`
5. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-workflow.test.js`

Покрытые сценарии:

- async auto-refresh rules;
- transition guidance branches (no targets / selectable targets);
- transition validation + payload mapping;
- batch details summary formatting.

## Метрика после итерации 5

- `imports-page.js`: `1527` строк (было `1590`, снижение на `63` после выноса workflow + удаления неиспользуемых thin-wrapper функций);
- `imports-page-workflow.js`: `105` строк;
- `imports-page-api.js`: `179` строк;
- `imports-page-lot-state.js`: `139` строк;
- `imports-page-helpers.js`: `403` строки;
- JS unit tests: `64/64`.

## Проверка после итерации 5

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-workflow.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`64/64`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для non-CI режима read-only seed сценария).

## Выполнено (итерация 6)

Продолжена декомпозиция `imports-page.js` в части lot-selection event logic.

Что вынесено в `imports-page-lot-state.js`:

- mutation helpers:
  - `setGroupSelected`,
  - `setGroupLotCode`,
  - `setGroupLotName`;
- status text helper:
  - `buildSelectedGroupsStatus`.

Что изменено в `imports-page.js`:

- обработчики `lotGroupsTable change` и `lotSelectedTable input` переведены на вызовы `importsPageLotStateRoot` вместо прямой мутации `Map`;
- status message выбора групп теперь собирается через helper.

Добавлены/расширены JS unit tests:

- `tests/js/imports-page-lot-state.test.js`

Новые покрытые сценарии:

- mutator-функции корректно обновляют только существующие группы;
- status message выбора групп стабилен.

## Метрика после итерации 6

- `imports-page.js`: `1518` строк (было `1527`, снижение ещё на `9`);
- `imports-page-lot-state.js`: `208` строк (было `139`, +`69`);
- JS unit tests: `66/66`.

## Проверка после итерации 6

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-lot-state.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`66/66`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для non-CI режима read-only seed сценария).

## Выполнено (итерация 7)

Выделен mapping-модуль страницы импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-mapping.js`

Что вынесено из `imports-page.js`:

- сборка и применение сопоставления:
  - `buildMappingFromRaw`,
  - `applyMapping`;
- validation/error rules:
  - обязательные сопоставления,
  - `empty rows`,
  - `maxImportRows` guard;
- генерация summary/status текстов по результату сопоставления.

`imports-page.js` переведён на `importsPageMapping` для:

- `rebuildMappingFromRaw`;
- `applyMappingToRows`.

Дополнительно удалены неиспользуемые thin-wrapper функции (`deriveColumns`, `buildAutoMapping`, `mapRawRow`) из `imports-page.js`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-mapping.js`
3. `imports-page-api.js`
4. `imports-page-lot-state.js`
5. `imports-page-workflow.js`
6. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-mapping.test.js`

Покрытые сценарии:

- dependency validation;
- resolved mapping build (keep previous selection);
- required mappings validation;
- apply-flow summary generation;
- max rows guard.

## Метрика после итерации 7

- `imports-page.js`: `1472` строки (было `1518`, снижение ещё на `46`);
- `imports-page-mapping.js`: `117` строк;
- `imports-page-helpers.js`: `403` строки;
- `imports-page-api.js`: `179` строк;
- `imports-page-lot-state.js`: `208` строк;
- `imports-page-workflow.js`: `105` строк;
- JS unit tests: `71/71`.

## Проверка после итерации 7

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-mapping.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`71/71`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для non-CI режима read-only seed сценария).

## Выполнено (итерация 8)

Выделен file-parser модуль страницы импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-file-parser.js`

Что вынесено из `imports-page.js`:

- определение типа файла:
  - `resolveExtension`,
  - `isDelimitedExtension`,
  - `isWorkbookExtension`;
- orchestration parse-flow:
  - выбор parser path (`csv/txt` vs `xlsx/xls`);
  - валидация `unsupported extension`;
  - валидация `empty parsed rows`.

`imports-page.js` переведён на `importsPageFileParser.parse(file)` в `parseSelectedFile`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-file-parser.js`
3. `imports-page-mapping.js`
4. `imports-page-api.js`
5. `imports-page-lot-state.js`
6. `imports-page-workflow.js`
7. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-file-parser.test.js`

Покрытые сценарии:

- dependency validation;
- extension-family detection;
- delimited parser path;
- workbook parser path;
- unsupported extension/empty rows errors.

## Метрика после итерации 8

- `imports-page.js`: `1463` строки (было `1472`, снижение ещё на `9`);
- `imports-page-file-parser.js`: `75` строк;
- `imports-page-mapping.js`: `117` строк;
- JS unit tests: `76/76`.

## Проверка после итерации 8

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-file-parser.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`76/76`);
- `dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: `2 passed`, `1 skipped` (ожидаемо для non-CI режима read-only seed сценария).

## Выполнено (итерация 9)

Выделен table-models модуль страницы импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-table-models.js`

Что вынесено из `imports-page.js`:

- модель preview-таблицы:
  - `buildPreviewModel`;
- модель таблицы пакетов:
  - `buildBatchesModel`;
- модель таблицы невалидных строк:
  - `buildInvalidRowsModel`;
- модель таблицы истории переходов:
  - `buildHistoryModel`;
- модель таблицы XML-очереди:
  - `buildXmlInboxModel`.

`imports-page.js` переведён на table-model builders для `preview/batches/invalid/history/xml` (DOM-отрисовка сохранена в entrypoint).

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-table-models.js`
3. `imports-page-file-parser.js`
4. `imports-page-mapping.js`
5. `imports-page-api.js`
6. `imports-page-lot-state.js`
7. `imports-page-workflow.js`
8. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-table-models.test.js`

Покрытые сценарии:

- dependency validation;
- preview headers/invalid-row model;
- batches table empty/data states;
- invalid/history visibility and cell mapping;
- XML inbox actions (`view batch`/`retry`) model mapping.

## Метрика после итерации 9

- `imports-page.js`: `1430` строк (было `1463`, снижение ещё на `33`);
- `imports-page-table-models.js`: `210` строк;
- JS unit tests: `81/81`.

## Проверка после итерации 9

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-table-models.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`81/81`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5090 npm run test:smoke`: green (`3/3`) на свежем локальном host-процессе.

## Выполнено (итерация 10)

Продолжена декомпозиция `lot recommendations` слоя: table-model логика вынесена из `imports-page.js` в `imports-page-lot-state.js`.

Что вынесено:

- модель таблицы рекомендационных групп:
  - `buildLotGroupsTableModel`;
- модель таблицы выбранных групп:
  - `buildLotSelectedTableModel`.

`imports-page.js` переведён на эти model-builders в:

- `renderLotGroupsTable`;
- `renderLotSelectedTable`.

Добавлены/расширены JS unit tests:

- `tests/js/imports-page-lot-state.test.js`

Новые покрытые сценарии:

- `buildLotGroupsTableModel` (empty/data states + checked/cell mapping);
- `buildLotSelectedTableModel` (empty state + selected-only mapping).

## Метрика после итерации 10

- `imports-page.js`: `1426` строк (было `1430`, снижение ещё на `4`);
- `imports-page-lot-state.js`: `299` строк (было `208`, +`91`);
- JS unit tests: `83/83`.

## Проверка после итерации 10

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-lot-state.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`83/83`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`3/3`).

## Выполнено (итерация 11)

Продолжена декомпозиция `lot recommendations` rule-layer: валидации и генерация status-text вынесены из `imports-page.js` в `imports-page-lot-state.js`.

Что вынесено:

- request guards:
  - `validateBuildRecommendationsRequest`,
  - `validateApplyRecommendationsRequest`;
- status text builder:
  - `buildRecommendationsStatus`.

`imports-page.js` переведён на эти функции в:

- `buildLotRecommendations`;
- `applyLotRecommendations`.

Добавлены/расширены JS unit tests:

- `tests/js/imports-page-lot-state.test.js`

Новые покрытые сценарии:

- build-request validation;
- apply-request validation;
- recommendation status text branches (`no groups`, `cannot apply`, `ready`).

## Метрика после итерации 11

- `imports-page.js`: `1410` строк (было `1426`, снижение ещё на `16`);
- `imports-page-lot-state.js`: `345` строк (было `299`, +`46`);
- JS unit tests: `86/86`.

## Проверка после итерации 11

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-lot-state.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`86/86`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`3/3`).

## Выполнено (итерация 12)

Выделен XML helper-модуль страницы импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-xml.js`

Что вынесено из `imports-page.js`:

- нормализация XML inbox payload:
  - `normalizeRows`;
- build/validation payload для queue action:
  - `buildQueueRequest`;
- status text builders:
  - `buildLoadSuccessStatus`,
  - `buildQueueSuccessStatus`,
  - `buildRetrySuccessStatus`.

`imports-page.js` переведён на `importsPageXml` в блоках:

- `loadXmlInbox`;
- `queueXmlInboxItem`;
- `retryXmlInboxItem`.

Также удалён неиспользуемый thin-wrapper `formatShortDate` из `imports-page.js`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-file-parser.js`
5. `imports-page-mapping.js`
6. `imports-page-api.js`
7. `imports-page-lot-state.js`
8. `imports-page-workflow.js`
9. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-xml.test.js`

Покрытые сценарии:

- dependency validation;
- queue payload validation/defaults normalization;
- payload preservation for explicit values;
- deterministic XML status messages.

## Метрика после итерации 12

- `imports-page.js`: `1404` строки (было `1410`, снижение ещё на `6`);
- `imports-page-xml.js`: `72` строки;
- JS unit tests: `91/91`.

## Проверка после итерации 12

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-xml.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`91/91`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`3/3`) после перезапуска host-процесса.

## Выполнено (итерация 13)

Выделен upload helper-модуль страницы импорта:

- `src/Subcontractor.Web/wwwroot/js/imports-page-upload.js`

Что вынесено из `imports-page.js`:

- build/validation payload для постановки пакета в очередь:
  - `buildQueuedBatchRequest`;
- status text builder:
  - `buildQueuedBatchSuccessStatus`.

`imports-page.js` переведён на `importsPageUpload` в блоке:

- `uploadBatch`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-file-parser.js`
5. `imports-page-mapping.js`
6. `imports-page-upload.js`
7. `imports-page-api.js`
8. `imports-page-lot-state.js`
9. `imports-page-workflow.js`
10. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-upload.test.js`

Покрытые сценарии:

- validation branch для empty parsed rows;
- queued payload defaults normalization (`fileName`/`notes`) + row mapping;
- payload with explicit `fileName`/`notes`;
- deterministic upload success status message.

## Метрика после итерации 13

- `imports-page.js`: `1395` строк (было `1404`, снижение ещё на `9`);
- `imports-page-upload.js`: `54` строки;
- JS unit tests: `95/95`.

## Проверка после итерации 13

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-upload.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`95/95`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`4/4`) на свежем host-процессе.

## Выполнено (итерация 14)

Продолжена декомпозиция parser-layer: XLSX workbook parsing вынесен из `imports-page.js` в отдельный модуль:

- `src/Subcontractor.Web/wwwroot/js/imports-page-workbook.js`

Что вынесено из `imports-page.js`:

- runtime SheetJS availability guard;
- workbook parse flow:
  - чтение первого листа;
  - `sheet_to_json` c фиксированными параметрами;
  - фильтрация пустых строк через `isRowEmpty`.

`imports-page.js` переведён на `importsPageWorkbook.parseWorkbookFile` при создании `importsPageFileParser`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-workbook.js`
5. `imports-page-file-parser.js`
6. `imports-page-mapping.js`
7. `imports-page-upload.js`
8. `imports-page-api.js`
9. `imports-page-lot-state.js`
10. `imports-page-workflow.js`
11. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-workbook.test.js`

Покрытые сценарии:

- dependency validation;
- runtime error branch при отсутствии SheetJS;
- workbook без листов (`Книга не содержит листов`);
- корректный parse с фильтрацией пустых строк и стабильными SheetJS options.

Также усилен browser smoke:

- `tests/smoke/navigation-smoke.spec.js` дополнен сценарием:
  - `imports page parses CSV and queues source-data batch`.

## Метрика после итерации 14

- `imports-page.js`: `1383` строки (было `1395`, снижение ещё на `12`);
- `imports-page-workbook.js`: `56` строк;
- JS unit tests: `99/99`;
- browser smoke: `5/5`.

## Проверка после итерации 14

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-workbook.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`99/99`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) на свежем host-процессе.

## Выполнено (итерация 15)

Продолжена декомпозиция batch orchestration слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-batches.js`;
- `imports-page.js` переведён на `importsPageBatches` для:
  - `loadBatchDetails`;
  - `loadBatches`;
  - `applyBatchTransition`.

Что вынесено из `imports-page.js`:

- orchestration загрузки списка пакетов;
- orchestration открытия деталей пакета, poll/auto-refresh и post-load hooks;
- orchestration перехода статуса пакета.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-workbook.js`
5. `imports-page-file-parser.js`
6. `imports-page-mapping.js`
7. `imports-page-upload.js`
8. `imports-page-api.js`
9. `imports-page-lot-state.js`
10. `imports-page-workflow.js`
11. `imports-page-batches.js`
12. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-batches.test.js`

Покрытые сценарии:

- dependency validation;
- `loadBatches` + открытие target batch;
- `loadBatchDetails` auto-refresh scheduling branch;
- `applyBatchTransition` orchestration и status text.

## Метрика после итерации 15

- `imports-page.js`: `1376` строк (было `1383`, снижение ещё на `7`);
- `imports-page-batches.js`: `171` строка;
- JS unit tests: `128/128`.

## Проверка после итерации 15

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-batches.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`128/128`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (изменение порядка `<script>` в Razor).

## Выполнено (итерация 16)

Выделен reports/download helper-слой страницы импорта:

- новый модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-reports.js`;
- `imports-page.js` переведён на `importsPageReports` для:
  - `downloadValidationReport`;
  - `downloadLotReconciliationReport`;
  - report URL builders.

Что вынесено из `imports-page.js`:

- `buildValidationReportUrl`;
- `buildLotReconciliationReportUrl`;
- `downloadValidationReport`;
- `downloadLotReconciliationReport`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-workbook.js`
5. `imports-page-file-parser.js`
6. `imports-page-mapping.js`
7. `imports-page-upload.js`
8. `imports-page-api.js`
9. `imports-page-reports.js`
10. `imports-page-lot-state.js`
11. `imports-page-workflow.js`
12. `imports-page-batches.js`
13. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-reports.test.js`

Покрытые сценарии:

- dependency validation;
- deterministic URL builders;
- `window.open` contract для download actions.

## Метрика после итерации 16

- `imports-page.js`: `1371` строка (было `1376`, снижение ещё на `5`);
- `imports-page-reports.js`: `59` строк;
- JS unit tests: `130/130`.

## Проверка после итерации 16

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-reports.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`130/130`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (изменение порядка `<script>` в Razor).

## Выполнено (итерация 17)

Продолжена декомпозиция XML inbox orchestration слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-xml-inbox.js`;
- `imports-page.js` переведён на `importsPageXmlInbox` для:
  - `loadXmlInbox`;
  - `queueXmlInboxItem`;
  - `retryXmlInboxItem`.

Что вынесено из `imports-page.js`:

- XML inbox load/queue/retry orchestration;
- построение XML inbox table через model contract (`buildXmlInboxModel`).

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-workbook.js`
5. `imports-page-file-parser.js`
6. `imports-page-mapping.js`
7. `imports-page-upload.js`
8. `imports-page-api.js`
9. `imports-page-xml-inbox.js`
10. `imports-page-reports.js`
11. `imports-page-lot-state.js`
12. `imports-page-workflow.js`
13. `imports-page-batches.js`
14. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-xml-inbox.test.js`

Покрытые сценарии:

- dependency validation;
- `loadXmlInbox` success/error branches;
- `queueXmlInboxItem` orchestration + normalized filename return;
- `retryXmlInboxItem` orchestration + refresh.

## Метрика после итерации 17

- `imports-page.js`: `1298` строк (было `1371`, снижение ещё на `73`);
- `imports-page-xml-inbox.js`: `182` строки;
- JS unit tests: `135/135`.

## Проверка после итерации 17

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-xml-inbox.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`135/135`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (изменение порядка `<script>` в Razor).

## Выполнено (итерация 18)

Продолжена декомпозиция lot orchestration слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-lot-orchestration.js`;
- `imports-page.js` переведён на `importsPageLot` для:
  - `buildRecommendations`;
  - `applyRecommendations`;
  - `clearRecommendations`;
  - `setGroupSelected`;
  - `setGroupLotCode`;
  - `setGroupLotName`;
  - `updateActionButtons`.

Что вынесено из `imports-page.js`:

- orchestration построения/применения рекомендаций по лотам;
- reset/update orchestration рекомендационного состояния;
- обработка mutator-событий выбора групп и редактирования параметров лотов.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-workbook.js`
5. `imports-page-file-parser.js`
6. `imports-page-mapping.js`
7. `imports-page-upload.js`
8. `imports-page-api.js`
9. `imports-page-xml-inbox.js`
10. `imports-page-reports.js`
11. `imports-page-lot-state.js`
12. `imports-page-lot-orchestration.js`
13. `imports-page-workflow.js`
14. `imports-page-batches.js`
15. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-lot-orchestration.test.js`

Покрытые сценарии:

- dependency validation;
- `buildRecommendations` orchestration;
- `applyRecommendations` orchestration + summary severity branch;
- `clearRecommendations` reset flow;
- selection mutator flow (`setGroupSelected`);
- details reset path (`onDetailsLoaded`).

## Метрика после итерации 18

- `imports-page.js`: `1240` строк (было `1298`, снижение ещё на `58`);
- `imports-page-lot-orchestration.js`: `211` строк;
- JS unit tests: `141/141`.

## Проверка после итерации 18

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-lot-orchestration.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`141/141`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (изменение порядка `<script>` в Razor).

## Выполнено (итерация 19)

Продолжена декомпозиция lot UI rendering слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-lot-tables.js`;
- `imports-page.js` переведён на `importsPageLotTables` для рендеринга:
  - `lot groups table`;
  - `lot selected table`.

Что вынесено из `imports-page.js`:

- `renderEmptyTable`;
- `renderLotGroupsTable`;
- `renderLotSelectedTable`;
- форматирующие врапперы для рендеринга lot-таблиц.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-workbook.js`
5. `imports-page-file-parser.js`
6. `imports-page-mapping.js`
7. `imports-page-upload.js`
8. `imports-page-api.js`
9. `imports-page-xml-inbox.js`
10. `imports-page-reports.js`
11. `imports-page-lot-state.js`
12. `imports-page-lot-tables.js`
13. `imports-page-lot-orchestration.js`
14. `imports-page-workflow.js`
15. `imports-page-batches.js`
16. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-lot-tables.test.js`

Покрытые сценарии:

- dependency validation;
- model-building layer (`buildGroupsModel`, `buildSelectedModel`);
- render callback contract (`variant`, `model`) для групп и выбранных лотов.

## Метрика после итерации 19

- `imports-page.js`: `1116` строк (было `1240`, снижение ещё на `124`);
- `imports-page-lot-tables.js`: `227` строк;
- JS unit tests: `144/144`.

## Проверка после итерации 19

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-lot-tables.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`144/144`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (изменение порядка `<script>` в Razor).

## Выполнено (итерация 20)

Продолжена декомпозиция batch/details/history UI rendering слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-batch-tables.js`;
- `imports-page.js` переведён на `importsPageBatchTables` для рендеринга:
  - batches registry table;
  - invalid rows table;
  - history table.

Что вынесено из `imports-page.js`:

- `renderBatchesTable`;
- `renderInvalidRows`;
- `renderHistoryTable`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-batch-tables.js`
5. `imports-page-workbook.js`
6. `imports-page-file-parser.js`
7. `imports-page-mapping.js`
8. `imports-page-upload.js`
9. `imports-page-api.js`
10. `imports-page-xml-inbox.js`
11. `imports-page-reports.js`
12. `imports-page-lot-state.js`
13. `imports-page-lot-tables.js`
14. `imports-page-lot-orchestration.js`
15. `imports-page-workflow.js`
16. `imports-page-batches.js`
17. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-batch-tables.test.js`

Покрытые сценарии:

- dependency validation;
- table-model to renderer orchestration for `batches`/`invalid`/`history` variants.

## Метрика после итерации 20

- `imports-page.js`: `1005` строк (было `1116`, снижение ещё на `111`);
- `imports-page-batch-tables.js`: `227` строк;
- JS unit tests: `146/146`.

## Проверка после итерации 20

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-batch-tables.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`146/146`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (изменение порядка `<script>` в Razor).

## Выполнено (итерация 21)

Продолжена декомпозиция mapping/preview UI слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-mapping-ui.js`;
- `imports-page.js` переведён на `importsPageMappingUi` для операций:
  - rendering mapping grid;
  - read mapping values from UI;
  - rendering preview table.

Что вынесено из `imports-page.js`:

- `renderMappingGrid`;
- `readMappingFromUi`;
- `renderPreviewTable`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный на итерации 21):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-upload.js`
10. `imports-page-api.js`
11. `imports-page-xml-inbox.js`
12. `imports-page-reports.js`
13. `imports-page-lot-state.js`
14. `imports-page-lot-tables.js`
15. `imports-page-lot-orchestration.js`
16. `imports-page-workflow.js`
17. `imports-page-batches.js`
18. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-mapping-ui.test.js`

Покрытые сценарии:

- dependency validation;
- mapping-grid model building + render callback contract;
- mapping values read delegation;
- preview-table render orchestration.

## Метрика после итерации 21

- `imports-page.js`: `928` строк (было `1005`, снижение ещё на `77`);
- `imports-page-mapping-ui.js`: `211` строк;
- JS unit tests: `150/150`.

## Проверка после итерации 21

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-mapping-ui.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`150/150`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (изменение порядка `<script>` в Razor).

## Выполнено (итерация 22)

Продолжена декомпозиция event-routing слоя таблиц страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-interactions.js`;
- `imports-page.js` переведён на `importsPageInteractions` для роутинга событий:
  - lot groups change;
  - lot selected input (code/name);
  - batches table click (`open details`);
  - XML table click (`view batch` / `retry`).

Что вынесено из `imports-page.js`:

- inline handlers для:
  - `lotGroupsTable` (`change`);
  - `lotSelectedTable` (`input`);
  - `batchesTable` (`click`);
  - `xmlTable` (`click`).

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-upload.js`
10. `imports-page-api.js`
11. `imports-page-xml-inbox.js`
12. `imports-page-reports.js`
13. `imports-page-lot-state.js`
14. `imports-page-lot-tables.js`
15. `imports-page-lot-orchestration.js`
16. `imports-page-workflow.js`
17. `imports-page-batches.js`
18. `imports-page-interactions.js`
19. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-interactions.test.js`

Покрытые сценарии:

- dependency validation;
- lot-selection event routing;
- batch details open routing;
- XML view/retry routing + retry error callback path.

## Метрика после итерации 22

- `imports-page.js`: `860` строк (было `928`, снижение ещё на `68`);
- `imports-page-interactions.js`: `189` строк;
- JS unit tests: `155/155`.

## Проверка после итерации 22

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-interactions.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`155/155`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (обновлённый порядок `<script>` в Razor).

## Выполнено (итерация 23)

Продолжена декомпозиция status-notification слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-status.js`;
- `imports-page.js` переведён на `importsPageStatus` для операций:
  - `setUploadStatus`;
  - `setBatchesStatus`;
  - `setMappingStatus`;
  - `setTransitionStatus`;
  - `setXmlStatus`;
  - `setLotStatus`.

Что вынесено из `imports-page.js`:

- повторяющиеся inline status-setter функции для всех статусных панелей.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-upload.js`
10. `imports-page-api.js`
11. `imports-page-xml-inbox.js`
12. `imports-page-reports.js`
13. `imports-page-lot-state.js`
14. `imports-page-lot-tables.js`
15. `imports-page-lot-orchestration.js`
16. `imports-page-workflow.js`
17. `imports-page-batches.js`
18. `imports-page-interactions.js`
19. `imports-page-status.js`
20. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-status.test.js`

Покрытые сценарии:

- dependency validation;
- default DOM status mutation contract (`textContent` + `imports-status--error`);
- custom renderer callback path (`setStatusView`).

## Метрика после итерации 23

- `imports-page.js`: `853` строки (было `860`, снижение ещё на `7`);
- `imports-page-status.js`: `90` строк;
- JS unit tests: `158/158`.

## Проверка после итерации 23

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-status.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`158/158`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (обновлённый порядок `<script>` в Razor).

## Выполнено (итерация 24)

Продолжена декомпозиция workflow-controls UI слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-workflow-ui.js`;
- `imports-page.js` переведён на `importsPageWorkflowUi` для операций:
  - rendering transition target options;
  - workflow controls enable/disable state management.

Что вынесено из `imports-page.js`:

- `setWorkflowActionsEnabled`;
- `renderTransitionTargets`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-upload.js`
10. `imports-page-api.js`
11. `imports-page-xml-inbox.js`
12. `imports-page-reports.js`
13. `imports-page-lot-state.js`
14. `imports-page-lot-tables.js`
15. `imports-page-lot-orchestration.js`
16. `imports-page-workflow.js`
17. `imports-page-workflow-ui.js`
18. `imports-page-batches.js`
19. `imports-page-interactions.js`
20. `imports-page-status.js`
21. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-workflow-ui.test.js`

Покрытые сценарии:

- dependency validation;
- custom renderer branch (`renderTransitionTargetsView`);
- custom controls-state branch (`applyControlsState`);
- default controls branch (`disable/enable + clear transition fields`);
- default option-rendering branch (`createOptionElement` contract).

## Метрика после итерации 24

- `imports-page.js`: `846` строк (было `853`, снижение ещё на `7`);
- `imports-page-workflow-ui.js`: `173` строки;
- JS unit tests: `163/163`.

## Проверка после итерации 24

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-workflow-ui.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`163/163`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (обновлённый порядок `<script>` в Razor).

## Выполнено (итерация 25)

Продолжена декомпозиция mapping-flow orchestration слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-mapping-orchestration.js`;
- `imports-page.js` переведён на `importsPageMappingOrchestration` для операций:
  - `parseSelectedFile`;
  - `rebuildMappingFromRaw`;
  - `applyMappingToRows`.

Что вынесено из `imports-page.js`:

- orchestration функций parsing + mapping flow с управлением статусами/preview summary.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-status.js`
22. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-mapping-orchestration.test.js`

Покрытые сценарии:

- dependency validation;
- `rebuildMappingFromRaw` state updates + render contract;
- `applyMappingToRows` parsed rows/summary/status updates;
- `parseSelectedFile` parse+mapping orchestration path.

## Метрика после итерации 25

- `imports-page.js`: `860` строк (было `846`, временный рост на `14` из-за явной dependency wiring для нового orchestration-сервиса);
- `imports-page-mapping-orchestration.js`: `163` строки;
- JS unit tests: `167/167`.

## Проверка после итерации 25

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-mapping-orchestration.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`167/167`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (обновлённый порядок `<script>` в Razor).

## Выполнено (итерация 26)

Продолжена декомпозиция wizard/session state слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-wizard-session.js`;
- `imports-page.js` переведён на `importsPageWizardSession` для операций:
  - `uploadBatch`;
  - `resetWizard`.

Что вынесено из `imports-page.js`:

- upload flow orchestration (`build payload` -> `create queued batch` -> `refresh batches`);
- общий reset wizard flow (reset state + reset UI + reset status/messages).

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-status.js`
22. `imports-page-wizard-session.js`
23. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-wizard-session.test.js`

Покрытые сценарии:

- dependency validation;
- queued upload orchestration (`request payload`, `create`, `status`, `reload`);
- wizard reset branch (state clear + UI reset + status callbacks).

## Метрика после итерации 26

- `imports-page.js`: `881` строк (было `860`, временный рост на `21` из-за расширенного dependency wiring);
- `imports-page-wizard-session.js`: `170` строк;
- JS unit tests: `170/170`.

## Проверка после итерации 26

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-wizard-session.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`170/170`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (обновлённый порядок `<script>` в Razor).

## Выполнено (итерация 27)

Продолжена декомпозиция action-bindings слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-action-bindings.js`;
- `imports-page.js` переведён на `importsPageActionBindings` для binding операций:
  - parse/apply/reset/upload;
  - batches/xml refresh and queue;
  - lot build/apply;
  - transition/history/report actions;
  - table interactions bind hook.

Что вынесено из `imports-page.js`:

- основной блок `addEventListener`-handler’ов для toolbar/workflow/xml/lot/report кнопок.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-action-bindings.js`
22. `imports-page-status.js`
23. `imports-page-wizard-session.js`
24. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-action-bindings.test.js`

Покрытые сценарии:

- dependency validation;
- browser-compatible `transitionTargetSelect.options.length` contract;
- parse error branch (`status + hidden` flags);
- upload re-enable branch when parsed rows exist;
- history guard when batch is not selected.

## Метрика после итерации 27

- `imports-page.js`: `790` строк (было `881`, снижение на `91`);
- `imports-page-action-bindings.js`: `336` строк;
- JS unit tests: `176/176`.

## Проверка после итерации 27

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-action-bindings.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`176/176`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (обновлённый порядок `<script>` в Razor).

## Выполнено (итерация 28)

Продолжена декомпозиция runtime/bootstrap слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-runtime.js`;
- `imports-page.js` переведён на `importsPageRuntime` для операций:
  - `loadBatchHistory`;
  - startup initialization (`reset`, `xml inbox init`, `batches init` + error statuses).

Что вынесено из `imports-page.js`:

- batch-history loading flow;
- startup bootstrap sequence в конце entrypoint.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-action-bindings.js`
22. `imports-page-status.js`
23. `imports-page-wizard-session.js`
24. `imports-page-runtime.js`
25. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-runtime.test.js`

Покрытые сценарии:

- dependency validation;
- `loadBatchHistory` fetch+render orchestration;
- `initialize` startup flow с отдельными error branches для XML/batches.

## Метрика после итерации 28

- `imports-page.js`: `812` строк (было `790`, временный рост на `22` из-за дополнительного dependency wiring);
- `imports-page-runtime.js`: `72` строки;
- JS unit tests: `179/179`.

## Проверка после итерации 28

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-runtime.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`179/179`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host (обновлённый порядок `<script>` в Razor).

## Выполнено (итерация 29)

Продолжена декомпозиция bootstrap-context слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap.js`;
- `imports-page.js` переведён на `importsPageBootstrap` для операций:
  - resolve API endpoints;
  - resolve required DOM controls;
  - resolve/validate required module dependencies (`ImportsPage*`).

Что вынесено из `imports-page.js`:

- инициализация `moduleRoot` + data-attribute endpoints;
- блок поиска обязательных DOM-элементов;
- блок диагностики отсутствующих submodules по порядку подключения скриптов.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-action-bindings.js`
22. `imports-page-status.js`
23. `imports-page-wizard-session.js`
24. `imports-page-runtime.js`
25. `imports-page-bootstrap.js`
26. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-bootstrap.test.js`

Покрытые сценарии:

- `document` dependency validation;
- branch без `data-imports-module`;
- branch missing required control;
- module dependency diagnostics (`logError`) при отсутствии required submodule;
- resolve custom/default endpoints и экспорт контролов/модульных root’ов.

## Метрика после итерации 29

- `imports-page.js`: `654` строки (было `812`, снижение на `158`);
- `imports-page-bootstrap.js`: `265` строк;
- JS unit tests: `184/184`.

## Проверка после итерации 29

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`184/184`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host.

## Выполнено (итерация 30)

Продолжена декомпозиция configuration слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-config.js`;
- `imports-page.js` переведён на `importsPageConfig` для операций:
  - resolve row limits;
  - resolve import statuses/labels;
  - resolve `fieldDefinitions`.

Что вынесено из `imports-page.js`:

- статический блок констант (`PREVIEW_ROW_LIMIT`, `MAX_IMPORT_ROWS`);
- матрица статусных переходов;
- словарь локализованных статусных подписей;
- `FIELD_DEFINITIONS` source-mapping схемы.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-action-bindings.js`
22. `imports-page-status.js`
23. `imports-page-wizard-session.js`
24. `imports-page-runtime.js`
25. `imports-page-config.js`
26. `imports-page-bootstrap.js`
27. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-config.test.js`

Покрытые сценарии:

- наличие required limits/словари статусов;
- canonical order/shape field definitions;
- fresh-copy contract (конфиг не шарится между вызовами).

## Метрика после итерации 30

- `imports-page.js`: `601` строка (было `654`, снижение на `53`);
- `imports-page-config.js`: `84` строки;
- JS unit tests: `187/187`.

## Проверка после итерации 30

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-config.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`187/187`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host.

## Выполнено (итерация 31)

Продолжена декомпозиция mutable-state слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-state.js`;
- `imports-page.js` переведён на `importsPageState` для операций:
  - read/write parsed/mapping/source state;
  - selected batch + details polling handle lifecycle;
  - lot recommendations/selections state contract.

Что вынесено из `imports-page.js`:

- локальные mutable переменные (`parsedRows`, `rawRows`, `selectedBatch`, `lotRecommendations` и др.);
- `clearDetailsPoll`-логика;
- повторяющиеся get/set callbacks для `mapping`, `wizard session`, `lot`, `action bindings`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-action-bindings.js`
22. `imports-page-status.js`
23. `imports-page-wizard-session.js`
24. `imports-page-runtime.js`
25. `imports-page-state.js`
26. `imports-page-config.js`
27. `imports-page-bootstrap.js`
28. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-state.test.js`

Покрытые сценарии:

- default state contract;
- setters/getters round-trip по всем ключевым state-сегментам;
- `clearDetailsPoll` timeout-cleanup contract.

## Метрика после итерации 31

- `imports-page.js`: `518` строк (было `601`, снижение на `83`);
- `imports-page-state.js`: `164` строки;
- JS unit tests: `190/190`.

## Проверка после итерации 31

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-state.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`190/190`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host.

## Выполнено (итерация 32)

Продолжена декомпозиция session-composition слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring.js`;
- `imports-page.js` переведён на `importsPageSessionWiring` для операций:
  - mapping-flow wiring;
  - wizard-session wiring;
  - action-bindings wiring + bind stage.

Что вынесено из `imports-page.js`:

- сборка option-контрактов для `createMappingOrchestrationService`;
- сборка option-контрактов для `createWizardSessionService`;
- сборка option-контрактов для `createActionBindingsService`;
- прямой bind блок (`importsPageActionBindings.bindAll`) заменён на `sessionWiring.bindActions()`.

Дополнительно:

- `imports-page-bootstrap.js` расширен проверкой dependency-модуля `ImportsPageSessionWiring`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-action-bindings.js`
22. `imports-page-status.js`
23. `imports-page-wizard-session.js`
24. `imports-page-runtime.js`
25. `imports-page-session-wiring.js`
26. `imports-page-state.js`
27. `imports-page-config.js`
28. `imports-page-bootstrap.js`
29. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-session-wiring.test.js`

Покрытые сценарии:

- dependency validation по required roots/service contracts;
- create-flow для mapping/wizard/action wiring;
- call-forwarding checks (`loadBatches`, `applyBatchTransition`, `queueXmlInboxItem`, `loadBatchHistory`);
- bind stage contract (`bindActions`).

## Метрика после итерации 32

- `imports-page.js`: `408` строк (было `518`, снижение на `110`);
- `imports-page-session-wiring.js`: `238` строк;
- JS unit tests: `192/192`.

## Проверка после итерации 32

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`192/192`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host.

## Выполнено (итерация 33)

Продолжена декомпозиция services-composition слоя страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring.js`;
- `imports-page.js` переведён на `importsPageServicesWiring` для операций:
  - status/workflow composition;
  - batches/xml/lot/interactions composition;
  - workbook/file-parser composition;
  - build callbacks для details/error branches.

Что вынесено из `imports-page.js`:

- сборка `status/workflow/mapping/table/reports` service graph;
- сборка `batches/xmlInbox/lot/interactions` orchestration graph;
- локальные helper wrapper-функции `isRowEmpty/parseDelimitedText` и workbook->fileParser wiring;
- большая часть onDetails/onError callback wiring логики.

Дополнительно:

- `imports-page-bootstrap.js` расширен проверкой dependency-модуля `ImportsPageServicesWiring`.

Подключение скриптов обновлено в:

- `src/Subcontractor.Web/Views/Home/Imports.cshtml`

Порядок загрузки (актуальный):

1. `imports-page-helpers.js`
2. `imports-page-xml.js`
3. `imports-page-table-models.js`
4. `imports-page-mapping-ui.js`
5. `imports-page-batch-tables.js`
6. `imports-page-workbook.js`
7. `imports-page-file-parser.js`
8. `imports-page-mapping.js`
9. `imports-page-mapping-orchestration.js`
10. `imports-page-upload.js`
11. `imports-page-api.js`
12. `imports-page-xml-inbox.js`
13. `imports-page-reports.js`
14. `imports-page-lot-state.js`
15. `imports-page-lot-tables.js`
16. `imports-page-lot-orchestration.js`
17. `imports-page-workflow.js`
18. `imports-page-workflow-ui.js`
19. `imports-page-batches.js`
20. `imports-page-interactions.js`
21. `imports-page-action-bindings.js`
22. `imports-page-status.js`
23. `imports-page-wizard-session.js`
24. `imports-page-runtime.js`
25. `imports-page-services-wiring.js`
26. `imports-page-session-wiring.js`
27. `imports-page-state.js`
28. `imports-page-config.js`
29. `imports-page-bootstrap.js`
30. `imports-page.js`

Добавлены focused JS unit tests:

- `tests/js/imports-page-services-wiring.test.js`

Покрытые сценарии:

- dependency validation по roots/controls/config/state;
- create-flow и экспорт core services;
- callbacks wiring для `onDetailsLoaded`/`onDetailsError`;
- propagation XML retry errors в status layer.

## Метрика после итерации 33

- `imports-page.js`: `135` строк (было `408`, снижение на `273`);
- `imports-page-services-wiring.js`: `361` строка;
- JS unit tests: `194/194`.

## Проверка после итерации 33

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page.js`: green;
- `npm run test:js`: green (`194/194`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host.

## Выполнено (итерация 34)

Техническая cleanup-итерация после стабилизации composition-слоёв:

- удалён неиспользуемый legacy-модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-dom-context.js`.

Причина:

- после перехода на `imports-page-bootstrap.js` + dedicated wiring-модули файл больше не участвовал в runtime;
- удаление снижает риск ложного подключения и дрейфа legacy-кода.

## Проверка после итерации 34

- `npm run test:js`: green (`194/194`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`).

## Выполнено (итерация 35)

Продолжена декомпозиция action-layer страницы импорта:

- добавлен модуль:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers.js`;
- `imports-page-action-bindings.js` переведён в thin event-subscription слой:
  - валидация обязательных UI controls;
  - делегирование runtime-логики в `ImportsPageActionHandlers`;
  - контрактная проверка полного handler-set.

Что вынесено из `imports-page-action-bindings.js`:

- обработчики toolbar/workflow/xml/lot/report действий:
  - parse/apply/rebuild/reset/upload;
  - refresh/xml queue/xml refresh;
  - lot build/apply;
  - transition apply/history refresh;
  - validation/full/lot-reconciliation downloads;
- state/status fallback ветки ошибок и post-action UI guards.

Дополнительно:

- `imports-page-session-wiring.js` расширен dependency-контрактом `actionHandlersRoot`;
- `imports-page-bootstrap.js` расширен проверкой dependency-модуля `ImportsPageActionHandlers`;
- обновлён порядок скриптов в:
  - `src/Subcontractor.Web/Views/Home/Imports.cshtml` (добавлен `imports-page-action-handlers.js` перед `imports-page-action-bindings.js`);
- добавлен focused JS test suite:
  - `tests/js/imports-page-action-handlers.test.js`;
- `tests/js/imports-page-action-bindings.test.js` адаптирован под thin-binding контракт.
- добавлены негативные контрактные проверки на новые зависимости:
  - `tests/js/imports-page-bootstrap.test.js` (`ImportsPageActionHandlers` missing-module path);
  - `tests/js/imports-page-session-wiring.test.js` (`actionHandlersRoot` contract path).

## Метрика после итерации 35

- `imports-page-action-bindings.js`: `180` строк (было `337`, снижение на `157`);
- `imports-page-action-handlers.js`: `349` строк;
- `imports-page-session-wiring.js`: `244` строки;
- JS unit tests: `198/198`.

## Проверка после итерации 35

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-action-bindings.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap.js`: green;
- `npm run test:js`: green (`198/198`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5080 npm run test:smoke`: green (`5/5`) после перезапуска локального host.

## Выполнено (итерация 36)

Добавлен и стабилизирован entrypoint contract suite для `imports-page.js`:

- `tests/js/imports-page-entrypoint.test.js`

Покрытые ветки:

- early-return при отсутствии `ImportsPageBootstrap`;
- early-return при `createBootstrapContext() -> null`;
- композиционный контракт:
  - `bootstrap -> state/config/services/session/runtime`;
  - корректный проброс endpoint/roots/controls/options в wiring-слои;
  - bootstrap-sequence: `bindActions` + async `runtime.initialize()`.
- runtime contract `loadBatchHistory`:
  - pre-runtime path через API + render history;
  - post-runtime path через runtime-service fallback.
- startup failure branch:
  - `initialize()` error корректно переводится в русское status-сообщение через `setBatchesStatus(..., true)`.

Технический fix в test harness:

- `loadImportsPage(...)` теперь временно подменяет global `console`, чтобы reliably перехватывать `console.error` ветки entrypoint-скрипта и не давать flaky-failures.

## Метрика после итерации 36

- JS unit tests: `363/363`.

## Проверка после итерации 36

- `node --check tests/js/imports-page-entrypoint.test.js`: green;
- `node --test tests/js/imports-page-entrypoint.test.js`: green (`4/4`);
- `npm run test:js -- --runInBand`: green (`363/363`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false`: green (`28/28`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false`: green (`142/142`).

## Выполнено (итерация 37)

Продолжена декомпозиция helper-слоя страницы импорта:

- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-helpers-parsing.js`;
  - `src/Subcontractor.Web/wwwroot/js/imports-page-helpers-row-mapper.js`;
- `src/Subcontractor.Web/wwwroot/js/imports-page-helpers.js` переведён в thin aggregator с module-resolver и backward-compatible API;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Imports.cshtml`
  - submodules подключаются перед `imports-page-helpers.js`.

Что вынесено:

- в `imports-page-helpers-parsing.js`:
  - parse/normalize rules для CSV and workbook text payloads;
  - safe date/decimal parsing helpers;
  - row-level normalization guards.
- в `imports-page-helpers-row-mapper.js`:
  - mapping-проекция строк source-data в preview/upload contracts;
  - field-level trim/default/value-coercion правила.

Добавлены focused JS unit tests:

- `tests/js/imports-page-helpers-parsing.test.js`;
- `tests/js/imports-page-helpers-row-mapper.test.js`.

Покрытые ветки:

- parser normalization для `empty/null/malformed` values;
- row-mapper projection contract для numeric/date/text fields;
- deterministic fallback behavior при частично заполненных строках.

## Метрика после итерации 37

- `imports-page-helpers.js`: `123` строки;
- `imports-page-helpers-parsing.js`: `222` строки;
- `imports-page-helpers-row-mapper.js`: `138` строк;
- JS unit tests (общий suite): `471/471`.

## Проверка после итерации 37

- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-helpers.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-helpers-parsing.js`: green;
- `node --check src/Subcontractor.Web/wwwroot/js/imports-page-helpers-row-mapper.js`: green;
- `npm run test:js`: green (`471/471`);
- `./.dotnet/dotnet build Subcontractor.sln -p:UseAppHost=false`: green;
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`11/11`).

## Выполнено (итерация 38)

Продолжена декомпозиция `imports-page-services-wiring` слоя:

- `src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring.js` переведён в thin orchestrator с module-resolver;
- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring-validation.js`;
  - `src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring-foundation.js`;
  - `src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring-orchestration.js`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Imports.cshtml`
  - (submodules подключаются перед `imports-page-services-wiring.js`).

Что вынесено:

- validation-contract (`roots/controls/config/stateStore/endpoints+callbacks`) в dedicated `validation` module;
- base service graph composition (`helpers/api/status/workflow/mapping/table-models/reports/workbook/file-parser`) в `foundation` module;
- orchestration graph (`workflow-ui`, `batches/xml/lot/interactions` и callbacks `onDetailsLoaded/onDetailsError`) в `orchestration` module.

Добавлены focused JS unit tests:

- `tests/js/imports-page-services-wiring-validation.test.js`;
- `tests/js/imports-page-services-wiring-foundation.test.js`;
- `tests/js/imports-page-services-wiring-orchestration.test.js`.

Дополнительно:

- `tests/js/imports-page-services-wiring.test.js` сохранён как integration-contract suite для итогового orchestrator API.

## Метрика после итерации 38

- `imports-page-services-wiring.js`: `92` строки (было `361`, снижение на `269`);
- `imports-page-services-wiring-validation.js`: `164` строки;
- `imports-page-services-wiring-foundation.js`: `136` строк;
- `imports-page-services-wiring-orchestration.js`: `194` строки;
- JS unit tests (общий suite): `498/498`.

## Проверка после итерации 38

- `npm run test:js`: green (`498/498`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`12/12`).

## Выполнено (итерация 39)

Продолжена декомпозиция `imports-page-session-wiring` слоя:

- `src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring.js` переведён в thin orchestrator с module-resolver;
- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring-validation.js`;
  - `src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring-composition.js`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Imports.cshtml`
  - (submodules подключаются перед `imports-page-session-wiring.js`).

Что вынесено:

- validation-contract (`controls`, `roots`, `runtime services`, `actions`, `helpers`) в dedicated `validation` module;
- session composition graph (wizard/runtime/session adapters, callbacks wiring, disclosure/event bindings) в `composition` module.

Добавлены focused JS unit tests:

- `tests/js/imports-page-session-wiring-validation.test.js`;
- `tests/js/imports-page-session-wiring-composition.test.js`.

Дополнительно:

- `tests/js/imports-page-session-wiring.test.js` сохранён как integration-contract suite для итогового orchestrator API.

## Метрика после итерации 39

- `imports-page-session-wiring.js`: `55` строк (было `244`, снижение на `189`);
- `imports-page-session-wiring-validation.js`: `103` строки;
- `imports-page-session-wiring-composition.js`: `189` строк;
- JS unit tests (общий suite): `502/502`.

## Проверка после итерации 39

- `npm run test:js`: green (`502/502`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`12/12`).

## Выполнено (итерация 40)

Продолжена декомпозиция `imports-page-bootstrap` слоя:

- `src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap.js` переведён в thin orchestrator с module-resolver;
- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-validation.js`;
  - `src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-composition.js`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Imports.cshtml`
  - (submodules подключаются перед `imports-page-bootstrap.js`).

Что вынесено:

- validation-слой (`CONTROL_SELECTORS`, `MODULE_REQUIREMENTS`, control/module roots resolution) в dedicated `bootstrap-validation` module;
- composition-слой (module-root detection, endpoint resolution, финальная сборка `bootstrap context`) в `bootstrap-composition` module.

Добавлены focused JS unit tests:

- `tests/js/imports-page-bootstrap-validation.test.js`;
- `tests/js/imports-page-bootstrap-composition.test.js`.

Дополнительно:

- `tests/js/imports-page-bootstrap.test.js` сохранён как integration-contract suite для итогового orchestrator API.

## Метрика после итерации 40

- `imports-page-bootstrap.js`: `71` строка (было `295`, снижение на `224`);
- `imports-page-bootstrap-validation.js`: `284` строки;
- `imports-page-bootstrap-composition.js`: `60` строк;
- JS unit tests (общий suite): `510/510`.

## Проверка после итерации 40

- `npm run test:js`: green (`510/510`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`12/12`) на контролируемом host (`ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`).

## Выполнено (итерация 41)

Продолжена декомпозиция `imports-page-lot-state` слоя:

- `src/Subcontractor.Web/wwwroot/js/imports-page-lot-state.js` переведён в thin orchestrator с module-resolver;
- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-lot-state-core.js`;
  - `src/Subcontractor.Web/wwwroot/js/imports-page-lot-state-table-models.js`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Imports.cshtml`
  - (submodules подключаются перед `imports-page-lot-state.js`).

Что вынесено:

- recommendation/selection/action/status/payload/mutation rules в `lot-state-core` module;
- table-model projection (`lot groups` и `selected lots`) в `lot-state-table-models` module.

Добавлены focused JS unit tests:

- `tests/js/imports-page-lot-state-core.test.js`;
- `tests/js/imports-page-lot-state-table-models.test.js`.

Дополнительно:

- `tests/js/imports-page-lot-state.test.js` сохранён как integration-contract suite для итогового orchestrator API.

## Метрика после итерации 41

- `imports-page-lot-state.js`: `80` строк (было `345`, снижение на `265`);
- `imports-page-lot-state-core.js`: `254` строки;
- `imports-page-lot-state-table-models.js`: `135` строк;
- JS unit tests (общий suite): `517/517`.

## Проверка после итерации 41

- `npm run test:js`: green (`517/517`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`12/12`) на контролируемом host (`ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`).

## Выполнено (итерация 42)

Продолжена декомпозиция `imports-page-action-handlers` слоя:

- `src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers.js` переведён в thin orchestrator с module-resolver;
- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers-validation.js`;
  - `src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers-composition.js`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Imports.cshtml`
  - (submodules подключаются перед `imports-page-action-handlers.js`).

Что вынесено:

- control/callback/state-status validation в `action-handlers-validation` module;
- runtime action handlers (`parse/upload/xml/lot/workflow/report`) в `action-handlers-composition` module.

Добавлены focused JS unit tests:

- `tests/js/imports-page-action-handlers-validation.test.js`;
- `tests/js/imports-page-action-handlers-composition.test.js`.

Дополнительно:

- `tests/js/imports-page-action-handlers.test.js` сохранён как integration-contract suite для итогового orchestrator API.

## Метрика после итерации 42

- `imports-page-action-handlers.js`: `55` строк (было `349`, снижение на `294`);
- `imports-page-action-handlers-validation.js`: `138` строк;
- `imports-page-action-handlers-composition.js`: `233` строки;
- JS unit tests (общий suite): `523/523`.

## Проверка после итерации 42

- `npm run test:js`: green (`523/523`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`);
- `BASE_URL=http://127.0.0.1:5081 npm run test:smoke`: green (`12/12`) на контролируемом host (`ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`).

## Выполнено (итерация 43)

Продолжена декомпозиция `imports-page-bootstrap-validation` слоя:

- `src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-validation.js` переведён в thin aggregator с module-resolver;
- добавлены submodules:
  - `src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-controls.js`;
  - `src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-modules.js`;
- обновлён script-order в:
  - `src/Subcontractor.Web/Views/Home/Imports.cshtml`
  - (новые submodules подключаются перед `imports-page-bootstrap-validation.js`).

Что вынесено:

- control selector catalog + control resolution contract в `bootstrap-controls` module;
- module requirements catalog + module roots resolution contract в `bootstrap-modules` module.

Добавлены focused JS unit tests:

- `tests/js/imports-page-bootstrap-controls.test.js`;
- `tests/js/imports-page-bootstrap-modules.test.js`.

Дополнительно:

- `tests/js/imports-page-bootstrap-validation.test.js` сохранён как integration-contract suite через aggregator API.

## Метрика после итерации 43

- `imports-page-bootstrap-validation.js`: `53` строки (было `284`, снижение на `231`);
- `imports-page-bootstrap-controls.js`: `84` строки;
- `imports-page-bootstrap-modules.js`: `214` строк;
- JS unit tests (общий suite): `569/569`.

## Проверка после итерации 43

- `node --test tests/js/imports-page-bootstrap-controls.test.js tests/js/imports-page-bootstrap-modules.test.js tests/js/imports-page-bootstrap-validation.test.js tests/js/imports-page-bootstrap-composition.test.js tests/js/imports-page-bootstrap.test.js`: green (`20/20`);
- `npm run test:js`: green (`569/569`);
- `./.dotnet/dotnet build src/Subcontractor.Web/Subcontractor.Web.csproj -p:UseAppHost=false`: green;
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false --no-build`: green (`173/173`);
- `./.dotnet/dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false --no-build`: green (`301/301`).
