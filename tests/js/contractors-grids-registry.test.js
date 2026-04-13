"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const registryModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-grids-registry.js"));

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

test("contractors registry grid: validates required dependencies", () => {
    assert.throws(function () {
        registryModule.createGrid({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        registryModule.createGrid({
            jQueryImpl: function () {}
        });
    }, /helpers/i);

    assert.throws(function () {
        registryModule.createGrid({
            jQueryImpl: function () {},
            helpers: {}
        });
    }, /element/i);

    assert.throws(function () {
        registryModule.createGrid({
            jQueryImpl: function () {},
            helpers: {},
            element: {}
        });
    }, /onContractorSelectionChanged/i);
});

test("contractors registry grid: creates grid and routes selection callback", () => {
    const captured = [];
    const selectionEvents = [];

    const helpers = {
        localizeContractorStatus: function (value) {
            return "status:" + value;
        },
        localizeReliability: function (value) {
            return "reliability:" + value;
        }
    };

    const grid = registryModule.createGrid({
        jQueryImpl: createJQueryStub(captured),
        helpers: helpers,
        element: { id: "registry-grid" },
        onContractorSelectionChanged: function (selected) {
            selectionEvents.push(selected);
        }
    });

    assert.ok(grid);
    assert.equal(captured.length, 1);

    const config = captured[0].config;
    assert.equal(config.keyExpr, "id");
    assert.equal(config.searchPanel.placeholder, "Поиск подрядчиков...");

    const statusColumn = findColumn(config.columns, "status");
    const reliabilityColumn = findColumn(config.columns, "reliabilityClass");

    assert.equal(statusColumn.customizeText({ value: "Active" }), "status:Active");
    assert.equal(reliabilityColumn.customizeText({ value: "A" }), "reliability:A");

    config.onSelectionChanged({ selectedRowsData: [{ id: "ctr-1" }] });
    config.onSelectionChanged({ selectedRowsData: [] });

    assert.deepEqual(selectionEvents[0], { id: "ctr-1" });
    assert.equal(selectionEvents[1], null);
});
