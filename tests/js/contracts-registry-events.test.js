"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const registryEventsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-registry-events.js"));

test("contracts registry events: validates required dependencies", () => {
    assert.throws(function () {
        registryEventsModule.createEvents({});
    }, /setSelectedContractId/i);
});

test("contracts registry events: selection/editor/error handlers preserve behavior", () => {
    const calls = {
        selectedIds: [],
        selectionChanged: 0,
        statuses: []
    };

    const events = registryEventsModule.createEvents({
        gridState: {
            setSelectedContractId: function (id) {
                calls.selectedIds.push(id);
            }
        },
        onSelectionChanged: function () {
            calls.selectionChanged += 1;
        },
        urlFilterState: {
            hasAny: false
        },
        clearUrlFilters: function () {},
        setStatus: function (message, isError) {
            calls.statuses.push({ message: message, isError: isError });
        },
        getGridInstance: function () {
            return null;
        }
    });

    events.onSelectionChanged({
        selectedRowKeys: ["contract-1"]
    });

    assert.deepEqual(calls.selectedIds, ["contract-1"]);
    assert.equal(calls.selectionChanged, 1);

    const statusEditor = {
        parentType: "dataRow",
        dataField: "status",
        editorOptions: {}
    };
    events.onEditorPreparing(statusEditor);
    assert.equal(statusEditor.editorOptions.readOnly, true);

    const lotEditor = {
        parentType: "dataRow",
        dataField: "lotId",
        row: {
            isNewRow: false
        },
        editorOptions: {}
    };
    events.onEditorPreparing(lotEditor);
    assert.equal(lotEditor.editorOptions.readOnly, true);

    events.onDataErrorOccurred({});
    assert.equal(calls.statuses.at(-1).isError, true);
    assert.match(calls.statuses.at(-1).message, /ошибка операции с данными/i);
});

test("contracts registry events: toolbar adds refresh and clear buttons when URL filters are active", () => {
    let refreshCalls = 0;
    let clearCalls = 0;

    const events = registryEventsModule.createEvents({
        gridState: {
            setSelectedContractId: function () {}
        },
        onSelectionChanged: function () {},
        urlFilterState: {
            hasAny: true
        },
        clearUrlFilters: function () {
            clearCalls += 1;
        },
        setStatus: function () {},
        getGridInstance: function () {
            return {
                refresh: function () {
                    refreshCalls += 1;
                }
            };
        }
    });

    const toolbarEvent = {
        toolbarOptions: {
            items: []
        }
    };
    events.onToolbarPreparing(toolbarEvent);
    assert.equal(toolbarEvent.toolbarOptions.items.length, 2);

    toolbarEvent.toolbarOptions.items[0].options.onClick();
    toolbarEvent.toolbarOptions.items[1].options.onClick();

    assert.equal(refreshCalls, 1);
    assert.equal(clearCalls, 1);
});
