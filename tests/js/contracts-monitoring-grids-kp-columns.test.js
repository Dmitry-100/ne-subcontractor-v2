"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const kpColumnsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-kp-columns.js"));

test("monitoring KP columns: control points columns include stages counter", () => {
    const columns = kpColumnsModule.createControlPointsColumns();
    assert.equal(columns.length, 11);

    const stagesCountColumn = columns.find(function (column) {
        return column.caption === "Этапов";
    });

    assert.equal(stagesCountColumn.calculateCellValue({ stages: [1, 2, 3] }), 3);
    assert.equal(stagesCountColumn.calculateCellValue({ stages: null }), 0);
});

test("monitoring KP columns: stages columns keep range validation and delayed flag", () => {
    const columns = kpColumnsModule.createStagesColumns();
    assert.equal(columns.length, 9);

    const progressColumn = columns.find(function (column) {
        return column.dataField === "progressPercent";
    });
    const delayedColumn = columns.find(function (column) {
        return column.dataField === "isDelayed";
    });

    assert.equal(progressColumn.validationRules[0].type, "range");
    assert.equal(progressColumn.validationRules[0].min, 0);
    assert.equal(progressColumn.validationRules[0].max, 100);
    assert.equal(delayedColumn.caption, "Просрочен");
});
