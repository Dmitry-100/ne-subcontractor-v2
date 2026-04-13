"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-runtime.js"));

test("imports runtime: createRuntimeService validates dependencies", () => {
    assert.throws(
        function () {
            runtimeModule.createRuntimeService({});
        },
        /apiClient\.getBatchHistory/);
});

test("imports runtime: loadBatchHistory fetches history and renders table", async () => {
    const calls = [];
    const service = runtimeModule.createRuntimeService({
        apiClient: {
            getBatchHistory: async function (endpoint, batchId) {
                calls.push({ endpoint: endpoint, batchId: batchId });
                return [{ id: "h-1" }];
            }
        },
        endpoint: "/api/imports/source-data/batches",
        renderHistoryTable: function (rows) {
            calls.push({ rendered: rows.length });
        },
        resetWizard: function () {},
        setXmlStatus: function () {},
        setBatchesStatus: function () {},
        loadXmlInbox: async function () {},
        loadBatches: async function () {}
    });

    const history = await service.loadBatchHistory("batch-1");

    assert.equal(history.length, 1);
    assert.deepEqual(calls, [
        { endpoint: "/api/imports/source-data/batches", batchId: "batch-1" },
        { rendered: 1 }
    ]);
});

test("imports runtime: initialize runs startup flow and reports loader errors", async () => {
    const calls = [];
    const service = runtimeModule.createRuntimeService({
        apiClient: {
            getBatchHistory: async function () {
                return [];
            }
        },
        endpoint: "/api/imports/source-data/batches",
        renderHistoryTable: function () {},
        resetWizard: function () {
            calls.push("reset");
        },
        setXmlStatus: function (message, isError) {
            calls.push({ type: "xml", message: message, isError: isError });
        },
        setBatchesStatus: function (message, isError) {
            calls.push({ type: "batches", message: message, isError: isError });
        },
        loadXmlInbox: async function () {
            throw new Error("xml failed");
        },
        loadBatches: async function () {
            throw new Error("batches failed");
        }
    });

    await service.initialize();

    assert.deepEqual(calls, [
        "reset",
        { type: "xml", message: "Операции с XML ещё не выполнялись.", isError: false },
        { type: "xml", message: "Не удалось инициализировать XML-очередь: xml failed", isError: true },
        { type: "batches", message: "Не удалось инициализировать модуль импорта: batches failed", isError: true }
    ]);
});
