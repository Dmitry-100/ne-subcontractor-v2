"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractorsActionsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-actions.js"));

function createControl(initialValue) {
    return {
        value: initialValue || "",
        handlers: {},
        addEventListener: function (eventName, handler) {
            this.handlers[eventName] = handler;
        }
    };
}

function createControls() {
    return {
        refreshButton: createControl(),
        recalcAllButton: createControl(),
        recalcSelectedButton: createControl(),
        reloadModelButton: createControl(),
        saveModelButton: createControl(),
        manualSaveButton: createControl(),
        manualScoreInput: createControl(""),
        manualCommentInput: createControl("")
    };
}

function createOperations(overrides) {
    return Object.assign({
        refreshContractorsAndReselect: async function () {},
        loadAnalytics: async function () {},
        loadHistory: async function () {},
        loadModel: async function () {},
        buildModelPayload: function () { return { versionCode: "R-1" }; },
        fillModelForm: function () {}
    }, overrides || {});
}

function createUiStateRecorder() {
    const calls = [];
    return {
        calls: calls,
        setUiBusy: function (value) {
            calls.push({ method: "setUiBusy", value: value });
        },
        setRatingStatus: function (message, isError) {
            calls.push({ method: "setRatingStatus", message: message, isError: isError });
        }
    };
}

test("contractors actions: validates required dependencies", () => {
    assert.throws(function () {
        contractorsActionsModule.createActions({});
    }, /refreshButton/i);

    assert.throws(function () {
        contractorsActionsModule.createActions({
            controls: createControls(),
            operations: createOperations(),
            contractorsHelpers: {},
            apiClient: {},
            uiState: {},
            getSelectedContractor: null
        });
    }, /getSelectedContractor/i);
});

test("contractors actions: manual save validates score range before API call", async () => {
    const controls = createControls();
    controls.manualScoreInput.value = "12";
    controls.manualCommentInput.value = "comment";

    let saveCalls = 0;
    const uiState = createUiStateRecorder();
    const actions = contractorsActionsModule.createActions({
        controls: controls,
        operations: createOperations(),
        apiClient: {
            recalculateRatings: async function () { return {}; },
            updateRatingModel: async function () { return { versionCode: "R-1" }; },
            saveManualAssessment: async function () {
                saveCalls += 1;
            }
        },
        contractorsHelpers: {
            parseNumber: function (value, fallback) {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : fallback;
            },
            normalizeOptionalText: function (value) {
                const text = String(value || "").trim();
                return text.length > 0 ? text : null;
            }
        },
        uiState: uiState,
        getSelectedContractor: function () {
            return { id: "ctr-1" };
        }
    });

    await actions.handleManualSaveClick();
    assert.equal(saveCalls, 0);
    const lastStatus = uiState.calls.find(function (entry) {
        return entry.method === "setRatingStatus";
    });
    assert.equal(lastStatus.message, "Оценка ГИПа должна быть в диапазоне от 0 до 5.");
    assert.equal(lastStatus.isError, true);
});

test("contractors actions: recalculate selected calls API and refresh operations", async () => {
    const calls = [];
    const uiState = createUiStateRecorder();
    const selected = { id: "ctr-9" };

    const actions = contractorsActionsModule.createActions({
        controls: createControls(),
        operations: createOperations({
            refreshContractorsAndReselect: async function (id) { calls.push(`refresh:${id}`); },
            loadAnalytics: async function () { calls.push("analytics"); },
            loadHistory: async function (id) { calls.push(`history:${id}`); }
        }),
        apiClient: {
            recalculateRatings: async function (payload) {
                calls.push(`recalculate:${payload.contractorId}`);
                return {
                    processedContractors: 1,
                    updatedContractors: 1
                };
            },
            updateRatingModel: async function () { return { versionCode: "R-1" }; },
            saveManualAssessment: async function () {}
        },
        contractorsHelpers: {
            parseNumber: function () { return Number.NaN; },
            normalizeOptionalText: function () { return null; }
        },
        uiState: uiState,
        getSelectedContractor: function () {
            return selected;
        }
    });

    await actions.handleRecalculateSelectedClick();
    assert.deepEqual(calls, [
        "recalculate:ctr-9",
        "refresh:ctr-9",
        "analytics",
        "history:ctr-9"
    ]);
    assert.equal(uiState.calls[0].method, "setUiBusy");
    assert.equal(uiState.calls[0].value, true);
    assert.equal(uiState.calls[uiState.calls.length - 1].method, "setUiBusy");
    assert.equal(uiState.calls[uiState.calls.length - 1].value, false);
});

test("contractors actions: bindEvents wires click handlers to all controls", () => {
    const controls = createControls();
    const actions = contractorsActionsModule.createActions({
        controls: controls,
        operations: createOperations(),
        apiClient: {
            recalculateRatings: async function () { return {}; },
            updateRatingModel: async function () { return { versionCode: "R-1" }; },
            saveManualAssessment: async function () {}
        },
        contractorsHelpers: {
            parseNumber: function () { return 1; },
            normalizeOptionalText: function () { return null; }
        },
        uiState: createUiStateRecorder(),
        getSelectedContractor: function () {
            return null;
        }
    });

    actions.bindEvents();
    assert.equal(typeof controls.refreshButton.handlers.click, "function");
    assert.equal(typeof controls.recalcAllButton.handlers.click, "function");
    assert.equal(typeof controls.recalcSelectedButton.handlers.click, "function");
    assert.equal(typeof controls.reloadModelButton.handlers.click, "function");
    assert.equal(typeof controls.saveModelButton.handlers.click, "function");
    assert.equal(typeof controls.manualSaveButton.handlers.click, "function");
});
