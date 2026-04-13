# Roadmap по усилению качества, тестового контура и сопровождаемости

Статус: `Implemented (Phase Completed)`

Дата фиксации плана: `2026-04-07`

Документ описывает поэтапный план усиления качества проекта без немедленного начала реализации. План ориентирован на:

- повышение достоверности тестов;
- снижение риска регрессий при доработках;
- приведение тестового контура в соответствие со стеком `MS SQL Server 2016`;
- декомпозицию самых рискованных и дорогих в сопровождении модулей.

## 1. Текущая база

На момент подготовки плана:

- unit tests: `11`;
- integration tests: `119`;
- текущие integration tests используют `EF Core InMemory`, а не реальный SQL Server;
- raw production coverage по .NET-коду: `15.6%`;
- coverage handwritten production code без EF-generated migrations: `56.2%`;
- `Domain`: `82.3%`;
- `Application`: `58.8%`;
- `Web`: `28.0%`;
- `Infrastructure`: `2.5%`.

Основные выявленные риски:

1. SQL-специфика не покрыта реальными тестами.
2. Контрактный фронтенд слишком монолитен.
3. Бизнес-логика закупочных процедур избыточно сконцентрирована в одном сервисе.
4. Часть системных API-ошибок всё ещё англоязычная.

## 2. Главные цели roadmap

1. Добавить реальный SQL Server integration contour.
2. Перестать опираться только на `InMemory` как на главный источник уверенности.
3. Повысить meaningful coverage по handwritten production code.
4. Снизить стоимость изменений в двух крупнейших проблемных модулях:
   - `ProcurementProceduresService`;
   - `contracts-grid.js`.
5. Встроить quality gate в CI.

## 3. Ограничения и принятые решения

### 3.1. Ограничения по SQL Server test contour

Серьёзных блокеров для введения реального SQL Server test contour нет, но есть важные ограничения:

- локально уже используется рабочий Docker-контейнер `mcr.microsoft.com/mssql/server:2019-latest`;
- автоматический тестовый контур на `macOS` и в CI удобнее строить на контейнерном SQL Server `2019`, а не на нативном SQL Server `2016`;
- полное 1:1-поведение SQL Server 2016 контейнерный стек не гарантирует;
- запуск SQL-backed тестов будет медленнее текущих `InMemory` тестов;
- потребуется lifecycle-контроль тестовой базы и изоляция данных между тестами.

### 3.2. Принятое архитектурное решение

Основной автоматический SQL-backed contour строится на:

- `SQL Server 2019` в Docker;
- выставлении `COMPATIBILITY_LEVEL = 130` для тестовой базы;
- отдельном тестовом проекте или отдельной SQL-backed категории тестов;
- сохранении существующего быстрого `InMemory` контура для fast feedback.

Дополнительно допускается отдельный optional contour:

- nightly/on-demand acceptance against production-like SQL Server stand.

### 3.3. Что не является целью этого плана

В рамках roadmap не ставится задача:

- добить coverage до максимума ради числа;
- покрыть тестами EF-generated migrations и snapshot-файлы;
- сразу построить тяжёлый browser-level full regression suite;
- выполнять big bang refactor без предварительного усиления тестового контура.

## 4. Общая стратегия выполнения

Работа делится на три последовательных спринта:

1. Сначала строится достоверный SQL Server test contour и базовый quality baseline.
2. Затем усиливаются backend-тесты и CI.
3. После этого выполняется декомпозиция самых рискованных модулей и добавляется минимальный фронтенд quality layer.

Ключевой принцип:

- сначала тесты на рисковые сценарии;
- потом рефакторинг;
- после каждого крупного изменения полный regression run.

## 5. Sprint 1

Название: `SQL Server test contour foundation`

Цель:

- перестать полагаться только на `EF Core InMemory`;
- ввести реальный SQL Server-backed тестовый контур;
- закрыть быстрый пользовательский quality gap по русификации API-ошибок;
- зафиксировать baseline и правила измерения качества.

Оценка трудоёмкости:

- `6–8` рабочих дней;
- ориентир: `48–64` часов.

### 5.1. Scope спринта

1. Ввести отдельный SQL-backed test contour.
2. Сохранить существующие `InMemory` integration tests как fast suite.
3. Реализовать инфраструктуру тестовой БД:
   - контейнерный SQL Server fixture;
   - создание временной БД;
   - применение миграций;
   - выставление compatibility level;
   - очистка/удаление БД после тестов.
4. Русифицировать ProblemDetails titles.
5. Описать testing strategy в документации.

### 5.2. Пошаговый порядок выполнения

#### Шаг 1. Зафиксировать testing baseline

Нужно:

- оформить документ со стартовыми метриками;
- зафиксировать, какие тесты считаются `unit`, `fast integration`, `sql integration`;
- определить, что meaningful coverage считается отдельно от generated EF code.

Результат:

- согласованный baseline для дальнейших спринтов.

#### Шаг 2. Создать SQL-backed test project

Нужно:

- добавить новый тестовый проект, например `Subcontractor.Tests.SqlServer`;
- подключить `Microsoft.Data.SqlClient`/EF dependencies, нужные для SQL-backed тестирования;
- подготовить отдельную test infrastructure folder.

Результат:

- новый изолированный SQL test project.

#### Шаг 3. Реализовать контейнерный fixture

Нужно:

- создать fixture уровня test collection или assembly;
- переиспользовать локальный SQL Server или поднимать dedicated test container;
- обеспечить readiness check сервера;
- хранить connection string в одном месте.

Результат:

- SQL Server доступен для автоматических тестов без ручной подготовки.

#### Шаг 4. Реализовать жизненный цикл временной БД

Нужно:

- создавать отдельную БД на тестовый прогон;
- применять EF migrations автоматически;
- выполнять `ALTER DATABASE ... SET COMPATIBILITY_LEVEL = 130`;
- предусмотреть teardown.

Результат:

- тесты работают на реальной схеме, а не на `InMemory`.

#### Шаг 5. Перенести первую волну тестов

Приоритетно переносим или дублируем в SQL-backed contour:

- миграционные проверки;
- `Contracts` workflow;
- `Procurement` transition rules;
- `Imports` core scenarios;
- `SLA` core scenarios.

Результат:

- первая meaningful SQL regression wave.

#### Шаг 6. Русифицировать default ProblemDetails

Нужно:

- заменить англоязычные default titles на русские;
- добавить тесты на `400`, `404`, `409`;
- проверять `correlationId` и структуру ошибок.

Результат:

- системные API-ошибки не выбиваются из русскоязычного интерфейса.

#### Шаг 7. Задокументировать тестовый контур

Нужно:

- описать локальный запуск SQL-backed тестов;
- описать ограничения SQL 2019 + compatibility 130;
- зафиксировать правила выбора между fast tests и SQL tests.

Результат:

- команда понимает, какой набор тестов когда запускать.

### 5.3. Артефакты Sprint 1

- `tests/Subcontractor.Tests.SqlServer/`
- SQL test fixture classes
- database lifecycle helpers
- `docs/testing-strategy.md`
- `docs/sql-test-contour.md`
- обновлённый `ApiControllerBase` design note или test note
- baseline quality note

### 5.4. Definition of Done Sprint 1

Спринт считается завершённым, если:

- есть отдельный SQL Server-backed test contour;
- SQL-backed тесты можно запускать локально одной командой;
- тестовая БД создаётся автоматически;
- миграции применяются автоматически;
- выставляется `COMPATIBILITY_LEVEL = 130`;
- есть минимум `10–15` meaningful SQL-backed тестов;
- default ProblemDetails titles русифицированы;
- тестовый контур задокументирован.

### 5.5. Основные риски Sprint 1

- flaky lifecycle контейнера;
- загрязнение БД между тестами;
- избыточное время запуска;
- переусложнение инфраструктуры до того, как пойдут реальные тесты.

### 5.6. Меры снижения рисков

- не заменять текущие `InMemory` тесты сразу;
- запускать SQL suite отдельно;
- на старте использовать serial execution для SQL suite;
- минимизировать первую волну SQL-тестов до самых критичных кейсов.

## 6. Sprint 2

Название: `Backend quality gate and SQL realism`

Цель:

- превратить SQL-backed contour в полноценный quality gate;
- усилить backend regression suite по бизнес-критичным модулям;
- встроить всё в CI;
- получить честную coverage-метрику.

Оценка трудоёмкости:

- `7–10` рабочих дней;
- ориентир: `56–80` часов.

### 6.1. Scope спринта

1. Расширить SQL-backed покрытие на ключевые backend-модули.
2. Проверить SQL-реалистичные ограничения и query translation.
3. Разделить coverage на meaningful и технический.
4. Добавить отдельные CI jobs.

### 6.2. Пошаговый порядок выполнения

#### Шаг 1. Усилить SQL-backed тесты по модулям

Приоритет модулей:

1. `Contracts`
2. `ProcurementProcedures`
3. `SourceDataImports`
4. `ContractorRatings`
5. `SlaMonitoring`

Для каждого модуля закрыть:

- happy path;
- invalid transition;
- missing prerequisite;
- conflict/duplicate;
- side effects;
- persistence assertions;
- API contract assertions.

#### Шаг 2. Добавить SQL-специфичные проверки

Обязательно проверить:

- foreign keys;
- unique indexes;
- delete behavior;
- multiple cascade path sensitivity;
- soft-delete filters;
- query translation in analytics/reporting;
- transaction consistency around state changes.

#### Шаг 3. Ввести meaningful coverage

Нужно:

- исключить из meaningful KPI:
  - `src/**/Migrations/**`
  - `*.Designer.cs`
  - `AppDbContextModelSnapshot.cs`
- публиковать:
  - raw coverage;
  - handwritten production coverage.

#### Шаг 4. Разбить CI на отдельные quality jobs

Нужно:

- вынести в CI отдельные jobs:
  - `build`
  - `unit-tests`
  - `fast-inmemory-integration`
  - `sqlserver-integration`
  - `dbmigrator-dry-run`
  - `coverage-report`

#### Шаг 5. Зафиксировать regression policy

Нужно:

- определить правило: каждый новый production bug должен либо иметь regression test, либо осознанно попадать в backlog;
- оформить test ownership для ключевых модулей.

### 6.3. Артефакты Sprint 2

- расширенный SQL-backed regression suite
- обновлённый `.github/workflows/ci.yml`
- coverage configuration/report
- `docs/coverage-baseline.md`
- `docs/regression-policy.md`

### 6.4. Definition of Done Sprint 2

Спринт считается завершённым, если:

- SQL-backed тесты запускаются в CI;
- есть meaningful coverage-метрика без generated EF code;
- по критичным backend-модулям есть regression suite;
- SQL-backed тесты ловят хотя бы по одному кейсу каждого класса риска:
  - constraint;
  - translation;
  - transaction/state rule;
- CI quality gate проверяет не только build, но и test contour.

### 6.5. Основные риски Sprint 2

- рост времени CI;
- нестабильность service container/job orchestration;
- соблазн “добивать coverage” вместо тестирования рисков.

### 6.6. Меры снижения рисков

- разделить PR suite и nightly suite;
- на PR выполнять core SQL subset;
- full SQL suite запускать на main/nightly;
- coverage-метрику использовать как вторичную, а не как единственный KPI.

## 7. Sprint 3

Название: `Refactor for testability and UI smoke barrier`

Цель:

- уменьшить стоимость изменений в самых крупных модулях;
- сделать части фронтенда и backend-логики более тестируемыми;
- добавить минимальный browser smoke.

Оценка трудоёмкости:

- `10–15` рабочих дней;
- ориентир: `80–120` часов.

### 7.1. Scope спринта

1. Декомпозировать `ProcurementProceduresService`.
2. Декомпозировать `contracts-grid.js`.
3. Добавить минимальный JS unit test stack.
4. Добавить минимальный browser smoke.

### 7.2. Пошаговый порядок выполнения

#### Шаг 1. Разделить ProcurementProceduresService

Целевая структура:

- `ProcedureLifecycleService`
- `ProcedureApprovalService`
- `ProcedureShortlistService`
- `ProcedureOfferService`
- `ProcedureAttachmentBindingService`
- orchestration facade

Принцип выполнения:

- сначала фиксируем тестами сценарии;
- затем выносим один логический блок;
- после каждого шага прогоняем regression suite.

#### Шаг 2. Выделить чистые backend policy/helper units

Нужно:

- вынести state rules, normalization, recommendation calculations, decision factors в изолированные units;
- добавить под них focused tests.

#### Шаг 3. Разделить contracts-grid.js

Целевая структура:

- `contracts-api.js`
- `contracts-state.js`
- `contracts-execution.js`
- `contracts-monitoring-kp.js`
- `contracts-monitoring-mdr.js`
- `contracts-mdr-import.js`
- `contracts-formatters.js`
- thin entrypoint

#### Шаг 4. Ввести минимальные JS unit tests

Тестировать только pure logic:

- CSV parsing;
- date normalization;
- number normalization;
- payload builders;
- deviation calculations;
- import validation helpers.

#### Шаг 5. Добавить browser smoke

Минимальный набор:

- открыть `/`;
- открыть `/Home/Procedures`;
- открыть `/Home/Contracts`;
- проверить русские заголовки;
- проверить навигацию;
- проверить наличие `?`-подсказок;
- проверить, что базовые страницы рендерятся без явных ошибок.

### 7.3. Артефакты Sprint 3

- декомпозированный procurement backend
- декомпозированный contracts frontend
- JS test stack
- smoke tests
- `docs/refactoring-notes-procurement.md`
- `docs/refactoring-notes-contracts-ui.md`

### 7.4. Definition of Done Sprint 3

Спринт считается завершённым, если:

- `ProcurementProceduresService` перестаёт быть единой точкой концентрации всей логики;
- `contracts-grid.js` становится thin entrypoint;
- pure JS logic тестируется без браузера;
- минимальный browser smoke работает стабильно;
- после рефакторинга весь unit + integration + SQL + smoke контур остаётся зелёным.

### 7.5. Основные риски Sprint 3

- слишком большой refactor за один проход;
- деградация сроков из-за переписывания UI-логики;
- накопление merge conflicts при параллельной работе.

### 7.6. Меры снижения рисков

- не делать big bang refactor;
- резать модули по функциональным вертикалям;
- выносить сначала pure logic, потом orchestration;
- после каждого малого шага прогонять regression suite.

## 8. Рекомендуемый KPI по итогам всех трёх спринтов

Ожидаемый результат:

- meaningful handwritten backend coverage: `65–75%`;
- SQL-backed contour встроен в CI;
- default ProblemDetails полностью русифицированы;
- основные backend state/transition rules защищены regression tests;
- `ProcurementProceduresService` и `contracts-grid.js` декомпозированы;
- есть минимальный browser smoke barrier.

## 9. Приоритеты выполнения

### Must-have

- Sprint 1 полностью;
- Sprint 2 полностью.

### Should-have

- backend часть Sprint 3;
- JS unit tests;
- browser smoke.

### Could-have

- отдельный nightly acceptance contour на production-like SQL stand;
- расширенный UI smoke beyond core pages.

## 10. Последовательность принятия работ

Работы принимаются в следующем порядке:

1. Утверждение testing strategy и SQL contour design.
2. Приёмка Sprint 1.
3. Приёмка Sprint 2.
4. Решение о полном или частичном запуске Sprint 3.

Запрещается начинать масштабный refactor модулей Sprint 3 до завершения базового SQL-backed quality contour.

## 11. Комментарий по выполнению

Roadmap реализован по шагам и зафиксирован артефактами.

Статус на `2026-04-12`:

- `Sprint 1`: выполнен;
- `Sprint 2`: выполнен;
- `Sprint 3`: выполнен.

Актуализация на `2026-04-12`:

- подтверждён локальный SQL contour:
  - `SqlSuite=Core`: `78/78`;
  - `SqlSuite=Full`: `80/80`;
- подтверждён полный regression contour:
  - `Unit`: `173/173`;
  - `Fast integration`: `301/301`;
  - `Frontend JS unit`: `471/471`;
  - `Browser smoke`: `11/11` (контролируемый host).
- обновлён coverage baseline:
  - `Raw line coverage`: `20.9%`;
  - `Meaningful line coverage`: `83.1%`.

Фактические артефакты выполнения:

- SQL contour и strategy: `docs/sql-test-contour.md`, `docs/testing-strategy.md`;
- coverage/regression governance: `docs/coverage-baseline.md`, `docs/regression-policy.md`;
- procurement refactoring log: `docs/refactoring-notes-procurement.md`;
- contracts UI refactoring log: `docs/refactoring-notes-contracts-ui.md`;
- SQL preflight для rollout constraints: `docs/sql-preflight-contract-uniqueness-check.sql`.
- closeout snapshot: `docs/quality-hardening-closeout-2026-04-10.md`.

Текущий `quality-hardening-roadmap-v1` закрыт полностью; дальнейшие инициативы рассматриваются как отдельный roadmap второй волны.

См. продолжение:

- `docs/quality-hardening-roadmap-v2.md` — second wave по dependency security, web maintainability и performance acceleration.
