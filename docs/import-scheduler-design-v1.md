# Import Scheduler Design v1

Date: 2026-04-06

## Goal

Describe background scheduling flow for XML inbox processing and source-data batch validation.

## Components

- `SourceDataImportProcessingWorker` (hosted service in Web app).
- `IXmlSourceDataImportInboxService`:
  - processes XML inbox queue.
- `ISourceDataImportsService`:
  - processes queued source-data batches.

## Loop behavior

Worker loop:

1. Create DI scope.
2. Process up to 2 XML inbox items (`Received` -> `Processing` -> `Completed|Failed`).
3. Process up to 3 source-data batches (`Uploaded` -> `Processing` -> `Validated|ValidatedWithErrors|Failed`).
4. If nothing processed, wait 5 seconds.
5. On exception, log error and wait 10 seconds.

## Reconciliation flow

- XML inbox item keeps link `SourceDataImportBatchId` after successful conversion.
- Operator can:
  - open XML inbox list;
  - inspect item status/error;
  - open related source-data batch details;
  - retry failed XML item via `POST /api/imports/source-data/xml/inbox/{id}/retry`.

## Operational notes

- Worker runs continuously in application host.
- XML parsing and source-data validation are separated into two queue steps for better isolation and retry behavior.
- Processing limits (`2` XML + `3` source batches per loop) are initial defaults and can be tuned after performance measurements.
