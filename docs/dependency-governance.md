# Dependency Governance

Статус: `Active`

Дата запуска: `2026-04-13`

## Цель

Этот документ фиксирует правила управления NuGet-зависимостями в `subcontractor-v2`, чтобы security-риски не возвращались незаметно после очередного обновления.

## Базовые правила

- Все версии NuGet-пакетов управляются централизованно через [Directory.Packages.props](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/Directory.Packages.props).
- Для транзитивных зависимостей включён `CentralPackageTransitivePinningEnabled`, поэтому исправления security advisory можно фиксировать в одном месте без ручного дублирования по каждому `csproj`.
- Patch/minor-обновления внутри поддерживаемой платформы `.NET 8` выполняются централизованно и проходят через build + test contour.

## Политика по severity

- `Critical` и `High`: блокирующие для всех production и test projects.
- `Moderate`: блокирующие для production projects.
- `Moderate` в test-only контуре и `Low`: допускаются только как временное исключение или warning и должны быть явно задокументированы.

Production-проектами считаются все проекты вне каталога `tests/`.

## Allowlist исключений

- Файл исключений: [.github/dependency-vulnerability-allowlist.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/.github/dependency-vulnerability-allowlist.json)
- Каждое исключение должно содержать:
  - `packageId`
  - `severity`
  - `advisoryUrl`
  - `scope` (`production`, `tests` или `all`)
- Начиная с `policyVersion: 2`, для каждого allowlist-entry обязательны:
  - `reason` (почему исключение временно допустимо),
  - `owner` (ответственный за закрытие),
  - `expiresOn` (дата истечения в формате `YYYY-MM-DD`).
- Любое исключение должно иметь понятное обоснование в PR/issue и пересматриваться не реже одного раза в месяц.
- Поле `nextReviewOn` в allowlist является обязательным для CI-gate и не должно быть просрочено.

## Локальная проверка

Основные команды:

```bash
./.dotnet/dotnet restore Subcontractor.sln --verbosity minimal
./.dotnet/dotnet list Subcontractor.sln package --vulnerable --include-transitive
bash scripts/ci/check-dotnet-vulnerabilities.sh Subcontractor.sln
bash scripts/ci/report-dotnet-outdated.sh Subcontractor.sln
bash scripts/ci/check-dotnet-outdated-budget.sh Subcontractor.sln
```

Скрипт формирует JSON-отчёт:

- [artifacts/security/nuget-vulnerability-report.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/security/nuget-vulnerability-report.json)
- [artifacts/security/nuget-outdated-report.json](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/security/nuget-outdated-report.json)
- [artifacts/security/nuget-outdated-summary.txt](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/artifacts/security/nuget-outdated-summary.txt)

В summary дополнительно фиксируется semver-breakdown:

- `patch` — обычно плановый техдолг в рамках текущей платформы;
- `minor` — требует совместимостной проверки API/поведения;
- `major` — требует отдельного change plan.

Текущий baseline на `2026-04-13`:

- `Total outdated`: `135` (`patch=135`, `minor=0`, `major=0`);
- `Production outdated`: `81` (`patch=81`, `minor=0`, `major=0`).

Это означает, что текущий backlog outdated-пакетов целиком patch-level и не противоречит целевому стеку проекта (`.NET 8 / корпоративный контур SQL Server 2016`).

## CI контроль

Пайплайн `subcontractor-v2-ci` обязан:

- запускать dependency vulnerability scan на каждом `push`, `pull_request` и ручном запуске;
- валидировать freshness/metadata allowlist (review date + entry metadata);
- публиковать JSON-отчёт как artifact;
- блокировать merge при нарушении severity policy.
- по schedule/manual формировать отдельный outdated-отчёт (`nuget-outdated-report`).
- валидировать outdated semver-budget (`dependency-outdated-budget`):
  - production `major/minor` не должны расти (по умолчанию `0`);
  - production patch-level debt контролируется отдельным порогом (`OUTDATED_BUDGET_PROD_PATCH_MAX`).
  - текущая CI-конфигурация (`.github/workflows/ci.yml`):
    - `OUTDATED_BUDGET_PROD_MAJOR_MAX=0`
    - `OUTDATED_BUDGET_PROD_MINOR_MAX=0`
    - `OUTDATED_BUDGET_PROD_PATCH_MAX=200`
    - `OUTDATED_BUDGET_TOTAL_MAJOR_MAX=0`
    - `OUTDATED_BUDGET_TOTAL_MINOR_MAX=0`

## Регламент обновления

- Минимум раз в спринт выполняется `dotnet list package --outdated --highest-patch --include-transitive`.
- Перед релизом обязательно выполняются:
  - restore;
  - build;
  - dependency vulnerability scan;
  - outdated semver-budget check (`bash scripts/ci/check-dotnet-outdated-budget.sh`);
  - unit / fast integration / SQL Core / browser smoke контур.
