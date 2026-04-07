# SLA Model Specification v1

## Scope

Sprint 14 foundation: SLA monitoring rules and violation registry for procurement procedures and contracts.

## Data model

### `SlaRule`

Purpose: configurable warning horizon by `PurchaseTypeCode`.

Fields:

- `Id: Guid`
- `PurchaseTypeCode: string (required, unique, max 64)`
- `WarningDaysBeforeDue: int (0..30)`
- `IsActive: bool`
- `Description: string? (max 512)`
- audit + soft-delete fields

Rule lookup:

- if active rule exists for purchase type -> use rule value;
- otherwise use global default `SlaMonitoring:DefaultWarningDaysBeforeDue`.

### `SlaViolation`

Purpose: persistent registry of SLA warning/overdue events with notification and reason trace.

Fields:

- identification:
  - `Id: Guid`
  - `EntityType: enum` (`ProcedureProposalDueDate`, `ProcedureRequiredSubcontractorDeadline`, `ContractEndDate`, `ContractMilestone`)
  - `EntityId: Guid`
  - `DueDate: date`
  - `Severity: enum` (`Warning`, `Overdue`)
- context:
  - `Title: string (max 512)`
  - `RecipientEmail: string? (max 256)`
- lifecycle:
  - `IsResolved: bool`
  - `FirstDetectedAtUtc: datetime`
  - `LastDetectedAtUtc: datetime`
  - `ResolvedAtUtc: datetime?`
- notification trace:
  - `NotificationAttempts: int`
  - `LastNotificationAttemptAtUtc: datetime?`
  - `LastNotificationSentAtUtc: datetime?`
  - `LastNotificationError: string? (max 2000)`
- reason classifier binding:
  - `ReasonCode: string? (max 128)`
  - `ReasonComment: string? (max 2000)`
  - `ReasonAssignedAtUtc: datetime?`
- audit fields

Constraints and indexes:

- unique key: `(EntityType, EntityId, DueDate, Severity)`;
- operational indexes: `IsResolved`, `Severity`, `DueDate`.

## Violation detection logic

Evaluation date: current UTC date (`UtcNow.Date`).

Severity rules:

- `Overdue` when `DueDate < UtcToday`;
- `Warning` when `UtcToday <= DueDate <= UtcToday + WarningDaysBeforeDue`.

Covered deadlines:

- procedure `ProposalDueDate`;
- procedure `RequiredSubcontractorDeadline`;
- contract `EndDate` (excluding `Closed`);
- contract milestone `PlannedDate` (excluding completed milestones and non-active contracts).

Lifecycle update per monitoring cycle:

1. Compute active warning/overdue candidates.
2. Upsert candidate records in `SlaViolation`.
3. Mark previously open records as `IsResolved=true` when no longer detected.
4. Send notification for open records without `LastNotificationSentAtUtc`.

## Reason classifier

Reference dictionary type code:

- `SLA_VIOLATION_REASON`

Reason assignment endpoint validates reason code against active reference entries.
