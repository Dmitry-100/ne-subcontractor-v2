"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotsGridsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-grids.js"));

function createJQueryStub(captured) {
    return function jQueryStub(element) {
        return {
            dxDataGrid: function (config) {
                const instance = {
                    element: element,
                    optionCalls: [],
                    refreshCalls: 0,
                    option: function (key, value) {
                        this.optionCalls.push({ key: key, value: value });
                    },
                    refresh: function () {
                        this.refreshCalls += 1;
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

test("lots grids: validates required dependencies", () => {
    assert.throws(function () {
        lotsGridsModule.createGrids({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        lotsGridsModule.createGrids({
            jQueryImpl: function () {},
            elements: {},
            store: {}
        });
    }, /statusLookup/i);

    assert.throws(function () {
        lotsGridsModule.createGrids({
            jQueryImpl: function () {},
            elements: {
                lotsGridElement: { id: "lots" },
                historyGridElement: { id: "history" }
            },
            store: {},
            statusLookup: [],
            localizeStatus: function (value) {
                return value;
            },
            callbacks: {}
        });
    }, /onSelectionChanged/i);
});

test("lots grids: creates history and lots grids and wires callbacks", () => {
    const captured = [];
    const selectedRows = [];
    const errors = [];
    const statusLookup = [
        { value: "Draft", text: "Черновик" },
        { value: "InExecution", text: "В исполнении" }
    ];

    const grids = lotsGridsModule.createGrids({
        jQueryImpl: createJQueryStub(captured),
        elements: {
            lotsGridElement: { id: "lots" },
            historyGridElement: { id: "history" }
        },
        store: { key: "mock-store" },
        statusLookup: statusLookup,
        localizeStatus: function (value) {
            return `status:${value}`;
        },
        callbacks: {
            onSelectionChanged: function (row) {
                selectedRows.push(row);
            },
            onDataErrorOccurred: function (error) {
                errors.push(error);
            }
        }
    });

    assert.ok(grids.historyGridInstance);
    assert.ok(grids.lotsGridInstance);
    assert.equal(captured.length, 1);

    const lotsConfig = captured[0].config;
    grids.historyGridInstance.ensureInitialized();
    assert.equal(captured.length, 2);
    const historyConfig = captured[1].config;

    assert.equal(historyConfig.columns[0].customizeText({ value: "Draft" }), "status:Draft");
    assert.equal(lotsConfig.searchPanel.placeholder, "Поиск лотов...");

    const statusColumn = findColumn(lotsConfig.columns, "status");
    assert.equal(statusColumn.lookup.dataSource, statusLookup);

    lotsConfig.onSelectionChanged({ selectedRowsData: [{ id: "lot-1" }] });
    lotsConfig.onSelectionChanged({ selectedRowsData: [] });
    assert.deepEqual(selectedRows, [{ id: "lot-1" }, null]);

    const editorOptions = {};
    lotsConfig.onEditorPreparing({
        parentType: "dataRow",
        dataField: "code",
        row: { isNewRow: false },
        editorOptions: editorOptions
    });
    assert.equal(editorOptions.readOnly, true);

    const toolbar = { toolbarOptions: { items: [] } };
    lotsConfig.onToolbarPreparing(toolbar);
    assert.equal(toolbar.toolbarOptions.items.length, 1);
    toolbar.toolbarOptions.items[0].options.onClick();
    assert.equal(grids.lotsGridInstance.refreshCalls, 1);

    const dataError = { message: "Данные некорректны" };
    lotsConfig.onDataErrorOccurred({ error: dataError });
    assert.deepEqual(errors, [dataError]);
});
