"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const batchesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-batches.js"));

test("imports batches: createBatchesService validates required dependencies", () => {
    assert.throws(
        function () {
            batchesModule.createBatchesService({});
        },
        /apiClient/);
});

test("imports batches: loadBatches loads rows and opens target batch details", async () => {
    let selectedBatch = null;
    let pollHandle = null;
    const calls = {
        batchesStatus: [],
        detailsLoaded: [],
        detailsError: [],
        afterDetails: [],
        history: [],
        renderedRows: []
    };

    const apiClient = {
        getBatches: async function () {
            return [{ id: "batch-1", fileName: "f1.csv" }];
        },
        getBatchDetails: async function (endpoint, batchId) {
            assert.equal(batchId, "batch-1");
            return {
                id: "batch-1",
                fileName: "f1.csv",
                status: "Validated"
            };
        },
        transitionBatch: async function () {
            throw new Error("unexpected");
        }
    };

    const service = batchesModule.createBatchesService({
        apiClient: apiClient,
        endpoint: "/api/imports/source-data/batches",
        workflow: {
            validateTransitionRequest: function () {
                throw new Error("unexpected");
            },
            shouldAutoRefreshDetails: function () {
                return false;
            }
        },
        lotState: {
            shouldResetRecommendations: function () {
                return false;
            }
        },
        getSelectedBatch: function () {
            return selectedBatch;
        },
        setSelectedBatch: function (value) {
            selectedBatch = value;
        },
        getLotRecommendations: function () {
            return null;
        },
        getLotRecommendationsBatchId: function () {
            return null;
        },
        clearDetailsPoll: function () {
            pollHandle = null;
        },
        setDetailsPollHandle: function (value) {
            pollHandle = value;
        },
        scheduleTimeout: function () {
            throw new Error("timeout should not be called for Validated status");
        },
        localizeImportStatus: function (value) {
            return value;
        },
        setBatchesStatus: function (message, isError) {
            calls.batchesStatus.push({ message: message, isError: Boolean(isError) });
        },
        setTransitionStatus: function () {},
        onBatchesLoaded: function (rows) {
            calls.renderedRows.push(rows);
        },
        onDetailsLoaded: function (details) {
            calls.detailsLoaded.push(details);
        },
        onDetailsError: function (error) {
            calls.detailsError.push(error);
        },
        onAfterDetailsLoaded: function (context) {
            calls.afterDetails.push(context);
        },
        onLoadBatchHistory: async function (batchId) {
            calls.history.push(batchId);
        },
        onAutoRefreshError: function () {}
    });

    await service.loadBatches("batch-1");

    assert.equal(calls.batchesStatus[0].message, "Загрузка пакетов...");
    assert.equal(calls.batchesStatus[1].message, "Загружено пакетов: 1.");
    assert.equal(calls.renderedRows.length, 1);
    assert.equal(calls.renderedRows[0].length, 1);
    assert.equal(calls.detailsLoaded.length, 1);
    assert.equal(calls.detailsError.length, 0);
    assert.equal(calls.afterDetails.length, 1);
    assert.equal(calls.afterDetails[0].shouldResetLotRecommendations, false);
    assert.deepEqual(calls.history, ["batch-1"]);
    assert.equal(selectedBatch.id, "batch-1");
    assert.equal(pollHandle, null);
});

test("imports batches: loadBatchDetails schedules auto-refresh for async status", async () => {
    let selectedBatch = null;
    let pollHandle = null;
    const timeoutCalls = [];

    const service = batchesModule.createBatchesService({
        apiClient: {
            getBatches: async function () {
                return [];
            },
            getBatchDetails: async function () {
                return {
                    id: "batch-2",
                    fileName: "f2.csv",
                    status: "Processing"
                };
            },
            transitionBatch: async function () {}
        },
        endpoint: "/api/imports/source-data/batches",
        workflow: {
            validateTransitionRequest: function () {
                throw new Error("unexpected");
            },
            shouldAutoRefreshDetails: function (status) {
                return status === "Processing";
            }
        },
        lotState: {
            shouldResetRecommendations: function () {
                return true;
            }
        },
        getSelectedBatch: function () {
            return selectedBatch;
        },
        setSelectedBatch: function (value) {
            selectedBatch = value;
        },
        getLotRecommendations: function () {
            return [{ id: "lot-group-1" }];
        },
        getLotRecommendationsBatchId: function () {
            return "batch-1";
        },
        clearDetailsPoll: function () {
            pollHandle = null;
        },
        setDetailsPollHandle: function (value) {
            pollHandle = value;
        },
        scheduleTimeout: function (handler, delay) {
            timeoutCalls.push({ handler: handler, delay: delay });
            return 777;
        },
        localizeImportStatus: function (value) {
            return value;
        },
        setBatchesStatus: function () {},
        setTransitionStatus: function () {},
        onBatchesLoaded: function () {},
        onDetailsLoaded: function () {},
        onDetailsError: function () {},
        onAfterDetailsLoaded: function (context) {
            assert.equal(context.shouldResetLotRecommendations, true);
        },
        onLoadBatchHistory: async function () {},
        onAutoRefreshError: function () {}
    });

    await service.loadBatchDetails("batch-2");

    assert.equal(selectedBatch.id, "batch-2");
    assert.equal(timeoutCalls.length, 1);
    assert.equal(timeoutCalls[0].delay, 3000);
    assert.equal(typeof timeoutCalls[0].handler, "function");
    assert.equal(pollHandle, 777);
});

test("imports batches: applyBatchTransition validates and applies transition", async () => {
    let selectedBatch = {
        id: "batch-3",
        status: "Validated"
    };
    const calls = {
        transition: [],
        transitionStatus: []
    };

    const service = batchesModule.createBatchesService({
        apiClient: {
            getBatches: async function () {
                return [];
            },
            getBatchDetails: async function () {
                return selectedBatch;
            },
            transitionBatch: async function (endpoint, batchId, payload) {
                calls.transition.push({
                    endpoint: endpoint,
                    batchId: batchId,
                    payload: payload
                });
            }
        },
        endpoint: "/api/imports/source-data/batches",
        workflow: {
            validateTransitionRequest: function (request) {
                assert.equal(request.selectedBatchId, "batch-3");
                assert.equal(request.targetStatus, "Rejected");
                assert.equal(request.reason, "comment");
                return {
                    targetStatus: request.targetStatus,
                    payload: {
                        targetStatus: request.targetStatus,
                        reason: request.reason
                    }
                };
            },
            shouldAutoRefreshDetails: function () {
                return false;
            }
        },
        lotState: {
            shouldResetRecommendations: function () {
                return false;
            }
        },
        getSelectedBatch: function () {
            return selectedBatch;
        },
        setSelectedBatch: function (value) {
            selectedBatch = value;
        },
        getLotRecommendations: function () {
            return null;
        },
        getLotRecommendationsBatchId: function () {
            return null;
        },
        clearDetailsPoll: function () {},
        setDetailsPollHandle: function () {},
        scheduleTimeout: function () {
            return 0;
        },
        localizeImportStatus: function (value) {
            return `loc:${value}`;
        },
        setBatchesStatus: function () {},
        setTransitionStatus: function (message, isError) {
            calls.transitionStatus.push({ message: message, isError: Boolean(isError) });
        },
        onBatchesLoaded: function () {},
        onDetailsLoaded: function () {},
        onDetailsError: function () {},
        onAfterDetailsLoaded: function () {},
        onLoadBatchHistory: async function () {},
        onAutoRefreshError: function () {}
    });

    await service.applyBatchTransition("Rejected", "comment");

    assert.equal(calls.transition.length, 1);
    assert.equal(calls.transition[0].endpoint, "/api/imports/source-data/batches");
    assert.equal(calls.transition[0].batchId, "batch-3");
    assert.deepEqual(calls.transition[0].payload, {
        targetStatus: "Rejected",
        reason: "comment"
    });
    assert.equal(calls.transitionStatus.length, 1);
    assert.equal(calls.transitionStatus[0].message, "Переход применён: loc:Rejected.");
    assert.equal(calls.transitionStatus[0].isError, false);
});
