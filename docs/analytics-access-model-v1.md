# Analytics Access Model v1

## Application-level access

- New permission: `analytics.read`.
- Policy: `policy.analytics.read`.
- Exposed endpoints:
  - `GET /api/analytics/kpi`
  - `GET /api/analytics/views`

## Role assignment (default seed)

- `Gip`: has `analytics.read`
- `Commercial`: has `analytics.read`
- `TenderCommission`: has `analytics.read`
- `Planner`: has `analytics.read`
- `Administrator`: has `analytics.read` (plus full set)

## Database access (BI users)

Recommended:

- dedicated SQL login with read-only rights;
- allow `SELECT` only on analytical views (`vwAnalytics_*`);
- deny direct update/delete on operational schema.

## Security considerations

- analytical access should avoid PII-heavy raw tables when possible;
- retain AD/LDAP mapping at app level for API access;
- rotate BI credentials according to enterprise policy.
