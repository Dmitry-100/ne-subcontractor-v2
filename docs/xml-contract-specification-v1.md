# XML Contract Specification v1

Date: 2026-04-06

## Purpose

Define XML payload contract for source-data ingestion from express planning systems into XML inbox.

## Inbox API

- `POST /api/imports/source-data/xml/inbox`

Request payload:

```json
{
  "sourceSystem": "ExpressPlanning",
  "externalDocumentId": "DOC-2026-09-21-001",
  "fileName": "express-plan-2026-09-21.xml",
  "xmlContent": "<rows><row projectCode=\"PRJ-001\" objectWbs=\"A.01.02\" disciplineCode=\"PIPING\" manHours=\"240.5\" plannedStartDate=\"2026-09-10\" plannedFinishDate=\"2026-10-05\" /></rows>"
}
```

## Supported XML shapes

### Preferred

```xml
<rows>
  <row
    rowNumber="1"
    projectCode="PRJ-001"
    objectWbs="A.01.02"
    disciplineCode="PIPING"
    manHours="240.5"
    plannedStartDate="2026-09-10"
    plannedFinishDate="2026-10-05" />
</rows>
```

### Element-based row

```xml
<rows>
  <row>
    <rowNumber>1</rowNumber>
    <projectCode>PRJ-001</projectCode>
    <objectWbs>A.01.02</objectWbs>
    <disciplineCode>PIPING</disciplineCode>
    <manHours>240.5</manHours>
    <plannedStartDate>2026-09-10</plannedStartDate>
    <plannedFinishDate>2026-10-05</plannedFinishDate>
  </row>
</rows>
```

## Mapping rules

- row nodes: `row`, `item`, `work`;
- supported field keys:
  - `rowNumber` / `lineNumber`,
  - `projectCode` / `project`,
  - `objectWbs` / `wbs`,
  - `disciplineCode` / `discipline`,
  - `manHours` / `laborHours` / `hours`,
  - `plannedStartDate` / `startDate`,
  - `plannedFinishDate` / `finishDate` / `endDate`;
- values can be provided as XML attributes or child elements;
- date format preference: `YYYY-MM-DD`;
- decimal parsing uses invariant format with fallback for comma separator.

## Processing outcomes

- XML item status:
  - `Received` -> `Processing` -> `Completed` / `Failed`;
- on `Completed`, linked source-data batch is created in queued mode (`Uploaded`) for downstream validation worker.
