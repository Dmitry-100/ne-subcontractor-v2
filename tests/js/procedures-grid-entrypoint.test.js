"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const proceduresGridModulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid.js");

function createStatusControl() {
    return {
        textContent: "",
        classList: {
            add: function () {},
            toggle: function () {}
        }
    };
}

function createProceduresControls() {
    return {
        gridElement: { id: "procedures-grid" },
        historyGridElement: { id: "procedures-history-grid" },
        statusElement: createStatusControl(),
        selectedElement: {},
        transitionStatusElement: createStatusControl(),
        targetSelect: {},
        reasonInput: {},
        applyButton: {},
        historyRefreshButton: {},
        shortlistSelectedElement: {},
        shortlistMaxIncludedInput: {},
        shortlistAdjustmentReasonInput: {},
        shortlistBuildButton: {},
        shortlistApplyButton: {},
        shortlistAdjustmentsRefreshButton: {},
        shortlistStatusElement: createStatusControl(),
        shortlistAdjustmentsStatusElement: createStatusControl(),
        shortlistGridElement: { id: "procedures-shortlist-grid" },
        shortlistAdjustmentsGridElement: { id: "procedures-adjustments-grid" }
    };
}

function loadProceduresGrid(windowMock, documentMock) {
    delete require.cache[proceduresGridModulePath];
    global.window = windowMock;
    global.document = documentMock;
    require(proceduresGridModulePath);
    delete global.window;
    delete global.document;
}

async function waitForBootstrapSettled() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(function (resolve) {
        setImmediate(resolve);
    });
}

test("procedures grid entrypoint: returns early when module root is missing", () => {
    assert.doesNotThrow(function () {
        loadProceduresGrid(
            { ProceduresBootstrap: { createBootstrapContext: function () {} } },
            { querySelector: function () { return null; } });
    });
});

test("procedures grid entrypoint: reports missing bootstrap module", () => {
    const bootstrapStatusElement = {
        textContent: "",
        addedClasses: [],
        classList: {
            add: function (className) {
                bootstrapStatusElement.addedClasses.push(className);
            }
        }
    };
    const moduleRoot = {
        querySelector: function (selector) {
            if (selector === "[data-procedures-status]") {
                return bootstrapStatusElement;
            }

            return null;
        }
    };

    loadProceduresGrid({}, {
        querySelector: function (selector) {
            if (selector === "[data-procedures-module]") {
                return moduleRoot;
            }

            return null;
        }
    });

    assert.equal(
        bootstrapStatusElement.textContent,
        "Скрипт ProceduresBootstrap не загружен. Проверьте порядок подключения скриптов.");
    assert.deepEqual(bootstrapStatusElement.addedClasses, ["procedures-status--error"]);
});

test("procedures grid entrypoint: composes bootstrap/services/controllers/grids", async () => {
    const events = {
        bootstrapCalls: 0,
        createServicesOptions: null,
        createStoreOptions: null,
        createHistoryGridOptions: null,
        createShortlistGridOptions: null,
        createShortlistAdjustmentsGridOptions: null,
        createRegistryGridOptions: null,
        createSelectionOptions: null,
        createTransitionOptions: null,
        createShortlistWorkspaceOptions: null,
        createRegistryCallbacksOptions: null,
        transitionBound: false,
        shortlistBound: false,
        selectedCalls: []
    };

    const controls = createProceduresControls();
    const moduleRoot = {
        querySelector: function (selector) {
            if (selector === "[data-procedures-status]") {
                return controls.statusElement;
            }

            return null;
        }
    };

    const selectionController = {
        setTransitionController: function () {},
        setShortlistWorkspace: function () {},
        applySelection: function (selected) {
            events.selectedCalls.push(selected);
            return Promise.resolve();
        },
        getSelectedProcedure: function () {
            return null;
        }
    };

    const transitionController = {
        bindEvents: function () {
            events.transitionBound = true;
        }
    };

    const shortlistWorkspace = {
        bindEvents: function () {
            events.shortlistBound = true;
        }
    };

    loadProceduresGrid({
        jQuery: function () {},
        DevExpress: {
            data: {
                CustomStore: function CustomStoreStub() {}
            }
        },
        location: {
            search: "?status=Sent",
            href: "https://example.test/Home/Procedures",
            assign: function () {}
        },
        ProceduresBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return {
                    endpoint: "/api/custom/procedures",
                    controls: controls,
                    moduleRoots: {
                        proceduresConfigRoot: {
                            createConfig: function () {
                                return {
                                    transitionMap: {}
                                };
                            }
                        },
                        proceduresServicesRoot: {
                            createServices: function (options) {
                                events.createServicesOptions = options;
                                return {
                                    gridHelpers: {
                                        appendFilterHint: function (message) { return message; },
                                        buildUrlWithoutFilters: function (url) { return url; },
                                        createPayload: function (values) { return values; },
                                        updatePayload: function (details, values) { return { details: details, values: values }; },
                                        localizeStatus: function (value) { return value; },
                                        supportsShortlistWorkspace: function () { return true; },
                                        normalizeMaxIncluded: function (value) { return value; },
                                        normalizeAdjustmentReason: function (value) { return value; }
                                    },
                                    urlFilterState: {
                                        hasAny: true
                                    },
                                    apiClient: {
                                        getTransitionHistory: async function () {
                                            return [];
                                        }
                                    },
                                    workflow: {
                                        buildProcedureSelectionSummary: function () { return "selected"; },
                                        buildShortlistSelectionSummary: function () { return "shortlist"; },
                                        validateTransitionRequest: function () { return { targetStatus: "Sent", reason: null }; },
                                        buildTransitionSuccessMessage: function () { return "ok"; }
                                    },
                                    columns: {
                                        historyColumns: [],
                                        shortlistColumns: [],
                                        shortlistAdjustmentsColumns: [],
                                        proceduresColumns: []
                                    },
                                    dataService: {
                                        findProcedureById: function () { return null; }
                                    }
                                };
                            }
                        },
                        proceduresGridHelpersRoot: { createHelpers: function () {} },
                        proceduresApiRoot: { createApiClient: function () {} },
                        proceduresWorkflowRoot: { createWorkflow: function () {} },
                        proceduresGridColumnsRoot: { createColumns: function () {} },
                        proceduresStoreRoot: {
                            createStore: function (options) {
                                events.createStoreOptions = options;
                                return { key: "procedures-store" };
                            }
                        },
                        proceduresGridsRoot: {
                            createHistoryGrid: function (options) {
                                events.createHistoryGridOptions = options;
                                return {
                                    option: function () {}
                                };
                            },
                            createShortlistGrid: function (options) {
                                events.createShortlistGridOptions = options;
                                return {
                                    option: function () {}
                                };
                            },
                            createShortlistAdjustmentsGrid: function (options) {
                                events.createShortlistAdjustmentsGridOptions = options;
                                return {
                                    option: function () {}
                                };
                            },
                            createProceduresGrid: function (options) {
                                events.createRegistryGridOptions = options;
                                return {
                                    refresh: async function () {},
                                    selectRows: async function () {}
                                };
                            }
                        },
                        proceduresSelectionRoot: {
                            createSelectionController: function (options) {
                                events.createSelectionOptions = options;
                                return selectionController;
                            }
                        },
                        proceduresTransitionRoot: {
                            createTransitionController: function (options) {
                                events.createTransitionOptions = options;
                                return transitionController;
                            }
                        },
                        proceduresShortlistRoot: {
                            createShortlistWorkspace: function (options) {
                                events.createShortlistWorkspaceOptions = options;
                                return shortlistWorkspace;
                            }
                        },
                        proceduresRegistryEventsRoot: {
                            createGridCallbacks: function (options) {
                                events.createRegistryCallbacksOptions = options;
                                return {
                                    onEditorPreparing: function () {},
                                    onSelectionChanged: function () {},
                                    onToolbarPreparing: function () {},
                                    onDataErrorOccurred: function () {}
                                };
                            }
                        },
                        proceduresDataRoot: { createDataService: function () {} }
                    }
                };
            }
        }
    }, {
        querySelector: function (selector) {
            if (selector === "[data-procedures-module]") {
                return moduleRoot;
            }

            return null;
        }
    });

    await waitForBootstrapSettled();

    assert.equal(events.bootstrapCalls, 1);
    assert.equal(events.createServicesOptions.endpoint, "/api/custom/procedures");
    assert.equal(events.createServicesOptions.locationSearch, "?status=Sent");
    assert.equal(
        typeof events.createServicesOptions.moduleRoots.proceduresGridHelpersRoot.createHelpers,
        "function");
    assert.equal(events.createStoreOptions.devExpressData.CustomStore.name, "CustomStoreStub");
    assert.equal(events.createHistoryGridOptions, null);
    assert.equal(events.createShortlistGridOptions, null);
    assert.equal(events.createShortlistAdjustmentsGridOptions, null);

    events.createTransitionOptions.historyGrid.ensureInitialized();
    events.createShortlistWorkspaceOptions.shortlistGrid.ensureInitialized();
    events.createShortlistWorkspaceOptions.shortlistAdjustmentsGrid.ensureInitialized();

    assert.equal(events.createHistoryGridOptions.element.id, "procedures-history-grid");
    assert.equal(events.createShortlistGridOptions.element.id, "procedures-shortlist-grid");
    assert.equal(events.createShortlistAdjustmentsGridOptions.element.id, "procedures-adjustments-grid");
    assert.equal(events.createRegistryGridOptions.element.id, "procedures-grid");
    assert.equal(events.createSelectionOptions.selectedElement, controls.selectedElement);
    assert.equal(events.createSelectionOptions.shortlistSelectedElement, controls.shortlistSelectedElement);
    assert.equal(typeof events.createSelectionOptions.setTransitionStatus, "function");
    assert.equal(events.createTransitionOptions.endpoint, "/api/custom/procedures");
    assert.equal(events.createShortlistWorkspaceOptions.endpoint, "/api/custom/procedures");
    assert.equal(typeof events.createRegistryCallbacksOptions.applySelection, "function");
    assert.equal(events.transitionBound, true);
    assert.equal(events.shortlistBound, true);
    assert.deepEqual(events.selectedCalls, [null]);
});
