"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime.js"));

function createStatusControl() {
    return {
        textContent: "",
        classList: {
            toggle: function () {}
        }
    };
}

function createControls() {
    return {
        gridElement: { id: "grid" },
        historyGridElement: { id: "history-grid" },
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
        shortlistGridElement: { id: "shortlist-grid" },
        shortlistAdjustmentsGridElement: { id: "shortlist-adjustments-grid" }
    };
}

test("procedures grid runtime: validates required host window dependencies", () => {
    assert.throws(() => {
        runtimeModule.initializeProceduresGrid({});
    }, /window dependencies are missing/i);
});

test("procedures grid runtime: composes services, controllers and grids", async () => {
    const events = {
        createServicesOptions: null,
        createStoreOptions: null,
        createGridOptions: null,
        createCallbacksOptions: null,
        transitionBound: false,
        shortlistBound: false,
        selectedCalls: []
    };

    const selectionController = {
        setTransitionController: function () {},
        setShortlistWorkspace: function () {},
        applySelection: function (value) {
            events.selectedCalls.push(value);
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

    runtimeModule.initializeProceduresGrid({
        window: {
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
            }
        },
        endpoint: "/api/custom/procedures",
        controls: createControls(),
        moduleRoots: {
            proceduresConfigRoot: {
                createConfig: function () {
                    return { transitionMap: {} };
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
                        urlFilterState: { hasAny: true },
                        apiClient: {
                            getTransitionHistory: async function () { return []; }
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
                    return { key: "store" };
                }
            },
            proceduresGridsRoot: {
                createHistoryGrid: function () {
                    return {
                        option: function () {}
                    };
                },
                createShortlistGrid: function () {
                    return {
                        option: function () {}
                    };
                },
                createShortlistAdjustmentsGrid: function () {
                    return {
                        option: function () {}
                    };
                },
                createProceduresGrid: function (options) {
                    events.createGridOptions = options;
                    return {
                        refresh: async function () {},
                        selectRows: async function () {}
                    };
                }
            },
            proceduresSelectionRoot: {
                createSelectionController: function () {
                    return selectionController;
                }
            },
            proceduresTransitionRoot: {
                createTransitionController: function () {
                    return transitionController;
                }
            },
            proceduresShortlistRoot: {
                createShortlistWorkspace: function () {
                    return shortlistWorkspace;
                }
            },
            proceduresRegistryEventsRoot: {
                createGridCallbacks: function (options) {
                    events.createCallbacksOptions = options;
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
    });

    await Promise.resolve();
    await Promise.resolve();

    assert.equal(events.createServicesOptions.endpoint, "/api/custom/procedures");
    assert.equal(events.createServicesOptions.locationSearch, "?status=Sent");
    assert.equal(
        typeof events.createServicesOptions.moduleRoots.proceduresGridHelpersRoot.createHelpers,
        "function");
    assert.equal(typeof events.createStoreOptions.createPayload, "function");
    assert.equal(events.createGridOptions.element.id, "grid");
    assert.equal(typeof events.createCallbacksOptions.applySelection, "function");
    assert.equal(events.transitionBound, true);
    assert.equal(events.shortlistBound, true);
    assert.deepEqual(events.selectedCalls, [null]);
});
