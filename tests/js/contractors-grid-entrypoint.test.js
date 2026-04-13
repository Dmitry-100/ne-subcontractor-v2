"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractorsGridModulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-grid.js");

function loadContractorsGrid(windowMock) {
    delete require.cache[contractorsGridModulePath];
    global.window = windowMock;
    require(contractorsGridModulePath);
    delete global.window;
}

async function waitForBootstrapSettled() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(function (resolve) {
        setImmediate(resolve);
    });
}

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

test("contractors grid entrypoint: returns early when ContractorsBootstrap is missing", () => {
    assert.doesNotThrow(function () {
        loadContractorsGrid({});
    });
});

test("contractors grid entrypoint: composes bootstrap/runtime/model/actions modules", async () => {
    const events = {
        bootstrapCalls: 0,
        helpersOptions: null,
        apiOptions: null,
        gridsOptions: null,
        dataRuntimeOptions: null,
        registryStoreCreatedWith: null,
        registryStoreAssigned: null,
        modelOptions: null,
        actionsOptions: null,
        actionsBound: false,
        selectedByHandler: null,
        uiBusyCalls: [],
        ratingStatusCalls: [],
        historyStatusCalls: [],
        updateSelectionCalls: 0
    };

    const controls = createControls();
    const dataRuntime = {
        createRegistryStore: function (devExpressData) {
            events.registryStoreCreatedWith = devExpressData;
            return { id: "contractors-registry-store" };
        },
        getSelectedContractor: function () {
            return { id: "ctr-1" };
        },
        handleContractorSelectionChanged: function (selected) {
            events.selectedByHandler = selected;
        },
        refreshContractorsAndReselect: async function () {},
        loadAnalytics: async function () {},
        loadHistory: async function () {},
        loadContractors: async function () {}
    };
    const modelService = {
        loadModel: async function () {},
        buildModelPayload: function () { return {}; },
        fillModelForm: function () {}
    };

    loadContractorsGrid({
        jQuery: function () {},
        DevExpress: {
            data: {}
        },
        ContractorsBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return {
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
                                return {};
                            }
                        },
                        contractorsApiRoot: {
                            createApiClient: function (options) {
                                events.apiOptions = options;
                                return {};
                            }
                        },
                        contractorsGridsRoot: {
                            createGrids: function (options) {
                                events.gridsOptions = options;
                                return {
                                    contractorsGridInstance: {
                                        id: "contractors-grid-instance",
                                        option: function (name, value) {
                                            if (name === "dataSource") {
                                                events.registryStoreAssigned = value;
                                            }
                                        }
                                    },
                                    historyGridInstance: { id: "history-grid-instance" },
                                    analyticsGridInstance: { id: "analytics-grid-instance" }
                                };
                            }
                        },
                        contractorsDataRoot: {
                            createDataRuntime: function (options) {
                                events.dataRuntimeOptions = options;
                                return dataRuntime;
                            }
                        },
                        contractorsModelRoot: {
                            createModelService: function (options) {
                                events.modelOptions = options;
                                return modelService;
                            }
                        },
                        contractorsUiStateRoot: {
                            createUiState: function () {
                                return {
                                    setStatus: function () {},
                                    setRatingStatus: function (message, isError) {
                                        events.ratingStatusCalls.push({ message: message, isError: isError });
                                    },
                                    setHistoryStatus: function (message, isError) {
                                        events.historyStatusCalls.push({ message: message, isError: isError });
                                    },
                                    setAnalyticsStatus: function () {},
                                    updateSelectionUi: function () {
                                        events.updateSelectionCalls += 1;
                                    },
                                    setUiBusy: function (value) {
                                        events.uiBusyCalls.push(value);
                                    }
                                };
                            }
                        },
                        contractorsActionsRoot: {
                            createActions: function (options) {
                                events.actionsOptions = options;
                                return {
                                    bindEvents: function () {
                                        events.actionsBound = true;
                                    }
                                };
                            }
                        }
                    }
                };
            }
        }
    });

    await waitForBootstrapSettled();

    assert.equal(events.bootstrapCalls, 1);
    assert.equal(events.helpersOptions.factorCodes.workload, "WorkloadPenalty");
    assert.equal(events.apiOptions.endpoint, "/api/custom/contractors");
    assert.equal(events.apiOptions.ratingModelEndpoint, "/api/custom/model");
    assert.equal(events.gridsOptions.elements.contractorsGridElement.id, "contractors-grid");
    assert.equal(events.dataRuntimeOptions.grids.contractorsGridInstance.id, "contractors-grid-instance");
    assert.ok(events.registryStoreCreatedWith);
    assert.equal(events.registryStoreAssigned.id, "contractors-registry-store");
    assert.equal(events.modelOptions.controls.versionCodeInput, controls.versionCodeInput);
    assert.equal(events.actionsBound, true);
    assert.equal(typeof events.actionsOptions.operations.refreshContractorsAndReselect, "function");

    events.gridsOptions.onContractorSelectionChanged({ id: "ctr-2" });
    assert.deepEqual(events.selectedByHandler, { id: "ctr-2" });

    assert.deepEqual(events.uiBusyCalls, [true, false]);
    assert.deepEqual(events.ratingStatusCalls, [{ message: "Модуль рейтинга готов к работе.", isError: false }]);
    assert.deepEqual(events.historyStatusCalls, [{ message: "Выберите подрядчика для просмотра истории.", isError: false }]);
    assert.equal(events.updateSelectionCalls, 1);
});

test("contractors grid entrypoint: analytics loads in background and reports analytics-only failures", async () => {
    const events = {
        analyticsStatusCalls: [],
        historyStatusCalls: [],
        ratingStatusCalls: [],
        statusCalls: [],
        uiBusyCalls: []
    };

    const controls = createControls();
    const dataRuntime = {
        createRegistryStore: function () {
            return { id: "contractors-registry-store" };
        },
        getSelectedContractor: function () {
            return null;
        },
        handleContractorSelectionChanged: function () {},
        refreshContractorsAndReselect: async function () {},
        loadAnalytics: async function () {
            throw new Error("analytics unavailable");
        },
        loadHistory: async function () {},
        loadContractors: async function () {}
    };
    const modelService = {
        loadModel: async function () {},
        buildModelPayload: function () { return {}; },
        fillModelForm: function () {}
    };

    loadContractorsGrid({
        jQuery: function () {},
        DevExpress: {
            data: {}
        },
        ContractorsBootstrap: {
            createBootstrapContext: function () {
                return {
                    endpoints: {
                        endpoint: "/api/custom/contractors",
                        ratingModelEndpoint: "/api/custom/model",
                        ratingRecalculateEndpoint: "/api/custom/recalculate",
                        ratingAnalyticsEndpoint: "/api/custom/analytics"
                    },
                    controls: controls,
                    moduleRoots: {
                        contractorsGridHelpersRoot: {
                            createHelpers: function () {
                                return {};
                            }
                        },
                        contractorsApiRoot: {
                            createApiClient: function () {
                                return {};
                            }
                        },
                        contractorsGridsRoot: {
                            createGrids: function () {
                                return {
                                    contractorsGridInstance: {
                                        option: function () {}
                                    },
                                    historyGridInstance: { option: function () {} },
                                    analyticsGridInstance: { option: function () {} }
                                };
                            }
                        },
                        contractorsDataRoot: {
                            createDataRuntime: function () {
                                return dataRuntime;
                            }
                        },
                        contractorsModelRoot: {
                            createModelService: function () {
                                return modelService;
                            }
                        },
                        contractorsUiStateRoot: {
                            createUiState: function () {
                                return {
                                    setStatus: function (message, isError) {
                                        events.statusCalls.push({ message: message, isError: isError });
                                    },
                                    setRatingStatus: function (message, isError) {
                                        events.ratingStatusCalls.push({ message: message, isError: isError });
                                    },
                                    setHistoryStatus: function (message, isError) {
                                        events.historyStatusCalls.push({ message: message, isError: isError });
                                    },
                                    setAnalyticsStatus: function (message, isError) {
                                        events.analyticsStatusCalls.push({ message: message, isError: isError });
                                    },
                                    updateSelectionUi: function () {},
                                    setUiBusy: function (value) {
                                        events.uiBusyCalls.push(value);
                                    }
                                };
                            }
                        },
                        contractorsActionsRoot: {
                            createActions: function () {
                                return {
                                    bindEvents: function () {}
                                };
                            }
                        }
                    }
                };
            }
        }
    });

    await waitForBootstrapSettled();

    assert.deepEqual(events.uiBusyCalls, [true, false]);
    assert.deepEqual(events.statusCalls, []);
    assert.deepEqual(events.ratingStatusCalls, [
        { message: "Модуль рейтинга готов к работе.", isError: false }
    ]);
    assert.deepEqual(events.historyStatusCalls, [
        { message: "Выберите подрядчика для просмотра истории.", isError: false }
    ]);
    assert.deepEqual(events.analyticsStatusCalls, [
        { message: "Загружаем аналитику рейтинга...", isError: false },
        { message: "Не удалось загрузить аналитику рейтинга: analytics unavailable", isError: true }
    ]);
});
