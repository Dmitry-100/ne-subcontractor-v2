"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-api-request-helpers.js"));

test("procedures api request helpers: parseErrorBody resolves detail/error/title/fallback", () => {
    assert.equal(
        helpersModule.parseErrorBody(JSON.stringify({ detail: "Детализация ошибки" }), 400),
        "Детализация ошибки");

    assert.equal(
        helpersModule.parseErrorBody(JSON.stringify({ error: "Текст ошибки" }), 400),
        "Текст ошибки");

    assert.equal(
        helpersModule.parseErrorBody(JSON.stringify({ title: "Заголовок ошибки" }), 404),
        "Заголовок ошибки");

    assert.equal(
        helpersModule.parseErrorBody("Простой текст ошибки", 500),
        "Простой текст ошибки");

    assert.equal(
        helpersModule.parseErrorBody("", 401),
        "Ошибка запроса (401).");
});

test("procedures api request helpers: appendQueryToUrl builds query string", () => {
    const url = helpersModule.appendQueryToUrl("/api/procedures?status=OnApproval", {
        search: "Процедура",
        lotId: "lot-1",
        skip: 30,
        take: 15,
        requireTotalCount: true
    });

    assert.equal(
        url,
        "/api/procedures?status=OnApproval&search=%D0%9F%D1%80%D0%BE%D1%86%D0%B5%D0%B4%D1%83%D1%80%D0%B0&lotId=lot-1&skip=30&take=15&requireTotalCount=true");
});

test("procedures api request helpers: createRequest handles json and empty responses", async () => {
    let fetchCalls = 0;
    const request = helpersModule.createRequest(async function () {
        fetchCalls += 1;
        if (fetchCalls === 1) {
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return JSON.stringify({ id: "proc-1" });
                }
            };
        }

        return {
            ok: true,
            status: 204,
            text: async function () {
                return "";
            }
        };
    });

    const first = await request("/api/procedures", { method: "GET" });
    const second = await request("/api/procedures", { method: "DELETE" });

    assert.deepEqual(first, { id: "proc-1" });
    assert.equal(second, null);
});
