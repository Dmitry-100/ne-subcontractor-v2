"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleUnderTest = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-monitoring.js"));

test("contracts runtime monitoring controller module: validates required dependencies", () => {
    assert.throws(function () {
        moduleUnderTest.createMonitoringController({
            foundation: {},
            elements: {},
            modules: {}
        });
    }, /requires/i);
});

test("contracts runtime monitoring controller module: composes monitoring controller options", () => {
    const events = {
        createControllerOptions: null,
        parseMdrImportFileArgs: null
    };

    const monitoringController = { id: "monitoring-controller" };

    const foundation = {
        hostWindow: {
            XLSX: { id: "xlsx-runtime" }
        },
        helpers: {
            parseMdrImportFile: function (file, xlsx) {
                events.parseMdrImportFileArgs = { file: file, xlsx: xlsx };
                return [];
            },
            parseMdrImportItemsFromRows: function () { return []; }
        },
        apiClient: { id: "api-client" },
        monitoringModel: { id: "monitoring-model" },
        gridState: { id: "grid-state" },
        setMonitoringStatus: function () {},
        setMdrImportStatus: function () {},
        localizeStatus: function (status) { return status; },
        getSelectedContract: function () { return { id: "contract-1" }; },
        canEditMilestones: function () { return true; }
    };

    const elements = {
        monitoringSelectedElement: {},
        monitoringStatusElement: {},
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
        mdrImportResetButton: {}
    };

    const modules = {
        monitoringControllerModule: {
            createController: function (options) {
                events.createControllerOptions = options;
                return monitoringController;
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
        monitoringDataModule: { id: "monitoring-data-module" }
    };

    const controller = moduleUnderTest.createMonitoringController({
        foundation: foundation,
        elements: elements,
        modules: modules
    });

    assert.equal(controller, monitoringController);
    assert.equal(events.createControllerOptions.monitoringKpModule.id, "kp-module");
    assert.equal(events.createControllerOptions.elements.monitoringMdrRowsGridElement.id, "mdr-rows-grid");
    assert.equal(events.createControllerOptions.monitoringImportModule.id, "monitoring-import-module");

    events.createControllerOptions.parseMdrImportFile("mdr.xlsx");
    assert.deepEqual(events.parseMdrImportFileArgs, {
        file: "mdr.xlsx",
        xlsx: foundation.hostWindow.XLSX
    });
    assert.equal(
        events.createControllerOptions.parseMdrImportItemsFromRows,
        foundation.helpers.parseMdrImportItemsFromRows);
});
