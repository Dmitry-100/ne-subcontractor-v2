"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const projectsBootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/projects-bootstrap.js"));

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
            if (selector === "[data-projects-module]") {
                return moduleRoot;
            }

            return null;
        }
    };
}

function createControls() {
    return {
        "[data-projects-grid]": { id: "projects-grid" },
        "[data-projects-status]": {
            textContent: "",
            classList: {
                add: function () {}
            }
        }
    };
}

function createWindowModules(overrides) {
    const modules = {
        jQuery: function () {},
        DevExpress: { data: {} },
        ProjectsHelpers: { createHelpers: function () {} },
        ProjectsApi: { createApiClient: function () {} },
        ProjectsRuntime: { createRuntime: function () {} },
        ProjectsGrids: { createGrid: function () {} }
    };

    return Object.assign(modules, overrides || {});
}

test("projects bootstrap: createBootstrapContext validates required document", () => {
    assert.throws(
        function () {
            projectsBootstrapModule.createBootstrapContext({});
        },
        /document with querySelector/);
});

test("projects bootstrap: returns null when module root is missing", () => {
    const context = projectsBootstrapModule.createBootstrapContext({
        document: createDocument(null),
        window: createWindowModules()
    });

    assert.equal(context, null);
});

test("projects bootstrap: returns null when required controls are missing", () => {
    const controls = createControls();
    delete controls["[data-projects-grid]"];

    const context = projectsBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, controls)),
        window: createWindowModules()
    });

    assert.equal(context, null);
});

test("projects bootstrap: logs DevExpress diagnostic when runtime is unavailable", () => {
    const loggedMessages = [];
    const context = projectsBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, createControls())),
        window: createWindowModules({ DevExpress: null }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим)."]);
});

test("projects bootstrap: logs missing module dependency", () => {
    const loggedMessages = [];
    const context = projectsBootstrapModule.createBootstrapContext({
        document: createDocument(createModuleRoot({}, createControls())),
        window: createWindowModules({ ProjectsApi: {} }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(context, null);
    assert.deepEqual(loggedMessages, ["Скрипт ProjectsApi не загружен. Проверьте порядок подключения скриптов."]);
});

test("projects bootstrap: resolves endpoint, controls and module roots", () => {
    const controls = createControls();
    const moduleRoot = createModuleRoot({ "data-api-endpoint": "/api/custom/projects" }, controls);
    const windowModules = createWindowModules();

    const context = projectsBootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: windowModules
    });

    assert.equal(context.endpoint, "/api/custom/projects");
    assert.equal(context.controls.gridElement, controls["[data-projects-grid]"]);
    assert.equal(context.controls.statusElement, controls["[data-projects-status]"]);
    assert.equal(context.moduleRoots.projectsHelpersRoot, windowModules.ProjectsHelpers);
    assert.equal(context.moduleRoots.projectsApiRoot, windowModules.ProjectsApi);
    assert.equal(context.moduleRoots.projectsRuntimeRoot, windowModules.ProjectsRuntime);
    assert.equal(context.moduleRoots.projectsGridsRoot, windowModules.ProjectsGrids);
});
