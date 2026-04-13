"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const selectionModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-selection.js"));

function createBaseSetup(overrides) {
    const selectedElement = { textContent: "" };
    const shortlistSelectedElement = { textContent: "" };

    const calls = {
        transitionStatuses: [],
        historyResetFallback: 0,
        transitionSelections: [],
        transitionHistoryLoads: [],
        shortlistSelections: []
    };

    const transitionController = {
        onSelectionChanged: function (procedure) {
            calls.transitionSelections.push(procedure);
        },
        loadHistory: async function (procedureId) {
            calls.transitionHistoryLoads.push(procedureId);
        }
    };

    const shortlistWorkspace = {
        onSelectionChanged: async function (procedure) {
            calls.shortlistSelections.push(procedure);
        }
    };

    const options = {
        selectedElement: selectedElement,
        shortlistSelectedElement: shortlistSelectedElement,
        buildProcedureSelectionSummary: function (procedure) {
            if (!procedure) {
                return "Выберите процедуру";
            }

            return `Процедура ${procedure.id}`;
        },
        buildShortlistSelectionSummary: function (procedure) {
            if (!procedure) {
                return "Выберите процедуру для shortlist";
            }

            return `Shortlist ${procedure.id}`;
        },
        setTransitionStatus: function (message, isError) {
            calls.transitionStatuses.push({ message: message, isError: isError });
        },
        onHistoryResetFailed: function () {
            calls.historyResetFallback += 1;
        }
    };

    return {
        selectedElement: selectedElement,
        shortlistSelectedElement: shortlistSelectedElement,
        calls: calls,
        transitionController: transitionController,
        shortlistWorkspace: shortlistWorkspace,
        options: Object.assign(options, overrides || {})
    };
}

test("procedures selection: validates required dependencies", () => {
    assert.throws(
        function () {
            selectionModule.createSelectionController({});
        },
        /required dependencies are missing/);
});

test("procedures selection: validates controller/workspace contracts", () => {
    const setup = createBaseSetup();
    const controller = selectionModule.createSelectionController(setup.options);

    assert.throws(
        function () {
            controller.setTransitionController({});
        },
        /transition controller contract is invalid/);

    assert.throws(
        function () {
            controller.setShortlistWorkspace({});
        },
        /shortlist workspace contract is invalid/);
});

test("procedures selection: applies initial null selection without controller sync", async () => {
    const setup = createBaseSetup();
    const controller = selectionModule.createSelectionController(setup.options);
    controller.setTransitionController(setup.transitionController);
    controller.setShortlistWorkspace(setup.shortlistWorkspace);

    await controller.applySelection(null);

    assert.equal(controller.getSelectedProcedure(), null);
    assert.equal(setup.selectedElement.textContent, "Выберите процедуру");
    assert.equal(setup.shortlistSelectedElement.textContent, "Выберите процедуру для shortlist");
    assert.deepEqual(setup.calls.transitionSelections, []);
    assert.deepEqual(setup.calls.transitionHistoryLoads, []);
    assert.deepEqual(setup.calls.shortlistSelections, []);
});

test("procedures selection: applies selected procedure and loads transition history", async () => {
    const setup = createBaseSetup();
    const controller = selectionModule.createSelectionController(setup.options);
    controller.setTransitionController(setup.transitionController);
    controller.setShortlistWorkspace(setup.shortlistWorkspace);
    const procedure = { id: "p-1", status: "Created" };

    await controller.applySelection(procedure);

    assert.deepEqual(controller.getSelectedProcedure(), procedure);
    assert.equal(setup.selectedElement.textContent, "Процедура p-1");
    assert.equal(setup.shortlistSelectedElement.textContent, "Shortlist p-1");
    assert.deepEqual(setup.calls.transitionSelections, [procedure]);
    assert.deepEqual(setup.calls.transitionHistoryLoads, ["p-1"]);
    assert.deepEqual(setup.calls.shortlistSelections, [procedure]);
});

test("procedures selection: reports history load error for selected procedure", async () => {
    const setup = createBaseSetup();
    setup.transitionController.loadHistory = async function () {
        throw new Error("history failed");
    };
    const controller = selectionModule.createSelectionController(setup.options);
    controller.setTransitionController(setup.transitionController);
    controller.setShortlistWorkspace(setup.shortlistWorkspace);

    await controller.applySelection({ id: "p-2", status: "Created" });

    assert.deepEqual(setup.calls.transitionStatuses, [{
        message: "Не удалось загрузить историю статусов: history failed",
        isError: true
    }]);
});

test("procedures selection: invokes reset fallback when null-history load fails", async () => {
    const setup = createBaseSetup();
    setup.transitionController.loadHistory = async function (procedureId) {
        if (!procedureId) {
            throw new Error("reset failed");
        }
    };
    const controller = selectionModule.createSelectionController(setup.options);
    controller.setTransitionController(setup.transitionController);
    controller.setShortlistWorkspace(setup.shortlistWorkspace);

    await controller.applySelection({ id: "p-3", status: "Sent" });
    await controller.applySelection(null);

    assert.equal(setup.calls.historyResetFallback, 1);
    assert.deepEqual(setup.calls.transitionStatuses, []);
});

test("procedures selection: syncs transition and shortlist in parallel", async () => {
    const setup = createBaseSetup();
    const callOrder = [];

    setup.transitionController.loadHistory = function (procedureId) {
        callOrder.push(`transition:start:${procedureId}`);
        return new Promise(function (resolve) {
            setTimeout(function () {
                callOrder.push(`transition:finish:${procedureId}`);
                resolve();
            }, 15);
        });
    };

    setup.shortlistWorkspace.onSelectionChanged = function (procedure) {
        const procedureId = procedure ? procedure.id : "null";
        callOrder.push(`shortlist:start:${procedureId}`);
        return new Promise(function (resolve) {
            setTimeout(function () {
                callOrder.push(`shortlist:finish:${procedureId}`);
                resolve();
            }, 1);
        });
    };

    const controller = selectionModule.createSelectionController(setup.options);
    controller.setTransitionController(setup.transitionController);
    controller.setShortlistWorkspace(setup.shortlistWorkspace);

    await controller.applySelection({ id: "p-parallel", status: "Created" });

    const shortlistStartIndex = callOrder.indexOf("shortlist:start:p-parallel");
    const transitionFinishIndex = callOrder.indexOf("transition:finish:p-parallel");
    assert.ok(shortlistStartIndex >= 0);
    assert.ok(transitionFinishIndex >= 0);
    assert.ok(shortlistStartIndex < transitionFinishIndex);
});
