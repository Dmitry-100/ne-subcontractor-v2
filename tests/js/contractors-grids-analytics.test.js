"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const analyticsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-grids-analytics.js"));

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

test("contractors analytics grid: validates required dependencies", () => {
    assert.throws(function () {
        analyticsModule.createGrid({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        analyticsModule.createGrid({
            jQueryImpl: function () {}
        });
    }, /helpers/i);

    assert.throws(function () {
        analyticsModule.createGrid({
            jQueryImpl: function () {},
            helpers: {}
        });
    }, /element/i);
});

test("contractors analytics grid: creates expected formatters and helper projections", () => {
    const captured = [];
    const helpers = {
        localizeContractorStatus: function (value) {
            return "status:" + value;
        },
        localizeReliability: function (value) {
            return "reliability:" + value;
        },
        parseRatingDelta: function (value) {
            return "delta:" + value;
        },
        formatDateTime: function (value) {
            return "date:" + value;
        }
    };

    const grid = analyticsModule.createGrid({
        jQueryImpl: createJQueryStub(captured),
        helpers: helpers,
        element: { id: "analytics-grid" }
    });

    assert.ok(grid);
    assert.equal(captured.length, 1);

    const config = captured[0].config;
    assert.equal(config.searchPanel.placeholder, "Поиск в аналитике...");
    assert.equal(config.keyExpr, "contractorId");

    const statusColumn = findColumn(config.columns, "contractorStatus");
    const reliabilityColumn = findColumn(config.columns, "reliabilityClass");
    const deltaColumn = findColumn(config.columns, "ratingDelta");
    const dateColumn = findColumn(config.columns, "lastCalculatedAtUtc");

    assert.equal(statusColumn.customizeText({ value: "Active" }), "status:Active");
    assert.equal(reliabilityColumn.customizeText({ value: "A" }), "reliability:A");
    assert.equal(deltaColumn.customizeText({ value: 0.12 }), "delta:0.12");
    assert.equal(dateColumn.calculateCellValue({ lastCalculatedAtUtc: "2026-04-12T00:00:00Z" }), "date:2026-04-12T00:00:00Z");
});
