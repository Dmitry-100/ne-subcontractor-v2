"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotsApiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-api.js"));

function createResponse(options) {
    const settings = options || {};
    const status = settings.status ?? 200;
    const text = settings.text ?? "";
    return {
        ok: status >= 200 && status < 300,
        status: status,
        text: async function () {
            return text;
        }
    };
}

test("lots api: parseErrorBody resolves detail/error/title/fallback", () => {
    assert.equal(
        lotsApiModule.parseErrorBody(JSON.stringify({ detail: "Детальная ошибка." }), 400),
        "Детальная ошибка.");
    assert.equal(
        lotsApiModule.parseErrorBody(JSON.stringify({ error: "Ошибка API." }), 400),
        "Ошибка API.");
    assert.equal(
        lotsApiModule.parseErrorBody(JSON.stringify({ title: "Некорректный запрос." }), 400),
        "Некорректный запрос.");
    assert.equal(
        lotsApiModule.parseErrorBody("", 500),
        "Ошибка запроса (500).");
});

test("lots api: createApiClient validates endpoint", () => {
    assert.throws(function () {
        lotsApiModule.createApiClient({});
    }, /endpoint/i);
});

test("lots api: request uses credentials/include and parses JSON", async () => {
    const calls = [];
    const api = lotsApiModule.createApiClient({
        endpoint: "/api/lots",
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return createResponse({
                status: 200,
                text: JSON.stringify([{ id: "lot-1" }])
            });
        }
    });

    const payload = await api.getLots();

    assert.deepEqual(payload, [{ id: "lot-1" }]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/lots");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.credentials, "include");
    assert.equal(calls[0].options.headers.Accept, "application/json");
    assert.equal(calls[0].options.headers["Content-Type"], undefined);
});

test("lots api: getLots appends query parameters", async () => {
    const calls = [];
    const api = lotsApiModule.createApiClient({
        endpoint: "/api/lots",
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return createResponse({
                status: 200,
                text: JSON.stringify({ items: [], totalCount: 0, skip: 0, take: 15 })
            });
        }
    });

    await api.getLots({
        search: "Лот-1",
        status: "InExecution",
        projectId: "project-1",
        skip: 30,
        take: 15,
        requireTotalCount: true
    });

    assert.equal(
        calls[0].url,
        "/api/lots?search=%D0%9B%D0%BE%D1%82-1&status=InExecution&projectId=project-1&skip=30&take=15&requireTotalCount=true");
});

test("lots api: request returns null for 204 and empty response", async () => {
    const api = lotsApiModule.createApiClient({
        endpoint: "/api/lots",
        fetchImpl: async function () {
            return createResponse({ status: 204, text: "" });
        }
    });

    const payload = await api.getLotDetails("lot-1");
    assert.equal(payload, null);
});

test("lots api: request throws parsed errors", async () => {
    const api = lotsApiModule.createApiClient({
        endpoint: "/api/lots",
        fetchImpl: async function () {
            return createResponse({
                status: 409,
                text: JSON.stringify({ detail: "Конфликт статуса." })
            });
        }
    });

    await assert.rejects(async function () {
        await api.transitionLot("lot-1", { targetStatus: "Closed" });
    }, /Конфликт статуса/);
});

test("lots api: endpoint helpers call correct urls and methods", async () => {
    const calls = [];
    const api = lotsApiModule.createApiClient({
        endpoint: "/api/lots",
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return createResponse({ status: 200, text: "{}" });
        }
    });

    await api.createLot({ code: "LOT-001" });
    await api.updateLot("lot-1", { name: "Updated" });
    await api.deleteLot("lot-1");
    await api.getLotDetails("lot-1");
    await api.getLotHistory("lot-1");
    await api.transitionLot("lot-1", { targetStatus: "InExecution" });

    assert.equal(calls[0].url, "/api/lots");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[1].url, "/api/lots/lot-1");
    assert.equal(calls[1].options.method, "PUT");
    assert.equal(calls[2].url, "/api/lots/lot-1");
    assert.equal(calls[2].options.method, "DELETE");
    assert.equal(calls[3].url, "/api/lots/lot-1");
    assert.equal(calls[3].options.method, "GET");
    assert.equal(calls[4].url, "/api/lots/lot-1/history");
    assert.equal(calls[4].options.method, "GET");
    assert.equal(calls[5].url, "/api/lots/lot-1/transition");
    assert.equal(calls[5].options.method, "POST");
    assert.equal(typeof calls[5].options.body, "string");
    assert.equal(calls[5].options.headers["Content-Type"], "application/json");
});
