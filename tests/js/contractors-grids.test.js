"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractorsGridsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-grids.js"));

function createJQueryStub(captured) {
    return function jQueryStub(element) {
        return {
            dxDataGrid: function (config) {
                const instance = {
                    element: element,
                    optionCalls: [],
                    option: function (key, value) {
                        this.optionCalls.push({ key: key, value: value });
                    }
                };

                captured.push({
                    element: element,
                    config: config,
                    instance: instance
                });

                return {
                    dxDataGrid: function (method) {
                        if (method !== "instance") {
                            throw new Error("Unsupported dxDataGrid method in test stub.");
                        }

                        return instance;
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

test("contractors grids: validates required dependencies", () => {
    assert.throws(function () {
        contractorsGridsModule.createGrids({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        contractorsGridsModule.createGrids({
            jQueryImpl: function () {},
            helpers: {},
            elements: {},
            onContractorSelectionChanged: function () {}
        });
    }, /contractorsGridElement/i);

    assert.throws(function () {
        contractorsGridsModule.createGrids({
            jQueryImpl: function () {},
            helpers: {},
            elements: {
                contractorsGridElement: { id: "registry" },
                historyGridElement: { id: "history" },
                analyticsGridElement: { id: "analytics" }
            }
        });
    }, /onContractorSelectionChanged/i);
});

test("contractors grids: creates registry/history/analytics grids and wires callback", () => {
    const captured = [];
    const selectedRows = [];

    const helpers = {
        localizeContractorStatus: function (value) {
            return `status:${value}`;
        },
        localizeReliability: function (value) {
            return `reliability:${value}`;
        },
        localizeSource: function (value) {
            return `source:${value}`;
        },
        parseRatingDelta: function (value) {
            return `delta:${value}`;
        },
        formatDateTime: function (value) {
            return `date:${value}`;
        }
    };

    const elements = {
        contractorsGridElement: { id: "registry" },
        historyGridElement: { id: "history" },
        analyticsGridElement: { id: "analytics" }
    };

    const grids = contractorsGridsModule.createGrids({
        jQueryImpl: createJQueryStub(captured),
        helpers: helpers,
        elements: elements,
        onContractorSelectionChanged: function (selected) {
            selectedRows.push(selected);
        }
    });

    assert.ok(grids.contractorsGridInstance);
    assert.ok(grids.historyGridInstance);
    assert.ok(grids.analyticsGridInstance);
    assert.equal(captured.length, 1);
    assert.equal(grids.historyGridInstance.isInitialized(), false);
    assert.equal(grids.analyticsGridInstance.isInitialized(), false);

    grids.historyGridInstance.option("dataSource", []);
    grids.analyticsGridInstance.option("dataSource", []);
    assert.equal(captured.length, 1);

    const contractorsConfig = captured[0].config;
    assert.equal(contractorsConfig.keyExpr, "id");
    assert.equal(contractorsConfig.searchPanel.placeholder, "Поиск подрядчиков...");

    grids.historyGridInstance.ensureInitialized();
    grids.analyticsGridInstance.ensureInitialized();

    assert.equal(captured.length, 3);
    const historyConfig = captured[1].config;
    const analyticsConfig = captured[2].config;
    assert.deepEqual(captured[1].instance.optionCalls[0], { key: "dataSource", value: [] });
    assert.deepEqual(captured[2].instance.optionCalls[0], { key: "dataSource", value: [] });
    assert.equal(historyConfig.paging.pageSize, 8);
    assert.equal(analyticsConfig.searchPanel.placeholder, "Поиск в аналитике...");

    const contractorsStatusColumn = findColumn(contractorsConfig.columns, "status");
    const analyticsDeltaColumn = findColumn(analyticsConfig.columns, "ratingDelta");
    const analyticsDateColumn = findColumn(analyticsConfig.columns, "lastCalculatedAtUtc");
    const historySourceColumn = findColumn(historyConfig.columns, "sourceType");

    assert.equal(contractorsStatusColumn.customizeText({ value: "Active" }), "status:Active");
    assert.equal(analyticsDeltaColumn.customizeText({ value: 0.123 }), "delta:0.123");
    assert.equal(analyticsDateColumn.calculateCellValue({ lastCalculatedAtUtc: "2026-01-01T00:00:00Z" }), "date:2026-01-01T00:00:00Z");
    assert.equal(historySourceColumn.customizeText({ value: "ManualAssessment" }), "source:ManualAssessment");

    contractorsConfig.onSelectionChanged({ selectedRowsData: [{ id: "ctr-1" }] });
    contractorsConfig.onSelectionChanged({ selectedRowsData: [] });

    assert.equal(selectedRows.length, 2);
    assert.deepEqual(selectedRows[0], { id: "ctr-1" });
    assert.equal(selectedRows[1], null);
});
