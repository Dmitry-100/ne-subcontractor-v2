"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const historyModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-grids-history.js"));

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

test("lots history grid: validates required dependencies", () => {
    assert.throws(function () {
        historyModule.createGrid({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        historyModule.createGrid({
            jQueryImpl: function () {}
        });
    }, /localizeStatus/i);

    assert.throws(function () {
        historyModule.createGrid({
            jQueryImpl: function () {},
            localizeStatus: function (value) {
                return value;
            }
        });
    }, /element/i);
});

test("lots history grid: creates expected columns and status localization", () => {
    const captured = [];

    const grid = historyModule.createGrid({
        jQueryImpl: createJQueryStub(captured),
        element: { id: "history-grid" },
        localizeStatus: function (value) {
            return "status:" + value;
        }
    });

    assert.ok(grid);
    assert.equal(captured.length, 1);

    const config = captured[0].config;
    assert.equal(config.paging.pageSize, 10);

    const fromStatusColumn = findColumn(config.columns, "fromStatus");
    const toStatusColumn = findColumn(config.columns, "toStatus");
    const changedAtColumn = findColumn(config.columns, "changedAtUtc");

    assert.equal(fromStatusColumn.customizeText({ value: "Draft" }), "status:Draft");
    assert.equal(toStatusColumn.customizeText({ value: "Closed" }), "status:Closed");
    assert.equal(changedAtColumn.sortOrder, "desc");
});
