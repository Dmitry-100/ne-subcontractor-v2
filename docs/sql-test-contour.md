# SQL Test Contour (v1)

Документ описывает запуск и ограничения реального SQL-backed тестового контура.

## Что реализовано

- добавлен проект `tests/Subcontractor.Tests.SqlServer`;
- тесты используют реальный SQL Server;
- для каждого теста создается отдельная временная база;
- применяются EF migrations;
- после миграции выставляется `COMPATIBILITY_LEVEL = 130`;
- первая SQL regression wave покрывает `Contracts`, `Procurement`, `Imports`, `SLA`, `ContractorRatings`, `Analytics`, `Projects`, `Security` и DB delete behavior;
- в текущем baseline SQL suite содержит `78` тестов (`76 core`, `2 full`);
- по `ContractorRatings` дополнительно закрыты SQL-регрессии для manual-assessment history и уникальности `VersionCode` активной модели;
- по `Procurement Offer/Outcome` дополнительно закрыты SQL-регрессии для `retender/cancel` flow и guard-правила "winner must have an offer";
- по `Procurement ExternalApproval` дополнительно закрыты SQL-регрессии для позитивного approve-flow (status + protocol bind) и отсутствия side-effects в invalid negative flow.
- SQL suite запускается последовательно (`CollectionBehavior(DisableTestParallelization = true)`);
- в SQL test infrastructure задан увеличенный `CommandTimeout` (`180s`) для снижения flaky timeout на миграциях/DDL под нагрузкой;
- временная база удаляется после завершения теста.

## Почему SQL Server 2019 + compatibility 130

- контейнерный SQL Server 2019 устойчиво работает локально и в CI;
- `COMPATIBILITY_LEVEL = 130` приближает поведение к SQL Server 2016;
- это не абсолютное 1:1 соответствие серверу 2016, но практично для автоматического контура.

## Локальный запуск

1. Убедиться, что SQL контейнер доступен на `localhost:1433`.
2. Включить SQL тесты переменной:

```bash
export SUBCONTRACTOR_SQL_TESTS=1
```

3. При необходимости задать серверную строку подключения:

```bash
export SUBCONTRACTOR_SQL_TEST_SERVER_CONNECTION='Server=localhost,1433;User Id=sa;Password=YourStr0ng!Passw0rd;TrustServerCertificate=True;Encrypt=False'
```

4. Запустить SQL-backed tests:

```bash
dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --verbosity minimal
```

Для core subset (PR/develop):

```bash
dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --filter "SqlSuite=Core" --verbosity minimal
```

Или через встроенный скрипт (рекомендуется для локального smoke/CI-rerun):

```bash
scripts/ci/run-sql-core-tests.sh
```

Скрипт:

- выставляет безопасные дефолты `SUBCONTRACTOR_SQL_TESTS=1` и connection string для `localhost:1433`;
- включает `--logger "console;verbosity=normal"` (виден прогресс по тестам);
- включает `--blame-hang-timeout 10m` для диагностики реального зависания.
- выбирает `dotnet` по цепочке:
  - `SUBCONTRACTOR_SQL_DOTNET_BIN` (если задан);
  - локальный `.dotnet/dotnet`;
  - системный `dotnet` из PATH.
- печатает выбранный dotnet-бинарь в лог (`[sql-core] dotnet: ...`).

Для full subset (main/nightly/manual):

```bash
dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --verbosity minimal
```

## Переменные окружения

- `SUBCONTRACTOR_SQL_TESTS`
  - `1` включает SQL-backed tests;
  - при отсутствии/другом значении тесты помечаются как skipped.

- `SUBCONTRACTOR_SQL_TEST_SERVER_CONNECTION`
  - server-level connection string без `Database=...`;
  - используется для создания и удаления временных БД.

- `SUBCONTRACTOR_SQL_DOTNET_BIN`
  - явный путь к `dotnet` для SQL core runner-а;
  - полезно для нестандартных окружений, где локальный `.dotnet/dotnet` отсутствует.

- `SUBCONTRACTOR_SQL_TEST_PROJECT_PATH`
  - override пути к SQL test project для runner-скрипта;
  - при неверном пути скрипт завершается ранней валидационной ошибкой.

## Ограничения

- SQL-backed tests медленнее fast integration tests;
- для стабильности на старте включен последовательный запуск;
- контур проверяет DB-level риски, но не заменяет browser-level UI smoke.

## Последняя проверка стабильности

Срез `2026-04-13`:

- `scripts/ci/run-sql-core-tests.sh` — `78/78` (`~4m46s`);
- silent-hang локально не воспроизведён; длительный прогон в `vstest` может выглядеть как “подвисание” без `normal`-логгера.
