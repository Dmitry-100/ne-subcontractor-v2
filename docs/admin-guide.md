# Admin Guide

Date: 2026-04-06

## Purpose

Operational guide for administrators of Subcontractor V2 MVP.

## Admin responsibilities

- manage user role assignment and active flags;
- manage reference dictionaries (type/item values);
- monitor access issues and escalate infrastructure/auth problems;
- coordinate with support using correlation ID from failed operations.

## Access requirements

- authenticated user in AD/LDAP (or current auth provider);
- `users.read` and `users.write` permissions for user administration;
- `reference-data.read` and `reference-data.write` permissions for dictionaries.

## User administration

Page: `/admin` -> `Users`

Typical operations:

1. Find user by login or display name.
2. Open edit popup.
3. Set active flag.
4. Assign one or more role names.
5. Save and verify update in grid.

Validation notes:

- unknown role names are rejected with validation error;
- inactive users cannot perform normal business actions;
- role changes are effective after new authorized request.

## Reference data administration

Page: `/admin` -> `Reference Data`

Typical operations:

1. Enter `typeCode` (for example `DISCIPLINES`, `PURCHASE_TYPE`).
2. Load dictionary items (optionally `active only`).
3. Create or update item (`itemCode`, `displayName`, `sortOrder`, `isActive`).
4. Delete obsolete item if not used in active process.

Normalization behavior:

- codes are normalized to uppercase;
- blank type/item codes are rejected.

## Error handling

If UI operation fails:

1. copy visible error text;
2. copy `X-Correlation-Id` from browser network response;
3. provide endpoint, timestamp, and correlation ID to support team.

## Recommended admin routines

Daily:

- verify no disabled critical users;
- check dictionary consistency for active workflows.

Weekly:

- audit role assignments for privileged roles (`ADMINISTRATOR`);
- review defect register and unblock business users;
- verify SLA reason classifier dictionary (`SLA_VIOLATION_REASON`) is up to date for current pilot process.
