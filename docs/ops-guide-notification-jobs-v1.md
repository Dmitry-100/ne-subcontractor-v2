# Ops Guide for Notification Jobs v1

## Scope

Operational control for SLA monitoring jobs and notification pipeline.

Job hosts:

- Web host worker: `Subcontractor.Web/Workers/SlaMonitoringWorker`;
- Background host worker: `Subcontractor.BackgroundJobs/Workers/SlaMonitorWorker`.

Both use the same service `ISlaMonitoringService`.

## Runtime controls

Section: `SlaMonitoring`

- `WorkerEnabled`: enable/disable worker loop.
- `WorkerPollingIntervalMinutes`: cycle interval (1..240).
- `DefaultWarningDaysBeforeDue`: fallback warning horizon when no purchase-type rule exists.

## Manual run

Operator/API command:

```bash
curl -k -X POST "https://localhost:5001/api/sla/run?sendNotifications=true"
```

Typical use:

- post-deployment smoke;
- emergency recalculation after data correction;
- validation of SMTP routing (with `DryRun=true`).

## Health checks

Primary indicators:

- open violations are visible via `GET /api/sla/violations`;
- notification counters in `SlaViolation`:
  - `NotificationAttempts`;
  - `LastNotificationSentAtUtc`;
  - `LastNotificationError`.

Expected baseline after healthy run:

- no unbounded growth of unresolved overdue events;
- no repetitive SMTP transport errors in `LastNotificationError`.

## Incident handling

1. Disable worker (`WorkerEnabled=false`) if notification storm is detected.
2. Switch SMTP to dry-run (`Smtp:DryRun=true`) for diagnostics.
3. Execute manual run with `sendNotifications=false` to validate pure detection.
4. Fix root cause (emails/rules/data), then re-enable worker.

## Recommended pilot cadence

- every deployment: one manual SLA cycle + check open violation sample;
- daily during pilot: verify count of overdue events and SMTP failures.
