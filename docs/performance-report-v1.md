# Performance Report v1

> Superseded by [performance-report-v2.md](/Users/Sotnikov/Google%20Drive%20100/10%20-%20coding%20project/ne-subcontractor/ne-subcontractor/subcontractor-v2/docs/performance-report-v2.md), which includes reproducible HTTP/browser snapshots and before/after metrics.

## Scope

- Sprint 10 hardening (phase: in progress).
- Focus area:
  - registry read paths (`projects`, `lots`, `procedures`, `contracts`);
  - dashboard summary aggregation (`/api/dashboard/summary`);
  - file lookups bound to entity owner.

## Implemented tuning

### 1. Database indexing

Migration: `20260406062430_AddPerformanceIndexes0008`.

Applied index additions:

- `IX_ProjectsSet_GipUserId`
- `IX_LotsSet_Status`
- `IX_ProceduresSet_Status`
- `IX_ProceduresSet_Status_ProposalDueDate`
- `IX_ProceduresSet_Status_RequiredSubcontractorDeadline`
- `IX_ProcedureApprovalStepsSet_Status_ApproverUserId_ApproverRoleName`
- `IX_ContractsSet_ContractorId`
- `IX_ContractsSet_LotId`
- `IX_ContractsSet_ProcedureId`
- `IX_ContractsSet_Status`
- `IX_ContractsSet_Status_EndDate`
- `IX_FilesSet_OwnerEntityType_OwnerEntityId`
- `IX_ContractMilestonesSet_PlannedDate_ProgressPercent`

Index cleanup:

- dropped `IX_ContractMilestonesSet_ContractId` as redundant after introducing composite milestone indexes.

### 2. Dashboard query optimization

File: `src/Subcontractor.Application/Dashboard/DashboardService.cs`.

Changes:

- counters now reuse grouped status aggregates;
- KPI for procedures/contracts computed from grouped status counts (no extra total/completed count roundtrips);
- milestone KPI computed with a single grouped query.

## Verification

Executed commands:

- `dotnet build Subcontractor.sln --no-restore`
- `dotnet test Subcontractor.sln --no-build -m:1 /nr:false --verbosity minimal`

Result:

- build: passed;
- tests: passed (`Unit: 11`, `Integration: 42`).

## Known limitations

- no production-sized benchmark dataset in this environment yet;
- no persisted SQL Server execution plans attached yet.

## Next validation step

- run migration on staging SQL Server 2016 and capture:
  - execution plans for dashboard endpoints;
  - p95/p99 response times for registry and dashboard reads;
  - index usage stats (`sys.dm_db_index_usage_stats`) after smoke workload.
