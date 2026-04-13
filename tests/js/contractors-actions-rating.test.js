"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const ratingModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-actions-rating.js"));

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

test("contractors actions rating: validates required dependencies", () => {
    assert.throws(function () {
        ratingModule.createRatingHandlers({});
    }, /uiState/i);

    assert.throws(function () {
        ratingModule.createRatingHandlers({
            operations: createOperations(),
            uiState: createUiStateRecorder(),
            apiClient: {
                recalculateRatings: async function () { return {}; }
            },
            getSelectedContractor: null
        });
    }, /getSelectedContractor/i);
});

test("contractors actions rating: refresh keeps selected contractor history in sync", async () => {
    const calls = [];

    const handlers = ratingModule.createRatingHandlers({
        operations: createOperations({
            refreshContractorsAndReselect: async function (id) { calls.push(`refresh:${id}`); },
            loadAnalytics: async function () { calls.push("analytics"); },
            loadHistory: async function (id) { calls.push(`history:${id}`); }
        }),
        uiState: createUiStateRecorder(),
        apiClient: {
            recalculateRatings: async function () { return {}; }
        },
        getSelectedContractor: function () {
            return { id: "ctr-11" };
        }
    });

    await handlers.handleRefreshClick();
    assert.deepEqual(calls, [
        "refresh:ctr-11",
        "analytics",
        "history:ctr-11"
    ]);
});

test("contractors actions rating: recalculate selected is no-op when no contractor selected", async () => {
    let recalcCalls = 0;

    const handlers = ratingModule.createRatingHandlers({
        operations: createOperations(),
        uiState: createUiStateRecorder(),
        apiClient: {
            recalculateRatings: async function () {
                recalcCalls += 1;
                return {};
            }
        },
        getSelectedContractor: function () {
            return null;
        }
    });

    await handlers.handleRecalculateSelectedClick();
    assert.equal(recalcCalls, 0);
});
