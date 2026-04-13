"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const apiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-api.js"));

test("imports-page api: parseErrorBody resolves detail/error/title/fallback", () => {
    assert.equal(
        apiModule.parseErrorBody(JSON.stringify({ detail: "Детализация ошибки" }), 400),
        "Детализация ошибки");

    assert.equal(
        apiModule.parseErrorBody(JSON.stringify({ error: "Текст ошибки" }), 400),
        "Текст ошибки");

    assert.equal(
        apiModule.parseErrorBody(JSON.stringify({ title: "Заголовок ошибки" }), 404),
        "Заголовок ошибки");

    assert.equal(
        apiModule.parseErrorBody("Простой текст ошибки", 500),
        "Простой текст ошибки");

    assert.equal(
        apiModule.parseErrorBody("", 401),
        "Ошибка запроса (401).");
});

test("imports-page api: url builders produce stable endpoints", () => {
    const endpoint = "/api/imports/source-data/batches";
    const batchId = "abc-123";

    assert.equal(
        apiModule.buildValidationReportUrl(endpoint, batchId, false),
        "/api/imports/source-data/batches/abc-123/validation-report");

    assert.equal(
        apiModule.buildValidationReportUrl(endpoint, batchId, true),
        "/api/imports/source-data/batches/abc-123/validation-report?includeValidRows=true");

    assert.equal(
        apiModule.buildLotReconciliationReportUrl(endpoint, batchId),
        "/api/imports/source-data/batches/abc-123/lot-reconciliation-report");
});

test("imports-page api: request uses credentials/include and parses JSON", async () => {
    let fetchArgs = null;
    const client = apiModule.createApiClient({
        fetchImpl: async function (url, options) {
            fetchArgs = { url: url, options: options };
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return JSON.stringify({ id: "batch-1", status: "Uploaded" });
                }
            };
        }
    });

    const payload = await client.request("/api/imports/source-data/batches", {
        method: "POST",
        body: JSON.stringify({ fileName: "demo.csv" })
    });

    assert.equal(fetchArgs.url, "/api/imports/source-data/batches");
    assert.equal(fetchArgs.options.credentials, "include");
    assert.equal(fetchArgs.options.headers.Accept, "application/json");
    assert.equal(fetchArgs.options.headers["Content-Type"], "application/json");
    assert.deepEqual(payload, { id: "batch-1", status: "Uploaded" });
});

test("imports-page api: request returns null for 204 and empty body", async () => {
    const sequence = [
        {
            ok: true,
            status: 204,
            text: async function () { return ""; }
        },
        {
            ok: true,
            status: 200,
            text: async function () { return ""; }
        }
    ];

    const client = apiModule.createApiClient({
        fetchImpl: async function () {
            const current = sequence.shift();
            return current;
        }
    });

    const first = await client.request("/api/imports/source-data/batches", { method: "GET" });
    const second = await client.request("/api/imports/source-data/batches", { method: "GET" });

    assert.equal(first, null);
    assert.equal(second, null);
});

test("imports-page api: request throws parsed error messages", async () => {
    const client = apiModule.createApiClient({
        fetchImpl: async function () {
            return {
                ok: false,
                status: 409,
                text: async function () {
                    return JSON.stringify({ detail: "Конфликт состояния пакета" });
                }
            };
        }
    });

    await assert.rejects(
        async function () {
            await client.request("/api/imports/source-data/batches", { method: "POST" });
        },
        /Конфликт состояния пакета/);
});

test("imports-page api: endpoint helpers call correct urls and methods", async () => {
    const calls = [];
    const client = apiModule.createApiClient({
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return JSON.stringify({ ok: true });
                }
            };
        }
    });

    await client.getBatches("/api/imports/source-data/batches");
    await client.getBatchDetails("/api/imports/source-data/batches", "b-1");
    await client.getBatchHistory("/api/imports/source-data/batches", "b-1");
    await client.createQueuedBatch("/api/imports/source-data/batches/queued", { fileName: "x.csv" });
    await client.transitionBatch("/api/imports/source-data/batches", "b-1", { targetStatus: "Rejected", reason: "r" });
    await client.getXmlInbox("/api/imports/source-data/xml/inbox");
    await client.queueXmlInboxItem("/api/imports/source-data/xml/inbox", { xmlContent: "<x/>" });
    await client.retryXmlInboxItem("/api/imports/source-data/xml/inbox", "x-1");
    await client.getLotRecommendations("/api/lots/recommendations/import-batches", "b-1");
    await client.applyLotRecommendations("/api/lots/recommendations/import-batches", "b-1", { groups: [] });

    assert.equal(calls[0].url, "/api/imports/source-data/batches");
    assert.equal(calls[0].options.method, "GET");

    assert.equal(calls[1].url, "/api/imports/source-data/batches/b-1");
    assert.equal(calls[1].options.method, "GET");

    assert.equal(calls[2].url, "/api/imports/source-data/batches/b-1/history");
    assert.equal(calls[2].options.method, "GET");

    assert.equal(calls[3].url, "/api/imports/source-data/batches/queued");
    assert.equal(calls[3].options.method, "POST");
    assert.equal(calls[3].options.body, JSON.stringify({ fileName: "x.csv" }));

    assert.equal(calls[4].url, "/api/imports/source-data/batches/b-1/transition");
    assert.equal(calls[4].options.method, "POST");
    assert.equal(calls[4].options.body, JSON.stringify({ targetStatus: "Rejected", reason: "r" }));

    assert.equal(calls[5].url, "/api/imports/source-data/xml/inbox");
    assert.equal(calls[5].options.method, "GET");

    assert.equal(calls[6].url, "/api/imports/source-data/xml/inbox");
    assert.equal(calls[6].options.method, "POST");
    assert.equal(calls[6].options.body, JSON.stringify({ xmlContent: "<x/>" }));

    assert.equal(calls[7].url, "/api/imports/source-data/xml/inbox/x-1/retry");
    assert.equal(calls[7].options.method, "POST");

    assert.equal(calls[8].url, "/api/lots/recommendations/import-batches/b-1");
    assert.equal(calls[8].options.method, "GET");

    assert.equal(calls[9].url, "/api/lots/recommendations/import-batches/b-1/apply");
    assert.equal(calls[9].options.method, "POST");
    assert.equal(calls[9].options.body, JSON.stringify({ groups: [] }));
});
