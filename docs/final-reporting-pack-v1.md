# Final Reporting Pack v1

## Included artifacts

- `analytical-data-mart-views-spec-v1.md`
- `kpi-definitions-v1.md`
- `reporting-validation-pack-v1.md`
- `power-bi-connectivity-guide-v1.md`
- `analytics-access-model-v1.md`
- `business-validation-report-rating-v1.md`

## Final readiness checklist

1. Migrations `0016` and `0017` are applied on target database.
2. Analytical views exist and are queryable.
3. Dashboard analytics panel is populated from `/api/analytics/kpi`.
4. Contractor rating module works end-to-end (`model`, `manual`, `history`, `analytics`).
5. `analytics.read` permission is assigned to required roles.
6. Integration tests are green on release candidate.

## Current status

- Engineering implementation: complete for Sprint 16-19 scope.
- Remaining production onboarding: environment-specific secrets, AD/LDAP alignment, SMTP routing confirmation, final performance evidence on staging SQL Server.
