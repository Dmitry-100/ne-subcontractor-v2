"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotsBootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-bootstrap.js"));

const REQUIRED_CONTROL_SELECTORS = [
    "[data-lots-grid]",
    "[data-lots-history-grid]",
    "[data-lots-status]",
    "[data-lots-selected]",
    "[data-lots-transition-status]",
    "[data-lots-next]",
    "[data-lots-rollback]",
    "[data-lots-history-refresh]"
];

function createRequiredControls() {
    const controls = {};
    for (let index = 0; index < REQUIRED_CONTROL_SELECTORS.length; index += 1) {
        const selector = REQUIRED_CONTROL_SELECTORS[index];
        controls[selector] = {
            selector: selector,
            textContent: "",
            classList: {
                add: function () {}
            }
        };
    }

    return controls;
}

function createModuleRoot(attributes, controls) {
    const attributeMap = attributes || {};
    const controlMap = controls || {};
    return {
        getAttribute: function (name) {
            return Object.prototype.hasOwnProperty.call(attributeMap, name)
                ? attributeMap[name]
                : null;
        },
        querySelector: function (selector) {
            return Object.prototype.hasOwnProperty.call(controlMap, selector)
                ? controlMap[selector]
                : null;
        }
    };
}

function createDocument(moduleRoot) {
    return {
        querySelector: function (selector) {
            if (selector === "[data-lots-module]") {
                return moduleRoot;
            }

            return null;
        }
    };
}

function createRequiredWindowModules(overrides) {
    const modules = {
        jQuery: function () {},
        DevExpress: { data: {} },
        LotsHelpers: { createHelpers: function () {} },
        LotsApi: { createApiClient: function () {} },
        LotsGrids: { createGrids: function () {} },
        LotsData: { createDataRuntime: function () {} },
        LotsActions: { createActions: function () {} },
        LotsUiState: { createUiState: function () {} }
    };

    return Object.assign(modules, overrides || {});
}

test("lots bootstrap: createBootstrapContext validates required document", () => {
    assert.throws(
        function () {
            lotsBootstrapModule.createBootstrapContext({});
        },
        /document with querySelector/);
});

test("lots bootstrap: returns null when module root is missing", () => {
    const context = lotsBootstrapModule.createBootstrapContext({
        document: createDocument(null),
        window: createRequiredWindowModules()
    });

    assert.equal(context, null);
});

test("lots bootstrap: returns null when required control is missing", () => {
    const controls = createRequiredControls();
    delete controls["[data-lots-history-grid]"];

    const context = lotsBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules()
    });

    assert.equal(context, null);
});

test("lots bootstrap: logs DevExpress diagnostic when runtime is unavailable", () => {
    const loggedMessages = [];
    const controls = createRequiredControls();

    const context = lotsBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules({ DevExpress: null }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим)."]);
});

test("lots bootstrap: logs missing module dependency", () => {
    const loggedMessages = [];
    const controls = createRequiredControls();

    const context = lotsBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules({ LotsApi: {} }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипт LotsApi не загружен. Проверьте порядок подключения скриптов."]);
});

test("lots bootstrap: resolves endpoint, controls and module roots", () => {
    const controls = createRequiredControls();
    const attributes = {
        "data-api-endpoint": "/api/custom/lots"
    };
    const moduleRoot = createModuleRoot(attributes, controls);
    const windowModules = createRequiredWindowModules();

    const context = lotsBootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: windowModules
    });

    assert.equal(context.endpoint, "/api/custom/lots");
    assert.equal(context.controls.statusElement, controls["[data-lots-status]"]);
    assert.equal(context.controls.nextButton, controls["[data-lots-next]"]);
    assert.equal(context.moduleRoots.lotsHelpersRoot, windowModules.LotsHelpers);
    assert.equal(context.moduleRoots.lotsApiRoot, windowModules.LotsApi);
    assert.equal(context.moduleRoots.lotsGridsRoot, windowModules.LotsGrids);
    assert.equal(context.moduleRoots.lotsDataRoot, windowModules.LotsData);
    assert.equal(context.moduleRoots.lotsActionsRoot, windowModules.LotsActions);
    assert.equal(context.moduleRoots.lotsUiStateRoot, windowModules.LotsUiState);
});
