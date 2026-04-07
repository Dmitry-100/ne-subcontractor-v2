# Permission Validation Report v1

Date: 2026-04-07

## Scope

Validation covers seeded role-permission matrix from `DefaultRolesAndPermissionsSeeder`:

- `GIP`
- `COMMERCIAL`
- `TENDER_COMMISSION`
- `PLANNER`
- `ADMINISTRATOR`

## Automated checks

Implemented in:

- `tests/Subcontractor.Tests.Integration/Security/PermissionMatrixValidationTests.cs`

Assertions:

- all expected roles are seeded;
- role-specific critical permissions are present or absent as expected;
- analytical permission `analytics.read` is validated across functional roles;
- `ADMINISTRATOR` role contains every permission code defined in `PermissionCodes`.

## Result

Current matrix is validated by automated integration test and included in CI test pass.
