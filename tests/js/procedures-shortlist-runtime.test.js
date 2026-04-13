"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-shortlist-runtime.js"));

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
            if (typeof handler === "function") {
                return await handler(event || {});
            }

            return null;
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

function createSetup(overrides) {
    const maxIncludedInput = createControl();
    const adjustmentReasonInput = createControl();
    const buildButton = createControl();
    const applyButton = createControl();
    const adjustmentsRefreshButton = createControl();
    maxIncludedInput.value = "5";
    adjustmentReasonInput.value = "Автоподбор";

    const shortlistGrid = createGrid();
    const shortlistAdjustmentsGrid = createGrid();

    const calls = {
        status: [],
        adjustmentsStatus: [],
        recommendations: [],
        adjustments: [],
        apply: []
    };

    const state = { selectedProcedure: null };
    const settings = {
        maxIncludedInput: maxIncludedInput,
        adjustmentReasonInput: adjustmentReasonInput,
        buildButton: buildButton,
        applyButton: applyButton,
        adjustmentsRefreshButton: adjustmentsRefreshButton,
        shortlistGrid: shortlistGrid,
        shortlistAdjustmentsGrid: shortlistAdjustmentsGrid,
        endpoint: "/api/procedures",
        apiClient: {
            getShortlistRecommendations: async function (endpoint, procedureId) {
                calls.recommendations.push({ endpoint: endpoint, procedureId: procedureId });
                return [{ contractorId: "c-1", isRecommended: true }];
            },
            getShortlistAdjustments: async function (endpoint, procedureId) {
                calls.adjustments.push({ endpoint: endpoint, procedureId: procedureId });
                return [{ id: "adj-1" }];
            },
            applyShortlistRecommendations: async function (endpoint, procedureId, payload) {
                calls.apply.push({ endpoint: endpoint, procedureId: procedureId, payload: payload });
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
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        },
        normalizeAdjustmentReason: function (value) {
            const normalized = String(value || "").trim();
            return normalized || "Автоподбор списка кандидатов";
        },
        setShortlistStatus: function (message, isError) {
            calls.status.push({ message: message, isError: isError });
        },
        setShortlistAdjustmentsStatus: function (message, isError) {
            calls.adjustmentsStatus.push({ message: message, isError: isError });
        }
    };

    return {
        controls: {
            maxIncludedInput: maxIncludedInput,
            adjustmentReasonInput: adjustmentReasonInput,
            buildButton: buildButton,
            applyButton: applyButton,
            adjustmentsRefreshButton: adjustmentsRefreshButton
        },
        grids: {
            shortlistGrid: shortlistGrid,
            shortlistAdjustmentsGrid: shortlistAdjustmentsGrid
        },
        state: state,
        calls: calls,
        settings: Object.assign(settings, overrides || {})
    };
}

test("procedures shortlist runtime: null selection resets grids and statuses", async () => {
    const setup = createSetup();
    const runtime = runtimeModule.createShortlistWorkspaceRuntime(setup.settings);

    await runtime.onSelectionChanged(null);

    assert.deepEqual(setup.grids.shortlistGrid.calls.at(-1), { key: "dataSource", value: [] });
    assert.deepEqual(setup.grids.shortlistAdjustmentsGrid.calls.at(-1), { key: "dataSource", value: [] });
    assert.deepEqual(setup.calls.status.at(-1), {
        message: "Рекомендации ещё не сформированы.",
        isError: false
    });
    assert.deepEqual(setup.calls.adjustmentsStatus.at(-1), {
        message: "Журнал корректировок пока не загружен.",
        isError: false
    });
});

test("procedures shortlist runtime: apply click normalizes payload and refreshes data", async () => {
    const setup = createSetup();
    const runtime = runtimeModule.createShortlistWorkspaceRuntime(setup.settings);
    setup.state.selectedProcedure = { id: "proc-7", status: "OnApproval" };
    setup.controls.maxIncludedInput.value = "0";
    setup.controls.adjustmentReasonInput.value = " ";

    await runtime.onApplyClick();

    assert.equal(setup.controls.maxIncludedInput.value, "1");
    assert.deepEqual(setup.calls.apply.at(-1), {
        endpoint: "/api/procedures",
        procedureId: "proc-7",
        payload: {
            maxIncluded: 1,
            adjustmentReason: "Автоподбор списка кандидатов"
        }
    });
    assert.equal(setup.calls.recommendations.length >= 1, true);
    assert.equal(setup.calls.adjustments.length >= 1, true);
    assert.equal(setup.calls.status.some(function (item) {
        return item.message === "Рекомендации применены." && item.isError === false;
    }), true);
});
