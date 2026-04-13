"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-grid-entrypoint-helpers.js"));

function createControls() {
    return {
        statusElement: {},
        ratingStatusElement: {},
        selectedElement: {},
        historyStatusElement: {},
        analyticsStatusElement: {},
        refreshButton: {},
        recalcAllButton: {},
        recalcSelectedButton: {},
        reloadModelButton: {},
        saveModelButton: {},
        manualSaveButton: {},
        versionCodeInput: {},
        modelNameInput: {},
        modelNotesInput: {},
        weightDeliveryInput: {},
        weightCommercialInput: {},
        weightClaimInput: {},
        weightManualInput: {},
        weightWorkloadInput: {},
        manualScoreInput: {},
        manualCommentInput: {},
        contractorsGridElement: { id: "contractors-grid" },
        historyGridElement: { id: "history-grid" },
        analyticsGridElement: { id: "analytics-grid" }
    };
}

test("contractors grid entrypoint helpers: validates DevExpress dependency", () => {
    assert.throws(
        function () {
            helpersModule.composeEntrypoint({
                context: {},
                windowImpl: {}
            });
        },
        /window\.DevExpress\.data/);
});

test("contractors grid entrypoint helpers: composes helpers, runtime, model and actions", () => {
    const controls = createControls();
    const events = {
        apiOptions: null,
        actionsOptions: null,
        dataRuntimeOptions: null,
        helpersOptions: null,
        modelOptions: null,
        onSelectionChanged: null,
        registryAssigned: null,
        selectedByHandler: null
    };

    const runtime = {
        getSelectedContractor: function () {
            return { id: "ctr-1" };
        },
        handleContractorSelectionChanged: function (selected) {
            events.selectedByHandler = selected;
        },
        createRegistryStore: function () {
            return { id: "registry-store" };
        },
        loadContractors: async function () {},
        loadHistory: async function () {},
        loadAnalytics: async function () {},
        refreshContractorsAndReselect: async function () {}
    };

    const modelService = {
        loadModel: async function () {},
        buildModelPayload: function () {
            return {};
        },
        fillModelForm: function () {}
    };

    const actions = {
        bindEvents: function () {}
    };

    const uiState = {
        setStatus: function () {},
        setRatingStatus: function () {},
        setHistoryStatus: function () {},
        setAnalyticsStatus: function () {},
        updateSelectionUi: function () {},
        setUiBusy: function () {}
    };

    const composition = helpersModule.composeEntrypoint({
        context: {
            endpoints: {
                endpoint: "/api/custom/contractors",
                ratingModelEndpoint: "/api/custom/model",
                ratingRecalculateEndpoint: "/api/custom/recalculate",
                ratingAnalyticsEndpoint: "/api/custom/analytics"
            },
            controls: controls,
            moduleRoots: {
                contractorsGridHelpersRoot: {
                    createHelpers: function (options) {
                        events.helpersOptions = options;
                        return { id: "helpers" };
                    }
                },
                contractorsApiRoot: {
                    createApiClient: function (options) {
                        events.apiOptions = options;
                        return { id: "api-client" };
                    }
                },
                contractorsUiStateRoot: {
                    createUiState: function () {
                        return uiState;
                    }
                },
                contractorsGridsRoot: {
                    createGrids: function (options) {
                        events.onSelectionChanged = options.onContractorSelectionChanged;
                        return {
                            contractorsGridInstance: {
                                option: function (key, value) {
                                    if (key === "dataSource") {
                                        events.registryAssigned = value;
                                    }
                                }
                            },
                            historyGridInstance: {
                                option: function () {}
                            },
                            analyticsGridInstance: {
                                option: function () {}
                            }
                        };
                    }
                },
                contractorsDataRoot: {
                    createDataRuntime: function (options) {
                        events.dataRuntimeOptions = options;
                        return runtime;
                    }
                },
                contractorsModelRoot: {
                    createModelService: function (options) {
                        events.modelOptions = options;
                        return modelService;
                    }
                },
                contractorsActionsRoot: {
                    createActions: function (options) {
                        events.actionsOptions = options;
                        return actions;
                    }
                }
            }
        },
        windowImpl: {
            jQuery: function () {},
            DevExpress: {
                data: {
                    CustomStore: function () {}
                }
            }
        }
    });

    assert.equal(events.helpersOptions.factorCodes.workload, "WorkloadPenalty");
    assert.equal(events.apiOptions.endpoint, "/api/custom/contractors");
    assert.equal(events.modelOptions.controls.versionCodeInput, controls.versionCodeInput);
    assert.equal(typeof events.actionsOptions.operations.loadModel, "function");
    assert.deepEqual(events.registryAssigned, { id: "registry-store" });
    assert.equal(composition.uiState, uiState);
    assert.equal(composition.dataRuntime, runtime);
    assert.equal(composition.modelService, modelService);
    assert.equal(composition.actions, actions);

    events.onSelectionChanged({ id: "ctr-2" });
    assert.deepEqual(events.selectedByHandler, { id: "ctr-2" });
});
