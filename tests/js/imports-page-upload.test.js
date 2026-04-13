"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const uploadModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-upload.js"));

function createUploadHelpers() {
    return uploadModule.createUploadHelpers();
}

test("imports upload: buildQueuedBatchRequest validates parsed rows", () => {
    const uploadHelpers = createUploadHelpers();

    assert.throws(() => uploadHelpers.buildQueuedBatchRequest({ parsedRows: [] }), /Нет разобранных строк/);
    assert.throws(() => uploadHelpers.buildQueuedBatchRequest({ parsedRows: null }), /Нет разобранных строк/);
});

test("imports upload: request payload normalizes defaults and maps rows", () => {
    const uploadHelpers = createUploadHelpers();
    const payload = uploadHelpers.buildQueuedBatchRequest({
        parsedRows: [
            {
                rowNumber: 7,
                projectCode: "PRJ-7",
                objectWbs: "OBJ-7",
                disciplineCode: "DISC-7",
                manHours: 11.5,
                plannedStartDate: "2026-04-01",
                plannedFinishDate: "2026-04-03"
            }
        ],
        sourceFileName: "   ",
        notes: "   "
    });

    assert.deepEqual(payload, {
        fileName: "source-data.csv",
        notes: null,
        rows: [
            {
                rowNumber: 7,
                projectCode: "PRJ-7",
                objectWbs: "OBJ-7",
                disciplineCode: "DISC-7",
                manHours: 11.5,
                plannedStartDate: "2026-04-01",
                plannedFinishDate: "2026-04-03"
            }
        ]
    });
});

test("imports upload: request payload preserves explicit file and notes", () => {
    const uploadHelpers = createUploadHelpers();
    const payload = uploadHelpers.buildQueuedBatchRequest({
        parsedRows: [{ rowNumber: 1 }],
        sourceFileName: "  data-2026-04.csv  ",
        notes: "  ручная загрузка  "
    });

    assert.equal(payload.fileName, "data-2026-04.csv");
    assert.equal(payload.notes, "ручная загрузка");
    assert.equal(payload.rows.length, 1);
});

test("imports upload: status message is deterministic", () => {
    const uploadHelpers = createUploadHelpers();
    const status = uploadHelpers.buildQueuedBatchSuccessStatus({
        id: "batch-42",
        status: "Uploaded"
    });

    assert.equal(
        status,
        "Пакет поставлен в очередь: batch-42. Статус: Uploaded. Валидация будет выполнена асинхронно.");
});
