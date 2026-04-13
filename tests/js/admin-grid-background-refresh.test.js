"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-grid-background-refresh.js");

const backgroundRefreshModule = require(modulePath);

async function waitForAsyncQueue() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(function (resolve) {
        setImmediate(resolve);
    });
}

test("admin background refresh: refreshes reference grid when document is complete", async () => {
    const statusUpdates = [];
    let refreshCalls = 0;

    const refreshService = backgroundRefreshModule.createBackgroundReferenceRefresh({
        windowRef: {
            addEventListener: function () {
                throw new Error("load listener must not be attached for complete documents");
            }
        },
        documentRef: { readyState: "complete" },
        setSectionStatus: function (element, message, isError) {
            statusUpdates.push({ element: element, message: message, isError: isError });
        },
        getReferenceGridInstance: function () {
            return {
                refresh: async function () {
                    refreshCalls += 1;
                }
            };
        },
        referenceStatusElement: { id: "reference-status" },
        referenceLoadingMessage: function () { return "loading"; },
        referenceOperationErrorMessage: function () { return "operation-error"; }
    });

    refreshService.refreshReferenceGridInBackground();
    await waitForAsyncQueue();

    assert.equal(refreshCalls, 1);
    assert.deepEqual(statusUpdates, [
        { element: { id: "reference-status" }, message: "loading", isError: false }
    ]);
});

test("admin background refresh: defers refresh until window load when document is loading", async () => {
    let loadCallback = null;
    const statusUpdates = [];
    let refreshCalls = 0;

    const refreshService = backgroundRefreshModule.createBackgroundReferenceRefresh({
        windowRef: {
            addEventListener: function (eventName, callback, options) {
                assert.equal(eventName, "load");
                assert.equal(options?.once, true);
                loadCallback = callback;
            }
        },
        documentRef: { readyState: "loading" },
        setSectionStatus: function (element, message, isError) {
            statusUpdates.push({ element: element, message: message, isError: isError });
        },
        getReferenceGridInstance: function () {
            return {
                refresh: async function () {
                    refreshCalls += 1;
                }
            };
        },
        referenceStatusElement: { id: "reference-status" },
        referenceLoadingMessage: function () { return "loading"; },
        referenceOperationErrorMessage: function () { return "operation-error"; }
    });

    refreshService.refreshReferenceGridInBackground();
    assert.equal(refreshCalls, 0);
    assert.equal(typeof loadCallback, "function");

    loadCallback();
    await waitForAsyncQueue();

    assert.equal(refreshCalls, 1);
    assert.deepEqual(statusUpdates, [
        { element: { id: "reference-status" }, message: "loading", isError: false }
    ]);
});

test("admin background refresh: reports refresh error in reference status", async () => {
    const statusUpdates = [];

    const refreshService = backgroundRefreshModule.createBackgroundReferenceRefresh({
        windowRef: {},
        documentRef: { readyState: "complete" },
        setSectionStatus: function (element, message, isError) {
            statusUpdates.push({ element: element, message: message, isError: isError });
        },
        getReferenceGridInstance: function () {
            return {
                refresh: async function () {
                    throw new Error("refresh failed");
                }
            };
        },
        referenceStatusElement: { id: "reference-status" },
        referenceLoadingMessage: function () { return "loading"; },
        referenceOperationErrorMessage: function () { return "operation-error"; }
    });

    refreshService.refreshReferenceGridInBackground();
    await waitForAsyncQueue();

    assert.deepEqual(statusUpdates, [
        { element: { id: "reference-status" }, message: "loading", isError: false },
        { element: { id: "reference-status" }, message: "refresh failed", isError: true }
    ]);
});
