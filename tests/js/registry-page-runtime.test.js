"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpers = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/registry-page-helpers.js"));
const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/registry-page-runtime.js"));

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

function createControls() {
    const statusElement = createStatusElement();
    statusElement.classList.owner = statusElement;
    return {
        statusElement: statusElement,
        searchInput: {
            value: "",
            listeners: {},
            addEventListener: function (eventName, handler) {
                this.listeners[eventName] = handler;
            }
        },
        refreshButton: {
            listeners: {},
            addEventListener: function (eventName, handler) {
                this.listeners[eventName] = handler;
            }
        },
        rawWrap: {
            hidden: true
        },
        rawElement: {
            textContent: ""
        }
    };
}

test("registry runtime: validates required dependencies", () => {
    assert.throws(function () {
        runtimeModule.createRuntime({});
    }, /endpoint/i);

    assert.throws(function () {
        runtimeModule.createRuntime({
            endpoint: "/api/registry/projects",
            fetchImpl: async function () {},
            helpers: {}
        });
    }, /helpers\.isObject/i);
});

test("registry runtime: load handles successful response", async () => {
    const controls = createControls();
    const calls = [];
    const runtime = runtimeModule.createRuntime({
        endpoint: "/api/registry/projects",
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                json: async function () {
                    return [{ code: "PRJ-001", name: "Пилот" }];
                }
            };
        },
        helpers: helpers,
        controls: controls
    });

    await runtime.load();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/registry/projects");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(controls.statusElement.textContent, "Загружено записей: 1.");
    assert.deepEqual(controls.statusElement.toggles.at(-1), { name: "registry-status--error", value: false });
    assert.equal(controls.rawWrap.hidden, false);
    assert.match(controls.rawElement.textContent, /PRJ-001/);
});

test("registry runtime: load handles non-ok response and reports diagnostics", async () => {
    const controls = createControls();
    const runtime = runtimeModule.createRuntime({
        endpoint: "/api/registry/projects",
        fetchImpl: async function () {
            return {
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
                text: async function () {
                    return "server-failed";
                }
            };
        },
        helpers: helpers,
        controls: controls
    });

    await runtime.load();

    assert.equal(controls.statusElement.textContent, "Ошибка запроса (500).");
    assert.deepEqual(controls.statusElement.toggles.at(-1), { name: "registry-status--error", value: true });
    assert.equal(controls.rawWrap.hidden, false);
    assert.match(controls.rawElement.textContent, /"status": 500/);
    assert.match(controls.rawElement.textContent, /server-failed/);
});

test("registry runtime: applyLocalFilter uses projected columns from loaded payload", async () => {
    const controls = createControls();
    const runtime = runtimeModule.createRuntime({
        endpoint: "/api/registry/projects",
        fetchImpl: async function () {
            return {
                ok: true,
                json: async function () {
                    return [
                        { code: "A-01", name: "Насос" },
                        { code: "B-02", name: "Компрессор" }
                    ];
                }
            };
        },
        helpers: helpers,
        controls: controls
    });

    await runtime.load();
    const filtered = runtime.applyLocalFilter("нас");

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].code, "A-01");
    assert.equal(controls.statusElement.textContent, "Показано записей: 1 из 2.");
});

test("registry runtime: bind wires refresh and search handlers", () => {
    const controls = createControls();
    const runtime = runtimeModule.createRuntime({
        endpoint: "/api/registry/projects",
        fetchImpl: async function () {
            return {
                ok: true,
                json: async function () {
                    return [];
                }
            };
        },
        helpers: helpers,
        controls: controls
    });

    runtime.bind();

    assert.equal(typeof controls.refreshButton.listeners.click, "function");
    assert.equal(typeof controls.searchInput.listeners.input, "function");
});
