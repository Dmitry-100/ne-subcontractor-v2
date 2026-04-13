"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractsGridModulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-grid.js");

function loadContractsGridWithWindow(windowMock) {
    delete require.cache[contractsGridModulePath];
    global.window = windowMock;
    require(contractsGridModulePath);
    delete global.window;
}

test("contracts grid entrypoint: returns early when ContractsGridBootstrap is missing", () => {
    assert.doesNotThrow(function () {
        loadContractsGridWithWindow({});
    });
});

test("contracts grid entrypoint: resolves bootstrap context and delegates to runtime", () => {
    const events = {
        bootstrapCalls: 0,
        runtimeCalls: []
    };

    const context = {
        moduleRoot: {},
        elements: {},
        modules: {}
    };

    const windowMock = {
        ContractsGridBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return context;
            }
        },
        ContractsGridRuntime: {
            initializeContractsGrid: function (args) {
                events.runtimeCalls.push(args);
            }
        }
    };

    loadContractsGridWithWindow(windowMock);

    assert.equal(events.bootstrapCalls, 1);
    assert.equal(events.runtimeCalls.length, 1);
    assert.equal(events.runtimeCalls[0].window, windowMock);
    assert.equal(events.runtimeCalls[0].context, context);
});
