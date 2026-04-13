"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const bootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-bootstrap.js"));

const REQUIRED_CONTROL_SELECTORS = [
    "[data-procedures-grid]",
    "[data-procedures-history-grid]",
    "[data-procedures-status]",
    "[data-procedures-selected]",
    "[data-procedures-transition-status]",
    "[data-procedures-target]",
    "[data-procedures-reason]",
    "[data-procedures-apply]",
    "[data-procedures-history-refresh]",
    "[data-procedures-shortlist-selected]",
    "[data-procedures-shortlist-max-included]",
    "[data-procedures-shortlist-adjustment-reason]",
    "[data-procedures-shortlist-build]",
    "[data-procedures-shortlist-apply]",
    "[data-procedures-shortlist-adjustments-refresh]",
    "[data-procedures-shortlist-status]",
    "[data-procedures-shortlist-adjustments-status]",
    "[data-procedures-shortlist-grid]",
    "[data-procedures-shortlist-adjustments-grid]"
];

function createRequiredControls() {
    const controls = {};
    for (let index = 0; index < REQUIRED_CONTROL_SELECTORS.length; index += 1) {
        const selector = REQUIRED_CONTROL_SELECTORS[index];
        controls[selector] = { selector: selector };
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
            if (selector === "[data-procedures-module]") {
                return moduleRoot;
            }

            return null;
        }
    };
}

function createRequiredWindowModules(overrides) {
    const modules = {
        jQuery: {},
        DevExpress: { data: {} },
        ProceduresConfig: { createConfig: function () {} },
        ProceduresServices: { createServices: function () {} },
        ProceduresGridHelpers: { createHelpers: function () {} },
        ProceduresApi: { createApiClient: function () {} },
        ProceduresWorkflow: { createWorkflow: function () {} },
        ProceduresGridColumns: { createColumns: function () {} },
        ProceduresGrids: { createProceduresGrid: function () {} },
        ProceduresStore: { createStore: function () {} },
        ProceduresRegistryEvents: { createGridCallbacks: function () {} },
        ProceduresData: { createDataService: function () {} },
        ProceduresShortlist: { createShortlistWorkspace: function () {} },
        ProceduresSelection: { createSelectionController: function () {} },
        ProceduresTransition: { createTransitionController: function () {} }
    };

    return Object.assign(modules, overrides || {});
}

test("procedures bootstrap: createBootstrapContext validates required document", () => {
    assert.throws(
        function () {
            bootstrapModule.createBootstrapContext({});
        },
        /document with querySelector/);
});

test("procedures bootstrap: returns null when module root is missing", () => {
    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(null),
        window: createRequiredWindowModules()
    });

    assert.equal(context, null);
});

test("procedures bootstrap: returns null when a required control is missing", () => {
    const controls = createRequiredControls();
    delete controls["[data-procedures-shortlist-grid]"];

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules()
    });

    assert.equal(context, null);
});

test("procedures bootstrap: logs DevExpress diagnostic when runtime is unavailable", () => {
    const loggedMessages = [];
    const controls = createRequiredControls();

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules({ DevExpress: null }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим)."]);
});

test("procedures bootstrap: logs missing module dependency", () => {
    const loggedMessages = [];
    const controls = createRequiredControls();

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules({ ProceduresSelection: {} }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипт ProceduresSelection не загружен. Проверьте порядок подключения скриптов."]);
});

test("procedures bootstrap: resolves endpoint, controls and module roots", () => {
    const controls = createRequiredControls();
    const attributes = {
        "data-api-endpoint": "/api/custom/procedures"
    };
    const moduleRoot = createModuleRoot(attributes, controls);
    const windowModules = createRequiredWindowModules();

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: windowModules
    });

    assert.equal(context.endpoint, "/api/custom/procedures");
    assert.equal(context.controls.gridElement, controls["[data-procedures-grid]"]);
    assert.equal(context.moduleRoots.proceduresConfigRoot, windowModules.ProceduresConfig);
    assert.equal(context.moduleRoots.proceduresServicesRoot, windowModules.ProceduresServices);
    assert.equal(context.moduleRoots.proceduresGridsRoot, windowModules.ProceduresGrids);
    assert.equal(context.moduleRoots.proceduresStoreRoot, windowModules.ProceduresStore);
    assert.equal(context.moduleRoots.proceduresRegistryEventsRoot, windowModules.ProceduresRegistryEvents);
    assert.equal(context.moduleRoots.proceduresDataRoot, windowModules.ProceduresData);
    assert.equal(context.moduleRoots.proceduresTransitionRoot, windowModules.ProceduresTransition);
});
