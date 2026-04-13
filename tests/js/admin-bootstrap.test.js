"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const bootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-bootstrap.js"));

const REQUIRED_CONTROL_SELECTORS = [
    "[data-admin-users-grid]",
    "[data-admin-users-status]",
    "[data-admin-users-search]",
    "[data-admin-users-search-apply]",
    "[data-admin-users-search-reset]",
    "[data-admin-roles-grid]",
    "[data-admin-roles-status]",
    "[data-admin-reference-grid]",
    "[data-admin-reference-status]",
    "[data-admin-reference-type-code]",
    "[data-admin-reference-active-only]",
    "[data-admin-reference-load]",
    "[data-admin-reference-open-api]"
];

function createClassList() {
    return {
        toggled: [],
        added: [],
        toggle: function (className, value) {
            this.toggled.push({ className: className, value: value });
        },
        add: function (className) {
            this.added.push(className);
        }
    };
}

function createRequiredControls() {
    const controls = {};
    for (let index = 0; index < REQUIRED_CONTROL_SELECTORS.length; index += 1) {
        const selector = REQUIRED_CONTROL_SELECTORS[index];
        controls[selector] = {
            selector: selector,
            textContent: "",
            classList: createClassList()
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
            if (selector === "[data-admin-module]") {
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
        AdminMessages: { createMessages: function () {} },
        AdminHelpers: { createHelpers: function () {} },
        AdminApi: { createApiClient: function () {} },
        AdminRuntime: { createRuntime: function () {} },
        AdminGrids: { createGrids: function () {} },
        AdminWiring: { createWiring: function () {} }
    };

    return Object.assign(modules, overrides || {});
}

test("admin bootstrap: createBootstrapContext validates required document", () => {
    assert.throws(function () {
        bootstrapModule.createBootstrapContext({});
    }, /document with querySelector/i);
});

test("admin bootstrap: returns null when module root is missing", () => {
    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(null),
        window: createRequiredWindowModules()
    });

    assert.equal(context, null);
});

test("admin bootstrap: returns null when a required control is missing", () => {
    const controls = createRequiredControls();
    delete controls["[data-admin-reference-grid]"];

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules()
    });

    assert.equal(context, null);
});

test("admin bootstrap: logs DevExpress diagnostic and marks all status blocks", () => {
    const controls = createRequiredControls();
    const loggedMessages = [];

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules({ DevExpress: null }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим)."]);

    assert.equal(controls["[data-admin-users-status]"].textContent, "Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).");
    assert.equal(controls["[data-admin-roles-status]"].textContent, "Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).");
    assert.equal(controls["[data-admin-reference-status]"].textContent, "Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).");
});

test("admin bootstrap: logs missing module dependency", () => {
    const controls = createRequiredControls();
    const loggedMessages = [];

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createRequiredWindowModules({ AdminApi: {} }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипт AdminApi не загружен. Проверьте порядок подключения скриптов."]);
});

test("admin bootstrap: resolves endpoints, controls and module roots", () => {
    const controls = createRequiredControls();
    const attributes = {
        "data-users-api-endpoint": "/api/custom/admin/users",
        "data-roles-api-endpoint": "/api/custom/admin/roles",
        "data-reference-api-root": "/api/custom/reference-data"
    };
    const moduleRoot = createModuleRoot(attributes, controls);
    const windowModules = createRequiredWindowModules();

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: windowModules
    });

    assert.equal(context.endpoints.usersEndpoint, "/api/custom/admin/users");
    assert.equal(context.endpoints.rolesEndpoint, "/api/custom/admin/roles");
    assert.equal(context.endpoints.referenceApiRoot, "/api/custom/reference-data");
    assert.equal(context.controls.usersGridElement, controls["[data-admin-users-grid]"]);
    assert.equal(context.controls.referenceOpenApiLink, controls["[data-admin-reference-open-api]"]);
    assert.equal(context.moduleRoots.adminMessagesRoot, windowModules.AdminMessages);
    assert.equal(context.moduleRoots.adminHelpersRoot, windowModules.AdminHelpers);
    assert.equal(context.moduleRoots.adminApiRoot, windowModules.AdminApi);
    assert.equal(context.moduleRoots.adminRuntimeRoot, windowModules.AdminRuntime);
    assert.equal(context.moduleRoots.adminGridsRoot, windowModules.AdminGrids);
    assert.equal(context.moduleRoots.adminWiringRoot, windowModules.AdminWiring);
});
