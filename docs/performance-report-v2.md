# Performance Report v2

Дата обновления: `2026-04-14`

## Scope

- Workstream `C.1` и `C.3` из `quality-hardening-roadmap-v2`.
- Контур:
  - pages: `/`, `/Home/Projects`, `/Home/Lots`, `/Home/Procedures`, `/Home/Contracts`, `/Home/Contractors`, `/Home/Sla`, `/Home/Admin`;
  - APIs: dashboard, paged registries, SLA APIs, admin APIs;
  - browser navigation timings + static asset waterfall.

Последний полный staging evidence прогон (`2026-04-14`, run-id `20260414-005150`) завершён `green`:

- host topology preflight: `passed`;
- dependency guards: `passed`;
- perf contour + budget + telemetry: `passed`;
- SQL Core contour: `passed`;
- SQL performance evidence pack: `present` (`artifacts/perf/sql-evidence-staging-local`).

## Measurement Tooling

- HTTP script: [measure-http-metrics.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/measure-http-metrics.sh)
- Browser script: [measure-browser-metrics.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/measure-browser-metrics.mjs)
- Cache/compression telemetry script: [capture-http-cache-compression-telemetry.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/capture-http-cache-compression-telemetry.sh)
- Unified contour script: [run-performance-contour.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/run-performance-contour.sh)
- Budget gate script: [check-performance-budget.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/check-performance-budget.mjs)
- Regression-diff report script: [compare-performance-manifests.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/compare-performance-manifests.mjs)
- Trend report script: [generate-performance-trend-report.mjs](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/generate-performance-trend-report.mjs)
- Baseline pin script: [pin-performance-baseline.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/pin-performance-baseline.sh)
- SQL staging snapshot script: [sql-performance-snapshot.sql](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-snapshot.sql)
- SQL top-queries script: [sql-performance-top-queries.sql](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-top-queries.sql)
- SQL snapshot capture wrapper: [capture-sql-performance-snapshot.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/capture-sql-performance-snapshot.sh)
- SQL evidence-pack wrapper: [capture-sql-performance-evidence-pack.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/capture-sql-performance-evidence-pack.sh)
- CI orchestration wrapper: [run-performance-contour.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/run-performance-contour.sh)
- CI long-run wrapper: [run-performance-contour-long-run.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/run-performance-contour-long-run.sh)
- Perf evidence completeness check: [check-performance-evidence-pack.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/check-performance-evidence-pack.sh)
- Perf evidence orchestration wrapper: [run-performance-evidence-pack.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/ci/run-performance-evidence-pack.sh)
- SQL staging runbook: [sql-performance-evidence-runbook.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-evidence-runbook.md)

NPM aliases:

- `npm run perf:http -- <baseUrl>`
- `npm run perf:browser -- <baseUrl>`
- `npm run perf:telemetry -- <baseUrl> [outDir]`
- `npm run perf:contour -- <baseUrl> [outDir] [baselineManifest]`
- `npm run perf:contour:long-run`
- `npm run perf:staging-evidence --` (requires `BASE_URL`, optional dependency guards)
- `npm run perf:staging-evidence:full --` (`STAGING_RUN_DEPENDENCY_GUARDS=1` preset)
- `npm run perf:staging-evidence:full:local-sql --` (локальный full-профиль: dependency guards + SQL evidence capture через docker fallback)
- `npm run perf:trend -- --dir <artifactsDir> --out <report.md> --limit <N>`
- `npm run perf:pin-baseline -- [sourceManifest] [outDir]`
- `npm run perf:compare -- --manifest <current> --baseline-manifest <baseline> --out <report.md>`
- `npm run perf:budget -- [--manifest <file>] [--browser-json <file> --http-tsv <file>]`
- `npm run perf:budget -- [--baseline-manifest <file>] [--baseline-browser-json <file> --baseline-http-tsv <file>]`
- `npm run perf:budget -- [--manifest <file>] [--report-md artifacts/perf/perf-budget-manual.md]`
- `npm run perf:budget:latest` (быстрый rerun budget + обновление `perf-budget-latest.md`)
- `npm run check:perf-evidence -- [perfDir]`
- `npm run perf:evidence-pack` (contour + evidence-check + optional SQL evidence + optional baseline pin via env flags)
- `bash scripts/perf/capture-sql-performance-snapshot.sh --server <sql-host> --database <db>`
- `bash scripts/perf/capture-sql-performance-evidence-pack.sh --server <sql-host> --database <db> --tag staging`
  - generates `manifest.json` + `evidence-summary.md` in evidence pack folder.

CI/nightly profile:

- workflow job `performance-budget-nightly` uses `scripts/ci/run-performance-contour.sh`;
- weekly long-run contour выполняется job `performance-budget-long-run-weekly` через `scripts/ci/run-performance-contour-long-run.sh` (`PERF_ITERATIONS=60`, `PERF_BROWSER_ITERATIONS=10`, out dir `artifacts/perf-long-run`);
- для ручного запуска через `workflow_dispatch` добавлен input `performance_profile` (`nightly | long-run | all`), чтобы явно выбирать нужный perf-профиль.
- long-run wrapper автоматически формирует trend-отчёт `artifacts/perf-long-run/perf-trend-latest.md` (по умолчанию последние `8` contour-manifest запусков).
- CI perf-wrapper принудительно снижает log-noise (`Microsoft/EF Core` -> `Warning`) через env overrides, чтобы не искажать browser latency budget избыточным `dbug` SQL logging.
- DevExpress/SheetJS работают в CDN+fallback режиме (local vendor assets не обязательны для CI agents).
- `perf:budget` оценивает failed-request budget по `same-origin` ошибкам (`staticRequests.avgFailedSameOrigin`), чтобы внешние CDN-флаки не искажали прод-метрику доступности приложения.
- `perf:staging-evidence` поддерживает dependency governance preflight (`STAGING_RUN_DEPENDENCY_GUARDS=1`):
  - `check-dotnet-vulnerabilities.sh`;
  - `check-dotnet-outdated-budget.sh`;
  - оба статуса фиксируются в `staging-evidence-summary.md`.
- `perf:staging-evidence` поддерживает SQL evidence capture (`PERF_CAPTURE_SQL_EVIDENCE=1`), включая локальный docker fallback для `sqlcmd` (`SQLCMD_MODE=docker`, `SQLCMD_DOCKER_CONTAINER=subcontractor-v2-sql`).
- `perf:budget` поддерживает trim верхних HTTP warm-samples (`p95TrimTopCount`) для снижения влияния единичных spiky outliers при вычислении `warm.p95.ms` и HTTP-regression check.
- `perf:budget` поддерживает markdown-report (`--report-md`) для единообразного review budget-gate в CI/релизных evidence-pack.
- `perf:contour` сохраняет связанный manifest (`perf-contour-*.json` + `perf-contour-latest.json`), а `perf:budget` в default режиме читает его в приоритете, чтобы использовать согласованную browser/http пару из одного прогона.
- `perf:contour` автоматически сохраняет budget-report:
  - `artifacts/perf/perf-budget-<timestamp>.md`;
  - `artifacts/perf/perf-budget-latest.md`.
- `perf:telemetry` формирует заголовочный срез по cache/compression (`Cache-Control`, `Vary`, `Content-Encoding`, `Age`) и пишет alias-артефакты `http-cache-compression-telemetry-latest.{md,tsv}` для release/go-live review.
- `perf:contour` теперь по умолчанию включает telemetry-этап (`PERF_CAPTURE_TELEMETRY=1`) и сохраняет пути telemetry-артефактов в contour manifest (`telemetryReportMd`, `telemetryRawTsv`).
- CI wrapper `scripts/ci/run-performance-contour.sh` прокидывает флаг `PERF_CAPTURE_TELEMETRY` в `perf:contour`; для сценариев, где telemetry нужно отключить, поддержан `PERF_CAPTURE_TELEMETRY=0`.
- CI nightly/weekly jobs дополнительно валидируют полноту perf evidence pack через `check-performance-evidence-pack.sh` перед upload artifacts.
  - в mandatory набор включён `perf-budget-latest.md` (budget-gate review artifact).
- CI nightly/weekly jobs публикуют `perf-budget-latest.md` и `perf-regression-latest.md` в `GITHUB_STEP_SUMMARY` для быстрого review без скачивания artifacts.
  - для protected endpoint-ов поддержаны заголовки через env-переменные:
    - `PERF_TELEMETRY_AUTH_HEADER="Authorization: Bearer <token>"`;
    - `PERF_TELEMETRY_EXTRA_HEADER="<Header-Name>: <value>"`.
- `measure-browser-metrics` включает post-load stabilization (`networkidle`), server/JIT warmup pass (`PERF_BROWSER_WARMUP_ITERATIONS`, default `1`) и сохраняет top runtime-error messages в raw JSON для диагностики.
- `measure-browser-metrics` использует navigation retry (`PERF_BROWSER_NAVIGATION_ATTEMPTS`, default `2`) для снижения флейков `page.goto timeout` на локальных/staging стендах.
- runtime-error contour фильтрует внешние сетевые noise-console сообщения (`Failed to load resource: net::ERR_*`), при этом same-origin доступность остаётся в budget-gate через `staticRequests.avgFailedSameOrigin`.
- browser smoke-контур синхронизирован с этим правилом noise-фильтра:
  - `tests/smoke/navigation-smoke.spec.js` игнорирует только `console.error` класса `Failed to load resource: net::ERR_*`;
  - init-error markers и `pageerror` продолжают валить тест без послаблений.
- для heavy registry grids включён async rendering (`renderAsync: true`) на страницах `Projects/Lots/Procedures/Admin`, чтобы снизить main-thread блокировку при первом рендере.
- `perf:budget` поддерживает baseline-regression режим (процентный контроль деградации по `requestCount`, `DOMContentLoaded p50`, `load p50`, `HTTP warm p95`) через `--baseline-manifest` или explicit baseline-артефакты.
- для low-latency HTTP endpoint-ов regression-gate использует absolute-delta профиль (`warm.p95.ms.regression.absDelta`) через `p95RegressionBaselineMinMs/p95RegressionAbsDeltaMaxMs`.
- `perf:contour` baseline-priority:
  - explicit baseline (`arg/env`);
  - pinned baseline alias `artifacts/perf/perf-contour-baseline.json`;
  - auto-latest baseline `artifacts/perf/perf-contour-latest.json`.
- CI wrapper по умолчанию отключает auto-baseline (`PERF_AUTO_BASELINE=0`) для стабильного nightly absolute-budget gate; regression сравнение включается explicit baseline-параметрами.
- при baseline-сравнении `perf:contour` формирует regression-diff отчёт:
  - `perf-regression-<timestamp>.md`;
  - `perf-regression-latest.md`.
- для стендов с `UseLocal=true` доступна preflight-проверка vendor ассетов: `bash scripts/ci/check-local-ui-assets.sh`.
- локальный стартовый скрипт `scripts/dev/start-web-5080.sh` выполняет этот preflight автоматически перед запуском (override: `SKIP_UI_ASSETS_PREFLIGHT=1`).
- CI wrapper `scripts/ci/run-performance-contour.sh` также запускает этот preflight перед поднятием web-host (override через env: `PERF_UI_ASSETS_PREFLIGHT=0`, custom checker/settings via `PERF_UI_ASSETS_CHECKER`/`PERF_UI_ASSETS_SETTINGS_FILE`).

Пример regression-gate запуска (baseline vs current):

```bash
npm run perf:budget -- \
  --manifest artifacts/perf/perf-contour-latest.json \
  --baseline-manifest artifacts/perf/perf-contour-20260413-061304.json
```

Пример фиксации стабильного baseline для следующей волны:

```bash
npm run perf:pin-baseline -- \
  artifacts/perf/perf-contour-latest.json \
  artifacts/perf
```

Пример telemetry-среза на стенде с auth:

```bash
PERF_TELEMETRY_AUTH_HEADER="Authorization: Bearer <token>" \
npm run perf:telemetry -- https://<staging-host>
```

## Raw Artifacts

Baseline (`before` second-wave bundles, contour `:5080`):

- HTTP: [http-metrics-20260413-055029.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/http-metrics-20260413-055029.md)
- Browser: [browser-metrics-20260413-025047.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/browser-metrics-20260413-025047.md)

After wave `C.3-2` (`Projects` + `Lots` bundles, fresh contour `:5090`):

- HTTP: [http-metrics-20260413-055932.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/http-metrics-20260413-055932.md)
- Browser: [browser-metrics-20260413-025932.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/browser-metrics-20260413-025932.md)

After wave `C.3-3` (`Contractors` + `SLA` + `Admin` bundles, fresh contour `:5090`):

- HTTP: [http-metrics-20260413-061304.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/http-metrics-20260413-061304.md)
- HTTP raw: [http-metrics-20260413-061304.tsv](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/http-metrics-20260413-061304.tsv)
- Browser: [browser-metrics-20260413-031304.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/browser-metrics-20260413-031304.md)
- Browser raw: [browser-metrics-20260413-031304.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/browser-metrics-20260413-031304.json)

After wave `C.2` CDN-resilience + `Admin`/dashboard startup-tail optimization (validation rerun, contour `:5090`):

- HTTP: [http-metrics-20260413-065152.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/http-metrics-20260413-065152.md)
- HTTP raw: [http-metrics-20260413-065152.tsv](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/http-metrics-20260413-065152.tsv)
- Browser: [browser-metrics-20260413-034934.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/browser-metrics-20260413-034934.md)
- Browser raw: [browser-metrics-20260413-034934.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/perf/browser-metrics-20260413-034934.json)

## HTTP Warm Snapshot (wave C.3-3)

| Endpoint | p50 (ms) | p95 (ms) | Avg TTFB (ms) | Avg bytes |
|---|---:|---:|---:|---:|
| `/` | 6.7 | 13.1 | 7.6 | 21155 |
| `/Home/Projects` | 6.0 | 7.3 | 6.0 | 2995 |
| `/Home/Lots` | 6.3 | 8.7 | 6.4 | 4948 |
| `/Home/Procedures` | 5.8 | 7.5 | 6.1 | 11969 |
| `/Home/Contracts` | 6.9 | 9.8 | 7.2 | 24874 |
| `/Home/Contractors` | 7.2 | 8.3 | 7.1 | 18634 |
| `/Home/Sla` | 6.5 | 8.3 | 6.1 | 9171 |
| `/Home/Admin` | 6.4 | 7.5 | 6.4 | 8970 |
| `/api/dashboard/summary` | 16.6 | 33.4 | 20.1 | 2551 |
| `/api/projects?...` | 13.3 | 15.4 | 12.2 | 659 |
| `/api/lots?...` | 11.7 | 13.6 | 11.3 | 3354 |
| `/api/procedures?...` | 6.0 | 13.1 | 7.7 | 5257 |
| `/api/contracts?...` | 13.3 | 15.4 | 12.3 | 2914 |
| `/api/contractors?...` | 11.8 | 14.6 | 11.8 | 1156 |
| `/api/sla/rules` | 8.5 | 10.7 | 8.6 | 403 |
| `/api/sla/violations` | 10.9 | 12.9 | 10.3 | 9391 |
| `/api/admin/users` | 9.4 | 11.1 | 8.3 | 171 |
| `/api/admin/roles` | 9.9 | 12.7 | 9.6 | 497 |

## Browser Snapshot (wave C.3-3)

| Page | DOMContentLoaded p50 (ms) | Load p50 (ms) | Avg requests | Avg JS | Avg CSS |
|---|---:|---:|---:|---:|---:|
| `/` | 528.4 | 1324.8 | 13.0 | 1.0 | 3.0 |
| `/Home/Projects` | 1392.5 | 2007.6 | 14.0 | 2.0 | 2.0 |
| `/Home/Lots` | 1428.5 | 1912.7 | 14.0 | 2.0 | 2.0 |
| `/Home/Procedures` | 1432.3 | 2066.7 | 14.0 | 2.0 | 2.0 |
| `/Home/Contracts` | 1630.9 | 2268.0 | 15.0 | 2.0 | 2.0 |
| `/Home/Contractors` | 1593.4 | 2230.4 | 16.0 | 2.0 | 2.0 |
| `/Home/Sla` | 502.7 | 1279.4 | 9.0 | 1.0 | 2.0 |
| `/Home/Admin` | 1534.3 | 2121.3 | 17.0 | 2.0 | 2.0 |

## Latest Validation Snapshot (C.2 + Startup-Tail Optimization)

- `Admin` page:
  - request count avg: `17.0 -> 15.2`;
  - DOMContentLoaded p50: `1534.3 -> 890.0 ms`;
  - load p50: `2121.3 -> 1396.1 ms`.
- `Contractors` page:
  - DOMContentLoaded p50: `1593.4 -> 1418.8 ms`;
  - load p50: `2230.4 -> 2044.0 ms`.
- `Dashboard` page:
  - DOMContentLoaded p50: `528.4 -> 520.5 ms`;
  - load p50: `1324.8 -> 1290.4 ms`.
- HTTP p95 remains well below budget for all measured endpoints (budget gate: `68/68` pass on latest snapshot).
- Regression contour after contractors deferred-grid startup-tail wave:
  - `npm run -s test:js` -> `759/759`;
  - `npm run -s test:smoke` -> `15/15`.
  - `Contractors` bootstrap critical-path разгружен: analytics load переведён в background и не блокирует завершение init UI.
- Regression contour after admin startup-tail + budget-stabilization wave:
  - `npm run -s test:js` -> `761/761`;
  - `npm run -s test:smoke` -> `15/15`;
  - `Admin` bootstrap critical-path разгружен: `reference` refresh переведён в background-path и не блокирует готовность страницы.
- Regression contour after budget-report evidence wave:
  - `npm run -s test:js` -> `765/765`;
  - `npm run -s test:smoke` -> `15/15`;
  - `perf:contour` формирует `perf-budget-latest.md`, а evidence-check контур валит отсутствие budget-report.
- Regression contour after contracts deferred-init startup-tail wave:
  - `npm run -s test:js` -> `765/765`;
  - `npm run -s test:smoke` -> `15/15`;
  - `env PERF_ITERATIONS=15 PERF_BROWSER_ITERATIONS=4 PERF_AUTO_BASELINE=0 bash scripts/ci/run-performance-contour.sh` -> budget `84/84` pass;
  - `Contracts` page snapshot:
    - DOMContentLoaded p50: `1583.7 ms`;
    - load p50: `2206.1 ms`;
    - request count avg: `14.5`.
- Regression contour after contracts parallel deferred-load orchestration wave:
  - `node --test tests/js/contracts-grid-runtime-controllers.test.js tests/js/contracts-grid-runtime.test.js tests/js/contracts-grid-entrypoint.test.js` -> `6/6`;
  - `npm run -s test:js` -> `765/765`;
  - `npm run -s test:smoke` -> `15/15`;
  - `env PERF_ITERATIONS=15 PERF_BROWSER_ITERATIONS=4 PERF_AUTO_BASELINE=0 bash scripts/ci/run-performance-contour.sh` -> budget `84/84` pass;
  - `Contracts` page snapshot:
    - DOMContentLoaded p50: `1545.5 ms`;
    - load p50: `2153.4 ms`;
    - request count avg: `15.0`.
- Regression contour after procedures selection parallel-sync wave:
  - `node --test tests/js/procedures-selection.test.js tests/js/procedures-grid-runtime.test.js tests/js/procedures-grid-entrypoint.test.js` -> `12/12`;
  - `npm run -s test:js` -> `766/766`;
  - `npm run -s test:smoke` -> `15/15`;
  - `env PERF_ITERATIONS=15 PERF_BROWSER_ITERATIONS=4 PERF_AUTO_BASELINE=0 bash scripts/ci/run-performance-contour.sh` -> budget `84/84` pass;
  - `Procedures` page snapshot:
    - DOMContentLoaded p50: `2204.0 ms`;
    - load p50: `2835.8 ms`;
    - request count avg: `14.0`;
  - примечание: единичный regression-diff относительно предыдущего локального snapshot содержит HTTP outliers на отдельных paged endpoints, поэтому зафиксирован как trend-watch (сравнение по нескольким consecutive contour-прогонам), а не как функциональная регрессия UI-изменения.
- Regression contour after regression-compare anti-flake wave:
  - `scripts/perf/compare-performance-manifests.mjs` синхронизирован с budget-gate правилами:
    - поддержан `p95TrimTopCount` для warm-sample trimming;
    - поддержан low-baseline режим `p95RegressionBaselineMinMs + p95RegressionAbsDeltaMaxMs`.
  - regression-report теперь показывает rule-type (`warm.p95.ms.regression.pct` / `warm.p95.ms.regression.absDelta`) для каждой endpoint-проверки.
  - validation:
    - `node --test tests/js/perf-compare-script.test.js tests/js/perf-contour-script.test.js tests/js/perf-budget-script.test.js tests/js/perf-evidence-check-script.test.js` -> `23/23`;
    - `npm run -s test:js` -> `768/768`;
    - `npm run -s test:smoke` -> `15/15`.
  - baseline scenario validation (`PERF_AUTO_BASELINE=1`, explicit previous manifest):
    - budget checks: `126/126` pass;
    - generated regression report: `0/42` regressions (`Overall status: OK`);
    - perf evidence pack check: `OK`.

## Key Deltas

Compared to baseline (`:5080`):

1. Request waterfall на hot pages резко снижен:
   - `Contracts`: `67 -> 15` requests;
   - `Procedures`: `41 -> 14` requests;
   - `Lots`: `24 -> 14` requests;
   - `Projects`: `19 -> 14` requests.
2. JS request count стабилизирован:
   - `Contracts`: `56 -> 2`;
   - `Procedures`: `31 -> 2`;
   - `Lots`: `14 -> 2`;
   - `Projects`: `7 -> 2`;
   - `Contractors`: `2` (новый bundle contour);
   - `Admin`: `2` (новый bundle contour).
3. HTTP warm-latency остаётся низкой:
   - большинство UI/API p95 — в диапазоне `~7–15 ms`;
   - dashboard aggregate остаётся наиболее тяжёлым (`p95 ~33.4 ms`) и требует отдельного SQL plan tuning на staging.

4. Read-heavy reference-data endpoint ускорен точечным output-cache:
   - `api/reference-data/{typeCode}/items` теперь покрыт policy `ReferenceDataRead` (`vary by typeCode + activeOnly`, `30s`);
   - после `upsert/delete` выполнена tag-invalidation (`reference-data`) для исключения stale данных.
5. Read-only admin role lookup ускорен output-cache:
   - `api/admin/roles` покрыт policy `AdminRolesRead` (`30s`);
   - снижает лишние повторные чтения role-lookup при загрузке/обновлении admin UI.
6. Analytics read endpoints ускорены short-lived output-cache:
   - `api/analytics/kpi` покрыт policy `AnalyticsKpiRead` (`30s`);
   - `api/analytics/views` покрыт policy `AnalyticsViewsRead` (`60s`).
7. Hot-read query compilation расширена на dashboard/read-model сервисы:
   - compiled query paths добавлены в `ReferenceDataReadQueryService`, `UsersAdministrationReadQueryService`,
     `DashboardCountersAndStatusesQueryService`, `DashboardImportPipelineQueryService`,
     `DashboardPerformanceMetricsQueryService`, `AnalyticsKpiDashboardQueryService`;
   - для `LotItem` total man-hours sum оставлен обычный EF path для provider-совместимости expression-tree;
   - цель — снизить overhead повторной компиляции expression trees на стабильно горячих read-endpoints.

## Next Steps

1. На SQL Server 2016 staging собрать evidence-pack через [capture-sql-performance-evidence-pack.sh](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/scripts/perf/capture-sql-performance-evidence-pack.sh) и приложить execution plans + IO/TIME.
   Для повторяемого orchestration запуска использовать `npm run perf:staging-evidence --` (обязательный env: `BASE_URL`, optional: `STAGING_RUN_SQL_CORE=0`, `STAGING_RUN_TOPOLOGY_CHECK=0`).
2. Зафиксировать perf gate: для каждого крупного PR добавлять `perf:http`/`perf:browser` snapshot в `artifacts/perf`, а для weekly long-run CI (`artifacts/perf-long-run`) вести trend-review деградаций.
3. Использовать `perf:budget` как quality gate для regression-проверки latency/request-count после hot-path изменений.
4. Стабилизировать tail-latency `load p95` для `contracts/procedures/admin/contractors` (без роста числа запросов).
5. На staging/prod-like стенде приложить telemetry-артефакт `http-cache-compression-telemetry-latest.md` (`npm run perf:telemetry -- <baseUrl>`) для подтверждения cache-hit/compression поведения под реальной нагрузкой.
