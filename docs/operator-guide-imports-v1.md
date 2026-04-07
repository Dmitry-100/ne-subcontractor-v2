# Operator Guide for Imports v1

Date: 2026-04-06

## Purpose

Guide for module `/imports` to upload source data, validate batches, and run workflow actions.

## Steps

1. Open `/imports`.
2. Download template from `Download CSV Template`.
3. Select source file (`.csv`, `.txt`, `.xlsx`, `.xls`).
4. Click `Parse File`.
5. Verify/adjust column mapping and click `Apply Mapping`.
6. Review preview and local validation hints.
7. Click `Upload Batch` (batch is queued with status `Uploaded`).
8. In `Import Batches`, click `View` for the needed batch.
9. Wait for automatic status refresh (`Uploaded` -> `Processing` -> `Validated`/`ValidatedWithErrors`).
10. Use:
   - `Download Invalid Rows Report` for error-focused CSV;
   - `Download Full Validation Report` for full batch CSV;
   - `Download Lot Reconciliation Report` to export apply trace (`batch -> group -> lot/skipped`).
11. In `Workflow Actions`, select target status and apply transition.
12. For transition to `Rejected`, fill `Reason`.
13. Validate changes in batch summary and transition history table.

## Notes

- Server-side validation is authoritative; local preview only helps before upload.
- Transition history stores `FromStatus`, `ToStatus`, `Reason`, operator, and timestamp.

## XML Inbox Flow

1. Scroll to `XML Inbox (Express Planning)` block on `/imports`.
2. Fill `Source System`, optional `External Document Id`, and `XML File Name`.
3. Paste XML payload and click `Queue XML`.
4. Refresh XML inbox list or wait worker cycle.
5. Track status:
   - `Received` -> queued;
   - `Processing` -> XML parsing/mapping in progress;
   - `Completed` -> source-data batch created;
   - `Failed` -> parsing or mapping error.
6. Use `View Batch` to open created source-data batch.
7. Use `Retry` for failed XML items after correcting source payload/process assumptions.

## Lot Recommendation Flow

1. Open a batch with status `ReadyForLotting`.
2. In `Lot Recommendations`, click `Build Recommendations`.
3. In the left table, select groups to include in draft lot creation.
4. In the right table, adjust `Lot Code` and `Lot Name` for selected groups if needed.
5. Click `Create Draft Lots`.
6. Review result message:
   - created lots count;
   - skipped groups count and first skip reason (if any).
7. Open `/lots` registry to validate newly created draft lots.
8. Use `Download Lot Reconciliation Report` in batch details to export reconciliation evidence after apply.
