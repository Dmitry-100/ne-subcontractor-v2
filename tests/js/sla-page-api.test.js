"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const apiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/sla-page-api.js"));

function createResponse(options) {
    const settings = options || {};
    const status = settings.status || 200;
    const payload = settings.payload;
    const text = settings.text;
    const bodyText = text !== undefined ? text : (payload !== undefined ? JSON.stringify(payload) : "");

    return {
        ok: status >= 200 && status < 300,
        status: status,
        statusText: settings.statusText || "OK",
        text: async function () {
            return bodyText;
        }
    };
}

test("sla-page api: validates endpoint methods and payload contracts", async () => {
    const calls = [];
    const fetchImpl = async function (url, options) {
        calls.push({ url: url, options: options });

        if (url.includes("/reason")) {
            return createResponse({ status: 204 });
        }

        if (url.includes("/run")) {
            return createResponse({
                payload: {
                    activeViolations: 1,
                    openViolations: 2,
                    notificationSuccessCount: 3,
                    notificationFailureCount: 0
                }
            });
        }

        if (options.method === "PUT") {
            return createResponse({
                payload: [{ purchaseTypeCode: "PT-1", warningDaysBeforeDue: 2, isActive: true, description: null }]
            });
        }

        if (url.includes("/violations")) {
            return createResponse({
                payload: [{ id: "v-1", title: "Нарушение" }]
            });
        }

        return createResponse({
            payload: [{ purchaseTypeCode: "PT-1", warningDaysBeforeDue: 2, isActive: true, description: null }]
        });
    };

    const api = apiModule.createApiClient({
        rulesApi: "/api/sla/rules",
        violationsApi: "/api/sla/violations",
        runApi: "/api/sla/run",
        fetchImpl: fetchImpl
    });

    const rules = await api.getRules();
    assert.equal(Array.isArray(rules), true);

    await api.saveRules([{ purchaseTypeCode: "PT-1", warningDaysBeforeDue: 3, isActive: true, description: null }]);
    await api.getViolations(true);
    const runResult = await api.runMonitoring(true);
    assert.equal(runResult.activeViolations, 1);
    await api.saveViolationReason("id/with/slash", { reasonCode: "DOC_DELAY", reasonComment: null });

    assert.equal(calls[0].url, "/api/sla/rules");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.credentials, "include");
    assert.equal(calls[0].options.headers.Accept, "application/json");

    assert.equal(calls[1].options.method, "PUT");
    assert.equal(calls[1].options.headers["Content-Type"], "application/json");
    assert.equal(JSON.parse(calls[1].options.body).items.length, 1);

    assert.equal(calls[2].url, "/api/sla/violations?includeResolved=true");
    assert.equal(calls[3].url, "/api/sla/run?sendNotifications=true");
    assert.equal(calls[4].url, "/api/sla/violations/id%2Fwith%2Fslash/reason");
    assert.equal(calls[4].options.method, "PUT");
});

test("sla-page api: returns null for 204 and empty body responses", async () => {
    const api = apiModule.createApiClient({
        fetchImpl: async function (_url, options) {
            if (options && options.method === "POST") {
                return createResponse({ status: 204 });
            }

            return createResponse({ status: 200, text: "" });
        }
    });

    const requestEmpty = await api.request("/api/sla/custom", { method: "GET" });
    assert.equal(requestEmpty, null);

    const runResult = await api.runMonitoring(false);
    assert.equal(runResult, null);
});

test("sla-page api: request throws parsed error from injected parser", async () => {
    const api = apiModule.createApiClient({
        fetchImpl: async function () {
            return createResponse({
                status: 400,
                statusText: "Bad Request",
                payload: { detail: "Текст ошибки" }
            });
        },
        parseApiError: function (rawText, statusCode, statusText) {
            return "Parsed(" + statusCode + " " + statusText + "): " + rawText;
        }
    });

    await assert.rejects(
        async function () {
            await api.getRules();
        },
        /Parsed\(400 Bad Request\):/
    );
});
