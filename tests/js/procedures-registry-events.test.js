"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const proceduresRegistryEventsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-registry-events.js"));

test("procedures registry events: validates required callbacks", () => {
    assert.throws(function () {
        proceduresRegistryEventsModule.createGridCallbacks({});
    }, /getGridInstance/i);
});

test("procedures registry events: editor and data-error callbacks keep existing behavior", () => {
    const statusLog = [];
    const callbacks = proceduresRegistryEventsModule.createGridCallbacks({
        getGridInstance: function () {
            return null;
        },
        hasAnyUrlFilter: false,
        clearUrlFilters: function () { },
        applySelection: async function () { },
        setTransitionStatus: function () { },
        setStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        }
    });

    const editorEvent = {
        parentType: "dataRow",
        dataField: "lotId",
        row: { isNewRow: false },
        editorOptions: {}
    };
    callbacks.onEditorPreparing(editorEvent);
    assert.equal(editorEvent.editorOptions.readOnly, true);

    callbacks.onDataErrorOccurred({});
    assert.deepEqual(statusLog, [{
        message: "Ошибка операции с данными.",
        isError: true
    }]);
});

test("procedures registry events: selection callback applies selected row and reports errors", async () => {
    const applied = [];
    const transitionErrors = [];
    const callbacks = proceduresRegistryEventsModule.createGridCallbacks({
        getGridInstance: function () {
            return null;
        },
        hasAnyUrlFilter: false,
        clearUrlFilters: function () { },
        applySelection: async function (selected) {
            applied.push(selected);
        },
        setTransitionStatus: function (message, isError) {
            transitionErrors.push({ message: message, isError: isError });
        },
        setStatus: function () { }
    });

    callbacks.onSelectionChanged({
        selectedRowsData: [{ id: "p1", objectName: "Процедура 1" }]
    });

    await new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });
    assert.deepEqual(applied, [{ id: "p1", objectName: "Процедура 1" }]);
    assert.equal(transitionErrors.length, 0);

    const callbacksWithError = proceduresRegistryEventsModule.createGridCallbacks({
        getGridInstance: function () {
            return null;
        },
        hasAnyUrlFilter: false,
        clearUrlFilters: function () { },
        applySelection: async function () {
            throw new Error("selection failed");
        },
        setTransitionStatus: function (message, isError) {
            transitionErrors.push({ message: message, isError: isError });
        },
        setStatus: function () { }
    });

    callbacksWithError.onSelectionChanged({
        selectedRowsData: []
    });
    await new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });

    assert.equal(transitionErrors.at(-1).isError, true);
    assert.match(transitionErrors.at(-1).message, /selection failed/i);
});

test("procedures registry events: toolbar callback wires refresh and clear-url actions", () => {
    let refreshCalls = 0;
    let clearCalls = 0;
    const callbacks = proceduresRegistryEventsModule.createGridCallbacks({
        getGridInstance: function () {
            return {
                refresh: function () {
                    refreshCalls += 1;
                }
            };
        },
        hasAnyUrlFilter: true,
        clearUrlFilters: function () {
            clearCalls += 1;
        },
        applySelection: async function () { },
        setTransitionStatus: function () { },
        setStatus: function () { }
    });

    const event = {
        toolbarOptions: {
            items: []
        }
    };
    callbacks.onToolbarPreparing(event);

    assert.equal(event.toolbarOptions.items.length, 2);
    event.toolbarOptions.items[0].options.onClick();
    event.toolbarOptions.items[1].options.onClick();

    assert.equal(refreshCalls, 1);
    assert.equal(clearCalls, 1);
});
