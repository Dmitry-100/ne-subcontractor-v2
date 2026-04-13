"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const projectsGridModulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/projects-grid.js");

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

function loadProjectsGrid(windowMock, documentMock) {
    delete require.cache[projectsGridModulePath];
    global.window = windowMock;
    global.document = documentMock;
    require(projectsGridModulePath);
    delete global.window;
    delete global.document;
}

test("projects grid entrypoint: returns early when ProjectsBootstrap is missing", () => {
    assert.doesNotThrow(function () {
        loadProjectsGrid({}, {});
    });
});

test("projects grid entrypoint: returns early when bootstrap context is null", () => {
    const events = {
        bootstrapCalls: 0
    };

    loadProjectsGrid({
        ProjectsBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return null;
            }
        }
    }, { id: "doc" });

    assert.equal(events.bootstrapCalls, 1);
});

test("projects grid entrypoint: composes helpers/api/runtime/grid modules", () => {
    const events = {
        bootstrapCalls: 0,
        apiOptions: null,
        runtimeOptions: null,
        gridOptions: null
    };

    const statusElement = createStatusElement();
    statusElement.classList.owner = statusElement;

    const controls = {
        gridElement: { id: "projects-grid" },
        statusElement: statusElement
    };

    loadProjectsGrid({
        jQuery: function () {},
        DevExpress: {
            data: {
                CustomStore: function CustomStoreStub() {}
            }
        },
        ProjectsBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return {
                    endpoint: "/api/custom/projects",
                    controls: controls,
                    moduleRoots: {
                        projectsHelpersRoot: {
                            createHelpers: function () {
                                return {
                                    normalizeGuid: function (value) { return value; },
                                    toTrimmedString: function (value) { return String(value ?? "").trim(); },
                                    parseErrorBody: function () { return "parsed"; }
                                };
                            }
                        },
                        projectsApiRoot: {
                            createApiClient: function (options) {
                                events.apiOptions = options;
                                return { id: "api-client" };
                            }
                        },
                        projectsRuntimeRoot: {
                            createRuntime: function (options) {
                                events.runtimeOptions = options;
                                return {
                                    createStore: function () {
                                        return { id: "projects-store" };
                                    }
                                };
                            }
                        },
                        projectsGridsRoot: {
                            createGrid: function (options) {
                                events.gridOptions = options;
                                return { id: "grid-instance" };
                            }
                        }
                    }
                };
            }
        }
    }, { id: "doc" });

    assert.equal(events.bootstrapCalls, 1);
    assert.equal(events.apiOptions.endpoint, "/api/custom/projects");
    assert.equal(typeof events.apiOptions.parseErrorBody, "function");
    assert.equal(events.runtimeOptions.apiClient.id, "api-client");
    assert.equal(events.runtimeOptions.customStoreCtor.name, "CustomStoreStub");
    assert.equal(typeof events.runtimeOptions.setStatus, "function");
    assert.equal(events.gridOptions.gridElement.id, "projects-grid");
    assert.equal(events.gridOptions.store.id, "projects-store");
    assert.equal(typeof events.gridOptions.setStatus, "function");
});

test("projects grid entrypoint: initialization error updates status", () => {
    const statusElement = createStatusElement();
    statusElement.classList.owner = statusElement;

    loadProjectsGrid({
        jQuery: function () {},
        DevExpress: {
            data: {
                CustomStore: function CustomStoreStub() {}
            }
        },
        ProjectsBootstrap: {
            createBootstrapContext: function () {
                return {
                    endpoint: "/api/custom/projects",
                    controls: {
                        gridElement: { id: "projects-grid" },
                        statusElement: statusElement
                    },
                    moduleRoots: {
                        projectsHelpersRoot: {
                            createHelpers: function () {
                                throw new Error("helpers failed");
                            }
                        },
                        projectsApiRoot: { createApiClient: function () { return {}; } },
                        projectsRuntimeRoot: { createRuntime: function () { return {}; } },
                        projectsGridsRoot: { createGrid: function () { return {}; } }
                    }
                };
            }
        }
    }, { id: "doc" });

    assert.equal(statusElement.textContent, "helpers failed");
    assert.deepEqual(statusElement.toggles.at(-1), { name: "projects-status--error", value: true });
});
