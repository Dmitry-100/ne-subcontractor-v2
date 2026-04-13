"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const shortlistModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-shortlist.js"));

function createControl() {
    const listeners = new Map();
    return {
        disabled: false,
        value: "",
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

function createGrid() {
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
        maxIncludedInput: createControl(),
        adjustmentReasonInput: createControl(),
        buildButton: createControl(),
        applyButton: createControl(),
        adjustmentsRefreshButton: createControl()
    };
    controls.maxIncludedInput.value = "5";
    controls.adjustmentReasonInput.value = "Автоподбор списка кандидатов";

    const shortlistGrid = createGrid();
    const shortlistAdjustmentsGrid = createGrid();

    const state = {
        selectedProcedure: null
    };
    const calls = {
        shortlistStatus: [],
        shortlistAdjustmentsStatus: [],
        recommendationsRequests: [],
        adjustmentsRequests: [],
        applyRequests: []
    };

    const options = {
        maxIncludedInput: controls.maxIncludedInput,
        adjustmentReasonInput: controls.adjustmentReasonInput,
        buildButton: controls.buildButton,
        applyButton: controls.applyButton,
        adjustmentsRefreshButton: controls.adjustmentsRefreshButton,
        shortlistGrid: shortlistGrid,
        shortlistAdjustmentsGrid: shortlistAdjustmentsGrid,
        endpoint: "/api/procedures",
        apiClient: {
            getShortlistRecommendations: async function (endpoint, procedureId) {
                calls.recommendationsRequests.push({ endpoint: endpoint, procedureId: procedureId });
                return [{ contractorId: "c-1", isRecommended: true }];
            },
            getShortlistAdjustments: async function (endpoint, procedureId) {
                calls.adjustmentsRequests.push({ endpoint: endpoint, procedureId: procedureId });
                return [{ id: "adj-1" }];
            },
            applyShortlistRecommendations: async function (endpoint, procedureId, payload) {
                calls.applyRequests.push({ endpoint: endpoint, procedureId: procedureId, payload: payload });
                return { appliedCount: 1, skippedCount: 0 };
            }
        },
        workflow: {
            buildRecommendationsStatus: function (items) {
                return `Рекомендаций: ${Array.isArray(items) ? items.length : 0}.`;
            },
            buildApplyResultStatus: function () {
                return "Рекомендации применены.";
            }
        },
        getSelectedProcedure: function () {
            return state.selectedProcedure;
        },
        supportsShortlistWorkspace: function (procedure) {
            return Boolean(procedure) && procedure.status !== "Completed" && procedure.status !== "Canceled";
        },
        normalizeMaxIncluded: function (value) {
            const numeric = Number.parseInt(value, 10);
            return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
        },
        normalizeAdjustmentReason: function (value) {
            const text = String(value || "").trim();
            return text.length > 0 ? text : "Автоподбор списка кандидатов";
        },
        setShortlistStatus: function (message, isError) {
            calls.shortlistStatus.push({ message: message, isError: isError });
        },
        setShortlistAdjustmentsStatus: function (message, isError) {
            calls.shortlistAdjustmentsStatus.push({ message: message, isError: isError });
        }
    };

    return {
        controls: controls,
        shortlistGrid: shortlistGrid,
        shortlistAdjustmentsGrid: shortlistAdjustmentsGrid,
        state: state,
        calls: calls,
        options: Object.assign(options, overrides || {})
    };
}

test("procedures shortlist: validates required dependencies", () => {
    assert.throws(
        function () {
            shortlistModule.createShortlistWorkspace({});
        },
        /required controls are missing/);
});

test("procedures shortlist: null selection resets data and statuses", async () => {
    const setup = createBaseSetup();
    const workspace = shortlistModule.createShortlistWorkspace(setup.options);

    await workspace.onSelectionChanged(null);

    assert.deepEqual(setup.shortlistGrid.calls.at(-1), { key: "dataSource", value: [] });
    assert.deepEqual(setup.shortlistAdjustmentsGrid.calls.at(-1), { key: "dataSource", value: [] });
    assert.deepEqual(setup.calls.shortlistStatus.at(-1), {
        message: "Рекомендации ещё не сформированы.",
        isError: false
    });
    assert.deepEqual(setup.calls.shortlistAdjustmentsStatus.at(-1), {
        message: "Журнал корректировок пока не загружен.",
        isError: false
    });
});

test("procedures shortlist: selection change loads adjustments for supported procedure", async () => {
    const setup = createBaseSetup();
    const workspace = shortlistModule.createShortlistWorkspace(setup.options);
    const procedure = { id: "proc-1", status: "Sent" };
    setup.state.selectedProcedure = procedure;

    await workspace.onSelectionChanged(procedure);

    assert.deepEqual(setup.calls.adjustmentsRequests, [{
        endpoint: "/api/procedures",
        procedureId: "proc-1"
    }]);
    assert.deepEqual(setup.calls.shortlistAdjustmentsStatus.at(-1), {
        message: "Записей в журнале: 1.",
        isError: false
    });
});

test("procedures shortlist: build/apply handlers execute API calls and normalize values", async () => {
    const setup = createBaseSetup();
    const workspace = shortlistModule.createShortlistWorkspace(setup.options);
    const procedure = { id: "proc-2", status: "OnApproval" };
    setup.state.selectedProcedure = procedure;
    setup.controls.maxIncludedInput.value = "0";
    setup.controls.adjustmentReasonInput.value = "   ";

    await workspace.onBuildClick();
    await workspace.onApplyClick();

    assert.deepEqual(setup.calls.recommendationsRequests.at(-1), {
        endpoint: "/api/procedures",
        procedureId: "proc-2"
    });
    assert.deepEqual(setup.calls.applyRequests.at(-1), {
        endpoint: "/api/procedures",
        procedureId: "proc-2",
        payload: {
            maxIncluded: 1,
            adjustmentReason: "Автоподбор списка кандидатов"
        }
    });
    assert.equal(setup.controls.maxIncludedInput.value, "1");
    assert.equal(setup.calls.shortlistStatus.some(function (item) {
        return item.message === "Рекомендации применены." && item.isError === false;
    }), true);
});

test("procedures shortlist: bindEvents wires controls to handlers", async () => {
    const setup = createBaseSetup();
    const workspace = shortlistModule.createShortlistWorkspace(setup.options);
    const procedure = { id: "proc-3", status: "DocumentsPreparation" };
    setup.state.selectedProcedure = procedure;
    setup.controls.maxIncludedInput.value = "-5";

    workspace.bindEvents();

    await setup.controls.maxIncludedInput.emit("change");
    await setup.controls.buildButton.emit("click");
    await setup.controls.applyButton.emit("click");
    await setup.controls.adjustmentsRefreshButton.emit("click");

    assert.equal(setup.controls.maxIncludedInput.value, "1");
    assert.equal(setup.calls.recommendationsRequests.length >= 1, true);
    assert.equal(setup.calls.applyRequests.length >= 1, true);
    assert.equal(setup.calls.adjustmentsRequests.length >= 1, true);
});
