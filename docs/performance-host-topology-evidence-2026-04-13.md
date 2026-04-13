# Performance evidence: host topology isolation (`C.5`)

Дата замера: `2026-04-13`  
Контур: `Subcontractor.Web` (`.NET 8`, локальный запуск через `./.dotnet/dotnet run`)  
Проверяемая гипотеза: web-host в production-профиле должен подниматься без embedded background workers, а фоновые циклы должны жить в `Subcontractor.BackgroundJobs`.

## Конфигурации сравнения

1. `embedded-off`
   - `DOTNET_ENVIRONMENT=Production`
   - `ASPNETCORE_ENVIRONMENT=Production`
   - `WebHostTopology__EnableEmbeddedWorkers=false`
   - `WebHostTopology__EnableDemoSeedWorker=false`
2. `embedded-on` (контрольная legacy-модель в web-host)
   - `DOTNET_ENVIRONMENT=Production`
   - `ASPNETCORE_ENVIRONMENT=Production`
   - `WebHostTopology__EnableEmbeddedWorkers=true`
   - `WebHostTopology__EnableDemoSeedWorker=false`

Endpoint для проверки готовности: `GET /api/health`.

## Startup / first-health latency (после warm-up)

Измерения (сек):

- `embedded-off`: `1.832`, `1.855`, `1.862`
- `embedded-on`: `2.248`, `2.217`, `2.270`

Итог:

- median `embedded-off`: `1.855s`
- median `embedded-on`: `2.248s`
- улучшение при отключенных embedded workers: ~`17.5%` по median startup-to-first-health.

## Stability signal в окне первых секунд

Дополнительная проверка на кратком окне после старта (`~4s` после первого health-ответа):

- `embedded-off`: startup без фоновых SQL/worker ошибок;
- `embedded-on`: в логах фиксируются ошибки фоновых worker-циклов (`SourceDataImportProcessingWorker`, `SlaMonitoringWorker`, `ContractorRatingWorker`) при недоступной/проблемной SQL-аутентификации.

Логи замеров сохранены в `artifacts/perf/`:

- `web-startup-prod-embedded-*.log`
- `web-startup-prod-window-*.log`

## Вывод

Шаг `C.5` подтверждён практическим замером:

- web host быстрее выходит в ready-state;
- startup-путь web-host больше не нагружен embedded worker-циклом по умолчанию;
- production-профиль становится предсказуемее, а background-процессы логично выносятся в `Subcontractor.BackgroundJobs`.
