"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const tableModelsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-table-models.js"));

function createTableModels() {
    return tableModelsModule.createTableModels({
        localizeImportStatus: function (status) {
            return `RU:${status}`;
        }
    });
}

test("imports table models: createTableModels validates dependencies", () => {
    assert.throws(() => tableModelsModule.createTableModels({}), /отсутствуют обязательные зависимости/);
});

test("imports table models: buildPreviewModel keeps headers and invalid row class", () => {
    const tableModels = createTableModels();
    const model = tableModels.buildPreviewModel([
        { rowNumber: 1, projectCode: "P1", objectWbs: "W1", disciplineCode: "D1", manHours: 8, isLocallyValid: true },
        { rowNumber: 2, projectCode: "P2", objectWbs: "W2", disciplineCode: "D2", manHours: 10, isLocallyValid: false, localValidationMessage: "Ошибка" }
    ], 200);

    assert.equal(model.headers.length, 8);
    assert.equal(model.rows.length, 2);
    assert.equal(model.rows[0].rowClassName, "");
    assert.equal(model.rows[1].rowClassName, "imports-row--invalid");
    assert.equal(model.rows[1].cells[7], "Ошибка");
});

test("imports table models: buildBatchesModel returns empty and populated states", () => {
    const tableModels = createTableModels();
    const emptyModel = tableModels.buildBatchesModel([]);
    assert.equal(emptyModel.emptyMessage, "Пакеты импорта не найдены.");
    assert.equal(emptyModel.emptyColSpan, 8);

    const model = tableModels.buildBatchesModel([{
        id: "batch-1",
        createdAtUtc: "2026-04-09T09:00:00Z",
        fileName: "source.csv",
        status: "Validated",
        totalRows: 10,
        validRows: 9,
        invalidRows: 1,
        createdBy: "user"
    }]);

    assert.equal(model.rows.length, 1);
    assert.equal(model.rows[0].batchId, "batch-1");
    assert.equal(model.rows[0].cells[2], "RU:Validated");
});

test("imports table models: buildInvalidRowsModel and buildHistoryModel visibility", () => {
    const tableModels = createTableModels();

    const emptyInvalid = tableModels.buildInvalidRowsModel({ rows: [{ isValid: true }] });
    assert.equal(emptyInvalid.visible, false);

    const invalidModel = tableModels.buildInvalidRowsModel({
        rows: [
            { isValid: true, rowNumber: 1 },
            { isValid: false, rowNumber: 2, validationMessage: "Пустой код" }
        ]
    });

    assert.equal(invalidModel.visible, true);
    assert.equal(invalidModel.rows.length, 1);
    assert.equal(invalidModel.rows[0].cells[0], 2);

    const emptyHistory = tableModels.buildHistoryModel([]);
    assert.equal(emptyHistory.visible, false);

    const historyModel = tableModels.buildHistoryModel([{
        changedAtUtc: "2026-04-09T10:00:00Z",
        fromStatus: "Uploaded",
        toStatus: "Validated",
        reason: "ОК",
        changedBy: "qa"
    }]);

    assert.equal(historyModel.visible, true);
    assert.equal(historyModel.rows[0].cells[1], "RU:Uploaded");
    assert.equal(historyModel.rows[0].cells[2], "RU:Validated");
});

test("imports table models: buildXmlInboxModel builds actions for view and retry", () => {
    const tableModels = createTableModels();
    const emptyModel = tableModels.buildXmlInboxModel([]);
    assert.equal(emptyModel.emptyMessage, "Элементы XML-очереди не найдены.");
    assert.equal(emptyModel.emptyColSpan, 7);

    const model = tableModels.buildXmlInboxModel([
        {
            id: "xml-1",
            createdAtUtc: "2026-04-09T11:00:00Z",
            sourceSystem: "ExpressPlanning",
            fileName: "plan.xml",
            status: "Failed",
            sourceDataImportBatchId: "batch-1",
            errorMessage: "Ошибка"
        },
        {
            id: "xml-2",
            createdAtUtc: "2026-04-09T12:00:00Z",
            sourceSystem: "ExpressPlanning",
            fileName: "plan2.xml",
            status: "Processing",
            sourceDataImportBatchId: null,
            errorMessage: ""
        }
    ]);

    assert.equal(model.rows.length, 2);
    assert.equal(model.rows[0].cells[3], "RU:Failed");
    assert.equal(model.rows[0].viewBatchId, "batch-1");
    assert.equal(model.rows[0].retryId, "xml-1");
    assert.equal(model.rows[1].retryId, null);
});
