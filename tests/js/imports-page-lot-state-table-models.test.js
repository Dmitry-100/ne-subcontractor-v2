"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const tableModelsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-lot-state-table-models.js"));

function buildRecommendations() {
    return {
        groups: [
            {
                groupKey: "g-1",
                projectCode: "P1",
                disciplineCode: "D1",
                suggestedLotCode: "LOT-001",
                suggestedLotName: "Лот 1",
                rowsCount: 2,
                totalManHours: 16
            },
            {
                groupKey: "g-2",
                projectCode: "P2",
                disciplineCode: "D2",
                suggestedLotCode: "LOT-002",
                suggestedLotName: "Лот 2",
                rowsCount: 1,
                totalManHours: 8
            }
        ]
    };
}

test("imports lot state table models: groups table handles empty and filled recommendations", () => {
    const emptyModel = tableModelsModule.buildLotGroupsTableModel({
        recommendations: { groups: [] },
        selectionsByKey: new Map(),
        formatNumber: function (value) { return `MH:${value}`; },
        formatDateRange: function (start, finish) { return `${start || ""}|${finish || ""}`; }
    });

    assert.equal(emptyModel.emptyColSpan, 8);
    assert.match(emptyModel.emptyMessage, /Постройте рекомендации/);

    const filledModel = tableModelsModule.buildLotGroupsTableModel({
        recommendations: buildRecommendations(),
        selectionsByKey: new Map([
            ["g-1", { selected: false, lotCode: "C1", lotName: "N1" }]
        ]),
        formatNumber: function (value) { return `MH:${value}`; },
        formatDateRange: function (start, finish) { return `${start || ""}|${finish || ""}`; }
    });

    assert.equal(filledModel.headers.length, 8);
    assert.equal(filledModel.rows.length, 2);
    assert.equal(filledModel.rows[0].checked, false);
});

test("imports lot state table models: selected table keeps only selected groups", () => {
    const filledModel = tableModelsModule.buildLotSelectedTableModel({
        recommendations: buildRecommendations(),
        selectionsByKey: new Map([
            ["g-1", { selected: true, lotCode: "LOT-A", lotName: "Лот А" }],
            ["g-2", { selected: false, lotCode: "LOT-B", lotName: "Лот Б" }]
        ]),
        formatNumber: function (value) { return `MH:${value}`; }
    });

    assert.equal(filledModel.headers.length, 5);
    assert.equal(filledModel.rows.length, 1);
    assert.equal(filledModel.rows[0].groupLabel, "P1 / D1");
    assert.equal(filledModel.rows[0].totalManHours, "MH:16");
});
