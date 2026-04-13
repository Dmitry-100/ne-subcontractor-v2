"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const monitoringModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring.js"));

function createButton() {
    const handlers = {};

    return {
        addEventListener: function (eventName, handler) {
            handlers[eventName] = handler;
        },
        trigger: function (eventName) {
            if (typeof handlers[eventName] === "function") {
                return handlers[eventName]();
            }

            return undefined;
        }
    };
}

function createHarness(options) {
    const config = options || {};
    const calls = {
        gridsOptions: null,
        controlsOptions: null,
        selectionOptions: null,
        dataServiceOptions: null,
        importControllerOptions: null,
        uiUpdateCalls: 0,
        uiRefreshSelectionCalls: 0,
        uiGridEditingCalls: [],
        selectionRefreshStagesCalls: 0,
        selectionRefreshRowsCalls: 0,
        selectionSyncStagesCalls: 0,
        selectionSyncRowsCalls: 0,
        selectionEnsureCalls: 0,
        dataLoadCalls: [],
        dataSaveCalls: 0,
        importBindCalls: 0,
        importUpdateButtonsCalls: 0,
        statuses: [],
        importStatuses: []
    };

    const monitoringRefreshButton = createButton();
    const monitoringSaveButton = createButton();

    const gridInstances = {
        monitoringControlPointsGridInstance: {
            option: function () {}
        },
        monitoringStagesGridInstance: {
            option: function () {}
        },
        monitoringMdrCardsGridInstance: {
            option: function () {}
        },
        monitoringMdrRowsGridInstance: {
            option: function () {}
        }
    };

    const uiController = {
        updateControls: function () {
            calls.uiUpdateCalls += 1;
        },
        refreshSelectionStatus: function () {
            calls.uiRefreshSelectionCalls += 1;
        },
        setMonitoringGridEditing: function (editable) {
            calls.uiGridEditingCalls.push(editable);
        }
    };

    const selectionController = {
        getControlPointsData: function () { return [{ clientId: "cp-1" }]; },
        getMdrCardsData: function () { return [{ clientId: "mdr-1" }]; },
        getSelectedControlPoint: function () { return { clientId: "cp-1" }; },
        getSelectedMdrCard: function () { return { clientId: "mdr-1" }; },
        refreshStagesGrid: function () {
            calls.selectionRefreshStagesCalls += 1;
        },
        refreshRowsGrid: function () {
            calls.selectionRefreshRowsCalls += 1;
        },
        syncStagesWithSelectedControlPoint: function () {
            calls.selectionSyncStagesCalls += 1;
        },
        syncRowsWithSelectedMdrCard: function () {
            calls.selectionSyncRowsCalls += 1;
        },
        ensureSelection: function () {
            calls.selectionEnsureCalls += 1;
        }
    };

    const dataService = {
        loadData: function (showStatusMessage) {
            calls.dataLoadCalls.push(showStatusMessage);
            return Promise.resolve();
        },
        saveData: config.saveData || function () {
            calls.dataSaveCalls += 1;
            return Promise.resolve();
        }
    };

    const importController = {
        bindEventHandlers: function () {
            calls.importBindCalls += 1;
        },
        updateButtons: function () {
            calls.importUpdateButtonsCalls += 1;
        }
    };

    const controller = monitoringModule.createController({
        elements: {
            monitoringSelectedElement: {},
            monitoringStatusElement: {},
            monitoringRefreshButton: monitoringRefreshButton,
            monitoringSaveButton: monitoringSaveButton,
            monitoringControlPointsGridElement: { id: "cp-grid" },
            monitoringStagesGridElement: { id: "stage-grid" },
            monitoringMdrCardsGridElement: { id: "mdr-card-grid" },
            monitoringMdrRowsGridElement: { id: "mdr-row-grid" },
            monitoringControlPointSelectedElement: {},
            monitoringMdrCardSelectedElement: {},
            mdrImportFileInput: {},
            mdrImportModeSelect: {},
            mdrImportApplyButton: {},
            mdrImportResetButton: {}
        },
        gridState: {
            setSelectedMonitoringControlPointClientId: function () {},
            setSelectedMonitoringMdrCardClientId: function () {},
            resetMonitoringSelection: function () {}
        },
        apiClient: {
            importMonitoringMdrForecastFact: function () {
                return Promise.resolve([]);
            }
        },
        monitoringModel: {
            normalizeControlPoint: function (point) { return point; },
            normalizeMdrCard: function (card) { return card; },
            calculateDeviationPercent: function () { return 0; },
            calculateMdrCardMetrics: function () {
                return {
                    totalPlanValue: 0,
                    totalForecastValue: 0,
                    totalFactValue: 0,
                    forecastDeviationPercent: 0,
                    factDeviationPercent: 0
                };
            },
            createClientId: function () { return "generated-id"; },
            buildControlPointsPayload: function () { return []; },
            buildMdrCardsPayload: function () { return []; }
        },
        monitoringKpModule: {},
        monitoringMdrModule: {
            buildMdrCardSelectionKey: function (card) { return card?.clientId || null; }
        },
        monitoringImportStatusModule: {},
        monitoringImportModule: {
            createController: function (options) {
                calls.importControllerOptions = options;
                return importController;
            }
        },
        monitoringDataModule: {
            createService: function (options) {
                calls.dataServiceOptions = options;
                return dataService;
            }
        },
        monitoringGridsModule: {
            createGrids: function (options) {
                calls.gridsOptions = options;
                return gridInstances;
            }
        },
        monitoringKpGridsModule: { id: "kp-grids-module" },
        monitoringMdrGridsModule: { id: "mdr-grids-module" },
        monitoringControlsModule: {
            createController: function (options) {
                calls.controlsOptions = options;
                return uiController;
            }
        },
        monitoringSelectionModule: {
            createController: function (options) {
                calls.selectionOptions = options;
                return selectionController;
            }
        },
        getSelectedContract: function () {
            return { id: "contract-1", status: "Active" };
        },
        canEditMilestones: function () {
            return true;
        },
        localizeStatus: function (value) {
            return value;
        },
        setMonitoringStatus: function (message, isError) {
            calls.statuses.push({ message: message, isError: isError });
        },
        setMdrImportStatus: function (message, isError) {
            calls.importStatuses.push({ message: message, isError: isError });
        },
        parseMdrImportFile: function () { return []; },
        parseMdrImportItemsFromRows: function () { return []; }
    });

    return {
        controller: controller,
        calls: calls,
        monitoringRefreshButton: monitoringRefreshButton,
        monitoringSaveButton: monitoringSaveButton
    };
}

test("contracts monitoring entrypoint: init composes grids/controllers/services and binds handlers", async () => {
    const harness = createHarness();
    harness.controller.init();

    assert.equal(harness.calls.gridsOptions.elements.monitoringControlPointsGridElement.id, "cp-grid");
    assert.equal(harness.calls.gridsOptions.kpGridsModule.id, "kp-grids-module");
    assert.equal(harness.calls.gridsOptions.mdrGridsModule.id, "mdr-grids-module");

    assert.equal(harness.calls.controlsOptions.elements.monitoringMdrCardSelectedElement !== undefined, true);
    assert.equal(typeof harness.calls.dataServiceOptions.ensureMonitoringSelection, "function");
    assert.equal(typeof harness.calls.importControllerOptions.buildMdrCardSelectionKey, "function");
    assert.equal(typeof harness.calls.selectionOptions.onSelectionStatusChanged, "function");

    assert.equal(harness.calls.importBindCalls, 1);
    assert.equal(harness.calls.importUpdateButtonsCalls, 1);
    assert.equal(harness.calls.uiUpdateCalls, 1);
    assert.equal(harness.calls.uiRefreshSelectionCalls, 1);

    harness.monitoringRefreshButton.trigger("click");
    assert.equal(harness.calls.dataLoadCalls.at(-1), true);

    harness.monitoringSaveButton.trigger("click");
    await Promise.resolve();
    assert.equal(harness.calls.dataSaveCalls, 1);
});

test("contracts monitoring entrypoint: save button propagates service error to monitoring status", async () => {
    const harness = createHarness({
        saveData: function () {
            return Promise.reject(new Error("save-failed"));
        }
    });

    harness.controller.init();
    harness.monitoringSaveButton.trigger("click");
    await new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });

    assert.ok(harness.calls.statuses.length > 0);
    assert.equal(harness.calls.statuses.at(-1).isError, true);
    assert.match(harness.calls.statuses.at(-1).message, /save-failed/i);
});

test("contracts monitoring entrypoint: public methods delegate to data/ui services", async () => {
    const harness = createHarness();
    harness.controller.init();

    harness.controller.updateControls();
    assert.equal(harness.calls.uiUpdateCalls, 2);

    await harness.controller.loadData(false);
    assert.equal(harness.calls.dataLoadCalls.at(-1), false);

    await harness.controller.saveData();
    assert.equal(harness.calls.dataSaveCalls, 1);
});
