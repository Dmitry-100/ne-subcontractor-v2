"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const registryModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-grids-registry.js"));

function createJQueryStub(captured) {
    return function jQueryStub(element) {
        return {
            dxDataGrid: function (config) {
                const instance = {
                    element: element,
                    refreshCalls: 0,
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
                            throw new Error("Unsupported dxDataGrid method.");
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

test("lots registry grid: validates required dependencies", () => {
    assert.throws(function () {
        registryModule.createGrid({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        registryModule.createGrid({
            jQueryImpl: function () {},
            onSelectionChanged: function () {},
            onDataErrorOccurred: function () {},
            store: {}
        });
    }, /element/i);

    assert.throws(function () {
        registryModule.createGrid({
            jQueryImpl: function () {},
            element: { id: "lots-grid" },
            onSelectionChanged: function () {},
            onDataErrorOccurred: function () {}
        });
    }, /store/i);

    assert.throws(function () {
        registryModule.createGrid({
            jQueryImpl: function () {},
            element: { id: "lots-grid" },
            store: {},
            onDataErrorOccurred: function () {},
            statusLookup: []
        });
    }, /onSelectionChanged/i);

    assert.throws(function () {
        registryModule.createGrid({
            jQueryImpl: function () {},
            element: { id: "lots-grid" },
            store: {},
            onSelectionChanged: function () {},
            statusLookup: []
        });
    }, /onDataErrorOccurred/i);

    assert.throws(function () {
        registryModule.createGrid({
            jQueryImpl: function () {},
            element: { id: "lots-grid" },
            store: {},
            onSelectionChanged: function () {},
            onDataErrorOccurred: function () {}
        });
    }, /statusLookup/i);
});

test("lots registry grid: creates grid and routes selection/refresh/error callbacks", () => {
    const captured = [];
    const selectionEvents = [];
    const errors = [];
    const statusLookup = [
        { value: "Draft", text: "Черновик" },
        { value: "InExecution", text: "В исполнении" }
    ];

    const grid = registryModule.createGrid({
        jQueryImpl: createJQueryStub(captured),
        element: { id: "lots-grid" },
        store: { key: "store" },
        statusLookup: statusLookup,
        onSelectionChanged: function (selected) {
            selectionEvents.push(selected);
        },
        onDataErrorOccurred: function (error) {
            errors.push(error);
        }
    });

    assert.ok(grid);
    assert.equal(captured.length, 1);

    const config = captured[0].config;
    const instance = captured[0].instance;

    assert.equal(config.keyExpr, "id");
    assert.equal(config.remoteOperations?.paging, true);
    assert.equal(config.searchPanel.placeholder, "Поиск лотов...");

    const statusColumn = findColumn(config.columns, "status");
    assert.equal(statusColumn.lookup.dataSource, statusLookup);

    const editorOptions = {};
    config.onEditorPreparing({
        parentType: "dataRow",
        dataField: "code",
        row: { isNewRow: false },
        editorOptions: editorOptions
    });
    assert.equal(editorOptions.readOnly, true);

    config.onSelectionChanged({ selectedRowsData: [{ id: "lot-1" }] });
    config.onSelectionChanged({ selectedRowsData: [] });
    assert.deepEqual(selectionEvents, [{ id: "lot-1" }, null]);

    const toolbar = { toolbarOptions: { items: [] } };
    config.onToolbarPreparing(toolbar);
    assert.equal(toolbar.toolbarOptions.items.length, 1);
    toolbar.toolbarOptions.items[0].options.onClick();
    assert.equal(instance.refreshCalls, 1);

    const dataError = { message: "Данные некорректны" };
    config.onDataErrorOccurred({ error: dataError });
    assert.deepEqual(errors, [dataError]);
});
