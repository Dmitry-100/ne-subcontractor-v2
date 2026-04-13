"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const apiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-api.js"));

test("procedures api: parseErrorBody resolves detail/error/title/fallback", () => {
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

test("procedures api: request uses credentials/include and parses JSON", async () => {
    let fetchArgs = null;
    const client = apiModule.createApiClient({
        fetchImpl: async function (url, options) {
            fetchArgs = { url: url, options: options };
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return JSON.stringify({ id: "proc-1", status: "Created" });
                }
            };
        }
    });

    const payload = await client.request("/api/procedures", {
        method: "POST",
        body: JSON.stringify({ objectName: "P-1" })
    });

    assert.equal(fetchArgs.url, "/api/procedures");
    assert.equal(fetchArgs.options.credentials, "include");
    assert.equal(fetchArgs.options.headers.Accept, "application/json");
    assert.equal(fetchArgs.options.headers["Content-Type"], "application/json");
    assert.deepEqual(payload, { id: "proc-1", status: "Created" });
});

test("procedures api: request returns null for 204 and empty body", async () => {
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
            return sequence.shift();
        }
    });

    const first = await client.request("/api/procedures", { method: "GET" });
    const second = await client.request("/api/procedures", { method: "GET" });

    assert.equal(first, null);
    assert.equal(second, null);
});

test("procedures api: request throws parsed error messages", async () => {
    const client = apiModule.createApiClient({
        fetchImpl: async function () {
            return {
                ok: false,
                status: 409,
                text: async function () {
                    return JSON.stringify({ detail: "Конфликт состояния процедуры" });
                }
            };
        }
    });

    await assert.rejects(
        async function () {
            await client.request("/api/procedures", { method: "POST" });
        },
        /Конфликт состояния процедуры/);
});

test("procedures api: endpoint helpers call correct urls and methods", async () => {
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

    await client.getProcedures("/api/procedures");
    await client.createProcedure("/api/procedures", { objectName: "P-1" });
    await client.updateProcedure("/api/procedures", "proc-1", { objectName: "P-2" });
    await client.deleteProcedure("/api/procedures", "proc-1");
    await client.getProcedureDetails("/api/procedures", "proc-1");
    await client.getProcedureHistory("/api/procedures", "proc-1");
    await client.transitionProcedure("/api/procedures", "proc-1", { targetStatus: "Sent", reason: "ok" });
    await client.getShortlistRecommendations("/api/procedures", "proc-1");
    await client.getShortlistAdjustments("/api/procedures", "proc-1");
    await client.applyShortlistRecommendations("/api/procedures", "proc-1", { maxIncluded: 5 });

    assert.equal(calls[0].url, "/api/procedures");
    assert.equal(calls[0].options.method, "GET");

    assert.equal(calls[1].url, "/api/procedures");
    assert.equal(calls[1].options.method, "POST");
    assert.equal(calls[1].options.body, JSON.stringify({ objectName: "P-1" }));

    assert.equal(calls[2].url, "/api/procedures/proc-1");
    assert.equal(calls[2].options.method, "PUT");
    assert.equal(calls[2].options.body, JSON.stringify({ objectName: "P-2" }));

    assert.equal(calls[3].url, "/api/procedures/proc-1");
    assert.equal(calls[3].options.method, "DELETE");

    assert.equal(calls[4].url, "/api/procedures/proc-1");
    assert.equal(calls[4].options.method, "GET");

    assert.equal(calls[5].url, "/api/procedures/proc-1/history");
    assert.equal(calls[5].options.method, "GET");

    assert.equal(calls[6].url, "/api/procedures/proc-1/transition");
    assert.equal(calls[6].options.method, "POST");
    assert.equal(calls[6].options.body, JSON.stringify({ targetStatus: "Sent", reason: "ok" }));

    assert.equal(calls[7].url, "/api/procedures/proc-1/shortlist/recommendations");
    assert.equal(calls[7].options.method, "GET");

    assert.equal(calls[8].url, "/api/procedures/proc-1/shortlist/adjustments");
    assert.equal(calls[8].options.method, "GET");

    assert.equal(calls[9].url, "/api/procedures/proc-1/shortlist/recommendations/apply");
    assert.equal(calls[9].options.method, "POST");
    assert.equal(calls[9].options.body, JSON.stringify({ maxIncluded: 5 }));
});

test("procedures api: getProcedures appends paging query to existing endpoint filter", async () => {
    const calls = [];
    const client = apiModule.createApiClient({
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

    await client.getProcedures("/api/procedures?status=OnApproval", {
        search: "Процедура",
        skip: 30,
        take: 15,
        requireTotalCount: true
    });

    assert.equal(
        calls[0].url,
        "/api/procedures?status=OnApproval&search=%D0%9F%D1%80%D0%BE%D1%86%D0%B5%D0%B4%D1%83%D1%80%D0%B0&skip=30&take=15&requireTotalCount=true");
    assert.equal(calls[0].options.method, "GET");
});
