# Monitoring Data Model v1

Date: 2026-04-06

## Scope

Foundation schema for Sprint 13 monitoring block:

- control points (KP) with nested stages;
- MDR cards with nested rows.

## Entities

## `ContractMonitoringControlPoint`

- `Id` (`uniqueidentifier`, PK)
- `ContractId` (`uniqueidentifier`, FK -> `ContractsSet.Id`)
- `Name` (`nvarchar(256)`, required)
- `ResponsibleRole` (`nvarchar(128)`, optional)
- `PlannedDate` (`datetime2`, required)
- `ForecastDate` (`datetime2`, optional)
- `ActualDate` (`datetime2`, optional)
- `ProgressPercent` (`decimal(5,2)`, required)
- `SortOrder` (`int`, required)
- `Notes` (`nvarchar(2000)`, optional)
- audit + soft-delete fields

Indexes:

- `ContractId`
- `(ContractId, SortOrder)`
- `(ContractId, PlannedDate)`

## `ContractMonitoringControlPointStage`

- `Id` (`uniqueidentifier`, PK)
- `ControlPointId` (`uniqueidentifier`, FK -> `ContractMonitoringControlPointsSet.Id`)
- `Name` (`nvarchar(256)`, required)
- `PlannedDate` (`datetime2`, required)
- `ForecastDate` (`datetime2`, optional)
- `ActualDate` (`datetime2`, optional)
- `ProgressPercent` (`decimal(5,2)`, required)
- `SortOrder` (`int`, required)
- `Notes` (`nvarchar(2000)`, optional)
- audit + soft-delete fields

Indexes:

- `ControlPointId`
- `(ControlPointId, SortOrder)`
- `(ControlPointId, PlannedDate)`

## `ContractMdrCard`

- `Id` (`uniqueidentifier`, PK)
- `ContractId` (`uniqueidentifier`, FK -> `ContractsSet.Id`)
- `Title` (`nvarchar(256)`, required)
- `ReportingDate` (`datetime2`, required)
- `SortOrder` (`int`, required)
- `Notes` (`nvarchar(2000)`, optional)
- audit + soft-delete fields

Indexes:

- `ContractId`
- `(ContractId, SortOrder)`
- `(ContractId, ReportingDate)`

## `ContractMdrRow`

- `Id` (`uniqueidentifier`, PK)
- `CardId` (`uniqueidentifier`, FK -> `ContractMdrCardsSet.Id`)
- `RowCode` (`nvarchar(128)`, required)
- `Description` (`nvarchar(512)`, required)
- `UnitCode` (`nvarchar(32)`, required)
- `PlanValue` (`decimal(18,2)`, required)
- `ForecastValue` (`decimal(18,2)`, required)
- `FactValue` (`decimal(18,2)`, required)
- `SortOrder` (`int`, required)
- `Notes` (`nvarchar(2000)`, optional)
- audit + soft-delete fields

Indexes:

- `CardId`
- `(CardId, SortOrder)`

## Migration

- `20260406192441_AddContractMonitoringFoundation0013`
