"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modelModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-actions-model.js"));

function createOperations(overrides) {
    return Object.assign({
        loadModel: async function () {},
        buildModelPayload: function () { return { versionCode: "R-2" }; },
        fillModelForm: function () {},
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

test("contractors actions model: validates required dependencies", () => {
    assert.throws(function () {
        modelModule.createModelHandlers({});
    }, /uiState/i);

    assert.throws(function () {
        modelModule.createModelHandlers({
            operations: createOperations(),
            uiState: createUiStateRecorder(),
            apiClient: {
                updateRatingModel: async function () { return {}; }
            },
            getSelectedContractor: null
        });
    }, /getSelectedContractor/i);
});

test("contractors actions model: reload model reports error state", async () => {
    const uiState = createUiStateRecorder();
    const handlers = modelModule.createModelHandlers({
        operations: createOperations({
            loadModel: async function () {
                throw new Error("network");
            }
        }),
        uiState: uiState,
        apiClient: {
            updateRatingModel: async function () { return { versionCode: "R-1" }; }
        },
        getSelectedContractor: function () {
            return null;
        }
    });

    await handlers.handleReloadModelClick();
    const errorEntry = uiState.calls.find(function (entry) {
        return entry.method === "setRatingStatus";
    });
    assert.equal(errorEntry.isError, true);
    assert.match(errorEntry.message, /Не удалось загрузить модель рейтинга/i);
});

test("contractors actions model: save model refreshes analytics and selected history", async () => {
    const calls = [];
    const handlers = modelModule.createModelHandlers({
        operations: createOperations({
            buildModelPayload: function () {
                calls.push("payload");
                return { versionCode: "R-3" };
            },
            fillModelForm: function (model) {
                calls.push(`fill:${model.versionCode}`);
            },
            loadAnalytics: async function () { calls.push("analytics"); },
            loadHistory: async function (id) { calls.push(`history:${id}`); }
        }),
        uiState: createUiStateRecorder(),
        apiClient: {
            updateRatingModel: async function (payload) {
                calls.push(`update:${payload.versionCode}`);
                return { versionCode: "R-3" };
            }
        },
        getSelectedContractor: function () {
            return { id: "ctr-21" };
        }
    });

    await handlers.handleSaveModelClick();
    assert.deepEqual(calls, [
        "payload",
        "update:R-3",
        "fill:R-3",
        "analytics",
        "history:ctr-21"
    ]);
});
