"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dashboardBootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-bootstrap.js"));

function createStatusElement() {
    return {
        textContent: "",
        classList: {
            values: [],
            add: function (value) {
                this.values.push(value);
            }
        }
    };
}

function createControls(statusElementOverride) {
    const statusElement = statusElementOverride || createStatusElement();
    return {
        "[data-dashboard-status]": statusElement,
        "[data-dashboard-refresh]": { id: "dashboard-refresh" },
        "[data-dashboard-tasks]": { id: "dashboard-tasks" },
        '[data-dashboard-status-list="lots"]': { id: "dashboard-lots" },
        '[data-dashboard-status-list="procedures"]': { id: "dashboard-procedures" },
        '[data-dashboard-status-list="contracts"]': { id: "dashboard-contracts" }
    };
}

function createModuleRoot(attributes, controls, disclosures) {
    const attributeMap = attributes || {};
    const controlMap = controls || {};
    const disclosureList = disclosures || [];
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
        },
        querySelectorAll: function (selector) {
            if (selector === ".dashboard-disclosure") {
                return disclosureList;
            }

            return [];
        }
    };
}

function createDocument(moduleRoot) {
    return {
        querySelector: function (selector) {
            if (selector === "[data-dashboard-module]") {
                return moduleRoot;
            }

            return null;
        }
    };
}

function createWindowModules(overrides) {
    const modules = {
        DashboardPageHelpers: { createHelpers: function () {} },
        DashboardPageFormatters: { createFormatters: function () {} }
    };

    return Object.assign(modules, overrides || {});
}

function createDisclosureElement(isOpen) {
    const hint = { textContent: "" };
    const summary = {
        querySelector: function (selector) {
            if (selector === ".dashboard-disclosure__hint") {
                return hint;
            }

            return null;
        }
    };

    let toggleHandler = null;
    const disclosure = {
        open: Boolean(isOpen),
        querySelector: function (selector) {
            if (selector === "summary") {
                return summary;
            }

            return null;
        },
        addEventListener: function (eventName, handler) {
            if (eventName === "toggle") {
                toggleHandler = handler;
            }
        },
        emitToggle: function () {
            if (typeof toggleHandler === "function") {
                toggleHandler();
            }
        }
    };

    return {
        element: disclosure,
        hint: hint
    };
}

test("dashboard bootstrap: createBootstrapContext validates required document", () => {
    assert.throws(
        function () {
            dashboardBootstrapModule.createBootstrapContext({});
        },
        /document with querySelector/);
});

test("dashboard bootstrap: returns null when module root is missing", () => {
    const context = dashboardBootstrapModule.createBootstrapContext({
        document: createDocument(null),
        window: createWindowModules()
    });

    assert.equal(context, null);
});

test("dashboard bootstrap: returns null when a required control is missing", () => {
    const controls = createControls();
    delete controls["[data-dashboard-refresh]"];

    const context = dashboardBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createWindowModules()
    });

    assert.equal(context, null);
});

test("dashboard bootstrap: logs missing helper module dependency", () => {
    const statusElement = createStatusElement();
    const loggedMessages = [];
    const context = dashboardBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, createControls(statusElement))),
        window: createWindowModules({ DashboardPageHelpers: {} }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.equal(statusElement.textContent, "Не удалось инициализировать модуль дашборда: helper-скрипт не загружен.");
    assert.deepEqual(loggedMessages, ["Не удалось инициализировать модуль дашборда: helper-скрипт не загружен."]);
    assert.deepEqual(statusElement.classList.values, ["dashboard-status--error"]);
});

test("dashboard bootstrap: logs missing formatter module dependency", () => {
    const statusElement = createStatusElement();
    const loggedMessages = [];
    const context = dashboardBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, createControls(statusElement))),
        window: createWindowModules({ DashboardPageFormatters: {} }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.equal(statusElement.textContent, "Не удалось инициализировать модуль дашборда: formatter-скрипт не загружен.");
    assert.deepEqual(loggedMessages, ["Не удалось инициализировать модуль дашборда: formatter-скрипт не загружен."]);
    assert.deepEqual(statusElement.classList.values, ["dashboard-status--error"]);
});

test("dashboard bootstrap: resolves endpoints, controls and module roots", () => {
    const controls = createControls();
    const moduleRoot = createModuleRoot({
        "data-api-endpoint": "/api/custom/dashboard",
        "data-analytics-endpoint": "/api/custom/analytics"
    }, controls);
    const windowModules = createWindowModules();

    const context = dashboardBootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: windowModules
    });

    assert.equal(context.moduleRoot, moduleRoot);
    assert.equal(context.endpoint, "/api/custom/dashboard");
    assert.equal(context.analyticsEndpoint, "/api/custom/analytics");
    assert.equal(context.controls.statusElement, controls["[data-dashboard-status]"]);
    assert.equal(context.controls.refreshButton, controls["[data-dashboard-refresh]"]);
    assert.equal(context.controls.tasksElement, controls["[data-dashboard-tasks]"]);
    assert.equal(context.controls.lotStatusesElement, controls['[data-dashboard-status-list="lots"]']);
    assert.equal(context.controls.procedureStatusesElement, controls['[data-dashboard-status-list="procedures"]']);
    assert.equal(context.controls.contractStatusesElement, controls['[data-dashboard-status-list="contracts"]']);
    assert.equal(context.moduleRoots.dashboardHelpersRoot, windowModules.DashboardPageHelpers);
    assert.equal(context.moduleRoots.dashboardFormattersRoot, windowModules.DashboardPageFormatters);
});

test("dashboard bootstrap: initializeDisclosureHints syncs and toggles hint text", () => {
    const firstDisclosure = createDisclosureElement(false);
    const secondDisclosure = createDisclosureElement(true);
    const moduleRoot = createModuleRoot({}, createControls(), [firstDisclosure.element, secondDisclosure.element]);

    dashboardBootstrapModule.initializeDisclosureHints(moduleRoot);

    assert.equal(firstDisclosure.hint.textContent, "развернуть");
    assert.equal(secondDisclosure.hint.textContent, "свернуть");

    firstDisclosure.element.open = true;
    firstDisclosure.element.emitToggle();
    assert.equal(firstDisclosure.hint.textContent, "свернуть");
});
