"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const monitoringBootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-bootstrap.js"));

function createOptions() {
    return {
        elements: {
            monitoringSelectedElement: {},
            monitoringStatusElement: {},
            monitoringRefreshButton: {},
            monitoringSaveButton: {},
            monitoringControlPointsGridElement: {},
            monitoringStagesGridElement: {},
            monitoringMdrCardsGridElement: {},
            monitoringMdrRowsGridElement: {},
            monitoringControlPointSelectedElement: {},
            monitoringMdrCardSelectedElement: {},
            mdrImportFileInput: {},
            mdrImportModeSelect: {},
            mdrImportApplyButton: {},
            mdrImportResetButton: {}
        },
        apiClient: {
            importMonitoringMdrForecastFact: function () {}
        },
        monitoringModel: {
            normalizeControlPoint: function () {},
            normalizeMdrCard: function () {},
            calculateDeviationPercent: function () {},
            calculateMdrCardMetrics: function () {},
            createClientId: function () {},
            buildControlPointsPayload: function () {},
            buildMdrCardsPayload: function () {}
        },
        monitoringMdrModule: {
            buildMdrCardSelectionKey: function () {}
        },
        monitoringGridsModule: {
            createGrids: function () {}
        },
        monitoringControlsModule: {
            createController: function () {}
        },
        monitoringSelectionModule: {
            createController: function () {}
        },
        monitoringDataModule: {
            createService: function () {}
        },
        monitoringImportModule: {
            createController: function () {}
        },
        getSelectedContract: function () {},
        canEditMilestones: function () {},
        localizeStatus: function () {},
        setMonitoringStatus: function () {},
        setMdrImportStatus: function () {},
        parseMdrImportFile: function () {},
        parseMdrImportItemsFromRows: function () {}
    };
}

test("contracts monitoring bootstrap: returns normalized composition context", () => {
    const options = createOptions();
    const context = monitoringBootstrapModule.createCompositionContext(options);

    assert.equal(context.settings, options);
    assert.equal(context.elements, options.elements);
});

test("contracts monitoring bootstrap: validates required monitoring element", () => {
    const options = createOptions();
    delete options.elements.monitoringSaveButton;

    assert.throws(function () {
        monitoringBootstrapModule.createCompositionContext(options);
    }, /missing required element: monitoringSaveButton/i);
});

test("contracts monitoring bootstrap: validates monitoring model contract", () => {
    const options = createOptions();
    delete options.monitoringModel.createClientId;

    assert.throws(function () {
        monitoringBootstrapModule.createCompositionContext(options);
    }, /monitoringModel\.createClientId/i);
});
