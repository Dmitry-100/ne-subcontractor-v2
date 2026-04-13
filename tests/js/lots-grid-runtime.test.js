"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-grid-runtime.js"));

function createContext(events) {
    const runtime = {
        createStore: function (dataArg) {
            events.storeDataArg = dataArg;
            return { key: "lots-store" };
        },
        attachGridInstances: function (instances) {
            events.attachedInstances = instances;
        },
        getSelectedLot: function () {
            return { id: "lot-1", status: "Draft" };
        },
        refreshLotsAndReselect: async function () {},
        loadHistory: async function () {},
        applySelection: function (selectedLot) {
            events.selectedLotApplied.push(selectedLot);
        }
    };

    return {
        endpoint: "/api/lots",
        controls: {
            lotsGridElement: { id: "lots-grid" },
            historyGridElement: { id: "history-grid" },
            statusElement: {},
            selectedElement: {},
            transitionStatusElement: {},
            nextButton: {},
            rollbackButton: {},
            historyRefreshButton: {}
        },
        moduleRoots: {
            lotsHelpersRoot: {
                createHelpers: function (options) {
                    events.helperOptions = options;
                    return {
                        localizeStatus: function (value) { return value; },
                        nextStatus: function (status) { return status === "Draft" ? "InProcurement" : null; },
                        previousStatus: function () { return null; },
                        parseTransitionError: function (error) { return error?.message || ""; }
                    };
                }
            },
            lotsApiRoot: {
                createApiClient: function () {
                    return {
                        transitionLot: async function (lotId, payload) {
                            events.transitionLotCalls.push({ lotId: lotId, payload: payload });
                        }
                    };
                }
            },
            lotsGridsRoot: {
                createGrids: function (args) {
                    events.createGridsArgs = args;
                    return {
                        lotsGridInstance: { id: "grid-instance" },
                        historyGridInstance: { id: "history-instance" }
                    };
                }
            },
            lotsDataRoot: {
                createDataRuntime: function () {
                    return runtime;
                }
            },
            lotsActionsRoot: {
                createActions: function (options) {
                    events.actionsOptions = options;
                    return {
                        bindEvents: function () {
                            events.actionsBound = true;
                        }
                    };
                }
            },
            lotsUiStateRoot: {
                createUiState: function () {
                    return {
                        setStatus: function (message, isError) {
                            events.uiSetStatusCalls.push({ message: message, isError: isError });
                        },
                        setTransitionStatus: function () {},
                        updateSelection: function () {}
                    };
                }
            }
        }
    };
}

test("lots grid runtime: validates required dependencies", () => {
    assert.throws(function () {
        runtimeModule.initializeLotsGrid({
            window: {}
        });
    }, /context/i);
});

test("lots grid runtime: composes ui-state, data, grids and actions modules", () => {
    const events = {
        helperOptions: null,
        storeDataArg: null,
        createGridsArgs: null,
        attachedInstances: null,
        selectedLotApplied: [],
        actionsOptions: null,
        actionsBound: false,
        uiSetStatusCalls: [],
        transitionLotCalls: []
    };

    const hostWindow = {
        jQuery: function () {},
        DevExpress: {
            data: {
                CustomStore: function () {}
            }
        }
    };

    const context = createContext(events);

    runtimeModule.initializeLotsGrid({
        window: hostWindow,
        context: context
    });

    assert.deepEqual(events.helperOptions.statusOrder, [
        "Draft",
        "InProcurement",
        "ContractorSelected",
        "Contracted",
        "InExecution",
        "Closed"
    ]);
    assert.equal(events.storeDataArg, hostWindow.DevExpress.data);
    assert.equal(events.createGridsArgs.store.key, "lots-store");
    assert.deepEqual(events.attachedInstances, {
        lotsGridInstance: { id: "grid-instance" },
        historyGridInstance: { id: "history-instance" }
    });
    assert.equal(events.actionsBound, true);
    assert.deepEqual(events.selectedLotApplied, [null]);

    events.createGridsArgs.callbacks.onSelectionChanged({ id: "lot-2" });
    assert.deepEqual(events.selectedLotApplied, [null, { id: "lot-2" }]);

    events.createGridsArgs.callbacks.onDataErrorOccurred({ message: "data error" });
    assert.deepEqual(events.uiSetStatusCalls, [{ message: "data error", isError: true }]);

    events.actionsOptions.operations.transitionLot("lot-77", { targetStatus: "InProcurement", reason: null });
    assert.deepEqual(events.transitionLotCalls, [{
        lotId: "lot-77",
        payload: {
            targetStatus: "InProcurement",
            reason: null
        }
    }]);
});
