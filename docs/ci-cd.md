# CI/CD Runbook

## Purpose

This document describes the baseline CI/CD setup for `subcontractor-v2` and how to run DB migrations safely.

## Workflows

- `.github/workflows/ci.yml`
  - trigger: `push` and `pull_request`;
  - steps: `restore` -> `build` -> `test` -> `DbMigrator --dry-run`.
- `.github/workflows/db-migrate.yml`
  - trigger: `workflow_dispatch` (manual);
  - target environment input: `environment_name`;
  - runs `DbMigrator` against connection string secret.

## Required Secret

- `SUBCONTRACTOR_SQL_CONNECTION_STRING`
  - should point to MS SQL Server 2016+ target DB;
  - injected as `ConnectionStrings__DefaultConnection`.

## DbMigrator Flags

- `--dry-run`
  - executes migrator entrypoint in CI smoke mode;
  - does not execute migrations or seed.
- `--skip-seed`
  - applies EF migrations only;
  - skips default role/permission seed.
- `--help`
  - prints options summary.

## Recommended Release Sequence

1. Run `subcontractor-v2-ci` on branch/PR until green.
2. Approve release and choose target environment in `subcontractor-v2-db-migrate`.
3. Execute migration workflow manually with environment protection rules.
4. Deploy web app after migration completion.

## Local Release Automation Scripts

- `scripts/release/preflight.sh`
  - runs restore/build/test and DbMigrator `--dry-run`;
  - intended as deterministic pre-release gate.
- `scripts/release/publish.sh <output-dir> [Release|Debug]`
  - creates deployable artifacts for web app and DbMigrator;
  - writes `build-metadata.txt` with build timestamp and commit hash.
