# Quality Hardening Closeout (2026-04-10)

Документ фиксирует финальный контрольный прогон по roadmap `quality-hardening-roadmap-v1`
и последующие optional second-wave rerun-проверки.

## 1. Результаты последнего прогона

Full gate snapshot (`2026-04-10`):

- `Unit`: `145/145` (green)
- `Fast integration`: `278/278` (green)
- `Frontend JS unit`: `363/363` (green)
- `SQL Core (SqlSuite=Core)`: `78/78` (green)
- `SQL Full`: `80/80` (green)

Partial rerun after `ProjectsService` + `UsersAdministrationService` + `ReferenceDataService` decomposition, `RegistryExport` wiring/csv hardening, `Procurement shortlist apply/ordering` extraction, `Dashboard UI helpers` extraction, `Application DI composition root modularization`, `Contracts helpers submodule decomposition`, `Procedures helpers submodule decomposition`, `Procedures columns submodule decomposition` и `Admin grids submodule decomposition` (`2026-04-11`):

- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `378/378` (green)

Latest full rerun after `Dashboard UI formatters + bootstrap/disclosure + renderers extraction` (`2026-04-11`):

- `Build`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `393/393` (green)
- `Browser smoke`: `11/11` (green)
- `SQL Core (SqlSuite=Core)`: `78/78` (green)
- `SQL Full`: `80/80` (green)

Latest optional rerun after `Contracts monitoring KPI grids (columns/events) extraction` (`2026-04-11`):

- `Build`: `green`
- `Frontend JS unit`: `404/404` (green)
- `Browser smoke`: `10 passed`, `1 skipped`

Latest optional rerun after `contracts-monitoring entrypoint contract suite` (`2026-04-11`):

- `Frontend JS unit`: `407/407` (green)

Latest optional rerun after `contracts-monitoring bootstrap/wiring extraction` (`2026-04-11`):

- `Build`: `green`
- `Frontend JS unit`: `415/415` (green)
- `Browser smoke`: `10 passed`, `1 skipped`

Latest optional rerun after `contracts-registry columns/events/store extraction` (`2026-04-11`):

- `Build`: `green`
- `Frontend JS unit`: `427/427` (green)
- `Browser smoke`: `10 passed`, `1 skipped`

Latest optional rerun after `contracts-execution-panel grid/events extraction` (`2026-04-11`):

- `Build`: `green`
- `Frontend JS unit`: `437/437` (green)
- `Browser smoke`: `10 passed`, `1 skipped`

Latest optional rerun after `contracts-workflow history-grid/events extraction` (`2026-04-11`):

- `Build`: `green`
- `Frontend JS unit`: `449/449` (green)
- `Browser smoke`: `10 passed`, `1 skipped`

Latest optional rerun after `contracts-draft events extraction` (`2026-04-11`):

- `Build`: `green`
- `Frontend JS unit`: `455/455` (green)
- `Browser smoke`: `10 passed`, `1 skipped`

Latest optional rerun after `contracts-bootstrap elements/modules extraction` (`2026-04-12`):

- `Build`: `green`
- `Frontend JS unit`: `459/459` (green)
- `Browser smoke`: `10 passed`, `1 skipped`

Latest full rerun after residual second-wave steps (`imports helpers parsing/row-mapper`, `dashboard renderers core/infographics`, `contracts monitoring runtime extraction`) (`2026-04-12`):

- `Build`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `471/471` (green)
- `Browser smoke`: `11/11` (green, на контролируемом host `BASE_URL=http://127.0.0.1:5081`)
- `SQL Core (SqlSuite=Core)`: `78/78` (green)
- `SQL Full`: `80/80` (green)

Latest optional rerun after `SLA UI helpers/api extraction + SLA smoke coverage` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `477/477` (green)
- `Browser smoke`: `12/12` (green, на контролируемом host `BASE_URL=http://127.0.0.1:5081`)

Latest optional rerun after `Contractors grids submodule decomposition` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `483/483` (green)
- `Browser smoke`: `12/12` (green, на контролируемом host `BASE_URL=http://127.0.0.1:5081`)

Latest optional rerun after `Contractors actions submodule decomposition` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `492/492` (green)
- `Browser smoke`: `12/12` (green, на контролируемом host `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081`)

Latest optional rerun after `Imports services-wiring submodule decomposition` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `498/498` (green)
- `Browser smoke`: `12/12` (green, на контролируемом host `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081`)

Latest optional rerun after `Imports session-wiring submodule decomposition` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `502/502` (green)
- `Browser smoke`: `12/12` (green, на контролируемом host `ASPNETCORE_ENVIRONMENT=Development BASE_URL=http://127.0.0.1:5081`)

Latest optional rerun after `Imports bootstrap validation/composition extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `510/510` (green)
- `Browser smoke`: `12/12` (green, на контролируемом host `ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`, `BASE_URL=http://127.0.0.1:5081`)

Latest optional rerun after `Imports lot-state core/table-models extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `517/517` (green)
- `Browser smoke`: `12/12` (green, на контролируемом host `ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`, `BASE_URL=http://127.0.0.1:5081`)

Latest optional rerun after `Imports action-handlers validation/composition extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `523/523` (green)
- `Browser smoke`: `12/12` (green, на контролируемом host `ASPNETCORE_ENVIRONMENT=Development`, `--no-launch-profile`, `ASPNETCORE_URLS=http://127.0.0.1:5081`, `BASE_URL=http://127.0.0.1:5081`)

Latest optional rerun after `Contracts monitoring model normalization/metrics/payload extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `532/532` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Contracts import helpers file-parsing/MDR-rows extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Frontend JS unit`: `538/538` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Procedures shortlist validation/runtime extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `543/543` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Procedures grid runtime foundation extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `550/550` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `SLA page rules/violations extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `558/558` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `SLA page runtime extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `563/563` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Imports bootstrap-validation controls/modules extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `569/569` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Lots grids history/registry submodule decomposition` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `573/573` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Lots data core/store submodule decomposition` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `578/578` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Lots grid runtime extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `580/580` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Dashboard runtime extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `585/585` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Contracts grid runtime extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `586/586` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Contracts grid runtime foundation extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `588/588` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Contracts grid runtime controllers extraction` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `590/590` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Contracts runtime controllers submodules wiring + browser script-order fix` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `598/598` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Contracts.cshtml script-order regression guard` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `599/599` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Dashboard runtime field collectors extraction + script-order guard` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `602/602` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Procedures runtime bindings extraction + script-order guard` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `605/605` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Procedures runtime workspace extraction + script-order guard` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `607/607` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Procedures grids config extraction + script-order guard` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `610/610` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Procedures shortlist runtime data extraction + script-order guard` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `613/613` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

Latest optional rerun after `Procedures payload-normalization extraction + script-order guard` (`2026-04-12`):

- `Build (Subcontractor.Web)`: `green`
- `Unit`: `173/173` (green)
- `Fast integration`: `301/301` (green)
- `Frontend JS unit`: `616/616` (green)
- `Browser smoke`: blocked на текущем host (SQL Server `localhost:1433` недоступен, app pages отвечают `500` до UI rendering)

## 2. Coverage snapshot (unit + fast integration)

Источник: `artifacts/coverage/raw/Summary.txt`, `artifacts/coverage/meaningful/Summary.txt`.

- `Raw line coverage`: `20.9%` (`8134 / 38860`)
- `Meaningful line coverage`: `83.1%` (`8134 / 9787`)
- `Raw branch coverage`: `63.8%` (`1417 / 2218`)
- `Meaningful branch coverage`: `63.8%` (`1417 / 2218`)

## 3. Что подтверждено

- SQL-контур стабильно запускается локально на `localhost:1433` при `SUBCONTRACTOR_SQL_TESTS=1`.
- CI-логика для split jobs (`core/full`) и coverage-модели воспроизводится локально.
- Базовые quality gates (build + unit + integration + js + sql) проходят одновременно.
- Browser smoke стабилен в контролируемом запуске приложения из текущего workspace; запуск smoke против внешнего stale-host на `:5080` может давать ложные регрессии (старый script-order).

## 4. Остаток работ относительно roadmap-v1

Roadmap `quality-hardening-roadmap-v1` закрыт.

Оставшиеся задачи относятся уже к optional second wave:

1. Дальнейшая декомпозиция крупных JS-модулей вне обязательного scope v1.
2. Расширение browser smoke beyond текущего минимального барьера.
3. Точечное повышение покрытия в low-value зонах (`DTO/worker/controller edge paths`) только по приоритетным рискам.
