# Quality Baseline — Sprint 1

Дата фиксации: `2026-04-07`

Примечание: это исторический baseline закрытия Sprint 1; текущие метрики в более поздних спринтах могут отличаться.

## Цель baseline

Зафиксировать стартовый quality state после внедрения SQL-backed test contour foundation.

## Состояние тестового контура

- `Unit`: `11` (green);
- `Fast integration (InMemory)`: `122` (green);
- `SQL-backed integration`: `11` (green при `SUBCONTRACTOR_SQL_TESTS=1`).

SQL-backed suite покрывает первую критичную волну:

- миграции и ограничения схемы;
- `Contracts` workflow;
- `Procurement` transition rules;
- `SourceDataImports` core workflow;
- `SLA` monitoring cycle;
- `ContractorRatings` recalculation core flow.

## Правила запуска

- по умолчанию SQL-suite отключен (тесты помечаются как `Skipped`);
- включение SQL-suite:

```bash
export SUBCONTRACTOR_SQL_TESTS=1
```

- опциональная серверная строка подключения:

```bash
export SUBCONTRACTOR_SQL_TEST_SERVER_CONNECTION='Server=localhost,1433;User Id=sa;Password=YourStr0ng!Passw0rd;TrustServerCertificate=True;Encrypt=False'
```

- запуск SQL-suite:

```bash
dotnet test tests/Subcontractor.Tests.SqlServer/Subcontractor.Tests.SqlServer.csproj --verbosity minimal
```

## Ограничения baseline

- SQL contour построен на SQL Server 2019 (Docker) с `COMPATIBILITY_LEVEL = 130`;
- это практичное приближение к SQL Server 2016, но не абсолютное 1:1 соответствие;
- browser-level smoke тесты в baseline не включены.
