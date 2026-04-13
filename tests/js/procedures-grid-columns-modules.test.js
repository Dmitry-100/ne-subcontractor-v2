"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const historyModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-columns-history.js"));

const shortlistModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-columns-shortlist.js"));

const registryModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-columns-registry.js"));

test("procedures columns modules: history module localizes statuses", () => {
    const columns = historyModule.createColumns({
        localizeStatus: function (status) { return `s:${status}`; }
    });

    const fromColumn = columns.historyColumns.find(function (item) { return item.dataField === "fromStatus"; });
    assert.equal(fromColumn.customizeText({ value: "Created" }), "s:Created");
});

test("procedures columns modules: shortlist module builds derived columns", () => {
    const columns = shortlistModule.createColumns({
        localizeContractorStatus: function (value) { return `cs:${value}`; },
        localizeReliabilityClass: function (value) { return `rc:${value}`; },
        localizeBoolean: function (value) { return value ? "Да" : "Нет"; }
    });

    const statusColumn = columns.shortlistColumns.find(function (item) { return item.dataField === "contractorStatus"; });
    assert.equal(statusColumn.customizeText({ value: "Active" }), "cs:Active");

    const adjustmentsColumn = columns.shortlistAdjustmentsColumns.find(function (item) { return item.dataField === "previousIsIncluded"; });
    assert.equal(adjustmentsColumn.customizeText({ value: null }), "—");
    assert.equal(adjustmentsColumn.customizeText({ value: true }), "Да");
});

test("procedures columns modules: registry module uses lookups", () => {
    const columns = registryModule.createColumns({
        statusLookup: [{ value: "Created", text: "Создана" }],
        approvalModeLookup: [{ value: "InSystem", text: "В системе" }]
    });

    const statusColumn = columns.proceduresColumns.find(function (item) { return item.dataField === "status"; });
    assert.deepEqual(statusColumn.lookup.dataSource, [{ value: "Created", text: "Создана" }]);

    const approvalModeColumn = columns.proceduresColumns.find(function (item) { return item.dataField === "approvalMode"; });
    assert.deepEqual(approvalModeColumn.lookup.dataSource, [{ value: "InSystem", text: "В системе" }]);
});
