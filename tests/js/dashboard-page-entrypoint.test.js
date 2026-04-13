"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dashboardEntrypointPath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page.js");

function loadEntrypoint(windowMock, documentMock) {
    delete require.cache[dashboardEntrypointPath];
    global.window = windowMock;
    global.document = documentMock;
    require(dashboardEntrypointPath);
    delete global.window;
    delete global.document;
}

test("dashboard entrypoint: returns early when bootstrap module is missing", () => {
    assert.doesNotThrow(function () {
        loadEntrypoint({}, {});
    });
});

test("dashboard entrypoint: delegates to runtime with bootstrap context", () => {
    const events = {
        bootstrapOptions: null,
        runtimeCalls: []
    };

    const context = {
        moduleRoot: {},
        endpoint: "/api/dashboard/summary",
        analyticsEndpoint: "/api/analytics/kpi",
        controls: {},
        moduleRoots: {}
    };

    const documentMock = {
        createElement: function () {
            return {};
        }
    };

    const windowMock = {
        console: {
            error: function () {}
        },
        DashboardPageBootstrap: {
            createBootstrapContext: function (options) {
                events.bootstrapOptions = options;
                return context;
            }
        },
        DashboardPageRuntime: {
            initializeDashboardPage: function (args) {
                events.runtimeCalls.push(args);
            }
        }
    };

    loadEntrypoint(windowMock, documentMock);

    assert.ok(events.bootstrapOptions);
    assert.equal(events.bootstrapOptions.document, documentMock);
    assert.equal(events.bootstrapOptions.window, windowMock);
    assert.equal(typeof events.bootstrapOptions.logError, "function");

    assert.equal(events.runtimeCalls.length, 1);
    assert.equal(events.runtimeCalls[0].window, windowMock);
    assert.equal(events.runtimeCalls[0].document, documentMock);
    assert.equal(events.runtimeCalls[0].context, context);
    assert.equal(events.runtimeCalls[0].bootstrapRoot, windowMock.DashboardPageBootstrap);
});
