"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dependenciesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-runtime-dependencies.js"));

test("dashboard runtime dependencies: guards validate required object/function", () => {
    assert.throws(
        function () {
            dependenciesModule.requireObject(null, "context");
        },
        /context/);

    assert.throws(
        function () {
            dependenciesModule.requireFunction(null, "fetch");
        },
        /fetch/);
});

test("dashboard runtime dependencies: setStatusError updates status element", () => {
    const element = {
        textContent: "",
        classList: {
            calls: [],
            add: function (name) {
                this.calls.push(name);
            }
        }
    };

    dependenciesModule.setStatusError(element, "Ошибка инициализации");

    assert.equal(element.textContent, "Ошибка инициализации");
    assert.deepEqual(element.classList.calls, ["dashboard-status--error"]);
});

test("dashboard runtime dependencies: createJsonRequester builds include-credentials request", async () => {
    const calls = [];
    const request = dependenciesModule.createJsonRequester(
        async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                json: async function () {
                    return { source: "ok" };
                }
            };
        },
        function () {
            return "parsed error";
        });

    const payload = await request("/api/dashboard/summary", { method: "GET" });
    assert.deepEqual(payload, { source: "ok" });
    assert.deepEqual(calls[0], {
        url: "/api/dashboard/summary",
        options: {
            credentials: "include",
            method: "GET",
            headers: {
                Accept: "application/json"
            }
        }
    });
});

test("dashboard runtime dependencies: createJsonRequester throws parsed response error", async () => {
    const request = dependenciesModule.createJsonRequester(
        async function () {
            return {
                ok: false,
                status: 500,
                text: async function () {
                    return "{\"detail\":\"db error\"}";
                }
            };
        },
        function (bodyText, statusCode) {
            return `parsed:${statusCode}:${bodyText}`;
        });

    await assert.rejects(
        async function () {
            await request("/api/dashboard/summary", { method: "GET" });
        },
        /parsed:500/);
});
