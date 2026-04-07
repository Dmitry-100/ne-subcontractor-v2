# Production Deployment Guide

Date: 2026-04-06

## Purpose

Repeatable deployment runbook for MVP release to production-like and production environments.

## Prerequisites

- Windows host with IIS configured for ASP.NET Core hosting;
- .NET 8 runtime installed on target host;
- reachable MS SQL Server 2016 instance;
- connection string secret available as `ConnectionStrings__DefaultConnection`;
- deployment account with permissions:
  - publish web files;
  - run DB migrations;
  - recycle IIS application pool.

## Release artifacts

Generate artifacts from repository root:

```bash
scripts/release/preflight.sh
scripts/release/publish.sh ./artifacts/release
```

Expected output:

- `./artifacts/release/web` (web app package);
- `./artifacts/release/db-migrator` (migration utility);
- `./artifacts/release/build-metadata.txt`.

## Deployment sequence

1. Announce maintenance window and freeze schema-changing operations.
2. Create database backup on target environment.
3. Apply DB migrations:
   - option A: GitHub workflow `.github/workflows/db-migrate.yml`;
   - option B: run db migrator package manually with target connection string.
4. Deploy new web package files to IIS site directory.
5. Ensure environment settings are present:
   - `ASPNETCORE_ENVIRONMENT`;
   - `ConnectionStrings__DefaultConnection`;
   - `Security__BootstrapAdminLogins` (if needed for bootstrap only).
6. Recycle IIS application pool.
7. Validate `/api/health` and run smoke from `docs/api-smoke.md`.
8. Capture deployment evidence (timestamp, commit hash, operator, result).

## Rollback strategy

1. Stop incoming traffic to application (maintenance mode/load balancer rule).
2. Restore previous web package.
3. If migration introduced incompatible schema change, restore DB backup.
4. Recycle IIS pool and re-run smoke checks.
5. Record incident and corrective actions.

## Post-deployment checks

- API health endpoint is green;
- dashboard page loads for authorized user;
- CRUD checks for projects/lots/procedures/contracts;
- exports return CSV files;
- error responses contain `X-Correlation-Id`.

## Operational notes

- Keep at least one previous artifact package for fast rollback.
- Do not run non-reviewed SQL scripts outside migration pipeline.
- For production release, require sign-off in `docs/go-live-checklist.md`.
