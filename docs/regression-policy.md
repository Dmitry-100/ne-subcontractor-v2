# Regression Policy (v1)

Дата фиксации: `2026-04-07`

## Цель

Снизить повторяемость дефектов и закрепить обязательный цикл: дефект -> тест -> исправление.

## Основное правило

Каждый новый production-баг должен сопровождаться одним из двух исходов:

1. Добавлен regression test, который воспроизводит сценарий и защищает исправление.
2. Если тест в текущем спринте невозможен, создается отдельный backlog-item с явной причиной, owner и сроком.

Вариант без теста и без backlog-item не допускается.

## Уровни регрессии

- Для чистой бизнес-логики: `Unit tests`.
- Для API/service сценариев: `Fast integration (InMemory)`.
- Для DB/SQL рисков: `SQL-backed integration`.

## Критерии выбора SQL-backed теста

SQL-backed regression обязателен, если дефект затрагивает:

- `FK/unique/check` ограничения;
- транзакционность или state-transition с несколькими сущностями;
- SQL translation и query-поведение;
- soft-delete/query filters, завязанные на SQL.

## Ownership по ключевым модулям

- `Contracts` / `ProcurementProcedures`: backend owner.
- `SourceDataImports`: import pipeline owner.
- `SLA` / `ContractorRatings`: monitoring and analytics owner.
- `Infrastructure.Persistence`: platform owner.

Если изменение кросс-модульное, owner дефекта назначается по модулю первопричины.

## Проверка в PR

Минимально обязательные green checks:

- `build`;
- `unit-tests`;
- `fast-inmemory-integration`;
- `frontend-js-unit`;
- `browser-smoke`;
- `sqlserver-integration-core`;
- `dbmigrator-dry-run`;
- `coverage-report`.

Дополнительно:

- `sqlserver-integration-full` обязателен для `main/master` и `nightly`, а также доступен для ручного запуска.
