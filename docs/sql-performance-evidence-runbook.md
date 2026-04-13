# SQL Performance Evidence Runbook (Staging / Prod-like)

Дата: `2026-04-13`

## Цель

Стандартизировать сбор SQL performance evidence для `SubcontractorV2`:

- `STATISTICS IO/TIME` + execution-shape snapshot;
- top queries / Query Store / waits / missing indexes;
- единый evidence pack для прикладывания к release/go-live артефактам.

## Входные требования

- доступ к целевому SQL Server (staging/prod-like);
- установлен `sqlcmd` в host `PATH` или доступен docker fallback-контейнер с `sqlcmd`;
- актуальная схема БД `SubcontractorV2`;
- (опционально) Query Store включён на целевой БД.

## Быстрый запуск (рекомендуется)

```bash
bash scripts/perf/capture-sql-performance-evidence-pack.sh \
  --server <sql-host-or-host,port> \
  --database SubcontractorV2 \
  --username <login> \
  --password '<password>' \
  --tag staging
```

## Быстрый запуск (docker fallback, если `sqlcmd` не установлен локально)

```bash
bash scripts/perf/capture-sql-performance-evidence-pack.sh \
  --sqlcmd-mode docker \
  --sqlcmd-docker-container subcontractor-v2-sql \
  --server localhost \
  --database SubcontractorV2 \
  --username sa \
  --password 'YourStr0ng!Passw0rd' \
  --tag local-docker
```

Примечание:

- по умолчанию скрипт добавляет `-C` (`trust server certificate`);
- при необходимости строгой TLS-проверки можно отключить это поведение флагом `--no-trust-server-certificate`.

Результат:

- директория `artifacts/perf/sql-evidence-<timestamp>-staging/`;
- `sql-performance-snapshot.txt`;
- `sql-performance-top-queries.txt`;
- `manifest.json`;
- `evidence-summary.md` (готовый шаблон ревью-чеклиста);
- `sql-evidence-<timestamp>-staging.tar.gz` (если доступен `tar`).

## SQL-скрипты в evidence pack

- [sql-performance-snapshot.sql](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-snapshot.sql)
  - dashboard-like aggregates;
  - registry paging query-shape;
  - index usage snapshot.
- [sql-performance-top-queries.sql](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/sql-performance-top-queries.sql)
  - top statements from plan cache;
  - Query Store top statements (если включён);
  - missing index hints;
  - top wait stats snapshot.

## Что приложить к релизному пакету

Минимально:

- evidence archive (`sql-evidence-*.tar.gz`) или папку evidence pack целиком;
- ссылка/вложение в release issue;
- комментарий с датой, стендом и tag (`staging`, `rc`, `prod-like`).

Дополнительно (если есть):

- Actual Execution Plan скриншоты/файлы для 3-5 самых тяжёлых запросов;
- short findings summary: bottleneck, действие, статус.

## Критерии “готово”

- evidence pack собран не ранее текущего релиз-кандидата;
- `manifest.json` присутствует и содержит commit/tag;
- evidence привязан к release/go-live checklist;
- для выявленных hotspot есть owner и follow-up задача.
