"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const transitionModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-transition.js"));

function createButtonControl() {
    const listeners = new Map();
    return {
        disabled: false,
        addEventListener: function (type, handler) {
            listeners.set(type, handler);
        },
        emit: async function (type, event) {
            const handler = listeners.get(type);
            if (typeof handler !== "function") {
                throw new Error(`No handler for event "${type}".`);
            }

            return await handler(event || {});
        }
    };
}

function createValueControl(initialValue) {
    return {
        value: initialValue || ""
    };
}

function createSelectControl() {
    const options = [];
    return {
        innerHTML: "",
        disabled: false,
        value: "",
        options: options,
        appendChild: function (option) {
            options.push(option);
        }
    };
}

function createHistoryGrid() {
    const calls = [];
    return {
        calls: calls,
        option: function (key, value) {
            calls.push({ key: key, value: value });
        }
    };
}

function createBaseSetup(overrides) {
    const controls = {
        targetSelect: createSelectControl(),
        reasonInput: createValueControl("reason"),
        applyButton: createButtonControl(),
        historyRefreshButton: createButtonControl()
    };
    const historyGrid = createHistoryGrid();

    const state = {
        selectedProcedure: null
    };
    const calls = {
        historyRequests: [],
        transitionRequests: [],
        transitionStatuses: [],
        refreshRequests: []
    };

    const options = {
        targetSelect: controls.targetSelect,
        reasonInput: controls.reasonInput,
        applyButton: controls.applyButton,
        historyRefreshButton: controls.historyRefreshButton,
        historyGrid: historyGrid,
        endpoint: "/api/procedures",
        apiClient: {
            getProcedureHistory: async function (endpoint, procedureId) {
                calls.historyRequests.push({ endpoint: endpoint, procedureId: procedureId });
                return [{ id: "h-1" }];
            },
            transitionProcedure: async function (endpoint, procedureId, payload) {
                calls.transitionRequests.push({ endpoint: endpoint, procedureId: procedureId, payload: payload });
            }
        },
        transitionMap: {
            Created: ["DocumentsPreparation", "Canceled"],
            Completed: []
        },
        localizeStatus: function (status) {
            return `Статус:${status}`;
        },
        validateTransitionRequest: function (procedure, targetStatus, reason) {
            return {
                isValid: true,
                payload: {
                    fromStatus: procedure.status,
                    targetStatus: targetStatus,
                    reason: reason
                }
            };
        },
        buildTransitionSuccessMessage: function (fromStatus, toStatus) {
            return `Переход ${fromStatus} -> ${toStatus}`;
        },
        getSelectedProcedure: function () {
            return state.selectedProcedure;
        },
        setTransitionStatus: function (message, isError) {
            calls.transitionStatuses.push({ message: message, isError: isError });
        },
        refreshGridAndReselect: async function (procedureId) {
            calls.refreshRequests.push(procedureId);
        },
        createOption: function (value, text) {
            return {
                value: value,
                textContent: text
            };
        }
    };

    return {
        controls: controls,
        historyGrid: historyGrid,
        state: state,
        calls: calls,
        options: Object.assign(options, overrides || {})
    };
}

test("procedures transition: validates required dependencies", () => {
    assert.throws(
        function () {
            transitionModule.createTransitionController({});
        },
        /required controls are missing/);
});

test("procedures transition: selection clears targets for null procedure", () => {
    const setup = createBaseSetup();
    const controller = transitionModule.createTransitionController(setup.options);

    controller.onSelectionChanged(null);

    assert.equal(setup.controls.targetSelect.disabled, true);
    assert.equal(setup.controls.applyButton.disabled, true);
    assert.equal(setup.controls.historyRefreshButton.disabled, true);
    assert.equal(setup.controls.targetSelect.options.length, 0);
});

test("procedures transition: selection renders localized targets", () => {
    const setup = createBaseSetup();
    const controller = transitionModule.createTransitionController(setup.options);

    controller.onSelectionChanged({ id: "p-1", status: "Created" });

    assert.equal(setup.controls.targetSelect.disabled, false);
    assert.equal(setup.controls.applyButton.disabled, false);
    assert.equal(setup.controls.historyRefreshButton.disabled, false);
    assert.equal(setup.controls.targetSelect.options.length, 2);
    assert.deepEqual(setup.controls.targetSelect.options[0], {
        value: "DocumentsPreparation",
        textContent: "Статус:DocumentsPreparation"
    });
});

test("procedures transition: loadHistory resets grid for empty id", async () => {
    const setup = createBaseSetup();
    const controller = transitionModule.createTransitionController(setup.options);

    await controller.loadHistory(null);

    assert.deepEqual(setup.historyGrid.calls, [{
        key: "dataSource",
        value: []
    }]);
    assert.deepEqual(setup.calls.historyRequests, []);
});

test("procedures transition: apply click validates and performs transition flow", async () => {
    const setup = createBaseSetup();
    const controller = transitionModule.createTransitionController(setup.options);
    setup.state.selectedProcedure = { id: "p-2", status: "Created" };
    controller.onSelectionChanged(setup.state.selectedProcedure);
    setup.controls.targetSelect.value = "DocumentsPreparation";
    setup.controls.reasonInput.value = "Go";

    await controller.onApplyClick();

    assert.deepEqual(setup.calls.transitionRequests, [{
        endpoint: "/api/procedures",
        procedureId: "p-2",
        payload: {
            fromStatus: "Created",
            targetStatus: "DocumentsPreparation",
            reason: "Go"
        }
    }]);
    assert.deepEqual(setup.calls.refreshRequests, ["p-2"]);
    assert.deepEqual(setup.calls.historyRequests, [{
        endpoint: "/api/procedures",
        procedureId: "p-2"
    }]);
    assert.deepEqual(setup.calls.transitionStatuses[0], {
        message: "Переход Created -> DocumentsPreparation",
        isError: false
    });
    assert.equal(setup.controls.reasonInput.value, "");
});

test("procedures transition: apply click reports validation error", async () => {
    const setup = createBaseSetup({
        validateTransitionRequest: function () {
            return {
                isValid: false,
                errorMessage: "Причина обязательна."
            };
        }
    });
    const controller = transitionModule.createTransitionController(setup.options);
    setup.state.selectedProcedure = { id: "p-3", status: "Created" };

    await controller.onApplyClick();

    assert.deepEqual(setup.calls.transitionRequests, []);
    assert.deepEqual(setup.calls.transitionStatuses, [{
        message: "Причина обязательна.",
        isError: true
    }]);
});

test("procedures transition: bindEvents wires apply and history handlers", async () => {
    const setup = createBaseSetup();
    const controller = transitionModule.createTransitionController(setup.options);
    setup.state.selectedProcedure = { id: "p-4", status: "Created" };
    controller.onSelectionChanged(setup.state.selectedProcedure);
    controller.bindEvents();

    await setup.controls.applyButton.emit("click");
    await setup.controls.historyRefreshButton.emit("click");

    assert.equal(setup.calls.transitionRequests.length >= 1, true);
    assert.equal(setup.calls.historyRequests.length >= 2, true);
    assert.equal(setup.calls.transitionStatuses.some(function (item) {
        return item.message === "История обновлена." && item.isError === false;
    }), true);
});
