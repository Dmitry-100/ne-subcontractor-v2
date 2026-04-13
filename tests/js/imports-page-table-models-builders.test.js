"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const buildersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-table-models-builders.js"));

test("imports table models builders: exports required functions", () => {
    assert.equal(typeof buildersModule.buildPreviewModel, "function");
    assert.equal(typeof buildersModule.buildBatchesModel, "function");
    assert.equal(typeof buildersModule.buildInvalidRowsModel, "function");
    assert.equal(typeof buildersModule.buildHistoryModel, "function");
    assert.equal(typeof buildersModule.buildXmlInboxModel, "function");
});

test("imports table models builders: xml and history builders keep status localization", () => {
    const localizeImportStatus = function (status) {
        return `RU:${status}`;
    };

    const historyModel = buildersModule.buildHistoryModel([{
        changedAtUtc: "2026-04-09T10:00:00Z",
        fromStatus: "Uploaded",
        toStatus: "Validated"
    }], localizeImportStatus);

    const xmlModel = buildersModule.buildXmlInboxModel([{
        id: "xml-1",
        createdAtUtc: "2026-04-09T11:00:00Z",
        status: "Failed",
        sourceDataImportBatchId: "batch-1"
    }], localizeImportStatus);

    assert.equal(historyModel.rows[0].cells[1], "RU:Uploaded");
    assert.equal(historyModel.rows[0].cells[2], "RU:Validated");
    assert.equal(xmlModel.rows[0].cells[3], "RU:Failed");
    assert.equal(xmlModel.rows[0].retryId, "xml-1");
});
