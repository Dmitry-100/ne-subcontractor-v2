"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const workflowHistoryGridModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-workflow-history-grid.js"));

test("workflow history grid: validates localizeStatus dependency", () => {
    assert.throws(function () {
        workflowHistoryGridModule.createColumns();
    }, /localizeStatus/i);
});

test("workflow history grid: creates columns with status localizer", () => {
    const columns = workflowHistoryGridModule.createColumns(function (value) {
        return `RU:${value}`;
    });

    assert.equal(columns.length, 6);
    assert.equal(columns[1].dataField, "fromStatus");
    assert.equal(columns[2].dataField, "toStatus");
    assert.equal(columns[5].dataField, "changedAtUtc");
    assert.equal(columns[1].customizeText({ value: "Active" }), "RU:Active");
});

test("workflow history grid: creates full default grid config", () => {
    const config = workflowHistoryGridModule.createGridConfig(function (value) {
        return value;
    });

    assert.equal(config.keyExpr, "id");
    assert.equal(config.height, 260);
    assert.deepEqual(config.pager.allowedPageSizes, [10, 20, 40]);
    assert.equal(config.columns.length, 6);
});
