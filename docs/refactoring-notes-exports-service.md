# Refactoring Notes — Exports Service

Дата обновления: `2026-04-11`

## Итерация 1 (csv policy extraction)

### Что сделано

`RegistryExportService` очищен от низкоуровневой CSV formatting/building логики:

- добавлен `src/Subcontractor.Application/Exports/RegistryExportCsvPolicy.cs`;
- в policy вынесены:
  - `BuildCsv(...)`;
  - `FormatGuid(...)`;
  - `FormatDate(...)`;
  - `FormatDecimal(...)`;
  - внутренние `AppendRow(...)`/`EscapeCsv(...)`.

`RegistryExportService` оставлен как orchestrator:

- получает данные через `IProjectsService`/`IContractorsService`/`ILotsService`/`IProcurementProceduresService`/`IContractsService`;
- формирует row-модели и делегирует CSV-сборку в policy.

Добавлены focused unit tests:

- `tests/Subcontractor.Tests.Unit/Exports/RegistryExportCsvPolicyTests.cs`.

Проверяются:

- CSV escaping для `,` и `"`;
- контент-type/filename контракт;
- `decimal/date/guid` formatting contract.

### Зачем

- отделить pure-formatting от orchestration слоя;
- упростить сопровождение экспортов и добавление новых реестров;
- обеспечить быстрый unit-контур вокруг CSV logic без поднятия интеграционного графа зависимостей.

### Проверка после итерации

- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj --filter "FullyQualifiedName~RegistryExportCsvPolicyTests" -p:UseAppHost=false` — green (`3/3`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj --filter "FullyQualifiedName~RegistryExport" -p:UseAppHost=false` — green (`4/4`);
- `dotnet test tests/Subcontractor.Tests.Unit/Subcontractor.Tests.Unit.csproj -p:UseAppHost=false` — green (`161/161`);
- `dotnet test tests/Subcontractor.Tests.Integration/Subcontractor.Tests.Integration.csproj -p:UseAppHost=false` — green (`300/300`).
