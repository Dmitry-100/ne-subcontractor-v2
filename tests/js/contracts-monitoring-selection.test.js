"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const selectionModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-selection.js"));

function createGridStub(initialDataSource) {
    const state = {
        dataSource: Array.isArray(initialDataSource) ? initialDataSource : [],
        selectedRows: [],
        clearSelectionCalls: 0,
        refreshCalls: 0
    };

    return {
        option: function (name, value) {
            if (arguments.length === 1) {
                if (name === "dataSource") {
                    return state.dataSource;
                }

                return undefined;
            }

            if (name === "dataSource") {
                state.dataSource = value;
            }
        },
        selectRows: function (rows) {
            state.selectedRows = rows;
        },
        clearSelection: function () {
            state.clearSelectionCalls += 1;
            state.selectedRows = [];
        },
        refresh: function () {
            state.refreshCalls += 1;
        },
        __state: state
    };
}

function createGridStateStub() {
    const state = {
        selectedMonitoringControlPointClientId: null,
        selectedMonitoringMdrCardClientId: null
    };

    return {
        getSelectedMonitoringControlPointClientId: function () {
            return state.selectedMonitoringControlPointClientId;
        },
        setSelectedMonitoringControlPointClientId: function (value) {
            state.selectedMonitoringControlPointClientId = value;
        },
        getSelectedMonitoringMdrCardClientId: function () {
            return state.selectedMonitoringMdrCardClientId;
        },
        setSelectedMonitoringMdrCardClientId: function (value) {
            state.selectedMonitoringMdrCardClientId = value;
        },
        __state: state
    };
}

function createMonitoringKpModule() {
    return {
        getControlPointsData: function (grid) {
            return grid ? grid.option("dataSource") : [];
        },
        findSelectedControlPoint: function (items, selectedClientId) {
            return (items || []).find(function (item) {
                return item.clientId === selectedClientId;
            }) || null;
        },
        getStagesDataSource: function (selectedControlPoint) {
            return selectedControlPoint && Array.isArray(selectedControlPoint.stages)
                ? selectedControlPoint.stages
                : [];
        },
        syncStagesToControlPoint: function (selectedControlPoint, source) {
            selectedControlPoint.stages = Array.isArray(source) ? source : [];
        },
        ensureSelectedControlPointId: function (items, currentId) {
            if (currentId && (items || []).some(function (item) { return item.clientId === currentId; })) {
                return currentId;
            }

            return (items && items.length > 0) ? items[0].clientId : null;
        }
    };
}

function createMonitoringMdrModule() {
    return {
        getMdrCardsData: function (grid) {
            return grid ? grid.option("dataSource") : [];
        },
        findSelectedMdrCard: function (items, selectedClientId) {
            return (items || []).find(function (item) {
                return item.clientId === selectedClientId;
            }) || null;
        },
        getRowsDataSource: function (selectedMdrCard) {
            return selectedMdrCard && Array.isArray(selectedMdrCard.rows)
                ? selectedMdrCard.rows
                : [];
        },
        syncRowsToMdrCard: function (selectedMdrCard, source) {
            selectedMdrCard.rows = Array.isArray(source) ? source : [];
        },
        ensureSelectedMdrCardId: function (items, currentId) {
            if (currentId && (items || []).some(function (item) { return item.clientId === currentId; })) {
                return currentId;
            }

            return (items && items.length > 0) ? items[0].clientId : null;
        }
    };
}

test("monitoring selection controller ensures defaults and refreshes dependent grids", () => {
    const gridState = createGridStateStub();
    const controlPointsGrid = createGridStub([
        { clientId: "cp-1", stages: [{ clientId: "stage-1" }] },
        { clientId: "cp-2", stages: [{ clientId: "stage-2" }] }
    ]);
    const stagesGrid = createGridStub([]);
    const mdrCardsGrid = createGridStub([
        { clientId: "mdr-1", rows: [{ clientId: "row-1" }] }
    ]);
    const mdrRowsGrid = createGridStub([]);
    let statusRefreshCalls = 0;

    const controller = selectionModule.createController({
        gridState: gridState,
        monitoringKpModule: createMonitoringKpModule(),
        monitoringMdrModule: createMonitoringMdrModule(),
        getControlPointsGrid: function () { return controlPointsGrid; },
        getStagesGrid: function () { return stagesGrid; },
        getMdrCardsGrid: function () { return mdrCardsGrid; },
        getMdrRowsGrid: function () { return mdrRowsGrid; },
        onSelectionStatusChanged: function () {
            statusRefreshCalls += 1;
        }
    });

    controller.ensureSelection();

    assert.equal(gridState.__state.selectedMonitoringControlPointClientId, "cp-1");
    assert.equal(gridState.__state.selectedMonitoringMdrCardClientId, "mdr-1");
    assert.deepEqual(controlPointsGrid.__state.selectedRows, ["cp-1"]);
    assert.deepEqual(mdrCardsGrid.__state.selectedRows, ["mdr-1"]);
    assert.deepEqual(stagesGrid.__state.dataSource, [{ clientId: "stage-1" }]);
    assert.deepEqual(mdrRowsGrid.__state.dataSource, [{ clientId: "row-1" }]);
    assert.equal(statusRefreshCalls, 2);
});

test("monitoring selection controller syncs rows and stages back to selected parent", () => {
    const gridState = createGridStateStub();
    gridState.setSelectedMonitoringControlPointClientId("cp-1");
    gridState.setSelectedMonitoringMdrCardClientId("mdr-1");

    const controlPointsGrid = createGridStub([
        { clientId: "cp-1", stages: [{ clientId: "old-stage" }] }
    ]);
    const stagesGrid = createGridStub([{ clientId: "new-stage" }]);
    const mdrCardsGrid = createGridStub([
        { clientId: "mdr-1", rows: [{ clientId: "old-row" }] }
    ]);
    const mdrRowsGrid = createGridStub([{ clientId: "new-row" }]);

    const controller = selectionModule.createController({
        gridState: gridState,
        monitoringKpModule: createMonitoringKpModule(),
        monitoringMdrModule: createMonitoringMdrModule(),
        getControlPointsGrid: function () { return controlPointsGrid; },
        getStagesGrid: function () { return stagesGrid; },
        getMdrCardsGrid: function () { return mdrCardsGrid; },
        getMdrRowsGrid: function () { return mdrRowsGrid; },
        onSelectionStatusChanged: function () { }
    });

    controller.syncStagesWithSelectedControlPoint();
    controller.syncRowsWithSelectedMdrCard();

    assert.deepEqual(controlPointsGrid.__state.dataSource[0].stages, [{ clientId: "new-stage" }]);
    assert.deepEqual(mdrCardsGrid.__state.dataSource[0].rows, [{ clientId: "new-row" }]);
    assert.equal(controlPointsGrid.__state.refreshCalls, 1);
    assert.equal(mdrCardsGrid.__state.refreshCalls, 1);
});
