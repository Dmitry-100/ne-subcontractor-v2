"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const proceduresGridsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grids.js"));

function createJQueryStub(gridRegistry, addClassCalls) {
    return function (element) {
        return {
            addClass: function (className) {
                addClassCalls.push({ element: element, className: className });
            },
            dxDataGrid: function (options) {
                const record = {
                    config: options,
                    dataSource: options.dataSource,
                    instance: {
                        option: function (name, value) {
                            if (arguments.length === 1) {
                                if (name === "dataSource") {
                                    return record.dataSource;
                                }

                                return undefined;
                            }

                            if (name === "dataSource") {
                                record.dataSource = value;
                            }
                        },
                        refresh: function () { },
                        selectRows: function () { },
                        clearSelection: function () { }
                    }
                };

                gridRegistry.set(element, record);
                return {
                    dxDataGrid: function (arg) {
                        if (arg === "instance") {
                            return record.instance;
                        }

                        throw new Error("Unsupported dxDataGrid call.");
                    }
                };
            }
        };
    };
}

test("procedures grids: validates required dependencies", () => {
    assert.throws(function () {
        proceduresGridsModule.createHistoryGrid({
            element: { id: "history" },
            columns: []
        });
    }, /requires jQuery factory/i);

    assert.throws(function () {
        proceduresGridsModule.createProceduresGrid({
            jQuery: function () { return {}; },
            element: { id: "grid" },
            store: {},
            columns: []
        });
    }, /onEditorPreparing/i);
});

test("procedures grids: creates history and shortlist grids with expected config", () => {
    const registry = new Map();
    const addClassCalls = [];
    const jQueryStub = createJQueryStub(registry, addClassCalls);
    const historyElement = { id: "history-grid" };
    const shortlistElement = { id: "shortlist-grid" };

    proceduresGridsModule.createHistoryGrid({
        jQuery: jQueryStub,
        element: historyElement,
        columns: [{ dataField: "toStatus" }]
    });

    proceduresGridsModule.createShortlistGrid({
        jQuery: jQueryStub,
        element: shortlistElement,
        columns: [{ dataField: "contractorName" }]
    });

    const historyConfig = registry.get(historyElement).config;
    const shortlistConfig = registry.get(shortlistElement).config;

    assert.equal(historyConfig.height, 320);
    assert.equal(historyConfig.columns[0].dataField, "toStatus");
    assert.equal(shortlistConfig.searchPanel.placeholder, "Поиск по подрядчикам...");
    assert.equal(shortlistConfig.columns[0].dataField, "contractorName");

    const rowElement = { id: "shortlist-row" };
    shortlistConfig.onRowPrepared({
        rowType: "data",
        data: { isRecommended: true },
        rowElement: rowElement
    });

    assert.deepEqual(addClassCalls, [{
        element: rowElement,
        className: "procedures-shortlist-row--recommended"
    }]);
});

test("procedures grids: creates procedures registry grid and uses external callbacks", () => {
    const registry = new Map();
    const addClassCalls = [];
    const jQueryStub = createJQueryStub(registry, addClassCalls);
    const proceduresElement = { id: "procedures-grid" };
    const callbackLog = [];

    proceduresGridsModule.createProceduresGrid({
        jQuery: jQueryStub,
        element: proceduresElement,
        store: { id: "store" },
        columns: [{ dataField: "status" }],
        urlFilterState: {
            searchText: "онбординг",
            statusFilter: [["status", "anyof", ["OnApproval"]]]
        },
        onEditorPreparing: function () {
            callbackLog.push("editor");
        },
        onSelectionChanged: function () {
            callbackLog.push("selection");
        },
        onToolbarPreparing: function () {
            callbackLog.push("toolbar");
        },
        onDataErrorOccurred: function () {
            callbackLog.push("error");
        }
    });

    const config = registry.get(proceduresElement).config;

    assert.equal(config.searchPanel.text, "онбординг");
    assert.deepEqual(config.filterValue, [["status", "anyof", ["OnApproval"]]]);
    assert.equal(config.editing.mode, "popup");
    assert.equal(config.editing.form.items.length > 10, true);

    config.onEditorPreparing({});
    config.onSelectionChanged({});
    config.onToolbarPreparing({});
    config.onDataErrorOccurred({});

    assert.deepEqual(callbackLog, ["editor", "selection", "toolbar", "error"]);
    assert.deepEqual(addClassCalls, []);
});
