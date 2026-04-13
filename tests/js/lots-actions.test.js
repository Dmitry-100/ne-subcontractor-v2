"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotsActionsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-actions.js"));

function createButtonStub() {
    return {
        listeners: {},
        addEventListener: function (eventName, handler) {
            this.listeners[eventName] = handler;
        }
    };
}

function createBaseOptions(overrides) {
    const selectedLotState = {
        value: { id: "lot-1", status: "Draft" }
    };

    const options = {
        controls: {
            nextButton: createButtonStub(),
            rollbackButton: createButtonStub(),
            historyRefreshButton: createButtonStub()
        },
        helpers: {
            localizeStatus: function (status) {
                if (status === "Draft") {
                    return "Черновик";
                }

                if (status === "InProcurement") {
                    return "В закупке";
                }

                return String(status || "");
            },
            nextStatus: function (status) {
                return status === "Draft" ? "InProcurement" : null;
            },
            previousStatus: function () {
                return "Draft";
            },
            parseTransitionError: function (error) {
                return error?.message || "Ошибка выполнения перехода.";
            }
        },
        operations: {
            getSelectedLot: function () {
                return selectedLotState.value;
            },
            transitionLot: async function () {},
            refreshLotsAndReselect: async function () {},
            loadHistory: async function () {}
        },
        setTransitionStatus: function () {},
        promptImpl: function () {
            return "rollback reason";
        }
    };

    return Object.assign(options, overrides || {});
}

test("lots actions: validates required dependencies", () => {
    assert.throws(function () {
        lotsActionsModule.createActions({});
    }, /transition controls/i);

    assert.throws(function () {
        lotsActionsModule.createActions(createBaseOptions({
            operations: {
                getSelectedLot: function () { return null; },
                transitionLot: async function () {},
                refreshLotsAndReselect: async function () {},
                loadHistory: null
            }
        }));
    }, /operations\.loadHistory/i);
});

test("lots actions: runTransition executes transition and refresh flow", async () => {
    const transitionCalls = [];
    const refreshCalls = [];
    const historyCalls = [];
    const transitionStatuses = [];

    const actions = lotsActionsModule.createActions(createBaseOptions({
        operations: {
            getSelectedLot: function () {
                return { id: "lot-1", status: "Draft" };
            },
            transitionLot: async function (lotId, payload) {
                transitionCalls.push({ lotId: lotId, payload: payload });
            },
            refreshLotsAndReselect: async function (lotId) {
                refreshCalls.push(lotId);
            },
            loadHistory: async function (lotId) {
                historyCalls.push(lotId);
            }
        },
        setTransitionStatus: function (message, isError) {
            transitionStatuses.push({ message: message, isError: isError });
        }
    }));

    await actions.runTransition("InProcurement", null);

    assert.deepEqual(transitionCalls, [{
        lotId: "lot-1",
        payload: {
            targetStatus: "InProcurement",
            reason: null
        }
    }]);
    assert.deepEqual(refreshCalls, ["lot-1"]);
    assert.deepEqual(historyCalls, ["lot-1"]);
    assert.deepEqual(transitionStatuses, [{
        message: "Переход выполнен: Черновик -> В закупке.",
        isError: false
    }]);
});

test("lots actions: rollback handler validates non-empty reason", () => {
    const transitionStatuses = [];
    const transitionCalls = [];
    const options = createBaseOptions({
        operations: {
            getSelectedLot: function () {
                return { id: "lot-1", status: "InProcurement" };
            },
            transitionLot: async function (lotId, payload) {
                transitionCalls.push({ lotId: lotId, payload: payload });
            },
            refreshLotsAndReselect: async function () {},
            loadHistory: async function () {}
        },
        promptImpl: function () {
            return "   ";
        },
        helpers: {
            localizeStatus: function (status) { return status; },
            nextStatus: function () { return null; },
            previousStatus: function () { return "Draft"; },
            parseTransitionError: function (error) { return error?.message || ""; }
        },
        setTransitionStatus: function (message, isError) {
            transitionStatuses.push({ message: message, isError: isError });
        }
    });

    const actions = lotsActionsModule.createActions(options);
    actions.bindEvents();
    options.controls.rollbackButton.listeners.click();

    assert.equal(transitionCalls.length, 0);
    assert.deepEqual(transitionStatuses, [{
        message: "Для отката требуется причина.",
        isError: true
    }]);
});

test("lots actions: history refresh handler reports load errors", async () => {
    const transitionStatuses = [];
    const options = createBaseOptions({
        operations: {
            getSelectedLot: function () {
                return { id: "lot-1", status: "InExecution" };
            },
            transitionLot: async function () {},
            refreshLotsAndReselect: async function () {},
            loadHistory: async function () {
                throw new Error("history-failed");
            }
        },
        setTransitionStatus: function (message, isError) {
            transitionStatuses.push({ message: message, isError: isError });
        }
    });

    const actions = lotsActionsModule.createActions(options);
    actions.bindEvents();
    options.controls.historyRefreshButton.listeners.click();
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(transitionStatuses, [{
        message: "Не удалось обновить историю: history-failed",
        isError: true
    }]);
});
