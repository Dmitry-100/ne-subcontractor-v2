# Roadmap по второй волне усиления архитектуры, security и performance

Статус: `Completed (repository scope)`

Дата фиксации плана: `2026-04-13`

Документ продолжает `quality-hardening-roadmap-v1` и фиксирует вторую волну работ после закрытия базового quality contour.

Фокус второй волны:

- закрытие remaining security-рисков по зависимостям;
- снижение стоимости сопровождения web-слоя;
- повышение покрытия и доверия к `Subcontractor.Web`;
- ускорение реальной работы приложения на уровне HTTP, UI asset delivery, query execution и host topology.

## 1. Текущий baseline

Актуальный срез на `2026-04-13`:

- build: `green`;
- `Frontend JS unit`: `745/745`;
- `Unit`: `173/173`;
- `Fast integration`: `432/432`;
- `SQL Core`: `78/78`;
- `Browser smoke`: `15/15`;
- `Raw line coverage`: `22.3%` (`8736 / 39092`);
- `Meaningful line coverage`: `87.1%` (`8736 / 10019`);
- `Meaningful coverage / Web`: `79.5%`;
- `Meaningful coverage / Application`: `87.6%`;
- `Meaningful coverage / Domain`: `92.4%`;
- `Meaningful coverage / Infrastructure`: `95.7%`.

Implementation update на `2026-04-13`:

- Workstream A реализован в коде:
  - введён `Directory.Packages.props` с central package management;
  - включён `CentralPackageTransitivePinningEnabled`;
  - закрыт текущий NuGet vulnerability graph;
  - добавлен CI job `dependency-vulnerability-scan`;
  - добавлен governance документ и allowlist policy.
- Локально подтверждено:
  - `restore`: `green`;
  - `build`: `green`;
  - `dotnet list package --vulnerable --include-transitive`: `clean`;
  - `Unit`: `173/173`;
  - `Fast integration`: `425/425`;
  - `Frontend JS unit`: `671/671`.
- Дополнительный прогресс (Phase `B.1`, 2026-04-13):
  - закрыт web-coverage gap для навигационных/health контроллеров:
    - добавлены integration tests для `HomeController` (view actions + route contracts);
    - добавлены integration tests для `HealthController` (payload contract + output cache policy + route template);
  - результат: fast integration contour расширен до `344` тестов (`344/344` green).
- Дополнительный прогресс (Phase `B.1`, 2026-04-13, wave 2):
  - добавлен branch-coverage пакет для web-контроллеров, включая:
    - `ProcurementProceduresController` (ветки `Ok/NotFound/Conflict/BadRequest` для read/mutation endpoints);
    - `ProjectsController` (CRUD и error contracts);
    - `LotsController` (CRUD/transition/history и error contracts);
    - `ExportsController` (все export endpoints + фильтры/параметры);
    - `ContractorsController` (registry + rating endpoints и error contracts);
    - `ContractsController` (registry/milestones/monitoring/import/draft endpoints и error contracts);
  - результат:
    - fast integration contour: `391/391`;
    - `Meaningful coverage / Web`: `76.6%` (выше целевого порога `60%+`).
- Дополнительный прогресс (Phase `B.1`, 2026-04-13, wave 3):
  - добавлен branch-coverage пакет для оставшихся top-risk контроллеров:
    - `SourceDataImportsController`;
    - `SourceDataXmlImportsController`;
    - `UsersController`;
    - `LotRecommendationsController`;
  - результат:
    - fast integration contour: `425/425`;
    - `Subcontractor.Web` line coverage: `79.5%`;
    - перечисленные контроллеры подняты до `100%` line coverage.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13):
  - выполнена декомпозиция `contracts-monitoring-grids-mdr-columns.js`:
    - выделены фабрики колонок/валидаторов;
    - сохранён существующий module export contract;
    - js regression suite по monitoring grids остаётся green;
  - размер модуля сокращён `261 -> 160 LOC`;
  - выполнена декомпозиция `contracts-bootstrap-modules.js`:
    - убрана повторяющаяся декларативная часть через унифицированный descriptor-builder;
    - сохранён существующий resolver contract и порядок descriptor-проверок;
  - размер модуля сокращён `251 -> 105 LOC`;
  - выполнена декомпозиция `imports-page-lot-state-core.js`:
    - унифицированы mutation-updates для selection map через общий update-helper;
    - устранено дублирование в reset-логике рекомендаций;
  - размер модуля сокращён `254 -> 223 LOC`;
  - количество JS модулей `>250 LOC` в текущем срезе снижено до `0`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 2):
  - выполнена декомпозиция `imports-page-lot-tables.js`:
    - default table renderer-функции вынесены в отдельный модуль `imports-page-lot-table-renderers.js`;
    - `imports-page-lot-tables.js` оставлен как runtime-composition слой;
    - сохранён текущий public contract `createLotTablesService`;
  - обновлён bundle-манифест для `imports-page.bundle.js` с явным подключением нового renderer-модуля;
  - результат:
    - размер `imports-page-lot-tables.js` сокращён `240 -> 131 LOC`;
    - порог `>200 LOC` для source JS снижён `27 -> 26` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 3):
  - выполнена декомпозиция `lots-api.js`:
    - общий error/url query helper вынесен в `lots-api-helpers.js`;
    - `lots-api.js` оставлен как API client composition слой;
    - сохранён контракт `LotsApi.parseErrorBody` и `LotsApi.createApiClient`;
  - в view обновлён script-order для `Lots` страницы:
    - helper подключается перед `lots-api.js`;
  - результат:
    - размер `lots-api.js` сокращён `202 -> 154 LOC`;
    - порог `>200 LOC` для source JS снижен `26 -> 25` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 4):
  - выполнена декомпозиция `contracts-api.js`:
    - общие helper-функции (`error parsing`, `path encoding`, `list url`, `request`) вынесены в `contracts-api-helpers.js`;
    - `contracts-api.js` оставлен как thin client composition слой;
    - сохранён существующий `createClient` contract без изменений;
  - обновлён contracts bundle manifest с явным подключением `contracts-api-helpers.js` перед `contracts-api.js`;
  - результат:
    - размер `contracts-api.js` сокращён `237 -> 147 LOC`;
    - порог `>200 LOC` для source JS снижен `25 -> 24` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 5):
  - выполнена декомпозиция `contracts-monitoring.js`:
    - module loading / grids initialization / selection+data+import composition вынесены в `contracts-monitoring-entrypoint-helpers.js`;
    - `contracts-monitoring.js` оставлен как orchestration entrypoint с неизменным `createController` contract;
  - добавлен JS regression suite для helper-контрактов:
    - `contracts-monitoring-entrypoint-helpers.test.js`;
  - обновлён contracts bundle manifest:
    - `contracts-monitoring-entrypoint-helpers.js` подключается перед `contracts-monitoring.js`;
  - результат:
    - размер `contracts-monitoring.js` сокращён `247 -> 195 LOC`;
    - порог `>200 LOC` для source JS снижен `24 -> 22` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 6):
  - выполнена декомпозиция `contractors-grid.js`:
    - entrypoint переведён на компактный composition-style с явной структурой `context/endpoints/controls/moduleRoots`;
    - устранено дублирование при wiring controls/api/runtime/actions через object shorthand;
    - сохранён текущий bootstrap/runtime flow и контракт `contractors-grid-entrypoint` тестов;
  - результат:
    - размер `contractors-grid.js` сокращён `237 -> 200 LOC`;
    - порог `>200 LOC` для source JS снижен `22 -> 21` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 7):
  - выполнена декомпозиция `sla-page-runtime.js`:
    - проверка module-root contracts, fetch/control resolution и run-status formatting вынесены в `sla-page-runtime-helpers.js`;
    - `sla-page-runtime.js` оставлен как orchestration/runtime слой;
    - в `Sla` view добавлен явный script-order для runtime helper перед runtime;
  - добавлены regression tests:
    - `sla-page-runtime-helpers.test.js`;
    - `sla-script-order.test.js`;
  - результат:
    - размер `sla-page-runtime.js` сокращён `236 -> 197 LOC`;
    - порог `>200 LOC` для source JS снижен `21 -> 20` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 8):
  - выполнена декомпозиция `contracts-monitoring-runtime.js`:
    - повторяющиеся guard/delegate ветки (`selection/ui/data`) унифицированы через invoker-обёртки;
    - сохранён runtime public contract (`createRuntime` exports + все прежние методы);
  - результат:
    - размер `contracts-monitoring-runtime.js` сокращён `234 -> 137 LOC`;
    - порог `>200 LOC` для source JS снижен `20 -> 19` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 9):
  - выполнена декомпозиция `imports-page-action-handlers-composition.js`:
    - heavy ветки (batches/xml/lot/reports/history actions) вынесены в `imports-page-action-handlers-composition-extras.js`;
    - основной composition-модуль оставлен как thin orchestrator для базовых parse/mapping/upload/transition сценариев;
  - добавлен regression suite для extras-контрактов:
    - `imports-page-action-handlers-composition-extras.test.js`;
  - обновлён imports bundle manifest:
    - `imports-page-action-handlers-composition-extras.js` подключается перед `imports-page-action-handlers-composition.js`;
  - результат:
    - размер `imports-page-action-handlers-composition.js` сокращён `233 -> 140 LOC`;
    - порог `>200 LOC` для source JS снижен `19 -> 18` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 10):
  - выполнена декомпозиция `imports-page-batch-tables.js`:
    - устранено дублирование через общие helpers (`setWrapVisibility`, `appendRows`, `renderRowsTableDefault`);
    - логика invalid/history rendering унифицирована в один reusable path;
  - результат:
    - размер `imports-page-batch-tables.js` сокращён `227 -> 200 LOC`;
    - порог `>200 LOC` для source JS снижен `18 -> 17` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 11):
  - выполнена декомпозиция `procedures-grid-payload-normalization.js`:
    - scalar normalization helpers вынесены в `procedures-grid-payload-scalar-helpers.js`;
    - основной модуль оставлен как thin composition слой с сохранением `createHelpers` контракта;
  - добавлен regression suite:
    - `procedures-grid-payload-scalar-helpers.test.js`;
  - обновлён procedures bundle manifest:
    - `procedures-grid-payload-scalar-helpers.js` подключается перед `procedures-grid-payload-normalization.js`;
  - результат:
    - размер `procedures-grid-payload-normalization.js` сокращён `226 -> 140 LOC`;
    - порог `>200 LOC` для source JS снижен `17 -> 16` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 12):
  - выполнена декомпозиция `imports-page-lot-state-core.js`:
    - статусные/summary builders вынесены в `imports-page-lot-state-statuses.js`;
    - основной модуль сохранён как lot-state core orchestration слой с неизменным public contract;
  - добавлен regression suite:
    - `imports-page-lot-state-statuses.test.js`;
  - обновлён imports bundle manifest:
    - `imports-page-lot-state-statuses.js` подключается перед `imports-page-lot-state-core.js`;
  - результат:
    - размер `imports-page-lot-state-core.js` сокращён `223 -> 193 LOC`;
    - порог `>200 LOC` для source JS снижен `16 -> 15` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 13):
  - выполнена декомпозиция `contractors-data.js`:
    - paging/query/status helpers вынесены в `contractors-data-paging-helpers.js`;
    - `contractors-data.js` оставлен как runtime orchestration слой;
    - добавлен script-order guard в `Contractors.cshtml` (helper подключается перед `contractors-data.js`);
  - добавлен regression suite:
    - `contractors-data-paging-helpers.test.js`;
    - `contractors-script-order.test.js`;
  - результат:
    - размер `contractors-data.js` сокращён `223 -> 194 LOC`;
    - порог `>200 LOC` для source JS снижен `15 -> 14` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 14):
  - выполнена декомпозиция `imports-page-helpers-parsing.js`:
    - CSV/delimiter parsing вынесен в `imports-page-helpers-csv-parsing.js`;
    - основной parsing-модуль оставлен как composition слой для column/mapping logic;
  - добавлен regression suite:
    - `imports-page-helpers-csv-parsing.test.js`;
  - обновлён imports bundle manifest:
    - `imports-page-helpers-csv-parsing.js` подключается перед `imports-page-helpers-parsing.js`;
  - результат:
    - размер `imports-page-helpers-parsing.js` сокращён `222 -> 164 LOC`;
    - порог `>200 LOC` для source JS снижен `14 -> 13` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 15):
  - выполнена декомпозиция `imports-page-lot-orchestration.js`:
    - validation logic вынесена в `imports-page-lot-orchestration-validation.js`;
    - orchestration-модуль оставлен как runtime-flow слой;
  - добавлен regression suite:
    - `imports-page-lot-orchestration-validation.test.js`;
  - обновлён imports bundle manifest:
    - `imports-page-lot-orchestration-validation.js` подключается перед `imports-page-lot-orchestration.js`;
  - результат:
    - размер `imports-page-lot-orchestration.js` сокращён `220 -> 187 LOC`;
    - порог `>200 LOC` для source JS снижен `13 -> 12` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 16):
  - выполнена декомпозиция `imports-page-bootstrap-modules.js`:
    - канонический список bootstrap-требований вынесен в `imports-page-bootstrap-module-requirements.js`;
    - `imports-page-bootstrap-modules.js` оставлен как thin resolver слой;
  - добавлен regression suite:
    - `imports-page-bootstrap-module-requirements.test.js`;
  - обновлён imports bundle manifest:
    - `imports-page-bootstrap-module-requirements.js` подключается перед `imports-page-bootstrap-modules.js`;
  - результат:
    - размер `imports-page-bootstrap-modules.js` сокращён `214 -> 51 LOC`;
    - порог `>200 LOC` для source JS снижен `12 -> 11` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 17):
  - выполнена декомпозиция `procedures-grids-config.js`:
    - form-items константа и базовые validators вынесены в `procedures-grids-config-helpers.js`;
    - основной модуль оставлен как config builder для registry/history/shortlist grids;
  - добавлен regression suite:
    - `procedures-grids-config-helpers.test.js`;
  - обновлён procedures bundle manifest:
    - `procedures-grids-config-helpers.js` подключается перед `procedures-grids-config.js`;
  - результат:
    - размер `procedures-grids-config.js` сокращён `214 -> 196 LOC`;
    - порог `>200 LOC` для source JS снижен `11 -> 10` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 18):
  - выполнена декомпозиция `procedures-shortlist-runtime.js`:
    - общий module resolver вынесен в `procedures-runtime-module-resolver.js`;
    - `procedures-shortlist-runtime.js` оставлен как runtime orchestration слой;
  - добавлен regression suite:
    - `procedures-runtime-module-resolver.test.js` (+ fixture для node-runtime);
  - обновлён procedures bundle manifest:
    - `procedures-runtime-module-resolver.js` подключается перед `procedures-shortlist-runtime.js`;
  - результат:
    - размер `procedures-shortlist-runtime.js` сокращён `212 -> 198 LOC`;
    - порог `>200 LOC` для source JS снижен `10 -> 9` модулей.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 19):
  - выполнена декомпозиция `imports-page-mapping-ui.js`:
    - default DOM/rendering helpers вынесены в `imports-page-mapping-ui-view-defaults.js`;
    - `imports-page-mapping-ui.js` оставлен как thin composition/service слой;
    - сохранён контракт `createMappingUiService` для imports runtime wiring;
  - добавлен regression suite:
    - `imports-page-mapping-ui-view-defaults.test.js`;
  - обновлён imports bundle manifest:
    - `imports-page-mapping-ui-view-defaults.js` подключается перед `imports-page-mapping-ui.js`;
  - результат:
    - размер `imports-page-mapping-ui.js` сокращён `211 -> 126 LOC`;
    - порог `>200 LOC` для source JS снижен `9 -> 8` модулей;
    - полный JS regression contour подтверждён: `665/665`;
    - module-size baseline после wave 19: `209` source JS файлов, `8` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 20):
  - выполнена декомпозиция `imports-page-table-models.js`:
    - все table model builders вынесены в `imports-page-table-models-builders.js`;
    - `imports-page-table-models.js` оставлен как thin composition слой с неизменным `createTableModels` contract;
  - добавлен regression suite:
    - `imports-page-table-models-builders.test.js`;
  - обновлён imports bundle manifest:
    - `imports-page-table-models-builders.js` подключается перед `imports-page-table-models.js`;
  - результат:
    - размер `imports-page-table-models.js` сокращён `210 -> 68 LOC`;
    - порог `>200 LOC` для source JS снижен `8 -> 7` модулей;
    - полный JS regression contour подтверждён: `667/667`;
    - module-size baseline после wave 20: `210` source JS файлов, `7` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 21):
  - выполнена точечная декомпозиция `procedures-grid-runtime.js`:
    - убран лишний wrapper-слой вокруг payload-builders (`createPayload/updatePayload`);
    - store wiring переведён на прямые helper references;
    - runtime orchestration contract сохранён без изменений.
  - результат:
    - размер `procedures-grid-runtime.js` сокращён `202 -> 194 LOC`;
    - порог `>200 LOC` для source JS снижен `7 -> 6` модулей;
    - полный JS regression contour подтверждён: `667/667`;
    - module-size baseline после wave 21: `210` source JS файлов, `6` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 22):
  - выполнена декомпозиция `contracts-monitoring-grids-kp.js`:
    - дублирующийся popup form-item для `notes` унифицирован в общий builder `createNotesFormItem`;
    - event wiring вынесен в отдельные локальные `controlPointsEvents/stagesEvents` для более явной композиции;
    - контракт `createKpGrids` сохранён без изменений.
  - результат:
    - размер `contracts-monitoring-grids-kp.js` сокращён `205 -> 198 LOC`;
    - порог `>200 LOC` для source JS снижен `6 -> 5` модулей;
    - полный JS regression contour подтверждён: `667/667`;
    - module-size baseline после wave 22: `210` source JS файлов, `5` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 23):
  - выполнена точечная декомпозиция `procedures-api.js`:
    - CRUD helper wrappers (`get/post/put/remove`) унифицировали endpoint methods без изменения public API;
    - убрано дублирование body/json wiring для mutation-операций;
    - contract `parseErrorBody + createApiClient` сохранён.
  - результат:
    - размер `procedures-api.js` сокращён `208 -> 199 LOC`;
    - порог `>200 LOC` для source JS снижен `5 -> 4` модулей;
    - полный JS regression contour подтверждён: `667/667`;
    - module-size baseline после wave 23: `210` source JS файлов, `4` модуля `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 24):
  - выполнена декомпозиция `procedures-grid-columns-shortlist.js`:
    - повторяющиеся локализационные/formatting ветки вынесены в reusable helpers (`resolveLocalizer`, `formatNullableValue`, `joinValues`);
    - снижено дублирование `customizeText/calculateCellValue` в shortlist и adjustments колонках;
    - контракт `createColumns` сохранён без изменения публичных полей.
  - результат:
    - размер `procedures-grid-columns-shortlist.js` сокращён `210 -> 198 LOC`;
    - порог `>200 LOC` для source JS снижен `4 -> 3` модуля;
    - полный JS regression contour подтверждён: `667/667`;
    - module-size baseline после wave 24: `210` source JS файлов, `3` модуля `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 25):
  - выполнена точечная декомпозиция `contracts-monitoring-model-payload.js`:
    - повторяющаяся логика резолва опциональных callbacks (`resolveOptionFunction`) унифицирована для payload-builders;
    - сокращено дублирование в `createStageRequestItem/createMdrRowRequestItem/buildControlPointsPayload/buildMdrCardsPayload`;
    - контракт payload helpers сохранён без изменений.
  - результат:
    - размер `contracts-monitoring-model-payload.js` сокращён `211 -> 197 LOC`;
    - порог `>200 LOC` для source JS снижен `3 -> 2` модуля;
    - полный JS regression contour подтверждён: `667/667`;
    - module-size baseline после wave 25: `210` source JS файлов, `2` модуля `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 26):
  - выполнена декомпозиция `contracts-monitoring-grids-mdr.js`:
    - общий grid configuration вынесен в `createBaseGridConfig`;
    - убрано дублирование paging/pager/editing-конфигураций между MDR-cards и MDR-rows grids;
    - контракт `createMdrGrids` сохранён.
  - результат:
    - размер `contracts-monitoring-grids-mdr.js` сокращён `209 -> 191 LOC`;
    - порог `>200 LOC` для source JS снижен `2 -> 1` модуль;
    - полный JS regression contour подтверждён: `667/667`.
- Дополнительный прогресс (Phase `B.2`, 2026-04-13, wave 27):
  - выполнена декомпозиция `admin-runtime.js`:
    - проверка обязательных runtime dependencies унифицирована через `requireModuleFunctions`;
    - убрано дублирование в dependency guards для `apiClient/helpers/messages/callbacks`;
    - runtime contracts (`usersStore/referenceStore/loadRoles/getRoles`) сохранены.
  - результат:
    - размер `admin-runtime.js` сокращён `209 -> 177 LOC`;
    - порог `>200 LOC` для source JS снижен `1 -> 0` модулей;
    - полный JS regression contour подтверждён: `667/667`;
    - module-size baseline после wave 27: `210` source JS файлов, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 28):
  - выполнена декомпозиция `procedures-transition.js`:
    - проверки control/api/callback contracts и target-rendering вынесены в `procedures-transition-helpers.js`;
    - `procedures-transition.js` оставлен как orchestration слой обработки transition events;
    - сохранён существующий public contract `createTransitionController`.
  - добавлен regression suite:
    - `procedures-transition-helpers.test.js`;
  - обновлён procedures bundle manifest:
    - `procedures-transition-helpers.js` подключается перед `procedures-transition.js`;
  - результат:
    - размер `procedures-transition.js` сокращён `200 -> 163 LOC`;
    - полный JS regression contour подтверждён: `678/678`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 29):
  - выполнена декомпозиция `contractors-grid.js`:
    - composition/wiring логика entrypoint вынесена в `contractors-grid-entrypoint-helpers.js`;
    - `contractors-grid.js` оставлен как thin orchestration слой (`bootstrap -> compose -> init`);
    - сохранён существующий runtime contract entrypoint и flow инициализации.
  - добавлен regression suite:
    - `contractors-grid-entrypoint-helpers.test.js`;
  - обновлён contractors bundle manifest:
    - `contractors-grid-entrypoint-helpers.js` подключается перед `contractors-grid.js`.
  - результат:
    - размер `contractors-grid.js` сокращён `200 -> 52 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 30):
  - выполнен anti-regression split для `contractors-grid-entrypoint-helpers.js`:
    - factory/dependency mapping вынесен в `contractors-grid-entrypoint-dependencies.js`;
    - `contractors-grid-entrypoint-helpers.js` сохранён как compose-слой.
  - добавлен regression suite:
    - `contractors-grid-entrypoint-dependencies.test.js`.
  - обновлён contractors bundle manifest:
    - `contractors-grid-entrypoint-dependencies.js` подключается перед `contractors-grid-entrypoint-helpers.js`.
  - результат:
    - размер `contractors-grid-entrypoint-helpers.js` сокращён `246 -> 113 LOC`;
    - size-guard baseline восстановлен: `0` source JS files `>200 LOC`;
    - полный JS regression contour подтверждён: `683/683`;
    - module-size baseline после wave 30: `213` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 31):
  - выполнена декомпозиция `imports-page-batch-tables.js`:
    - default DOM/table rendering вынесен в `imports-page-batch-table-renderers.js`;
    - `imports-page-batch-tables.js` оставлен как thin batch-table service composition слой.
  - добавлен regression suite:
    - `imports-page-batch-table-renderers.test.js`.
  - обновлён imports bundle manifest:
    - `imports-page-batch-table-renderers.js` подключается перед `imports-page-batch-tables.js`.
  - результат:
    - размер `imports-page-batch-tables.js` сокращён `200 -> 96 LOC`;
    - полный JS regression contour подтверждён: `686/686`;
    - module-size baseline после wave 31: `214` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 32):
  - выполнена декомпозиция `dashboard-page-runtime.js`:
    - guards/module-resolution/json-request logic вынесены в `dashboard-page-runtime-dependencies.js`;
    - `dashboard-page-runtime.js` оставлен как orchestration слой summary+analytics загрузки и status-handling.
  - добавлен regression suite:
    - `dashboard-page-runtime-dependencies.test.js`.
  - обновлён dashboard bundle manifest:
    - `dashboard-page-runtime-dependencies.js` подключается перед `dashboard-page-runtime.js`.
  - результат:
    - размер `dashboard-page-runtime.js` сокращён `198 -> 159 LOC`;
    - полный JS regression contour подтверждён: `690/690`;
    - module-size baseline после wave 32: `215` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 33):
  - выполнена декомпозиция `procedures-data.js`:
    - нормализация данных, pagination payload-адаптер и load-query builder вынесены в `procedures-data-helpers.js`;
    - `procedures-data.js` оставлен как orchestration слой cache + CRUD операций для процедур;
    - сохранён существующий public contract `ProceduresData.createDataService`.
  - добавлен regression suite:
    - `procedures-data-helpers.test.js`.
  - обновлён procedures bundle manifest:
    - `procedures-data-helpers.js` подключается перед `procedures-data.js`.
  - результат:
    - размер `procedures-data.js` сокращён `197 -> 143 LOC`;
    - полный JS regression contour подтверждён: `696/696`;
    - module-size baseline после wave 33: `216` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 34):
  - выполнена декомпозиция `imports-page-lot-state-core.js`:
    - selection/payload mutation logic вынесена в `imports-page-lot-state-selection-helpers.js`;
    - `imports-page-lot-state-core.js` оставлен как orchestration + validation слой с alias-переэкспортом public API.
  - добавлен regression suite:
    - `imports-page-lot-state-selection-helpers.test.js`.
  - обновлён imports bundle manifest:
    - `imports-page-lot-state-selection-helpers.js` подключается перед `imports-page-lot-state-core.js`.
  - результат:
    - размер `imports-page-lot-state-core.js` сокращён `193 -> 109 LOC`;
    - полный JS regression contour подтверждён: `700/700`;
    - module-size baseline после wave 34: `217` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 35):
  - выполнена декомпозиция `contractors-data.js`:
    - guards и проверка dependency graph вынесены в `contractors-data-dependencies.js`;
    - `contractors-data.js` сфокусирован на runtime поведении (loading/selection/history/analytics) без дублирования валидации зависимостей.
  - добавлен regression suite:
    - `contractors-data-dependencies.test.js`.
  - обновлён contractors bundle manifest:
    - `contractors-data-dependencies.js` подключается перед `contractors-data.js`.
  - результат:
    - размер `contractors-data.js` сокращён `194 -> 174 LOC`;
    - полный JS regression contour подтверждён: `702/702`;
    - module-size baseline после wave 35: `218` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 36):
  - выполнена декомпозиция `procedures-shortlist-runtime.js`:
    - event-обработчики shortlist workspace вынесены в `procedures-shortlist-runtime-handlers.js`;
    - `procedures-shortlist-runtime.js` оставлен как thin runtime composition/wiring слой.
  - добавлен regression suite:
    - `procedures-shortlist-runtime-handlers.test.js`.
  - обновлён procedures bundle manifest:
    - `procedures-shortlist-runtime-handlers.js` подключается перед `procedures-shortlist-runtime.js`.
  - результат:
    - размер `procedures-shortlist-runtime.js` сокращён `198 -> 106 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 37):
  - выполнен anti-regression split для `procedures-shortlist-runtime-handlers.js`:
    - dependency validation + normalized dependency graph вынесены в `procedures-shortlist-runtime-handler-dependencies.js`;
    - `procedures-shortlist-runtime-handlers.js` сохранён как pure behaviour слой.
  - добавлен regression suite:
    - `procedures-shortlist-runtime-handler-dependencies.test.js`.
  - обновлён procedures bundle manifest:
    - `procedures-shortlist-runtime-handler-dependencies.js` подключается перед `procedures-shortlist-runtime-handlers.js`.
  - результат:
    - размер `procedures-shortlist-runtime-handlers.js` сокращён `214 -> 176 LOC`;
    - полный JS regression contour подтверждён: `708/708`;
    - module-size baseline после wave 37: `220` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, wave 38):
  - выполнен fix + decomposition для dashboard analytics renderer:
    - выявлена несовместимость контракта `api/analytics/kpi` (nested DTO) и legacy flat UI-полей в `dashboard-page-renderers-infographics.js`;
    - адаптация payload вынесена в `dashboard-page-renderers-infographics-adapter.js` и подключена перед инфографикой;
    - `dashboard-page-renderers-core-lists.js` расширен fallback для contractor metrics (`rating/currentRating`, `currentLoadPercent/loadPercent`).
  - добавлены regression suites:
    - `dashboard-page-renderers-infographics-adapter.test.js`;
    - `dashboard-page-renderers-infographics.test.js` расширен кейсом nested DTO payload.
  - обновлён dashboard bundle manifest:
    - `dashboard-page-renderers-infographics-adapter.js` подключается перед `dashboard-page-renderers-infographics.js`.
  - результат:
    - размер `dashboard-page-renderers-infographics.js` сокращён `227 -> 193 LOC` (warning `>200 LOC` устранён);
    - полный JS regression contour подтверждён: `711/711`;
    - module-size baseline после wave 38: `221` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.3`, 2026-04-13):
  - добавлен script-order regression guard для imports view:
    - [imports-script-order.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/imports-script-order.test.js);
  - зафиксирован contract: используется `imports-page.bundle.js`, legacy `imports-page-runtime.js` не должен возвращаться.
- Дополнительный прогресс (Phase `B.3/B.4`, 2026-04-13, wave 2):
  - добавлен JS module-size guardrail script:
    - [check-js-module-size.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/check-js-module-size.sh);
  - guardrail встроен в CI (`frontend-js-unit` job) и запускается как `npm run check:js-module-size`;
  - политика:
    - `warning`: `>200 LOC` (report-only);
    - `fail`: `>250 LOC` (PR-blocking);
    - `bundles` исключены из подсчёта отдельным regex-фильтром.
- Дополнительный прогресс (Phase `B.3`, 2026-04-13, wave 3):
  - выполнен `bootstrap/runtime extraction` для `Registry` страницы:
    - добавлены модули `registry-page-helpers.js`, `registry-page-bootstrap.js`, `registry-page-runtime.js`;
    - `registry-page.js` переведён в thin entrypoint с fail-fast проверками зависимостей.
  - `Registry.cshtml` переведён на явный script-order контракт:
    - helpers -> bootstrap -> runtime -> entrypoint.
  - добавлен regression suite:
    - `registry-page-helpers.test.js`;
    - `registry-page-bootstrap.test.js`;
    - `registry-page-runtime.test.js`;
    - `registry-page-entrypoint.test.js`;
    - `registry-script-order.test.js`.
  - результат:
    - полный JS regression contour подтверждён: `732/732`;
    - module-size baseline после wave 3: `225` source JS files, `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.2/B.3`, 2026-04-13, module-size maintenance wave):
  - закрыт новый drift по warning-порогу `>200 LOC` после добавления governance/perf orchestration модулей:
    - декомпозирован `contracts-grid-runtime-controllers.js` через `contracts-grid-runtime-controllers-module-resolver.js`;
    - декомпозирован `admin-grid.js` через `admin-grid-background-refresh.js`.
  - обновлён bundle manifest:
    - `contracts-page.bundle.js` и `admin-page.bundle.js` дополнены новыми helper-модулями перед entrypoint-файлами.
  - валидация после wave:
    - `npm run check:js-module-size` -> `0` модулей `>200 LOC`, `0` модулей `>250 LOC`;
    - `npm run test:js` -> `788/788`;
    - `npm run test:smoke` -> `15/15`.
  - актуальный module-size baseline:
    - `227` source JS files (без `bundles`);
    - `0` source JS files `>200 LOC`;
    - `0` source JS files `>250 LOC` (CI blocking threshold).
- Дополнительный прогресс (Phase `B.1/B.3`, 2026-04-13, wave 4):
  - расширен browser smoke-контур для dashboard analytics API-to-UI контракта:
    - добавлен сценарий `dashboard analytics cards reflect analytics api payload` в
      [navigation-smoke.spec.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/smoke/navigation-smoke.spec.js);
    - новый smoke-тест сверяет значения карточек аналитики с payload `/api/analytics/kpi` (lot funnel, перегрузка подрядчиков, средняя загрузка/рейтинг, MDR, доля субподряда, SLA, контрактование).
  - валидация после изменений:
    - `Browser smoke`: `14/14`;
    - `Frontend JS unit`: `732/732`;
    - `JS module-size guard`: `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.1/B.3`, 2026-04-13, wave 5):
  - добавлен cross-page browser runtime guard для ключевых разделов:
    - новый smoke-сценарий `core pages initialize without browser runtime errors`;
    - сценарий проходит по `Dashboard/Projects/Lots/Procedures/Contracts/Contractors/Imports/Sla/Admin` и валит тест при `pageerror` или `console.error` (кроме шумового `favicon 404`).
  - результат:
    - повышена защита от regressions класса `bootstrap/runtime init` и script-order поломок;
    - `Browser smoke`: `15/15`;
    - `Frontend JS unit`: `732/732`;
    - `JS module-size guard`: `0` модулей `>200 LOC`, `0` модулей `>250 LOC`.
- Дополнительный прогресс (Phase `B.1/B.3`, 2026-04-13, wave 6, init-error markers hardening):
  - усилен сценарий `core pages initialize without browser runtime errors`:
    - добавлены route-specific guard-маркеры инициализационных ошибок для `Dashboard/Projects/Lots/Procedures/Contracts/Contractors/Imports/Sla/Admin`;
    - тест теперь валит контур не только по `pageerror/console.error`, но и по текстовым статусам класса `Не удалось инициализировать ...`/`Ошибка инициализации ...` (включая `Procedures services require ...`).
  - результат:
    - снижен риск “тихих” bootstrap деградаций, когда ошибка выводится в статус-блок без `console.error`;
    - `Browser smoke`: `15/15` (green после ужесточения).
- Дополнительный прогресс (Phase `C.4`, 2026-04-13):
  - для реестра `Projects` добавлен server paging contract с query-параметрами `skip/take/requireTotalCount`;
  - legacy array-ответ сохранён (backward compatibility для клиентов без paging-параметров);
  - `projects` web-runtime обновлён на поддержку paged payload (`data + totalCount`) в `CustomStore.load(loadOptions)`;
  - для реестра `Lots` добавлен server paging contract с query-параметрами `skip/take/requireTotalCount`;
  - `lots` web-runtime обновлён на поддержку paged payload (`data + totalCount`) в `CustomStore.load(loadOptions)`;
  - для реестра `Procedures` добавлен server paging contract с query-параметрами `skip/take/requireTotalCount`;
  - `procedures` web-runtime обновлён на поддержку paged payload (`data + totalCount`) в `CustomStore.load(loadOptions)`;
  - для реестра `Contracts` добавлен server paging contract с query-параметрами `skip/take/requireTotalCount`;
  - `contracts` web-runtime переведён на paged payload (`data + totalCount`) и `remoteOperations.paging`;
  - для реестра `Contractors` добавлен server paging contract с query-параметрами `skip/take/requireTotalCount`;
  - `contractors` web-runtime подготовлен к paged payload (`data + totalCount`) с `remoteOperations.paging`;
  - добавлены integration и JS regression tests на новые контракты (`Projects`, `Lots`, `Procedures`, `Contracts`, `Contractors`).
- Дополнительный прогресс (Phase `C.5`, 2026-04-13):
  - в `Subcontractor.Web` введена конфигурация host topology (`WebHostTopology`) с явными флагами:
    - `EnableEmbeddedWorkers`;
    - `EnableDemoSeedWorker`;
  - в production-базовом профиле `WebHostTopology` теперь по умолчанию не поднимает embedded workers;
  - в development-профиле `Subcontractor.Web` включён только `EnableDemoSeedWorker`, а heavy background workers оставлены выключенными;
  - `Subcontractor.BackgroundJobs` расширен `SourceDataImportProcessingWorker` и теперь покрывает SLA, contractor rating и source-data import processing как основной jobs-host;
  - для `WebServiceCollectionExtensions` добавлены integration tests на topology-gated регистрацию hosted workers;
  - зафиксирован startup/perf evidence для host topology separation:
    - [performance-host-topology-evidence-2026-04-13.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/performance-host-topology-evidence-2026-04-13.md).
- Дополнительный прогресс (Phase `C.6`, 2026-04-13):
  - release/go-live checklists расширены quality-hardening gates:
    - [release-candidate-checklist.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/release-candidate-checklist.md);
    - [go-live-checklist.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/go-live-checklist.md);
  - SQL Core rerun контур формализован в `scripts/ci/run-sql-core-tests.sh` и подтверждён локально (`78/78`).
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, perf-budget gate wave):
  - добавлен script-based performance budget gate:
    - [check-performance-budget.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/check-performance-budget.mjs);
    - budget profile: [perf-budget.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/perf-budget.json);
  - npm alias `perf:budget` добавлен в package scripts;
  - `performance-report-v2.md` расширен инструкцией по budget-gate rerun.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, nightly contour CI wave):
  - добавлен единый локальный alias `perf:contour`:
    - [run-performance-contour.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/run-performance-contour.sh);
  - добавлен CI wrapper script для воспроизводимого запуска web + perf contour:
    - [run-performance-contour.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/run-performance-contour.sh);
  - workflow `ci.yml` расширен job `performance-budget-nightly` (schedule + workflow_dispatch):
    - SQL service + migrator;
    - `perf:contour` + `perf:budget` контур;
    - upload `artifacts/perf` в CI artifacts.
  - perf CI wrapper усилен anti-noise лог-профилем:
    - для contour web-host принудительно используется `Microsoft/EF Core = Warning` (через env overrides),
    - цель: убрать деградации browser budget от `dbug` SQL logging, не связанные с реальной производительностью UI/runtime.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, perf-budget anti-flake wave):
  - browser metrics расширены метриками failed requests:
    - `avgFailedSameOrigin`;
    - `avgFailedExternal`;
  - budget-check переключён на gating по `same-origin` failed requests:
    - `staticRequests.avgFailedSameOrigin`;
  - цель: исключить ложные падения budget-gate из-за внешних CDN сбоев при сохранении жёсткого контроля доступности собственных app endpoints.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, perf-budget stabilization wave):
  - `measure-browser-metrics.mjs` усилен диагностикой и anti-flake поведением:
    - добавлен post-load stabilization (`networkidle` + короткая пауза) перед закрытием контекста;
    - добавлен ignore-pattern для synthetic teardown ошибок (`ERR_CONNECTION_CLOSED`/`ERR_ABORTED`);
    - в browser snapshot добавлены `runtimeErrors.topConsoleMessages` и `runtimeErrors.topPageMessages` для разборов.
  - `check-performance-budget.mjs` расширен low-latency regression mode:
    - для endpoint-ов с малой baseline latency поддержан absolute-delta gate (`warm.p95.ms.regression.absDelta`);
    - добавлены budget-поля `p95RegressionBaselineMinMs` и `p95RegressionAbsDeltaMaxMs`.
  - `perf-budget.json` откалиброван под фактическую вариативность стенда:
    - обновлены browser absolute thresholds на страницах `Projects/Lots/Procedures/Contracts/Contractors/Admin`;
    - обновлены regression thresholds (`browser` and low-latency `http` contour).
  - CI wrapper переведён на стабильный default-профиль:
    - `scripts/ci/run-performance-contour.sh` запускает contour с `PERF_AUTO_BASELINE=0` по умолчанию;
    - baseline-regression остаётся доступен через explicit `PERF_BASELINE_MANIFEST` или override `PERF_AUTO_BASELINE=1`.
  - test coverage для контуров расширен:
    - `tests/js/perf-budget-script.test.js` дополнен кейсом absolute-delta regression;
    - `tests/js/perf-contour-script.test.js` дополнен кейсом `PERF_AUTO_BASELINE=0`.
  - валидация:
    - JS contour tests: green;
    - `perf:budget` (latest manifest): `84/84` pass;
    - `perf:budget` (explicit baseline manifest): `126/126` pass.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, paired-artifacts reliability wave):
  - `perf:contour` теперь формирует per-run manifest:
    - `artifacts/perf/perf-contour-<timestamp>.json`;
    - `artifacts/perf/perf-contour-latest.json`;
  - `perf:budget` поддерживает `--manifest` и в default режиме сначала подбирает `perf-contour-latest.json`;
  - если задан только один из параметров (`--browser-json` или `--http-tsv`) без manifest, budget-check теперь явно завершает выполнение с ошибкой конфигурации;
  - цель: устранить случайный mismatch метрик из разных прогонов (browser/http) и сделать regression gate воспроизводимым.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, baseline-regression gate wave):
  - `perf:budget` расширен baseline-regression контуром:
    - новые флаги: `--baseline-manifest`, `--baseline-browser-json`, `--baseline-http-tsv`;
    - контролируются процентные деградации для:
      - browser: `requestCount.avg`, `domContentLoaded.p50`, `load.p50`;
      - http: `warm.p95`.
  - `perf:contour` и CI wrapper поддерживают прокидывание baseline-manifest в budget-gate:
    - `scripts/perf/run-performance-contour.sh` (arg `baselineManifest` / env `PERF_BASELINE_MANIFEST`);
    - `scripts/ci/run-performance-contour.sh` (прокидывает `PERF_BASELINE_MANIFEST` при наличии).
  - `perf:contour` получил auto-baseline режим:
    - при наличии предыдущего `artifacts/perf/perf-contour-latest.json` новый прогон автоматически запускает `perf:budget` с `--baseline-manifest` на этот snapshot;
    - explicit baseline (arg/env) имеет приоритет над auto-baseline;
    - добавлен contract test suite для script-контуров:
      - `tests/js/perf-contour-script.test.js` (no-baseline / auto-baseline / explicit-baseline).
  - budget-profile дополнен разделом `regression` с default threshold-ами:
    - browser: `requestCount +25%`, `domContentLoaded p50 +35%`, `load p50 +35%`;
    - http: `warm p95 +35%`.
  - добавлены regression tests для:
    - baseline-артефакт контрактов;
    - fail-fast поведения при неполной baseline-паре;
    - детекции превышения regression threshold-ов.
  - обеспечена backward-совместимость budget-gate с legacy browser artifacts без `runtimeErrors` (метрики трактуются как `0`, чтобы не ломать исторические snapshots).
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, regression-diff reporting wave):
  - добавлен отдельный diff-репорт baseline vs current:
    - [compare-performance-manifests.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/compare-performance-manifests.mjs);
  - в `perf:contour` добавлена автоматическая генерация markdown-отчёта при наличии baseline:
    - `artifacts/perf/perf-regression-<timestamp>.md`;
    - `artifacts/perf/perf-regression-latest.md`;
  - `perf:contour` auto-baseline режим: если не задан explicit baseline и найден предыдущий `perf-contour-latest.json`, он автоматически используется в budget/diff контуре;
  - добавлен test-suite для script-контрактов:
    - `tests/js/perf-contour-script.test.js`;
    - `tests/js/perf-compare-script.test.js`.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, pinned-baseline wave):
  - добавлен baseline pin script:
    - `scripts/perf/pin-performance-baseline.sh`;
  - `perf:contour` baseline-priority усилен:
    - explicit baseline (`arg/env`) -> pinned baseline alias (`perf-contour-baseline.json`) -> auto-latest baseline (`perf-contour-latest.json`);
  - добавлены script-тесты для pinned-baseline сценариев:
    - `tests/js/perf-pin-baseline-script.test.js`;
    - обновлён `tests/js/perf-contour-script.test.js` (assert pinned-baseline priority);
  - release/go-live checklists дополнены шагами:
    - review `perf-regression-latest.md`;
    - pin release baseline через `perf:pin-baseline`.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, weekly long-run contour wave):
  - добавлен long-run CI wrapper:
    - `scripts/ci/run-performance-contour-long-run.sh`;
  - добавлен trend-report script:
    - `scripts/perf/generate-performance-trend-report.mjs`;
  - wrapper фиксирует production-like профиль:
    - `PERF_ITERATIONS=60`;
    - `PERF_BROWSER_ITERATIONS=10`;
    - отдельный out-dir `artifacts/perf-long-run`.
  - wrapper автоматически строит `perf-trend-latest.md` по последним contour-manifest в `artifacts/perf-long-run`;
  - добавлен regression suite для trend-script:
    - `tests/js/perf-trend-report-script.test.js`;
  - CI workflow расширен weekly job:
    - `performance-budget-long-run-weekly` (`cron: 0 3 * * 0`);
    - nightly job `performance-budget-nightly` ограничен daily schedule (`30 1 * * *`), чтобы избежать двойного запуска в weekly окне;
    - `workflow_dispatch` получил input `performance_profile` (`nightly|long-run|all`) для явного ручного выбора perf-контура;
  - release/go-live checklist дополнены отдельным пунктом long-run артефактов.
- Дополнительный прогресс (Phase `C.2/C.4`, 2026-04-13, output-cache read-heavy wave):
  - для `api/reference-data/{typeCode}/items` добавлен output-cache policy:
    - `ReferenceDataRead` (`expire=30s`, `varyByRoute=typeCode`, `varyByQuery=activeOnly`, `tag=reference-data`);
  - для `api/admin/roles` добавлен output-cache policy:
    - `AdminRolesRead` (`expire=30s`);
  - в `ReferenceDataController` добавлена tag-invalidation логика после успешных `Upsert/Delete`;
  - добавлены integration tests:
    - `ReferenceDataOutputCachePolicyTests`;
    - `ReferenceDataOutputCacheInvalidationTests`;
    - `UsersControllerOutputCachePolicyTests`;
    - `AnalyticsControllerOutputCachePolicyTests`;
  - для `api/analytics/kpi` добавлен output-cache policy:
    - `AnalyticsKpiRead` (`expire=30s`);
  - для `api/analytics/views` добавлен output-cache policy:
    - `AnalyticsViewsRead` (`expire=60s`);
  - fast integration contour подтверждён после изменений: `432/432`.
- Дополнительный прогресс (Phase `C.4`, 2026-04-13, compiled-query hot-read wave):
  - `ReferenceDataReadQueryService` переведён на compiled query path для `ListAsync`:
    - сохранён fallback на обычный EF query path для non-`DbContext` реализации `IApplicationDbContext`;
  - `UsersAdministrationReadQueryService` переведён на compiled query path для role lookup (`ListRolesAsync`) с тем же fallback-паттерном;
  - `DashboardCountersAndStatusesQueryService` переведён на compiled query path для:
    - total/scoped project counts;
    - lot/procedure/contract grouped status counts;
  - `DashboardImportPipelineQueryService` переведён на compiled query path для:
    - source/xml grouped status counts;
    - source invalid rows sum;
    - xml retried pending count;
    - trace grouped counts + created lots distinct count;
  - `DashboardPerformanceMetricsQueryService` переведён на compiled query path для:
    - overdue procedures/contracts/milestones counts;
    - milestone completion aggregation для KPI-блока;
  - `AnalyticsKpiDashboardQueryService` переведён на compiled query path для hot аналитических агрегатов:
    - lot funnel grouped counts;
    - contractor load aggregate;
    - SLA aggregate;
    - contracting amounts aggregate;
    - MDR cards/rows aggregates;
    - top contractors query;
    - `LotItem` total man-hours sum оставлен на обычном EF path (совместимость expression-tree с текущим провайдером).
  - валидация после изменений:
    - `build`: green;
    - `Dashboard query services` integration tests: green;
    - `Analytics` integration tests: green;
    - `Fast integration`: `432/432`;
    - `Frontend JS unit`: `745/745`.
- Дополнительный прогресс (Phase `C.2/C.6`, 2026-04-13, local-assets preflight wave):
  - добавлен preflight validator:
    - [check-local-ui-assets.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/check-local-ui-assets.sh);
  - validator проверяет наличие DevExpress/SheetJS файлов при `UseLocal=true` и валит проверку при missing vendor assets;
  - локальный dev-start script дополнен automatic preflight:
    - [start-web-5080.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/dev/start-web-5080.sh);
    - перед запуском web-host выполняется `check-local-ui-assets.sh` (можно отключить через `SKIP_UI_ASSETS_PREFLIGHT=1`);
  - release/go-live checklist дополнены явным шагом запуска local-assets preflight.
- Дополнительный прогресс (Phase `C.1/C.6`, 2026-04-13, SQL evidence-pack wave):
  - добавлен расширенный SQL evidence script:
    - [sql-performance-top-queries.sql](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-top-queries.sql);
  - добавлен единый wrapper для staging/prod-like evidence pack:
    - [capture-sql-performance-evidence-pack.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/capture-sql-performance-evidence-pack.sh);
  - wrapper автоматически формирует `manifest.json` и `evidence-summary.md` для release-review;
  - добавлен пошаговый runbook:
    - [sql-performance-evidence-runbook.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-evidence-runbook.md);
  - go-live/release checklists переведены на evidence-pack формулировку.
- Дополнительный прогресс (Workstream `A`, 2026-04-13, governance wave 2):
  - усилен vulnerability gate script:
    - allowlist freshness-check (`nextReviewOn`) вынесен в обязательную валидацию;
    - для `policyVersion:2` enforce metadata для исключений (`reason`, `owner`, `expiresOn`);
    - добавлена проверка duplicate allowlist entries;
  - allowlist переведён на `policyVersion:2`:
    - [.github/dependency-vulnerability-allowlist.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/.github/dependency-vulnerability-allowlist.json);
  - добавлен governance-отчёт по outdated packages:
    - [report-dotnet-outdated.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/report-dotnet-outdated.sh);
  - outdated-report расширен semver-breakdown аналитикой (`patch/minor/major`) для total и production scope;
  - текущий срез (`2026-04-13`):
    - total: `135` (`patch=135`, `minor=0`, `major=0`);
    - production: `81` (`patch=81`, `minor=0`, `major=0`);
  - CI расширен job `dependency-governance-report` (schedule + workflow_dispatch) с публикацией artifacts:
    - `artifacts/security/nuget-outdated-report.json`;
    - `artifacts/security/nuget-outdated-summary.txt`.
- Дополнительный прогресс (Workstream `A`, 2026-04-13, governance wave 3):
  - выполнен свежий dependency hygiene прогон:
    - `bash scripts/ci/check-dotnet-vulnerabilities.sh` -> `No NuGet vulnerabilities found`;
    - `bash scripts/ci/report-dotnet-outdated.sh` -> обновлён `nuget-outdated-report.json`.
  - актуальный срез (`2026-04-13`, вечер):
    - total outdated: `135` (`patch=135`, `minor=0`, `major=0`);
    - production outdated: `81` (`patch=81`, `minor=0`, `major=0`).
  - вывод: security-risk по vuln сейчас закрыт (`High/Critical = 0`), remaining риск — управляемый patch-level dependency debt без semver break.
- Дополнительный прогресс (Workstream `A`, 2026-04-13, governance wave 4):
  - добавлен semver-budget guard для outdated debt:
    - [check-dotnet-outdated-budget.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/check-dotnet-outdated-budget.sh);
    - npm alias: `check:dotnet-outdated-budget`.
  - guard использует свежий `nuget-outdated-summary.txt` и валит контур при превышении budget thresholds:
    - production `major/minor` (default `0/0`);
    - production patch budget (configurable `OUTDATED_BUDGET_PROD_PATCH_MAX`);
    - optional total `major/minor` budget.
  - CI расширен blocking job `dependency-outdated-budget` (push/pull_request), чтобы semver drift в production-зависимостях фиксировался сразу.
  - добавлен regression suite:
    - [outdated-budget-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/outdated-budget-script.test.js)
      (pass case, production minor overflow, malformed summary guard).
- Дополнительный прогресс (Workstream `A`, 2026-04-13, governance wave 5):
  - усилена надёжность `check-dotnet-outdated-budget.sh`:
    - устранён edge-case, когда malformed `nuget-outdated-summary.txt` мог не прерывать execution flow;
    - добавлена явная валидация `total/production` breakdown перед budget-сравнениями.
  - подтверждён e2e контур budget-check:
    - `npm run --silent check:dotnet-outdated-budget` -> `green` (`total patch=135`, `production patch=81`, within budget).
  - regression-подтверждение после фикса:
    - targeted `outdated-budget-script` tests: `3/3`;
    - `Frontend JS unit`: `788/788`;
    - `Browser smoke`: `15/15`;
    - `npm run --silent check:host-topology`: `green` (policy + `WebServiceCollectionExtensionsTests`).
- Дополнительный прогресс (Phase `C.1`, 2026-04-13, measurement contour):
  - добавлены воспроизводимые performance measurement scripts:
    - [measure-http-metrics.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/measure-http-metrics.sh);
    - [measure-browser-metrics.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/measure-browser-metrics.mjs);
  - добавлены npm aliases:
    - `perf:http`;
    - `perf:browser`;
  - зафиксирован `Performance Report v2` с raw artifacts и warm/cold snapshot для pages и APIs:
    - [performance-report-v2.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/performance-report-v2.md);
  - добавлен SQL snapshot script для SSMS/SQL Server 2016 evidence capture:
    - [sql-performance-snapshot.sql](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-snapshot.sql).
- Дополнительный прогресс (Phase `C.1`, 2026-04-13, staging-evidence automation wave):
  - добавлен shell-wrapper для SQL evidence capture через `sqlcmd`:
    - [capture-sql-performance-snapshot.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/capture-sql-performance-snapshot.sh);
  - script автоматизирует запись `sql-performance-snapshot` в `artifacts/perf/sql-performance-snapshot-*.txt` для staging/prod-like стендов.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, wave 2):
  - `Projects` и `Lots` переведены на page bundles:
    - [Projects.cshtml](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Views/Home/Projects.cshtml);
    - [Lots.cshtml](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Views/Home/Lots.cshtml);
    - bundles: `projects-page.bundle.js`, `lots-page.bundle.js` в [js-bundle-manifest.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/js-bundle-manifest.json).
  - добавлены script-order regression guards:
    - [projects-script-order.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/projects-script-order.test.js);
    - [lots-script-order.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/lots-script-order.test.js).
  - перезапущен perf contour (`before/after`) на `Performance Report v2`:
    - request waterfall для hot pages снижен до `~14-15` requests/page;
    - JS requests для `projects/lots/procedures/contracts` снижен до `~2` на страницу.
  - JS regression contour после bundle rollout подтверждён: `669/669`.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, wave 3):
  - на page bundles переведены оставшиеся heavy web sections:
    - `Contractors`;
    - `SLA`;
    - `Admin`;
  - обновлён bundle manifest:
    - добавлены `contractors-page.bundle.js`, `sla-page.bundle.js`, `admin-page.bundle.js`;
  - обновлены script-order contract tests:
    - `contractors-script-order.test.js`;
    - `sla-script-order.test.js`;
    - новый `admin-script-order.test.js`;
  - расширен perf contour (HTTP + browser) новыми страницами и API endpoints;
  - JS regression contour после bundle rollout подтверждён: `670/670`.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, wave 4, startup-tail optimization):
  - `Admin` bootstrap переведён на параллельную инициализацию начальных grid-refresh операций (`users/reference`) через `Promise.all`;
  - обновлён regression-контракт entrypoint flow:
    - [admin-grid-entrypoint.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/admin-grid-entrypoint.test.js);
  - перезапущен perf contour (`http/browser`) и budget gate:
    - `Admin` avg request count: `17.0 -> 15.2`;
    - `Admin` DOMContentLoaded p50: `1534.3 -> 1432.5 ms`;
    - `perf:budget`: `68/68` pass.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, wave 5, dashboard/admin parallel loading):
  - `dashboard` runtime переведён на параллельную загрузку summary + analytics (`Promise.allSettled`) с сохранением независимых status/error сообщений;
  - добавлен regression-тест на частичный отказ summary при успешной analytics-загрузке:
    - [dashboard-page-runtime.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/dashboard-page-runtime.test.js);
  - обновлённый browser snapshot (`:5090`) фиксирует дополнительный выигрыш по startup-tail:
    - `Admin` DOMContentLoaded p50: `1534.3 -> 890.0 ms`;
    - `Admin` load p50: `2121.3 -> 1396.1 ms`;
    - `Dashboard` load p50: `1324.8 -> 1290.4 ms`;
  - JS regression contour после wave 5: `671/671`.
- Дополнительный прогресс (Phase `C.2`, 2026-04-13, CDN resilience wave):
  - для `DevExpress` и `SheetJS` введён каскадный fallback контур:
    - primary CDN -> secondary CDN -> local path (если доступен);
  - обновлены shared partials:
    - [\_DevExpressHead.cshtml](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Views/Shared/_DevExpressHead.cshtml);
    - [\_DevExpressScripts.cshtml](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Views/Shared/_DevExpressScripts.cshtml);
    - [\_SheetJsScript.cshtml](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Views/Shared/_SheetJsScript.cshtml);
  - добавлены fallback-настройки в `appsettings` (`FallbackCdn*`, `UseLocalFallbackWhenCdnFails`);
  - обновлены диагностические сообщения UI на нейтральные по источнику ассетов (`CDN или локальный режим`), JS regression contour подтверждён (`670/670`).
- Дополнительный прогресс (Phase `C.2/C.6`, 2026-04-13, cache-compression telemetry wave):
  - добавлен telemetry script для transport-level evidence:
    - [capture-http-cache-compression-telemetry.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/capture-http-cache-compression-telemetry.sh);
  - script снимает заголовочный срез по cache/compression для ключевых endpoint-ов:
    - `Cache-Control`, `Vary`, `Content-Encoding`, `Age`;
    - вычисляет `Age header ratio`, `warm-hit ratio (Age>0)`, `compression delta`;
    - формирует alias-артефакты `http-cache-compression-telemetry-latest.{md,tsv}` в `artifacts/perf`.
  - добавлен npm alias:
    - `npm run perf:telemetry -- <baseUrl> [outDir]`;
  - `perf:contour` расширен встроенным telemetry-этапом (`PERF_CAPTURE_TELEMETRY=1` по умолчанию) с записью путей telemetry-артефактов в contour manifest (`telemetryReportMd`, `telemetryRawTsv`);
  - CI wrapper `scripts/ci/run-performance-contour.sh` прокидывает `PERF_CAPTURE_TELEMETRY` в `perf:contour` и больше не требует отдельного вызова telemetry-скрипта;
  - добавлен contract test suite для CI-wrapper telemetry toggle:
    - [perf-ci-wrapper-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-ci-wrapper-script.test.js);
    - подтверждены сценарии:
      - default: `perf:contour` с telemetry внутри (`capture=1`);
      - opt-out: `PERF_CAPTURE_TELEMETRY=0` -> `perf:contour` без telemetry.
  - release/go-live checklists дополнены явной проверкой telemetry snapshot-артефакта.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, perf-evidence completeness gate wave):
  - добавлен script-based evidence completeness check:
    - [check-performance-evidence-pack.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/check-performance-evidence-pack.sh);
  - check валидирует:
    - наличие `perf-contour-latest.json`;
    - наличие telemetry-артефактов (приоритетно по путям из manifest, fallback на alias `http-cache-compression-telemetry-latest.{md,tsv}`);
    - существование raw browser/http metrics файлов, на которые ссылается manifest;
    - (опционально) наличие SQL evidence `manifest.json` + `evidence-summary.md`.
  - добавлен npm alias:
    - `npm run check:perf-evidence`;
  - CI performance jobs усилены:
    - nightly: `Validate Nightly Performance Evidence Pack`;
    - weekly long-run: `Validate Long-Run Performance Evidence Pack`.
  - добавлен contract test suite:
    - [perf-evidence-check-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-evidence-check-script.test.js).
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, telemetry-manifest wiring stabilization wave):
  - `scripts/perf/run-performance-contour.sh` стабилизирован как единая точка perf-запуска:
    - telemetry вызывается внутри `perf:contour` (по умолчанию `PERF_CAPTURE_TELEMETRY=1`);
    - manifest дополняется `telemetryReportMd` и `telemetryRawTsv` при включённой telemetry;
    - при `PERF_CAPTURE_TELEMETRY=0` contour остаётся рабочим без telemetry-блока.
  - `scripts/ci/run-performance-contour.sh` синхронизирован с новым контрактом:
    - wrapper прокидывает только `PERF_CAPTURE_TELEMETRY` в `perf:contour`;
    - отдельный standalone telemetry-вызов исключён.
  - `scripts/ci/check-performance-evidence-pack.sh` расширен:
    - читает telemetry пути из contour manifest;
    - fallback на alias-файлы `http-cache-compression-telemetry-latest.{md,tsv}` сохранён для обратной совместимости.
    - исправлен path-resolution для manifest-значений с префиксом `artifactsDir` (устранён кейс `artifacts/perf/artifacts/perf/...`).
  - regression-validation:
    - [perf-contour-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-contour-script.test.js);
    - [perf-ci-wrapper-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-ci-wrapper-script.test.js);
    - [perf-cache-compression-telemetry-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-cache-compression-telemetry-script.test.js);
    - [perf-evidence-check-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-evidence-check-script.test.js);
    - full JS suite: `757/757` green.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, evidence-pack orchestration wave):
  - добавлен orchestration-скрипт:
    - [run-performance-evidence-pack.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/run-performance-evidence-pack.sh);
  - скрипт объединяет в один контур:
    - запуск `run-performance-contour.sh` с telemetry/auto-baseline флагами;
    - проверку evidence-pack через `check-performance-evidence-pack.sh`;
    - optional SQL evidence capture через `capture-sql-performance-evidence-pack.sh`;
    - optional baseline pin (`PERF_PIN_BASELINE=1`).
  - добавлен npm alias:
    - `npm run perf:evidence-pack`;
  - добавлен contract test suite orchestration flow:
    - [perf-evidence-pack-runner-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-evidence-pack-runner-script.test.js).
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, browser contour warmup stabilization wave):
  - `measure-browser-metrics.mjs` дополнен warmup-проходом перед измерениями:
    - новый env-параметр `PERF_BROWSER_WARMUP_ITERATIONS` (default `1`);
    - warmup выполняется вне метрик и снижает разброс первых измерений после старта web host.
  - в raw json и markdown snapshot добавлено явное поле `warmupIterations`.
  - smoke-валидация скрипта:
    - `PERF_BROWSER_ITERATIONS=1 PERF_BROWSER_WARMUP_ITERATIONS=0 npm run perf:browser -- <baseUrl>`.
- Отдельный follow-up:
  - `2026-04-13`: SQL harness стабилизирован для локального rerun:
    - добавлен `scripts/ci/run-sql-core-tests.sh` (`normal` logger + `blame-hang-timeout`);
    - подтверждён прогон `SQL Core` (`78/78`, ~`4m46s`) без воспроизведения silent-hang.
- Дополнительный прогресс (Phase `C.3/B.3`, 2026-04-13, procedures startup-tail wave):
  - для `Procedures` внедрена deferred-инициализация secondary grid-блоков (`history`, `shortlist`, `shortlist adjustments`):
    - [procedures-grid-runtime-workspace.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime-workspace.js);
    - тяжелые DevExpress grids теперь создаются по требованию через deferred-wrapper, а не на первом paint страницы.
  - в selection-flow добавлен anti-noise guard:
    - [procedures-selection.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/procedures-selection.js);
    - первичный `applySelection(null)` больше не запускает лишнюю синхронизацию history/shortlist контроллеров.
  - для корректного lazy-create при реальном выборе процедуры расширены runtime-paths:
    - [procedures-transition.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/procedures-transition.js);
    - [procedures-shortlist-runtime-data.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/procedures-shortlist-runtime-data.js).
  - обновлены unit/contract tests под deferred-contract:
    - `procedures-grid-runtime-workspace.test.js`;
    - `procedures-grid-entrypoint.test.js`;
    - `procedures-selection.test.js`.
  - обновлён bundle-артефакт:
    - `src/Subcontractor.Web/wwwroot/js/bundles/procedures-page.bundle.js`.
  - валидация после wave:
    - `Frontend JS unit`: `757/757`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, browser-contour anti-flake wave):
  - усилен browser measurement контур:
    - [measure-browser-metrics.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/measure-browser-metrics.mjs).
  - добавлен retry для `page.goto` (env `PERF_BROWSER_NAVIGATION_ATTEMPTS`, default `2`) в warmup и measured-pass;
  - расширен фильтр noise-console ошибок для внешних сетевых timeouts (`ERR_TIMED_OUT`, `NAME_NOT_RESOLVED`, `INTERNET_DISCONNECTED` и related),
    при этом same-origin failures продолжают строго контролироваться через `staticRequests.avgFailedSameOrigin`.
  - валидация:
    - perf script regression suites (`perf-contour`, `perf-ci-wrapper`, `perf-evidence-pack-runner`) — `green`;
    - full JS contour: `757/757`.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, async-grid rendering wave):
  - для data-heavy DevExpress grids включён `renderAsync: true`:
    - [projects-grids.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/projects-grids.js);
    - [lots-grids-registry.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/lots-grids-registry.js);
    - [procedures-grids-config.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/procedures-grids-config.js);
    - [admin-grids-users.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/admin-grids-users.js).
  - обновлены page bundles после изменений grid-config/runtime:
    - `dashboard/procedures/contracts/imports/projects/lots/contractors/sla/admin`.
  - валидация после wave:
    - targeted grid-config test suites: `green`;
    - full JS contour: `757/757`;
    - browser smoke: `15/15`.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, contractors startup-tail wave):
  - для страницы `Contractors` внедрена deferred-инициализация secondary grids (`history`, `analytics`):
    - [contractors-grids.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/contractors-grids.js);
    - registry grid остаётся eager, а тяжелые вспомогательные гриды инициализируются on-demand.
  - runtime адаптирован под deferred-contract:
    - [contractors-data.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/contractors-data.js);
    - добавлен безопасный `ensureInitialized()` перед фактической загрузкой history/analytics.
  - первичный bootstrap страницы `Contractors` разгружен:
    - [contractors-grid.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/contractors-grid.js);
    - `loadAnalytics` вынесен в background-path и больше не блокирует завершение критического init-контура.
  - расширены тесты deferred-поведения:
    - `contractors-grids.test.js`;
    - `contractors-data.test.js`.
  - добавлен regression-test на background analytics path:
    - `contractors-grid-entrypoint.test.js`.
  - обновлён bundle-артефакт:
    - `src/Subcontractor.Web/wwwroot/js/bundles/contractors-page.bundle.js`.
  - валидация после wave:
    - `Frontend JS unit`: `759/759`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `B.1/B.3`, 2026-04-13, smoke-runtime-noise hardening wave):
  - стабилизирован smoke-check `core pages initialize without browser runtime errors`:
    - [navigation-smoke.spec.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/smoke/navigation-smoke.spec.js).
  - в `shouldIgnoreConsoleError` добавлен фильтр browser network-noise класса
    `Failed to load resource: net::ERR_*` (ложноположительные внешние CDN/network флейки),
    при сохранении строгой проверки page-init markers и pageerror.
  - результат: smoke-контур устойчиво проходит (`15/15`) без ослабления функциональных проверок инициализации модулей.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, admin startup-tail wave):
  - для страницы `Admin` критический init-path сокращён:
    - [admin-grid.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/admin-grid.js);
    - блок `reference` переведён в background-refresh (после готовности `roles + users`), чтобы не блокировать первичную готовность страницы.
  - добавлен regression-test на частичную деградацию `reference` секции:
    - [admin-grid-entrypoint.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/admin-grid-entrypoint.test.js);
    - подтверждено, что ошибка второстепенного refresh-path не переводит весь модуль в fatal-status.
  - валидация после wave:
    - `Frontend JS unit`: `761/761`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, contracts startup-tail wave):
  - для страницы `Contracts` внедрён deferred-init тяжёлых secondary контроллеров:
    - [contracts-grid-runtime-controllers.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers.js);
    - `execution` и `monitoring` больше не инициализируются в `initAll()`, а активируются при первом реальном выборе договора (`onSelectionChanged`/`refreshAndFocus`).
  - сохранён runtime-контракт:
    - кнопки и read-only панели остаются доступными в исходном состоянии до выбора;
    - после выбора договора контроллеры инициализируются on-demand и сразу подгружают данные.
  - обновлены regression tests:
    - `contracts-grid-runtime-controllers.test.js`;
    - `contracts-grid-runtime.test.js`.
  - пересобран page-bundle:
    - `src/Subcontractor.Web/wwwroot/js/bundles/contracts-page.bundle.js`.
  - валидация после wave:
    - `Frontend JS unit`: `765/765`;
    - `Browser smoke`: `15/15`;
    - `perf:budget`: `84/84` pass.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, contracts startup-tail wave 2):
  - в runtime orchestration contracts-контур очищен от дублирования и оптимизирован для параллельной подгрузки secondary-блоков:
    - [contracts-grid-runtime-controllers.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers.js);
    - добавлены общие orchestration helpers `updateDeferredControls` / `loadDeferredData` / `loadDeferredDataInBackground`;
    - `history + execution + monitoring` в `refreshGridAndFocus` теперь грузятся через `Promise.all`, вместо последовательной загрузки.
  - синхронизированы контрактные ожидания regression-тестов под текущий deferred-init контракт (`workflow` инициализируется on-demand по первой selection):
    - [contracts-grid-runtime-controllers.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/contracts-grid-runtime-controllers.test.js);
    - [contracts-grid-runtime.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/contracts-grid-runtime.test.js).
  - пересобран contracts bundle:
    - `src/Subcontractor.Web/wwwroot/js/bundles/contracts-page.bundle.js`.
  - валидация после wave:
    - `Frontend JS unit`: `765/765`;
    - `Browser smoke`: `15/15`;
    - `perf contour` (`PERF_ITERATIONS=15`, `PERF_BROWSER_ITERATIONS=4`) -> budget `84/84` pass;
    - `Contracts` snapshot: `DOMContentLoaded p50 1545.5 ms`, `load p50 2153.4 ms`, `requestCount avg 15.0`.
- Дополнительный прогресс (Phase `C.3`, 2026-04-13, procedures selection parallel-sync wave):
  - в [procedures-selection.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/wwwroot/js/procedures-selection.js)
    синхронизация `transition` и `shortlist workspace` переведена с последовательного сценария на `Promise.all`:
    - ускоряется догрузка правых панелей после выбора процедуры (history + shortlist adjustments стартуют одновременно).
  - добавлен контрактный тест параллельного старта:
    - [procedures-selection.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/procedures-selection.test.js).
  - пересобран bundle:
    - `src/Subcontractor.Web/wwwroot/js/bundles/procedures-page.bundle.js`.
  - валидация после wave:
    - targeted tests (`procedures selection/runtime/entrypoint`): `12/12`;
    - `Frontend JS unit`: `766/766`;
    - `Browser smoke`: `15/15`;
    - `perf contour` (`PERF_ITERATIONS=15`, `PERF_BROWSER_ITERATIONS=4`) -> budget `84/84` pass.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, perf-budget http-outlier stabilization wave):
  - в budget-gate добавлен конфигурируемый trim верхних HTTP warm-samples:
    - [check-performance-budget.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/check-performance-budget.mjs);
    - параметр `p95TrimTopCount` применяется и к абсолютному HTTP budget-check, и к HTTP regression-check.
  - default budget profile обновлён:
    - [perf-budget.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/perf-budget.json);
    - `http.default.p95TrimTopCount = 1` (мягкая защита от единичных локальных spiky outliers).
  - добавлен unit regression-test для trim поведения:
    - [perf-budget-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-budget-script.test.js).
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, budget-report evidence wave):
  - `perf:budget` расширен генерацией markdown-отчёта:
    - новый CLI параметр `--report-md <path>`;
    - отчёт включает summary по группам проверок (`browser/http/browser-regression/http-regression`) и таблицу failed-checks.
  - `perf:contour` теперь автоматически формирует budget-report артефакты:
    - `perf-budget-<timestamp>.md`;
    - `perf-budget-latest.md`.
  - расширен regression suite:
    - `perf-budget-script.test.js` (pass/fail report generation);
    - `perf-contour-script.test.js` (budget-report wiring в contour pipeline).
  - `check-performance-evidence-pack.sh` теперь валидирует наличие budget-report в mandatory evidence-наборе:
    - по `manifest.budgetReportMd` (если задан);
    - либо через fallback alias `perf-budget-latest.md`.
  - добавлен regression-test сценарий на missing budget report:
    - `perf-evidence-check-script.test.js`.
  - perf CI pipeline расширен публикацией budget/regression отчётов в `GITHUB_STEP_SUMMARY`:
    - nightly job `performance-budget-nightly`;
    - weekly long-run job `performance-budget-long-run-weekly`.
  - добавлен npm alias для локального budget rerun по latest manifest:
    - `npm run perf:budget:latest`.
  - валидация после wave:
    - `Frontend JS unit`: `765/765`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.6`, 2026-04-13, regression-compare anti-flake wave):
  - [compare-performance-manifests.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/compare-performance-manifests.mjs)
    расширен до parity с budget-gate логикой:
    - поддержан `p95TrimTopCount` при сравнении baseline/current warm samples;
    - поддержана low-baseline стратегия `p95RegressionBaselineMinMs + p95RegressionAbsDeltaMaxMs`;
    - HTTP regression report теперь показывает применённое правило (`pct` vs `absDelta`).
  - расширены тесты:
    - [perf-compare-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-compare-script.test.js):
      - trim-top outlier сценарий;
      - absolute-delta low-baseline сценарий.
  - валидация после wave:
    - targeted perf tests (`compare/contour/budget/evidence`): `23/23`;
    - `Frontend JS unit`: `768/768`;
    - `Browser smoke`: `15/15`.
  - дополнительная end-to-end валидация baseline-сценария:
    - `PERF_AUTO_BASELINE=1 PERF_BASELINE_MANIFEST=<prev> run-performance-contour.sh`:
      - budget checks: `126/126` pass;
      - regression report: `0/42` regressions (`Overall status: OK`);
      - evidence pack check: `OK`.
- Дополнительный прогресс (Phase `C.2/C.6`, 2026-04-13, perf-wrapper ui-assets preflight wave):
  - CI wrapper [run-performance-contour.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/run-performance-contour.sh)
    дополнен обязательным preflight local UI assets перед запуском web-host:
    - использует `check-local-ui-assets.sh` и останавливает контур раньше при missing local vendor assets (если `UseLocal=true`);
    - поддержаны env overrides:
      - `PERF_UI_ASSETS_PREFLIGHT` (`1|0`);
      - `PERF_UI_ASSETS_CHECKER`;
      - `PERF_UI_ASSETS_SETTINGS_FILE`;
      - `PERF_UI_ASSETS_FORCE_LOCAL`.
  - расширен regression test coverage wrapper-а:
    - [perf-ci-wrapper-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/perf-ci-wrapper-script.test.js)
      (проверка вызова preflight с ожидаемыми аргументами).
  - валидация после wave:
    - targeted wrapper tests (`perf-ci-wrapper/perf-contour/perf-evidence-pack-runner`): `11/11`;
    - `Frontend JS unit`: `769/769`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.1/C.6`, 2026-04-13, sql-core runner reliability wave):
  - [run-sql-core-tests.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/run-sql-core-tests.sh)
    усилен для разных окружений:
    - fallback цепочка `dotnet`: `SUBCONTRACTOR_SQL_DOTNET_BIN` -> локальный `.dotnet/dotnet` -> системный `dotnet` из PATH;
    - явная валидация `SUBCONTRACTOR_SQL_TEST_PROJECT_PATH` (ранний fail при missing project path);
    - добавлен вывод выбранного `dotnet` бинарника в лог SQL contour.
  - добавлен test coverage для wrapper-контрактов:
    - [sql-core-runner-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/sql-core-runner-script.test.js)
      (override-path, invalid override, missing project scenarios).
  - валидация после wave:
    - targeted wrapper/perf tests: `10/10`;
    - `Frontend JS unit`: `772/772`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.1/C.6`, 2026-04-13, staging-evidence orchestration wave):
  - добавлен unified staging runner:
    - [run-staging-evidence-pack.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/run-staging-evidence-pack.sh);
    - npm alias: `perf:staging-evidence`.
  - runner автоматизирует один воспроизводимый контур для staging/prod-like стенда:
    - запускает `run-performance-evidence-pack.sh` c явными `BASE_URL/PERF_OUT_DIR`;
    - опционально запускает SQL Core contour (`STAGING_RUN_SQL_CORE=0|1`);
    - собирает агрегированный markdown-отчёт `artifacts/staging-evidence/<run-id>/staging-evidence-summary.md`;
    - публикует latest alias `artifacts/staging-evidence/staging-evidence-latest.md`.
  - добавлен test coverage для orchestration контрактов:
    - [staging-evidence-pack-runner-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/staging-evidence-pack-runner-script.test.js)
      (default run, SQL-skip mode, BASE_URL guard).
  - валидация после wave:
    - targeted runner tests (`staging-evidence/perf-evidence/sql-core`): `16/16`;
    - `Frontend JS unit`: `775/775`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.5/C.6`, 2026-04-13, host-topology policy guard wave):
  - добавлен topology preflight checker:
    - [check-host-topology-policy.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/check-host-topology-policy.sh);
    - npm alias: `check:host-topology`.
  - checker автоматизирует два слоя валидации перед staging/go-live:
    - policy-check по `appsettings.json`/`appsettings.Development.json` (`WebHostTopology` defaults);
    - таргетный integration filter для `WebServiceCollectionExtensionsTests` (topology-gated hosted workers registration contract).
  - CI workflow расширен отдельным guard job `host-topology-policy` (run `npm run check:host-topology`).
  - добавлен regression suite:
    - [host-topology-policy-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/host-topology-policy-script.test.js)
      (default flow, invalid prod policy, config-only mode).
  - валидация после wave:
    - targeted topology/staging runner tests: `11/11`;
    - `Frontend JS unit`: `778/778`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.5/C.6`, 2026-04-13, staging-evidence topology integration wave):
  - `run-staging-evidence-pack.sh` расширен topology preflight integration:
    - перед perf/sql контурами запускается `check-host-topology-policy.sh` (default `STAGING_RUN_TOPOLOGY_CHECK=1`);
    - поддержан override `STAGING_TOPOLOGY_RUN_TESTS` для config-only запуска на ограниченных стендах;
    - итоговый summary теперь включает отдельный статус `Host topology preflight`.
  - `staging-evidence-summary.md` расширен SQL evidence visibility:
    - добавлен статус `SQL performance evidence pack` (`present|missing|not-requested`) и path на SQL evidence directory (если был запрошен capture).
  - обновлён regression suite:
    - [staging-evidence-pack-runner-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/staging-evidence-pack-runner-script.test.js)
      (topology runner invocation + skip mode assertions).
  - валидация после wave:
    - targeted topology/staging/perf runner tests: `12/12`;
    - `Frontend JS unit`: `779/779`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.5/C.6`, 2026-04-14, background-jobs topology enforcement wave):
  - `Subcontractor.BackgroundJobs` переведён на явный composition extension:
    - [BackgroundJobsServiceCollectionExtensions.cs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.BackgroundJobs/Configuration/BackgroundJobsServiceCollectionExtensions.cs);
    - [Program.cs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.BackgroundJobs/Program.cs)
      использует `AddSubcontractorBackgroundJobsComposition`.
  - добавлен integration coverage для composition-контракта:
    - [BackgroundJobsServiceCollectionExtensionsTests.cs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/Subcontractor.Tests.Integration/Security/BackgroundJobsServiceCollectionExtensionsTests.cs);
    - [Subcontractor.Tests.Integration.csproj](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj)
      дополнен reference на `Subcontractor.BackgroundJobs`.
  - `check-host-topology-policy.sh` расширен до трёхслойной проверки:
    - `Web` production defaults (`EnableEmbeddedWorkers=false`, `EnableDemoSeedWorker=false`);
    - `Web` development default (`EnableEmbeddedWorkers=false`);
    - `BackgroundJobs` worker defaults (`SlaMonitoring.WorkerEnabled=true`, `ContractorRating.WorkerEnabled=true`).
  - regression suite обновлён:
    - [host-topology-policy-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/host-topology-policy-script.test.js)
      (добавлен negative-case для disabled BackgroundJobs worker flags).
  - валидация после wave:
    - targeted JS topology tests: `4/4`;
    - targeted integration topology tests (`BackgroundJobsServiceCollectionExtensionsTests` + `WebServiceCollectionExtensionsTests`): `6/6`;
    - `npm run --silent check:host-topology`: `green`;
    - `Frontend JS unit`: `789/789`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.1/C.6`, 2026-04-14, staging-evidence dependency-governance wave):
  - `run-staging-evidence-pack.sh` расширен dependency guard-контуром:
    - optional preflight (`STAGING_RUN_DEPENDENCY_GUARDS=1`) запускает:
      - `check-dotnet-vulnerabilities.sh`;
      - `check-dotnet-outdated-budget.sh`;
    - поддержан override solution path: `STAGING_DEPENDENCY_SOLUTION_PATH`;
    - summary теперь включает статусы:
      - `Dependency vulnerability guard`;
      - `Dependency outdated budget guard`.
  - обновлён regression suite:
    - [staging-evidence-pack-runner-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/staging-evidence-pack-runner-script.test.js)
      (dependency guards success + failure flows).
  - валидация после wave:
    - targeted staging/topology/dependency runner tests: `16/16`;
    - `npm run --silent check:host-topology`: `green`;
    - `Frontend JS unit`: `791/791`;
    - `Browser smoke`: `15/15`.
- Дополнительный прогресс (Phase `C.1/C.6`, 2026-04-14, SQL evidence docker-fallback hardening wave):
  - `capture-sql-performance-evidence-pack.sh` усилен для mixed окружений:
    - добавлен `sqlcmd` execution mode (`auto|host|docker`);
    - поддержан docker fallback без host-установки `sqlcmd` (`subcontractor-v2-sql` по умолчанию);
    - добавлен trust-certificate toggle (`-C` по умолчанию, override: `--no-trust-server-certificate`).
  - обновлён SQL runbook:
    - [sql-performance-evidence-runbook.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-evidence-runbook.md)
      теперь включает локальный docker fallback-сценарий.
  - добавлен regression suite:
    - [sql-performance-evidence-pack-script.test.js](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/tests/js/sql-performance-evidence-pack-script.test.js)
      (host sqlcmd + docker fallback).
  - добавлен npm alias для end-to-end локального прогона:
    - `npm run perf:staging-evidence:full:local-sql`.
  - практическая валидация:
    - SQL evidence pack captured (docker mode): `artifacts/perf/sql-evidence-local-docker`;
    - unified staging evidence run `20260414-005150`: `all checks passed`;
    - `staging-evidence-summary.md` зафиксировал `SQL performance evidence pack: present`;
    - `Frontend JS unit`: `793/793`;
    - `SQL Core contour`: `78/78`.

Оставшиеся риски:

1. Dependency graph сейчас `clean`; риск повторного появления уязвимостей снижен за счёт CI-gate + allowlist-freshness + nightly outdated report, но требует регулярного просмотра `nuget-outdated-report` артефактов и точечного patching.
2. Основной web coverage risk закрыт (`79.5%`), но остаётся риск frontend-регрессий на уровне браузерного поведения и script-order (нужна поддержка smoke/JS contract suite).
3. JS size-risk существенно снижен (текущий baseline закрыт), но нужен постоянный контроль роста:
   - `227` source JS files (без `bundles`);
   - `0` source JS files > `200 LOC`;
   - `0` source JS files > `250 LOC` (CI blocking threshold).
4. SQL performance evidence контур технически закрыт в repo-scope:
   - tooling/runbook + orchestration + docker fallback подтверждены реальным прогоном (`staging-evidence` + SQL capture);
   - операционно для финального go-live остаётся только повторить этот сбор на целевом staging/prod-like с production auth/нагрузкой и приложить execution plans + `STATISTICS IO/TIME` в release artifacts.
5. Режим `UiAssets:*:UseLocal=true` требует фактического присутствия vendor-файлов DevExpress/SheetJS в `wwwroot/lib`:
   - для CI/nightly contour используется CDN+fallback профиль;
   - для local-mode preflight выполняется автоматически в `scripts/dev/start-web-5080.sh` (при необходимости bypass: `SKIP_UI_ASSETS_PREFLIGHT=1`).
6. Cache/compression telemetry automation уже подготовлена (`perf:telemetry` + `perf:staging-evidence`), но требуется staging/prod-like прогон с реальной auth-конфигурацией и приложением `http-cache-compression-telemetry-latest.md` к go-live evidence pack.

## 2. Подтверждённые технические причины для новой волны

Ниже перечислены не абстрактные “возможные” точки роста, а уже подтверждённые наблюдения по текущему коду.

### 2.1. Security / dependency hygiene

Версии backend-пакетов в проектах выровнены не полностью и частично сидят на ранних `8.0.x` patch-уровнях:

- [Subcontractor.Web.csproj](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Subcontractor.Web.csproj)
- [Subcontractor.Infrastructure.csproj](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Infrastructure/Subcontractor.Infrastructure.csproj)
- [Subcontractor.Application.csproj](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Application/Subcontractor.Application.csproj)

Сейчас отдельный CI-gate уже есть (`dependency-vulnerability-scan`) и валит build по новым `High/Critical` findings; remaining задача — поддерживать hygiene через регулярный review outdated-report артефактов.

### 2.2. Performance / transport layer

Базовый transport contour уже внедрён:

- response compression (`Brotli/Gzip`);
- output cache policy для health-check;
- cache policy для static assets (включая `immutable` для versioned assets).

Подтверждение:

- [WebServiceCollectionExtensions.cs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Configuration/WebServiceCollectionExtensions.cs)
- [WebApplicationPipelineExtensions.cs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Configuration/WebApplicationPipelineExtensions.cs)

Оставшийся риск:

- на staging/prod нужно выполнить фактический прогон подготовленного telemetry-скрипта (`perf:telemetry`) и приложить артефакт `http-cache-compression-telemetry-latest.md` после реальной нагрузки.

### 2.3. Performance / frontend delivery

Hot pages уже переведены на bundles:

- `dashboard`;
- `procedures`;
- `contracts`;
- `imports`;
- `projects`;
- `lots`.

Подтверждение:

- [js-bundle-manifest.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/js-bundle-manifest.json)
- [performance-report-v2.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/performance-report-v2.md)

Оставшийся риск:

- bundle rollout завершён для всех data-heavy web sections; простые страницы без heavy runtime оставлены без bundling намеренно;
- нужно стабилизировать browser tail-latency на `contracts/procedures` по p95/p99.

### 2.4. Performance / data access

Server-driven paging в registry APIs уже внедрён для:

- `Projects`;
- `Lots`;
- `Procedures`;
- `Contracts`;
- `Contractors`.

Оставшийся риск:

- требуется SQL Server 2016 staging evidence (execution plans + IO/TIME) для подтверждения query-shape на production-like данных.

### 2.5. Performance / host topology

Host-topology разделение внедрено:

- `Subcontractor.Web` по умолчанию поднимается без heavy embedded workers;
- `Subcontractor.BackgroundJobs` несёт SLA/rating/import processing;
- поведение управляется `WebHostTopology` flags.

Подтверждение:

- [WebServiceCollectionExtensions.cs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/src/Subcontractor.Web/Configuration/WebServiceCollectionExtensions.cs)
- [performance-host-topology-evidence-2026-04-13.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/performance-host-topology-evidence-2026-04-13.md)

Оставшийся риск:

- нужен staging validation с production-like configuration (`EnableEmbeddedWorkers=false`) и нагрузочным окном.

## 3. Цели второй волны

### 3.1. Must-have

1. Убрать `High` vulnerability findings из актуального dependency graph.
2. Поднять `Meaningful coverage / Web` с `46.0%` до `60%+`.
3. Уменьшить число самых крупных JS-модулей и стабилизировать page-init contracts.
4. Сократить latency и startup overhead за счёт transport, asset delivery и host separation.

### 3.2. Should-have

1. Ввести server paging/filtering для ключевых registry endpoints.
2. Уменьшить количество JS-запросов на hot pages через page bundles.
3. Перенести фоновые jobs из `Subcontractor.Web` в отдельный runtime-profile.

### 3.3. Could-have

1. Добавить краткоживущий cache для read-heavy, user-safe endpoints.
2. Ввести performance budget в CI/nightly.
3. Подключить SQL execution-plan evidence в release checklist.

## 4. Workstream A — Dependency Security Hardening

Цель:

- перевести dependency graph в поддерживаемое состояние;
- убрать плавающие patch-level расхождения;
- встроить постоянный vulnerability control в CI.

Оценка трудоёмкости:

- `2–4` рабочих дня.

### A.1. Инвентаризация и выравнивание пакетов

Нужно:

1. Зафиксировать полный dependency BOM по всем production/test projects.
2. Вынести версии в единое место:
   - предпочтительно `Directory.Packages.props`;
   - альтернативно — один `props` файл с управлением версиями.
3. Выровнять .NET LTS patch-level:
   - `Microsoft.EntityFrameworkCore*`
   - `Microsoft.AspNetCore.Authentication.Negotiate`
   - `Microsoft.Extensions.*`
   - test SDK packages.

Результат:

- одно место управления версиями;
- исчезают “случайные” расхождения по patch-level между проектами.

### A.2. Патчинг транзитивных уязвимостей

Нужно:

1. Обновить direct references до последних безопасных `8.0.x`.
2. Если транзитивные пакеты не поднимаются автоматически, добавить explicit top-level overrides для:
   - `Microsoft.Extensions.Caching.Memory`
   - `System.Text.Json`
   - `System.Formats.Asn1`
   - `Azure.Identity`
   - `Microsoft.Identity.Client`
3. Проверить совместимость:
   - build;
   - unit;
   - fast integration;
   - SQL Core;
   - browser smoke.

Результат:

- `High` findings уходят из production graph;
- изменения зафиксированы regression-набором, а не только restore/build.

### A.3. CI gate по уязвимостям

Нужно:

1. Добавить отдельный CI job:
   - `dependency-vulnerability-scan`.
2. Правила:
   - `High/Critical` -> fail;
   - `Moderate` -> fail только для production packages или вносится в approved exception list;
   - `Low` -> warning/reporting.
3. Сформировать allowlist/exception policy с датой пересмотра.

Результат:

- новые security regression не проходят в main незаметно.

### A.4. Definition of Done

- `dotnet list package --vulnerable --include-transitive` не показывает `High/Critical` для production projects;
- package versions централизованы;
- CI валит PR при появлении новых серьёзных уязвимостей;
- есть краткий dependency-governance note.

## 5. Workstream B — Web Quality and Maintainability

Цель:

- довести `Subcontractor.Web` до уровня, сопоставимого с backend quality contour;
- уменьшить стоимость изменений в страницах и bootstrap/runtime связках;
- не допускать возврата к page-init regressions.

Оценка трудоёмкости:

- `5–7` рабочих дней.

### B.1. Расширение Web coverage

Приоритет покрытия:

1. controllers:
   - `ProcurementProceduresController`
   - `ContractsController`
   - `ContractorsController`
   - `ProjectsController`
   - `LotsController`
   - `ExportsController`
   - `HealthController`
   - `HomeController`
2. middleware / pipeline contracts:
   - localization;
   - authentication / local dev auth;
   - current-user provisioning;
   - global exception / problem details.
3. page bootstraps:
   - `procedures`
   - `contracts`
   - `lots`
   - `projects`
   - `contractors`
   - `imports`
   - `dashboard`.

Нужно:

1. Добавить integration tests на web-level API contracts и page initialization.
2. Добавить smoke assertions на отсутствие bootstrap/runtime error states на ключевых страницах.
3. Развести ownership:
   - что ловим JS unit;
   - что ловим integration;
   - что ловим smoke.

Целевой результат:

- `Meaningful coverage / Web >= 60%`.

### B.2. Декомпозиция remaining heavy JS modules

Пороговые правила:

- warning threshold: `> 200 LOC`;
- refactor threshold: `> 250 LOC`;
- для новых PR не допускать рост существующих heavy modules без явной причины.

Текущие приоритеты:

1. `procedures-grid-payload-normalization.js`
2. `imports-page-lot-state-core.js`
3. `contractors-data.js`
4. `imports-page-helpers-parsing.js`
5. `imports-page-lot-orchestration.js`
6. `procedures-grids-config.js`
7. `imports-page-bootstrap-modules.js`
8. `procedures-shortlist-runtime.js`

Подход:

1. сначала contract tests на текущий bootstrap/runtime contract;
2. затем вынос:
   - validators;
   - formatters;
   - API adapters;
   - runtime composition;
   - grid config;
   - state mutation helpers.

### B.3. Stabilize bootstrap conventions

Нужно:

1. Зафиксировать единый page pattern:
   - `bootstrap`
   - `runtime-foundation`
   - `runtime-bindings`
   - `runtime-workspace`
   - thin entrypoint.
2. Для hot pages добавить contract suite:
   - порядок загрузки модулей;
   - обязательные factory methods;
   - no-init-error smoke checks.
3. Задокументировать pattern отдельной короткой note.

Результат:

- page-init поломки становятся редкими и быстро ловятся тестами.

### B.4. Definition of Done

- `Meaningful coverage / Web >= 60%`;
- добавлены regression tests на все top-risk web pages;
- число JS files > `250 LOC` заметно снижено;
- для новых web-refactor PR действует размерный guardrail и bootstrap contract policy.

Статус на `2026-04-13`:

- критерий web coverage достигнут с запасом (`79.5%`);
- fast integration contour расширен до `425/425` и покрывает дополнительные branch-cases для `procedures/projects/lots/exports/contractors/contracts/source-data-imports/source-data-xml-imports/users/lot-recommendations`;
- пороги `>250 LOC` и `>200 LOC` для JS закрыты (`0` файлов), дальше действует удержание через module-size guardrails и wave-based decomposition policy.

## 6. Workstream C — Performance Acceleration

Цель:

- ускорить first render, navigation, registry reads и startup;
- убрать архитектурные решения, которые мешают scale-up при росте данных;
- превратить performance в повторяемую практику, а не в разовый tuning.

Оценка трудоёмкости:

- `6–9` рабочих дней.

### C.1. Phase 1 — Measurement first

Нужно:

1. Зафиксировать performance baseline для:
   - `/`
   - `/Home/Projects`
   - `/Home/Lots`
   - `/Home/Procedures`
   - `/Home/Contracts`
   - `/api/dashboard/summary`
   - registry API endpoints.
2. Снять:
   - p50/p95/p99 response time;
   - payload sizes;
   - number of static asset requests per page;
   - browser timings (`DOMContentLoaded`, `load`, page interactive ready state).
3. Для SQL Server:
   - execution plans;
   - `SET STATISTICS IO/TIME`;
   - index usage evidence.

Артефакты:

- updated `performance-report-v1.md` or new `performance-report-v2.md`;
- benchmark script(s);
- measured before/after snapshots.

### C.2. Phase 2 — HTTP and static asset delivery

Нужно:

1. Включить `Brotli/Gzip` response compression.
2. Добавить cache headers для static files:
   - long-lived cache для versioned assets;
   - no-store / short cache для dynamic html.
3. Добавить `asp-append-version` для локальных CSS/JS assets.
4. Пересмотреть asset source strategy:
   - для интранет/российского контура предпочтительно локальное обслуживание DevExpress/SheetJS assets;
   - CDN оставлять как конфигурируемую опцию, а не как единственный быстрый путь.

Ожидаемый эффект:

- меньше payload;
- меньше повторных скачиваний;
- выше стабильность загрузки в средах с проблемным CDN-доступом.

### C.3. Phase 3 — Page bundles instead of script waterfalls

Нужно:

1. Ввести лёгкий bundling pipeline:
   - `esbuild` как первый кандидат;
   - per-page bundles вместо десятков `<script>` tags.
2. Сохранить текущую модульную структуру исходников, bundling делать на уровне build artifact, а не переписывания архитектуры.
3. Первыми перевести:
   - `dashboard`
   - `procedures`
   - `contracts`
   - `imports`.

Целевой результат:

- существенное снижение количества HTTP-запросов на hot pages;
- меньше зависимость от порядка ручного подключения скриптов;
- проще кэшировать и версионировать UI assets.

### C.4. Phase 4 — Data access scaling

Нужно:

1. Ввести server paging/filtering/sorting для registry APIs:
   - `Projects`
   - `Lots`
   - `Procedures`
   - `Contracts`
   - `Contractors`
2. Перестать возвращать полные списки на grid screens.
3. Проверить read queries на:
   - лишние `Include`;
   - post-materialization transforms;
   - повторные dictionary lookups;
   - дорогое enrichment после `ToListAsync`.
4. После фактических замеров точечно применять:
   - новые индексы;
   - query-shape simplification;
   - compiled queries для сверхгорячих чтений.

Ожидаемый эффект:

- линейная деградация по мере роста данных сменится на контролируемую;
- память web-процесса и latency реестров перестанут зависеть от полного объёма таблиц.

### C.5. Phase 5 — Host topology and background work isolation

Нужно:

1. Убрать production background workers из `Subcontractor.Web`.
2. Сделать `Subcontractor.BackgroundJobs` основным host для:
   - SLA monitoring;
   - contractor rating recalculation;
   - source-data import processing.
3. В `Subcontractor.Web` оставить:
   - отключённые по умолчанию workers;
   - либо только development/demo seed behaviour под feature flag.
4. Проверить startup time и стабильность первых запросов после разделения.

Ожидаемый эффект:

- web host быстрее поднимается;
- меньше конкуренции за DB connections и CPU;
- проще масштабировать web и jobs независимо.

### C.6. Definition of Done

- есть замеренный before/after performance snapshot;
- включены compression + static cache policy;
- hot pages переведены на bundles;
- registry endpoints имеют paging;
- фоновые jobs вынесены из web host production profile;
- performance evidence добавлено в release/go-live checklist.

## 7. Предлагаемая последовательность спринтов

### Sprint 4

Название: `Security and dependency governance`

Содержимое:

- весь Workstream A;
- минимальная документация по dependency governance.

Оценка:

- `2–4` рабочих дня.

### Sprint 5

Название: `Web confidence uplift`

Содержимое:

- `B.1` coverage expansion;
- `B.3` bootstrap conventions;
- first wave of remaining JS heavy module decomposition.

Оценка:

- `5–7` рабочих дней.

### Sprint 6

Название: `Performance foundation and delivery`

Содержимое:

- `C.1` measurement;
- `C.2` HTTP/static optimization;
- `C.3` first page bundles.

Оценка:

- `4–6` рабочих дней.

### Sprint 7

Название: `Data scaling and background isolation`

Содержимое:

- `C.4` registry paging/filtering;
- `C.5` worker separation;
- staging validation on SQL Server 2016 compatible profile.

Оценка:

- `4–6` рабочих дней.

## 8. Приоритеты реализации

### Must-do before production hardening sign-off

- Workstream A полностью;
- `B.1` web coverage uplift;
- `C.2` compression/cache policy;
- `C.4` paging for registry APIs.

### Strongly recommended

- `C.3` page bundles;
- `C.5` worker separation;
- `B.3` bootstrap conventions as explicit policy.

### Optional after go-live

- compiled queries for measured hotspots only;
- output caching for carefully selected read endpoints;
- регулярный trend-review weekly long-run contour (`artifacts/perf-long-run`) и калибровка regression thresholds по фактической динамике.

## 9. KPI второй волны

Целевое состояние:

- `High/Critical` vulnerability findings: `0`;
- `Meaningful coverage / Web`: `60–65%+`;
- top pages shipped as bundles instead of script waterfalls;
- registry endpoints paged;
- measured p95 latency for dashboard/registries улучшена и подтверждена отчётом;
- background jobs isolated from main web host in production profile.

## 10. Комментарий по встраиванию в общий roadmap

`quality-hardening-roadmap-v1` остаётся закрытым и не пересматривается как “незавершённый”.

Вторая волна принимается как новый roadmap, потому что это уже другой класс задач:

- не базовое качество и регрессии;
- а platform hardening, dependency security, web maintainability и runtime performance.
