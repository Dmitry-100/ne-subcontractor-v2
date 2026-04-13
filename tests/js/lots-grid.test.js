"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotsGridModulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-grid.js");

function loadLotsGridWithWindow(windowMock) {
    delete require.cache[lotsGridModulePath];
    global.window = windowMock;
    require(lotsGridModulePath);
    delete global.window;
}

test("lots grid entrypoint: returns early when LotsBootstrap is missing", () => {
    assert.doesNotThrow(function () {
        loadLotsGridWithWindow({});
    });
});

test("lots grid entrypoint: resolves bootstrap context and delegates to runtime", () => {
    const events = {
        bootstrapCalls: 0,
        runtimeCalls: []
    };

    const context = {
        endpoint: "/api/lots",
        controls: {
            lotsGridElement: { id: "lots-grid" },
            historyGridElement: { id: "history-grid" },
            statusElement: {},
            selectedElement: {},
            transitionStatusElement: {},
            nextButton: {},
            rollbackButton: {},
            historyRefreshButton: {}
        },
        moduleRoots: {
            lotsHelpersRoot: {},
            lotsApiRoot: {},
            lotsGridsRoot: {},
            lotsDataRoot: {},
            lotsActionsRoot: {},
            lotsUiStateRoot: {}
        }
    };

    const windowMock = {
        LotsBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return context;
            }
        },
        LotsGridRuntime: {
            initializeLotsGrid: function (args) {
                events.runtimeCalls.push(args);
            }
        }
    };

    loadLotsGridWithWindow(windowMock);

    assert.equal(events.bootstrapCalls, 1);
    assert.equal(events.runtimeCalls.length, 1);
    assert.equal(events.runtimeCalls[0].window, windowMock);
    assert.equal(events.runtimeCalls[0].context, context);
});
