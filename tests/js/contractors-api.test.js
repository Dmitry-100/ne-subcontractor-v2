"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractorsApiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-api.js"));

test("contractors api: parseErrorBody resolves detail/error/title/fallback", () => {
    assert.equal(
        contractorsApiModule.parseErrorBody(JSON.stringify({ detail: "Детализация ошибки" }), 400),
        "Детализация ошибки");

    assert.equal(
        contractorsApiModule.parseErrorBody(JSON.stringify({ error: "Текст ошибки" }), 400),
        "Текст ошибки");

    assert.equal(
        contractorsApiModule.parseErrorBody(JSON.stringify({ title: "Заголовок ошибки" }), 404),
        "Заголовок ошибки");

    assert.equal(
        contractorsApiModule.parseErrorBody("Простой текст ошибки", 500),
        "Простой текст ошибки");

    assert.equal(
        contractorsApiModule.parseErrorBody("", 401),
        "Ошибка запроса (401).");
});

test("contractors api: request uses credentials/include and parses JSON", async () => {
    let fetchArgs = null;
    const client = contractorsApiModule.createApiClient({
        fetchImpl: async function (url, options) {
            fetchArgs = { url: url, options: options };
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return JSON.stringify({ id: "ctr-1", name: "Подрядчик 1" });
                }
            };
        }
    });

    const payload = await client.request("/api/contractors", {
        method: "POST",
        body: JSON.stringify({ name: "Подрядчик 1" })
    });

    assert.equal(fetchArgs.url, "/api/contractors");
    assert.equal(fetchArgs.options.credentials, "include");
    assert.equal(fetchArgs.options.headers.Accept, "application/json");
    assert.equal(fetchArgs.options.headers["Content-Type"], "application/json");
    assert.deepEqual(payload, { id: "ctr-1", name: "Подрядчик 1" });
});

test("contractors api: request returns null for 204 and empty body", async () => {
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

    const client = contractorsApiModule.createApiClient({
        fetchImpl: async function () {
            return sequence.shift();
        }
    });

    const first = await client.request("/api/contractors", { method: "GET" });
    const second = await client.request("/api/contractors", { method: "GET" });

    assert.equal(first, null);
    assert.equal(second, null);
});

test("contractors api: request throws parsed error messages", async () => {
    const client = contractorsApiModule.createApiClient({
        fetchImpl: async function () {
            return {
                ok: false,
                status: 409,
                text: async function () {
                    return JSON.stringify({ detail: "Конфликт состояния рейтинга" });
                }
            };
        }
    });

    await assert.rejects(
        async function () {
            await client.request("/api/contractors/rating/model", { method: "PUT" });
        },
        /Конфликт состояния рейтинга/);
});

test("contractors api: endpoint helpers call correct urls and methods", async () => {
    const calls = [];
    const client = contractorsApiModule.createApiClient({
        endpoint: "/api/contractors",
        ratingModelEndpoint: "/api/contractors/rating/model",
        ratingRecalculateEndpoint: "/api/contractors/rating/recalculate",
        ratingAnalyticsEndpoint: "/api/contractors/rating/analytics",
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

    await client.getContractors();
    await client.getRatingModel();
    await client.updateRatingModel({ versionCode: "R-1" });
    await client.recalculateRatings({ includeInactiveContractors: false });
    await client.getRatingAnalytics();
    await client.getRatingHistory("ctr-1");
    await client.saveManualAssessment("ctr-1", { score: 4.5, comment: "ok" });

    assert.equal(calls[0].url, "/api/contractors");
    assert.equal(calls[0].options.method, "GET");

    assert.equal(calls[1].url, "/api/contractors/rating/model");
    assert.equal(calls[1].options.method, "GET");

    assert.equal(calls[2].url, "/api/contractors/rating/model");
    assert.equal(calls[2].options.method, "PUT");
    assert.equal(calls[2].options.body, JSON.stringify({ versionCode: "R-1" }));

    assert.equal(calls[3].url, "/api/contractors/rating/recalculate");
    assert.equal(calls[3].options.method, "POST");
    assert.equal(calls[3].options.body, JSON.stringify({ includeInactiveContractors: false }));

    assert.equal(calls[4].url, "/api/contractors/rating/analytics");
    assert.equal(calls[4].options.method, "GET");

    assert.equal(calls[5].url, "/api/contractors/ctr-1/rating/history?top=50");
    assert.equal(calls[5].options.method, "GET");

    assert.equal(calls[6].url, "/api/contractors/ctr-1/rating/manual-assessment");
    assert.equal(calls[6].options.method, "POST");
    assert.equal(calls[6].options.body, JSON.stringify({ score: 4.5, comment: "ok" }));
});

test("contractors api: getContractors appends paging query when provided", async () => {
    const calls = [];
    const client = contractorsApiModule.createApiClient({
        endpoint: "/api/contractors",
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return JSON.stringify({ items: [], totalCount: 0, skip: 0, take: 15 });
                }
            };
        }
    });

    await client.getContractors({
        search: "Контрагент 01",
        skip: 45,
        take: 15,
        requireTotalCount: true
    });

    assert.equal(
        calls[0].url,
        "/api/contractors?search=%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%B3%D0%B5%D0%BD%D1%82%2001&skip=45&take=15&requireTotalCount=true");
    assert.equal(calls[0].options.method, "GET");
});
