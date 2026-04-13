"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const monitoringGridsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids.js"));
const monitoringKpGridsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-kp.js"));
const monitoringMdrGridsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-mdr.js"));

function createJQueryStub(gridRegistry) {
    return function (element) {
        return {
            dxDataGrid: function (options) {
                const record = {
                    config: options,
                    dataSource: [],
                    instance: {
                        option: function (name, value) {
                            if (arguments.length === 1) {
                                if (name === "dataSource") {
                                    return record.dataSource;
                                }

                                return undefined;
                            }

                            if (name === "dataSource") {
                                record.dataSource = value;
                            }
                        },
                        refresh: function () { },
                        selectRows: function () { },
                        clearSelection: function () { }
                    }
                };

                gridRegistry.set(element, record);

                return {
                    dxDataGrid: function (arg) {
                        if (arg === "instance") {
                            return record.instance;
                        }

                        throw new Error("Unsupported dxDataGrid call.");
                    }
                };
            }
        };
    };
}

test("monitoring grids module wires selection callbacks and fallback data-error messages", () => {
    const gridRegistry = new Map();
    global.window = {
        jQuery: createJQueryStub(gridRegistry)
    };

    const elements = {
        monitoringControlPointsGridElement: { id: "cp" },
        monitoringStagesGridElement: { id: "stages" },
        monitoringMdrCardsGridElement: { id: "mdr-cards" },
        monitoringMdrRowsGridElement: { id: "mdr-rows" }
    };

    const state = {
        selectedControlPointClientId: null,
        selectedMdrCardClientId: null
    };
    let refreshStagesCalls = 0;
    let refreshRowsCalls = 0;
    const statusLog = [];

    monitoringGridsModule.createGrids({
        elements: elements,
        gridState: {
            setSelectedMonitoringControlPointClientId: function (value) {
                state.selectedControlPointClientId = value;
            },
            setSelectedMonitoringMdrCardClientId: function (value) {
                state.selectedMdrCardClientId = value;
            }
        },
        setMonitoringStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        },
        refreshMonitoringStagesGrid: function () {
            refreshStagesCalls += 1;
        },
        refreshMonitoringRowsGrid: function () {
            refreshRowsCalls += 1;
        },
        ensureMonitoringSelection: function () { },
        markMonitoringDirty: function () { },
        syncStagesWithSelectedControlPoint: function () { },
        syncRowsWithSelectedMdrCard: function () { },
        createMonitoringClientId: function () { return "client-id"; },
        getSelectedMonitoringControlPoint: function () { return null; },
        getSelectedMonitoringMdrCard: function () { return null; },
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
        kpGridsModule: monitoringKpGridsModule,
        mdrGridsModule: monitoringMdrGridsModule
    });

    const controlPointsConfig = gridRegistry.get(elements.monitoringControlPointsGridElement).config;
    const mdrCardsConfig = gridRegistry.get(elements.monitoringMdrCardsGridElement).config;

    controlPointsConfig.onSelectionChanged({
        selectedRowKeys: ["cp-1"]
    });
    mdrCardsConfig.onSelectionChanged({
        selectedRowKeys: ["mdr-9"]
    });

    assert.equal(state.selectedControlPointClientId, "cp-1");
    assert.equal(state.selectedMdrCardClientId, "mdr-9");
    assert.equal(refreshStagesCalls, 1);
    assert.equal(refreshRowsCalls, 1);

    controlPointsConfig.onDataErrorOccurred({});
    assert.equal(statusLog.at(-1).isError, true);
    assert.match(statusLog.at(-1).message, /контрольными точками/i);
});

test("monitoring grids module enforces selected parent before inserting stage and MDR row", () => {
    const gridRegistry = new Map();
    global.window = {
        jQuery: createJQueryStub(gridRegistry)
    };

    const elements = {
        monitoringControlPointsGridElement: { id: "cp" },
        monitoringStagesGridElement: { id: "stages" },
        monitoringMdrCardsGridElement: { id: "mdr-cards" },
        monitoringMdrRowsGridElement: { id: "mdr-rows" }
    };
    const statusLog = [];

    monitoringGridsModule.createGrids({
        elements: elements,
        gridState: {
            setSelectedMonitoringControlPointClientId: function () { },
            setSelectedMonitoringMdrCardClientId: function () { }
        },
        setMonitoringStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        },
        refreshMonitoringStagesGrid: function () { },
        refreshMonitoringRowsGrid: function () { },
        ensureMonitoringSelection: function () { },
        markMonitoringDirty: function () { },
        syncStagesWithSelectedControlPoint: function () { },
        syncRowsWithSelectedMdrCard: function () { },
        createMonitoringClientId: function () { return "client-id"; },
        getSelectedMonitoringControlPoint: function () { return null; },
        getSelectedMonitoringMdrCard: function () { return null; },
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
        kpGridsModule: monitoringKpGridsModule,
        mdrGridsModule: monitoringMdrGridsModule
    });

    const stagesConfig = gridRegistry.get(elements.monitoringStagesGridElement).config;
    const mdrRowsConfig = gridRegistry.get(elements.monitoringMdrRowsGridElement).config;

    const stageInsert = {};
    stagesConfig.onRowInserting(stageInsert);
    assert.equal(stageInsert.cancel, true);
    assert.match(statusLog.at(-1).message, /выберите контрольную точку/i);

    const mdrRowInsert = {};
    mdrRowsConfig.onRowInserting(mdrRowInsert);
    assert.equal(mdrRowInsert.cancel, true);
    assert.match(statusLog.at(-1).message, /выберите карточку mdr/i);
});

test("monitoring grids module validates required submodules", () => {
    assert.throws(function () {
        monitoringGridsModule.createGrids({
            kpGridsModule: null,
            mdrGridsModule: monitoringMdrGridsModule
        });
    }, /kp grids module/i);

    assert.throws(function () {
        monitoringGridsModule.createGrids({
            kpGridsModule: monitoringKpGridsModule,
            mdrGridsModule: null
        });
    }, /mdr grids module/i);
});
