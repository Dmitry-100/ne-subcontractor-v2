"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const historyModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-grids-history.js"));

function createJQueryStub(captured) {
    return function jQueryStub(element) {
        return {
            dxDataGrid: function (config) {
                captured.push({
                    element: element,
                    config: config
                });

                return {
                    dxDataGrid: function (method) {
                        if (method !== "instance") {
                            throw new Error("Unsupported dxDataGrid method.");
                        }

                        return {
                            element: element
                        };
                    }
                };
            }
        };
    };
}

function findColumn(columns, dataField) {
    return columns.find(function (column) {
        return column.dataField === dataField;
    });
}

test("contractors history grid: validates required dependencies", () => {
    assert.throws(function () {
        historyModule.createGrid({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        historyModule.createGrid({
            jQueryImpl: function () {}
        });
    }, /helpers/i);

    assert.throws(function () {
        historyModule.createGrid({
            jQueryImpl: function () {},
            helpers: {}
        });
    }, /element/i);
});

test("contractors history grid: creates expected columns and helper localization", () => {
    const captured = [];
    const helpers = {
        localizeSource: function (value) {
            return "source:" + value;
        }
    };

    const grid = historyModule.createGrid({
        jQueryImpl: createJQueryStub(captured),
        helpers: helpers,
        element: { id: "history-grid" }
    });

    assert.ok(grid);
    assert.equal(captured.length, 1);

    const config = captured[0].config;
    assert.equal(config.paging.pageSize, 8);

    const sourceColumn = findColumn(config.columns, "sourceType");
    const finalScoreColumn = findColumn(config.columns, "finalScore");

    assert.equal(sourceColumn.customizeText({ value: "ManualAssessment" }), "source:ManualAssessment");
    assert.equal(finalScoreColumn.format.precision, 3);
});
