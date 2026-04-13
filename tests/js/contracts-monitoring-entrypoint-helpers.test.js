"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-entrypoint-helpers.js"));

function createRuntimeStub() {
    return {
        refreshMonitoringStagesGrid: function () {},
        refreshMonitoringRowsGrid: function () {},
        ensureMonitoringSelection: function () {},
        markMonitoringDirty: function () {},
        syncStagesWithSelectedControlPoint: function () {},
        syncRowsWithSelectedMdrCard: function () {},
        createMonitoringClientId: function () {},
        getSelectedMonitoringControlPoint: function () {},
        getSelectedMonitoringMdrCard: function () {},
        calculateDeviationPercent: function () {},
        calculateMdrCardMetrics: function () {},
        setGridInstances: function () {},
        normalizeMonitoringControlPoint: function () {},
        normalizeMonitoringMdrCard: function () {},
        getMonitoringControlPointsData: function () {},
        getMonitoringMdrCardsData: function () {},
        buildMonitoringControlPointsPayload: function () {},
        buildMonitoringMdrCardsPayload: function () {},
        getControlPointsGrid: function () {},
        getStagesGrid: function () {},
        getMdrCardsGrid: function () {},
        getMdrRowsGrid: function () {},
        refreshMonitoringSelectionStatus: function () {}
    };
}

test("contracts monitoring entrypoint helpers: resolveMonitoringModules returns required modules", () => {
    const modules = helpersModule.resolveMonitoringModules();

    assert.equal(typeof modules.bootstrapModule.createCompositionContext, "function");
    assert.equal(typeof modules.wiringModule.bindCoreEvents, "function");
    assert.equal(typeof modules.runtimeModule.createRuntime, "function");
});

test("contracts monitoring entrypoint helpers: initializeMonitoringGrids wires runtime and grid module", () => {
    const runtime = createRuntimeStub();
    const createdGrids = { id: "grids" };
    let setGridInstancesArg = null;
    runtime.setGridInstances = function (value) {
        setGridInstancesArg = value;
    };

    let capturedOptions = null;
    const monitoringGridsModule = {
        createGrids: function (options) {
            capturedOptions = options;
            return createdGrids;
        }
    };

    const elements = {
        monitoringControlPointsGridElement: { id: "cp" },
        monitoringStagesGridElement: { id: "st" },
        monitoringMdrCardsGridElement: { id: "mc" },
        monitoringMdrRowsGridElement: { id: "mr" }
    };

    const result = helpersModule.initializeMonitoringGrids({
        runtime: runtime,
        monitoringGridsModule: monitoringGridsModule,
        monitoringKpGridsModule: { id: "kp" },
        monitoringMdrGridsModule: { id: "mdr" },
        gridState: { id: "state" },
        setMonitoringStatus: function () {},
        elements: elements
    });

    assert.equal(result, createdGrids);
    assert.equal(setGridInstancesArg, createdGrids);
    assert.equal(capturedOptions.elements, elements);
    assert.equal(capturedOptions.kpGridsModule.id, "kp");
    assert.equal(capturedOptions.mdrGridsModule.id, "mdr");
});

test("contracts monitoring entrypoint helpers: createMonitoringDataService maps runtime contracts", () => {
    const runtime = createRuntimeStub();
    const expectedService = { id: "service" };
    let capturedOptions = null;
    const monitoringDataModule = {
        createService: function (options) {
            capturedOptions = options;
            return expectedService;
        }
    };

    const gridDataBinders = {
        setControlPointsData: function () {},
        setMdrCardsData: function () {}
    };

    const result = helpersModule.createMonitoringDataService({
        monitoringDataModule: monitoringDataModule,
        apiClient: { id: "api" },
        gridState: { id: "state" },
        getSelectedContract: function () {},
        canEditMilestones: function () {},
        runtime: runtime,
        gridDataBinders: gridDataBinders,
        setMonitoringStatus: function () {}
    });

    assert.equal(result, expectedService);
    assert.equal(capturedOptions.apiClient.id, "api");
    assert.equal(capturedOptions.setControlPointsData, gridDataBinders.setControlPointsData);
    assert.equal(capturedOptions.buildMonitoringMdrCardsPayload, runtime.buildMonitoringMdrCardsPayload);
});

test("contracts monitoring entrypoint helpers: createMonitoringSelectionController maps runtime grids", () => {
    const runtime = createRuntimeStub();
    const expectedController = { id: "selection" };
    let capturedOptions = null;
    const monitoringSelectionModule = {
        createController: function (options) {
            capturedOptions = options;
            return expectedController;
        }
    };

    const result = helpersModule.createMonitoringSelectionController({
        monitoringSelectionModule: monitoringSelectionModule,
        gridState: { id: "state" },
        monitoringKpModule: { id: "kp" },
        monitoringMdrModule: { id: "mdr" },
        runtime: runtime
    });

    assert.equal(result, expectedController);
    assert.equal(capturedOptions.getControlPointsGrid, runtime.getControlPointsGrid);
    assert.equal(capturedOptions.onSelectionStatusChanged, runtime.refreshMonitoringSelectionStatus);
});

test("contracts monitoring entrypoint helpers: createMdrImportController maps dependencies", () => {
    const runtime = createRuntimeStub();
    const expectedController = { id: "import-controller" };
    let capturedOptions = null;
    const monitoringImportModule = {
        createController: function (options) {
            capturedOptions = options;
            return expectedController;
        }
    };

    const gridDataBinders = {
        setMdrCardsData: function () {}
    };

    const result = helpersModule.createMdrImportController({
        monitoringImportModule: monitoringImportModule,
        mdrImportFileInput: { id: "file" },
        mdrImportModeSelect: { id: "mode" },
        mdrImportApplyButton: { id: "apply" },
        mdrImportResetButton: { id: "reset" },
        getSelectedContract: function () {},
        canEditMilestones: function () {},
        monitoringImportStatusModule: { id: "status" },
        parseMdrImportFile: function () {},
        parseMdrImportItemsFromRows: function () {},
        importMdrForecastFactApi: function () {},
        buildMdrCardSelectionKey: function () {},
        runtime: runtime,
        gridDataBinders: gridDataBinders,
        setSelectedMdrCardClientId: function () {},
        setMdrImportStatus: function () {},
        setMonitoringStatus: function () {}
    });

    assert.equal(result, expectedController);
    assert.equal(capturedOptions.fileInput.id, "file");
    assert.equal(capturedOptions.importStatusModule.id, "status");
    assert.equal(capturedOptions.setMdrCardsData, gridDataBinders.setMdrCardsData);
    assert.equal(capturedOptions.getSelectedMdrCard, runtime.getSelectedMonitoringMdrCard);
});
