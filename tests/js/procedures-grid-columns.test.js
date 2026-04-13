"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const columnsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-columns.js"));

test("procedures columns: createColumns builds all grid column sets", () => {
    const columns = columnsModule.createColumns({
        localizeStatus: function (value) { return `s:${value}`; },
        localizeContractorStatus: function (value) { return `cs:${value}`; },
        localizeReliabilityClass: function (value) { return `rc:${value}`; },
        localizeBoolean: function (value) { return value ? "Да" : "Нет"; },
        statusLookup: [{ value: "Created", text: "Создана" }],
        approvalModeLookup: [{ value: "InSystem", text: "В системе" }]
    });

    assert.ok(Array.isArray(columns.historyColumns));
    assert.ok(Array.isArray(columns.shortlistColumns));
    assert.ok(Array.isArray(columns.shortlistAdjustmentsColumns));
    assert.ok(Array.isArray(columns.proceduresColumns));

    const historyFrom = columns.historyColumns.find(function (item) {
        return item.dataField === "fromStatus";
    });
    assert.equal(historyFrom.customizeText({ value: "Created" }), "s:Created");

    const shortlistStatus = columns.shortlistColumns.find(function (item) {
        return item.dataField === "contractorStatus";
    });
    assert.equal(shortlistStatus.customizeText({ value: "Active" }), "cs:Active");

    const shortlistReliability = columns.shortlistColumns.find(function (item) {
        return item.dataField === "reliabilityClass";
    });
    assert.equal(shortlistReliability.customizeText({ value: "A" }), "rc:A");

    const shortlistMissingCodes = columns.shortlistColumns.find(function (item) {
        return item.dataField === "missingDisciplineCodes";
    });
    assert.equal(
        shortlistMissingCodes.calculateCellValue({ missingDisciplineCodes: ["M1", "M2"] }),
        "M1, M2");
    assert.equal(shortlistMissingCodes.calculateCellValue({}), "");

    const shortlistFactors = columns.shortlistColumns.find(function (item) {
        return item.dataField === "decisionFactors";
    });
    assert.equal(
        shortlistFactors.calculateCellValue({ decisionFactors: ["F1", "F2"] }),
        "F1 | F2");
    assert.equal(shortlistFactors.calculateCellValue(null), "");

    const shortlistAdjustmentsPrevious = columns.shortlistAdjustmentsColumns.find(function (item) {
        return item.dataField === "previousIsIncluded";
    });
    assert.equal(shortlistAdjustmentsPrevious.customizeText({ value: true }), "Да");
    assert.equal(shortlistAdjustmentsPrevious.customizeText({ value: null }), "—");

    const procedureStatus = columns.proceduresColumns.find(function (item) {
        return item.dataField === "status";
    });
    assert.deepEqual(procedureStatus.lookup.dataSource, [{ value: "Created", text: "Создана" }]);

    const procedureApprovalMode = columns.proceduresColumns.find(function (item) {
        return item.dataField === "approvalMode";
    });
    assert.deepEqual(procedureApprovalMode.lookup.dataSource, [{ value: "InSystem", text: "В системе" }]);
});
