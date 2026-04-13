"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const bootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-bootstrap.js"));

const REQUIRED_CONTROL_SELECTORS = [
    "[data-contractors-status]",
    "[data-contractors-rating-status]",
    "[data-contractors-selected]",
    "[data-contractors-history-status]",
    "[data-contractors-analytics-status]",
    "[data-contractors-refresh]",
    "[data-contractors-recalculate-all]",
    "[data-contractors-recalculate-selected]",
    "[data-contractors-reload-model]",
    "[data-contractors-save-model]",
    "[data-contractors-manual-save]",
    "[data-contractors-model-version-code]",
    "[data-contractors-model-name]",
    "[data-contractors-model-notes]",
    "[data-contractors-weight-delivery]",
    "[data-contractors-weight-commercial]",
    "[data-contractors-weight-claim]",
    "[data-contractors-weight-manual]",
    "[data-contractors-weight-workload]",
    "[data-contractors-manual-score]",
    "[data-contractors-manual-comment]",
    "[data-contractors-grid]",
    "[data-contractors-history-grid]",
    "[data-contractors-analytics-grid]"
];

function createRequiredControls() {
    const controls = {};
    for (let index = 0; index < REQUIRED_CONTROL_SELECTORS.length; index += 1) {
        const selector = REQUIRED_CONTROL_SELECTORS[index];
        controls[selector] = {
            selector: selector,
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
            if (selector === "[data-contractors-module]") {
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
        ContractorsGridHelpers: { createHelpers: function () {} },
        ContractorsApi: { createApiClient: function () {} },
        ContractorsGrids: { createGrids: function () {} },
        ContractorsData: { createDataRuntime: function () {} },
        ContractorsModel: { createModelService: function () {} },
        ContractorsUiState: { createUiState: function () {} },
        ContractorsActions: { createActions: function () {} }
    };

    return Object.assign(modules, overrides || {});
}

test("contractors bootstrap: createBootstrapContext validates required document", () => {
    assert.throws(
        function () {
            bootstrapModule.createBootstrapContext({});
        },
        /document with querySelector/);
});

test("contractors bootstrap: returns null when module root is missing", () => {
    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(null),
        window: createRequiredWindowModules()
    });

    assert.equal(context, null);
});

test("contractors bootstrap: returns null when a required control is missing", () => {
    const controls = createRequiredControls();
    delete controls["[data-contractors-grid]"];

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules()
    });

    assert.equal(context, null);
});

test("contractors bootstrap: logs DevExpress diagnostic when runtime is unavailable", () => {
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

test("contractors bootstrap: logs missing module dependency", () => {
    const loggedMessages = [];
    const controls = createRequiredControls();

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules({ ContractorsApi: {} }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипт ContractorsApi не загружен. Проверьте порядок подключения скриптов."]);
});

test("contractors bootstrap: resolves endpoints, controls and module roots", () => {
    const controls = createRequiredControls();
    const attributes = {
        "data-api-endpoint": "/api/custom/contractors",
        "data-rating-model-endpoint": "/api/custom/contractors/model",
        "data-rating-recalculate-endpoint": "/api/custom/contractors/recalculate",
        "data-rating-analytics-endpoint": "/api/custom/contractors/analytics"
    };
    const moduleRoot = createModuleRoot(attributes, controls);
    const windowModules = createRequiredWindowModules();

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: windowModules
    });

    assert.equal(context.endpoints.endpoint, "/api/custom/contractors");
    assert.equal(context.endpoints.ratingModelEndpoint, "/api/custom/contractors/model");
    assert.equal(context.endpoints.ratingRecalculateEndpoint, "/api/custom/contractors/recalculate");
    assert.equal(context.endpoints.ratingAnalyticsEndpoint, "/api/custom/contractors/analytics");
    assert.equal(context.controls.contractorsGridElement, controls["[data-contractors-grid]"]);
    assert.equal(context.moduleRoots.contractorsGridHelpersRoot, windowModules.ContractorsGridHelpers);
    assert.equal(context.moduleRoots.contractorsApiRoot, windowModules.ContractorsApi);
    assert.equal(context.moduleRoots.contractorsGridsRoot, windowModules.ContractorsGrids);
    assert.equal(context.moduleRoots.contractorsDataRoot, windowModules.ContractorsData);
    assert.equal(context.moduleRoots.contractorsModelRoot, windowModules.ContractorsModel);
    assert.equal(context.moduleRoots.contractorsUiStateRoot, windowModules.ContractorsUiState);
    assert.equal(context.moduleRoots.contractorsActionsRoot, windowModules.ContractorsActions);
});
