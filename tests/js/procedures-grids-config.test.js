"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const gridsConfigModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grids-config.js"));

test("procedures grids config: validates required options", () => {
    assert.throws(function () {
        gridsConfigModule.buildHistoryGridConfig({});
    }, /'columns' array/i);

    assert.throws(function () {
        gridsConfigModule.buildShortlistGridConfig({
            columns: []
        });
    }, /'jQueryFactory' callback/i);

    assert.throws(function () {
        gridsConfigModule.buildProceduresGridConfig({
            store: {},
            columns: [],
            onEditorPreparing: function () {},
            onSelectionChanged: function () {},
            onToolbarPreparing: function () {}
        });
    }, /onDataErrorOccurred/i);
});

test("procedures grids config: builds history and shortlist grids", () => {
    const addClassCalls = [];
    const jQueryFactory = function (element) {
        return {
            addClass: function (className) {
                addClassCalls.push({ element: element, className: className });
            }
        };
    };

    const historyConfig = gridsConfigModule.buildHistoryGridConfig({
        columns: [{ dataField: "toStatus" }]
    });
    const shortlistConfig = gridsConfigModule.buildShortlistGridConfig({
        columns: [{ dataField: "contractorName" }],
        jQueryFactory: jQueryFactory
    });

    assert.equal(historyConfig.height, 320);
    assert.equal(historyConfig.columns[0].dataField, "toStatus");
    assert.equal(shortlistConfig.height, 330);
    assert.equal(shortlistConfig.searchPanel.placeholder, "Поиск по подрядчикам...");

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

test("procedures grids config: builds shortlist adjustments and procedures registry config", () => {
    const callbackLog = [];
    const proceduresConfig = gridsConfigModule.buildProceduresGridConfig({
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

    const shortlistAdjustmentsConfig = gridsConfigModule.buildShortlistAdjustmentsGridConfig({
        columns: [{ dataField: "changedAtUtc" }]
    });

    assert.equal(shortlistAdjustmentsConfig.height, 300);
    assert.equal(shortlistAdjustmentsConfig.columns[0].dataField, "changedAtUtc");
    assert.equal(proceduresConfig.remoteOperations?.paging, true);
    assert.equal(proceduresConfig.searchPanel.text, "онбординг");
    assert.deepEqual(proceduresConfig.filterValue, [["status", "anyof", ["OnApproval"]]]);
    assert.equal(proceduresConfig.editing.mode, "popup");
    assert.equal(proceduresConfig.editing.form.items.length > 10, true);

    proceduresConfig.onEditorPreparing({});
    proceduresConfig.onSelectionChanged({});
    proceduresConfig.onToolbarPreparing({});
    proceduresConfig.onDataErrorOccurred({});

    assert.deepEqual(callbackLog, ["editor", "selection", "toolbar", "error"]);
});
