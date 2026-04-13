"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime.js"));

function createStatusElement() {
    return {
        textContent: "",
        classList: {
            toggles: [],
            toggle: function (name, value) {
                this.toggles.push({ name: name, value: value });
            }
        }
    };
}

function createElements() {
    return {
        gridElement: { id: "contracts-grid" },
        statusElement: createStatusElement(),
        selectedElement: {},
        transitionStatusElement: createStatusElement(),
        transitionTargetSelect: {},
        transitionReasonInput: {},
        transitionApplyButton: {},
        historyRefreshButton: {},
        historyGridElement: { id: "contracts-history-grid" },
        draftStatusElement: createStatusElement(),
        draftProcedureIdInput: {},
        draftNumberInput: {},
        draftSigningDateInput: {},
        draftStartDateInput: {},
        draftEndDateInput: {},
        draftCreateButton: {},
        executionSelectedElement: {},
        executionSummaryElement: {},
        executionStatusElement: createStatusElement(),
        executionRefreshButton: {},
        executionGridElement: { id: "contracts-execution-grid" },
        monitoringSelectedElement: {},
        monitoringStatusElement: createStatusElement(),
        monitoringRefreshButton: {},
        monitoringSaveButton: {},
        monitoringControlPointsGridElement: { id: "kp-grid" },
        monitoringStagesGridElement: { id: "kp-stages-grid" },
        monitoringMdrCardsGridElement: { id: "mdr-cards-grid" },
        monitoringMdrRowsGridElement: { id: "mdr-rows-grid" },
        monitoringControlPointSelectedElement: {},
        monitoringMdrCardSelectedElement: {},
        mdrImportFileInput: {},
        mdrImportModeSelect: {},
        mdrImportApplyButton: {},
        mdrImportResetButton: {},
        mdrImportStatusElement: createStatusElement()
    };
}

function createContext(events) {
    const elements = createElements();

    const helpers = {
        parseErrorBody: function () { return "parsed"; },
        toNumber: function (value) { return Number(value); },
        toNullableDate: function (value) { return value || null; },
        readUrlFilterState: function (search, values) {
            events.readUrlFilterState = { search: search, values: values };
            return { hasAny: true };
        },
        appendFilterHint: function (message) { return message; },
        clearUrlFilters: function (url) {
            events.clearUrlFiltersCalls.push(url);
            return `${url}#cleared`;
        },
        isGuid: function () { return true; },
        parseMdrImportFile: function (file, xlsx) {
            events.parseMdrImportFile = { file: file, xlsx: xlsx };
            return [];
        },
        parseMdrImportItemsFromRows: function () { return []; },
        buildMilestonesPayload: function () { return []; }
    };

    const apiClient = { id: "contracts-api-client" };
    const monitoringModel = { id: "monitoring-model" };
    const gridState = {
        getSelectedContract: function () {
            return { id: "contract-1", status: "Draft" };
        }
    };

    const monitoringController = {
        init: function () {
            events.monitoringInitCalls += 1;
        },
        updateControls: function () {
            events.monitoringUpdateCalls += 1;
        },
        loadData: function () {
            events.monitoringLoadCalls += 1;
        }
    };

    const workflowController = {
        init: function () {
            events.workflowInitCalls += 1;
        },
        updateControls: function () {
            events.workflowUpdateCalls += 1;
        },
        loadHistory: function () {
            events.workflowLoadCalls += 1;
        }
    };

    const draftController = {
        init: function () {
            events.draftInitCalls += 1;
        }
    };

    const executionController = {
        init: function () {
            events.executionInitCalls += 1;
        },
        updateControls: function () {
            events.executionUpdateCalls += 1;
        },
        loadExecutionData: function () {
            events.executionLoadCalls += 1;
        }
    };

    const registryController = {
        init: function () {
            events.registryInitCalls += 1;
        },
        refreshAndSelect: async function (contractId) {
            events.registryRefreshCalls.push(contractId);
        }
    };

    return {
        moduleRoot: {
            getAttribute: function (name) {
                if (name === "data-api-endpoint") {
                    return "/api/custom/contracts";
                }

                return null;
            }
        },
        elements: elements,
        modules: {
            helpers: helpers,
            contractsApiModule: {
                createClient: function (options) {
                    events.apiClientOptions = options;
                    return apiClient;
                }
            },
            monitoringModelModule: {
                createModel: function (options) {
                    events.monitoringModelOptions = options;
                    return monitoringModel;
                }
            },
            stateModule: {
                createState: function () {
                    events.createStateCalls += 1;
                    return gridState;
                }
            },
            executionModule: {
                canEditMilestones: function () {
                    return true;
                }
            },
            monitoringKpModule: { id: "kp-module" },
            monitoringMdrModule: { id: "mdr-module" },
            monitoringKpGridsModule: { id: "kp-grids-module" },
            monitoringMdrGridsModule: { id: "mdr-grids-module" },
            monitoringGridsModule: { id: "monitoring-grids-module" },
            monitoringControlsModule: { id: "monitoring-controls-module" },
            monitoringSelectionModule: { id: "monitoring-selection-module" },
            monitoringImportStatusModule: { id: "monitoring-import-status-module" },
            monitoringImportModule: { id: "monitoring-import-module" },
            monitoringDataModule: { id: "monitoring-data-module" },
            workflowHistoryGridModule: { id: "workflow-history-grid-module" },
            workflowEventsModule: { id: "workflow-events-module" },
            draftEventsModule: { id: "draft-events-module" },
            monitoringControllerModule: {
                createController: function (options) {
                    events.monitoringControllerOptions = options;
                    return monitoringController;
                }
            },
            workflowControllerModule: {
                createController: function (options) {
                    events.workflowControllerOptions = options;
                    return workflowController;
                }
            },
            draftControllerModule: {
                createController: function (options) {
                    events.draftControllerOptions = options;
                    return draftController;
                }
            },
            registryControllerModule: {
                createController: function (options) {
                    events.registryControllerOptions = options;
                    return registryController;
                }
            },
            registryPayloadModule: { id: "registry-payload-module" },
            registryColumnsModule: { id: "registry-columns-module" },
            registryEventsModule: { id: "registry-events-module" },
            registryStoreModule: { id: "registry-store-module" },
            executionPanelGridModule: { id: "execution-panel-grid-module" },
            executionPanelEventsModule: { id: "execution-panel-events-module" },
            executionPanelControllerModule: {
                createController: function (options) {
                    events.executionControllerOptions = options;
                    return executionController;
                }
            }
        }
    };
}

test("contracts grid runtime: validates required dependencies", () => {
    assert.throws(function () {
        runtimeModule.initializeContractsGrid({
            window: {}
        });
    }, /context/i);
});

test("contracts grid runtime: composes modules and wires orchestration callbacks", async () => {
    const events = {
        createStateCalls: 0,
        monitoringInitCalls: 0,
        workflowInitCalls: 0,
        draftInitCalls: 0,
        executionInitCalls: 0,
        registryInitCalls: 0,
        monitoringUpdateCalls: 0,
        workflowUpdateCalls: 0,
        executionUpdateCalls: 0,
        monitoringLoadCalls: 0,
        workflowLoadCalls: 0,
        executionLoadCalls: 0,
        registryRefreshCalls: [],
        clearUrlFiltersCalls: [],
        apiClientOptions: null,
        monitoringModelOptions: null,
        monitoringControllerOptions: null,
        workflowControllerOptions: null,
        draftControllerOptions: null,
        executionControllerOptions: null,
        registryControllerOptions: null,
        readUrlFilterState: null,
        parseMdrImportFile: null
    };

    const windowMock = {
        location: {
            search: "?status=Active",
            href: "https://demo.test/Home/Contracts",
            assign: function (url) {
                events.locationAssignUrl = url;
            }
        },
        XLSX: { id: "xlsx-runtime" }
    };

    runtimeModule.initializeContractsGrid({
        window: windowMock,
        context: createContext(events)
    });

    assert.equal(events.createStateCalls, 1);
    assert.equal(events.apiClientOptions.endpoint, "/api/custom/contracts");
    assert.equal(typeof events.apiClientOptions.parseErrorBody, "function");
    assert.equal(typeof events.monitoringModelOptions.toNumber, "function");
    assert.equal(events.readUrlFilterState.search, "?status=Active");
    assert.deepEqual(events.readUrlFilterState.values, ["Draft", "OnApproval", "Signed", "Active", "Closed"]);

    assert.equal(events.registryControllerOptions.elements.gridElement.id, "contracts-grid");
    assert.equal(events.registryControllerOptions.columnsModule.id, "registry-columns-module");
    assert.equal(events.registryControllerOptions.eventsModule.id, "registry-events-module");
    assert.equal(events.registryControllerOptions.storeModule.id, "registry-store-module");
    assert.equal(events.executionControllerOptions.elements.executionGridElement.id, "contracts-execution-grid");
    assert.equal(events.executionControllerOptions.gridModule.id, "execution-panel-grid-module");
    assert.equal(events.executionControllerOptions.eventsModule.id, "execution-panel-events-module");
    assert.equal(events.monitoringControllerOptions.elements.monitoringMdrRowsGridElement.id, "mdr-rows-grid");
    assert.equal(events.workflowControllerOptions.statusValues.length, 5);
    assert.equal(events.workflowControllerOptions.historyGridModule.id, "workflow-history-grid-module");
    assert.equal(events.workflowControllerOptions.eventsModule.id, "workflow-events-module");
    assert.equal(events.draftControllerOptions.eventsModule.id, "draft-events-module");

    assert.equal(events.registryInitCalls, 1);
    assert.equal(events.workflowInitCalls, 0);
    assert.equal(events.workflowUpdateCalls, 1);
    assert.equal(events.draftInitCalls, 1);
    assert.equal(events.executionInitCalls, 0);
    assert.equal(events.monitoringInitCalls, 0);
    assert.equal(events.executionUpdateCalls, 1);
    assert.equal(events.monitoringUpdateCalls, 1);

    events.registryControllerOptions.onSelectionChanged();
    assert.equal(events.workflowInitCalls, 1);
    assert.equal(events.executionInitCalls, 1);
    assert.equal(events.monitoringInitCalls, 1);
    assert.equal(events.workflowUpdateCalls, 2);
    assert.equal(events.executionUpdateCalls, 2);
    assert.equal(events.monitoringUpdateCalls, 2);
    assert.equal(events.workflowLoadCalls, 1);
    assert.equal(events.executionLoadCalls, 1);
    assert.equal(events.monitoringLoadCalls, 1);

    await events.workflowControllerOptions.onTransitionCompleted("contract-77");
    assert.deepEqual(events.registryRefreshCalls, ["contract-77"]);
    assert.equal(events.workflowUpdateCalls, 3);
    assert.equal(events.executionUpdateCalls, 3);
    assert.equal(events.monitoringUpdateCalls, 3);
    assert.equal(events.workflowLoadCalls, 2);
    assert.equal(events.executionLoadCalls, 2);
    assert.equal(events.monitoringLoadCalls, 2);

    await events.draftControllerOptions.onDraftCreated({ id: "contract-88" });
    assert.deepEqual(events.registryRefreshCalls, ["contract-77", "contract-88"]);

    events.monitoringControllerOptions.parseMdrImportFile("mdr.xlsx");
    assert.deepEqual(events.parseMdrImportFile, {
        file: "mdr.xlsx",
        xlsx: windowMock.XLSX
    });

    events.registryControllerOptions.clearUrlFilters();
    assert.deepEqual(events.clearUrlFiltersCalls, ["https://demo.test/Home/Contracts"]);
    assert.equal(events.locationAssignUrl, "https://demo.test/Home/Contracts#cleared");
});
