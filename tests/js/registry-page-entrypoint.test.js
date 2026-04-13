"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const entrypointPath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/registry-page.js");

function createStatusElement() {
    return {
        textContent: "",
        toggles: [],
        classList: {
            toggle: function (name, value) {
                this.owner.toggles.push({ name: name, value: value });
            },
            owner: null
        }
    };
}

function loadEntrypoint(windowMock, documentMock) {
    delete require.cache[entrypointPath];
    global.window = windowMock;
    global.document = documentMock;
    require(entrypointPath);
    delete global.window;
    delete global.document;
}

test("registry entrypoint: returns early when bootstrap root is missing", () => {
    assert.doesNotThrow(function () {
        loadEntrypoint({}, {});
    });
});

test("registry entrypoint: returns early when bootstrap context is null", () => {
    const events = {
        bootstrapCalls: 0
    };

    loadEntrypoint({
        RegistryPageBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return null;
            }
        },
        RegistryPageHelpers: {
            normalizeArray: function () {}
        },
        RegistryPageRuntime: {
            createRuntime: function () {
                throw new Error("Should not be called");
            }
        }
    }, { id: "doc" });

    assert.equal(events.bootstrapCalls, 1);
});

test("registry entrypoint: composes runtime, binds handlers and triggers initial load", () => {
    const events = {
        bootstrapCalls: 0,
        runtimeOptions: null,
        bindCalls: 0,
        loadCalls: 0
    };

    const statusElement = createStatusElement();
    statusElement.classList.owner = statusElement;
    const controls = { statusElement: statusElement };

    loadEntrypoint({
        fetch: async function () {},
        RegistryPageBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return {
                    endpoint: "/api/registry/lots",
                    controls: controls
                };
            }
        },
        RegistryPageHelpers: {
            normalizeArray: function () {}
        },
        RegistryPageRuntime: {
            createRuntime: function (options) {
                events.runtimeOptions = options;
                return {
                    bind: function () {
                        events.bindCalls += 1;
                    },
                    load: function () {
                        events.loadCalls += 1;
                    }
                };
            }
        }
    }, { id: "doc" });

    assert.equal(events.bootstrapCalls, 1);
    assert.equal(events.runtimeOptions.endpoint, "/api/registry/lots");
    assert.equal(events.runtimeOptions.controls, controls);
    assert.equal(typeof events.runtimeOptions.fetchImpl, "function");
    assert.equal(typeof events.runtimeOptions.helpers.normalizeArray, "function");
    assert.equal(events.bindCalls, 1);
    assert.equal(events.loadCalls, 1);
});

test("registry entrypoint: initialization error sets fatal status", () => {
    const statusElement = createStatusElement();
    statusElement.classList.owner = statusElement;

    loadEntrypoint({
        console: {
            error: function () {}
        },
        RegistryPageBootstrap: {
            createBootstrapContext: function () {
                return {
                    endpoint: "/api/registry/projects",
                    controls: {
                        statusElement: statusElement
                    }
                };
            }
        },
        RegistryPageHelpers: {
            normalizeArray: function () {}
        },
        RegistryPageRuntime: {
            createRuntime: function () {
                throw new Error("runtime failed");
            }
        }
    }, { id: "doc" });

    assert.equal(statusElement.textContent, "runtime failed");
    assert.deepEqual(statusElement.toggles.at(-1), { name: "registry-status--error", value: true });
});
