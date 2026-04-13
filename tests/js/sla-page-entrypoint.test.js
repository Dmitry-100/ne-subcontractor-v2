"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const entrypointModulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/sla-page.js");

function createStatusElement() {
    return {
        textContent: "",
        toggles: [],
        classList: {
            owner: null,
            toggle: function (name, value) {
                this.owner.toggles.push({ name: name, value: value });
            }
        }
    };
}

function loadEntrypoint(windowMock, documentMock) {
    delete require.cache[entrypointModulePath];
    global.window = windowMock;
    global.document = documentMock;
    require(entrypointModulePath);
    delete global.window;
    delete global.document;
}

test("sla entrypoint: returns early when module element is missing", () => {
    assert.doesNotThrow(function () {
        loadEntrypoint({}, {
            querySelector: function () {
                return null;
            }
        });
    });
});

test("sla entrypoint: delegates initialization to runtime module", () => {
    const events = {
        initializeOptions: null
    };

    const statusElement = createStatusElement();
    statusElement.classList.owner = statusElement;
    const moduleElement = {
        dataset: {},
        querySelector: function (selector) {
            if (selector === "[data-sla-status]") {
                return statusElement;
            }

            return null;
        }
    };

    loadEntrypoint({
        SlaPageRuntime: {
            initializeSlaPage: function (options) {
                events.initializeOptions = options;
            }
        },
        SlaPageHelpers: { createHelpers: function () {} },
        SlaPageApi: { createApiClient: function () {} },
        SlaPageRules: { createDraftRule: function () {}, renderRulesMarkup: function () {}, collectRulesFromRows: function () {} },
        SlaPageViolations: { renderViolationsMarkup: function () {}, buildViolationReasonPayload: function () {} }
    }, {
        querySelector: function (selector) {
            if (selector === "[data-sla-module]") {
                return moduleElement;
            }

            return null;
        }
    });

    assert.equal(events.initializeOptions.moduleElement, moduleElement);
    assert.equal(typeof events.initializeOptions.setStatus, "function");
    assert.equal(events.initializeOptions.moduleRoots.helpersRoot.createHelpers instanceof Function, true);
});

test("sla entrypoint: reports runtime initialization errors in status", () => {
    const statusElement = createStatusElement();
    statusElement.classList.owner = statusElement;

    const moduleElement = {
        dataset: {},
        querySelector: function (selector) {
            if (selector === "[data-sla-status]") {
                return statusElement;
            }

            return null;
        }
    };

    loadEntrypoint({
        SlaPageRuntime: {
            initializeSlaPage: function () {
                throw new Error("runtime failed");
            }
        },
        SlaPageHelpers: {},
        SlaPageApi: {},
        SlaPageRules: {},
        SlaPageViolations: {}
    }, {
        querySelector: function (selector) {
            if (selector === "[data-sla-module]") {
                return moduleElement;
            }

            return null;
        }
    });

    assert.equal(statusElement.textContent, "runtime failed");
    assert.deepEqual(statusElement.toggles.at(-1), { name: "dashboard-status--error", value: true });
});
