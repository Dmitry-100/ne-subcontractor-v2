"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const manualModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-actions-manual.js"));

function createControls(scoreValue, commentValue) {
    return {
        manualScoreInput: { value: scoreValue || "" },
        manualCommentInput: { value: commentValue || "" }
    };
}

function createOperations(overrides) {
    return Object.assign({
        refreshContractorsAndReselect: async function () {},
        loadAnalytics: async function () {},
        loadHistory: async function () {}
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

test("contractors actions manual: validates required controls and dependencies", () => {
    assert.throws(function () {
        manualModule.createManualHandlers({});
    }, /manualScoreInput/i);

    assert.throws(function () {
        manualModule.createManualHandlers({
            controls: createControls(),
            operations: createOperations(),
            uiState: createUiStateRecorder(),
            apiClient: {
                saveManualAssessment: async function () {}
            },
            contractorsHelpers: {
                parseNumber: function () { return 1; },
                normalizeOptionalText: function () { return null; }
            },
            getSelectedContractor: null
        });
    }, /getSelectedContractor/i);
});

test("contractors actions manual: validates score bounds before API call", async () => {
    const uiState = createUiStateRecorder();
    let saveCalls = 0;
    const handlers = manualModule.createManualHandlers({
        controls: createControls("9", "  reason  "),
        operations: createOperations(),
        uiState: uiState,
        apiClient: {
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
                return value;
            }
        },
        getSelectedContractor: function () {
            return { id: "ctr-5" };
        }
    });

    await handlers.handleManualSaveClick();
    assert.equal(saveCalls, 0);

    const errorStatus = uiState.calls.find(function (entry) {
        return entry.method === "setRatingStatus";
    });
    assert.equal(errorStatus.message, "Оценка ГИПа должна быть в диапазоне от 0 до 5.");
    assert.equal(errorStatus.isError, true);
});

test("contractors actions manual: saves manual assessment and refreshes dependent views", async () => {
    const calls = [];

    const handlers = manualModule.createManualHandlers({
        controls: createControls("4.5", "  ok  "),
        operations: createOperations({
            refreshContractorsAndReselect: async function (id) { calls.push(`refresh:${id}`); },
            loadAnalytics: async function () { calls.push("analytics"); },
            loadHistory: async function (id) { calls.push(`history:${id}`); }
        }),
        uiState: createUiStateRecorder(),
        apiClient: {
            saveManualAssessment: async function (id, payload) {
                calls.push(`save:${id}:${payload.score}:${payload.comment}`);
            }
        },
        contractorsHelpers: {
            parseNumber: function (value, fallback) {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : fallback;
            },
            normalizeOptionalText: function (value) {
                return String(value || "").trim();
            }
        },
        getSelectedContractor: function () {
            return { id: "ctr-5" };
        }
    });

    await handlers.handleManualSaveClick();
    assert.deepEqual(calls, [
        "save:ctr-5:4.5:ok",
        "refresh:ctr-5",
        "analytics",
        "history:ctr-5"
    ]);
});
