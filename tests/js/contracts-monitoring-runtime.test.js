"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-runtime.js"));

function createMonitoringModel() {
    return {
        normalizeControlPoint: function (item) { return item; },
        normalizeMdrCard: function (item) { return item; },
        calculateDeviationPercent: function () { return 10; },
        calculateMdrCardMetrics: function () { return { totalPlanValue: 1 }; },
        createClientId: function (prefix) { return prefix + "-1"; },
        buildControlPointsPayload: function () { return [{ id: "cp" }]; },
        buildMdrCardsPayload: function () { return [{ id: "mdr" }]; }
    };
}

test("contracts-monitoring runtime: validates required dependencies", () => {
    assert.throws(
        function () {
            runtimeModule.createRuntime({});
        },
        /monitoringModel/i);

    assert.throws(
        function () {
            runtimeModule.createRuntime({
                monitoringModel: createMonitoringModel()
            });
        },
        /setMonitoringStatus/i);
});

test("contracts-monitoring runtime: delegates to attached controllers/services", async () => {
    const statuses = [];
    const runtime = runtimeModule.createRuntime({
        monitoringModel: createMonitoringModel(),
        setMonitoringStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        }
    });

    const cpGrid = { option: function () {} };
    const stagesGrid = { option: function () {} };
    const mdrCardsGrid = { option: function () {} };
    const mdrRowsGrid = { option: function () {} };

    runtime.setGridInstances({
        monitoringControlPointsGridInstance: cpGrid,
        monitoringStagesGridInstance: stagesGrid,
        monitoringMdrCardsGridInstance: mdrCardsGrid,
        monitoringMdrRowsGridInstance: mdrRowsGrid
    });

    assert.equal(runtime.getControlPointsGrid(), cpGrid);
    assert.equal(runtime.getStagesGrid(), stagesGrid);
    assert.equal(runtime.getMdrCardsGrid(), mdrCardsGrid);
    assert.equal(runtime.getMdrRowsGrid(), mdrRowsGrid);

    const uiCalls = { update: 0, refreshSelection: 0 };
    const selectionCalls = { refreshStages: 0, refreshRows: 0, syncStages: 0, syncRows: 0, ensure: 0 };
    const dataCalls = { load: 0, save: 0 };

    runtime.attachControllers({
        uiController: {
            updateControls: function () { uiCalls.update += 1; },
            refreshSelectionStatus: function () { uiCalls.refreshSelection += 1; }
        },
        selectionController: {
            getControlPointsData: function () { return [{ id: "cp" }]; },
            getMdrCardsData: function () { return [{ id: "mdr" }]; },
            getSelectedControlPoint: function () { return { id: "cp" }; },
            getSelectedMdrCard: function () { return { id: "mdr" }; },
            refreshStagesGrid: function () { selectionCalls.refreshStages += 1; },
            refreshRowsGrid: function () { selectionCalls.refreshRows += 1; },
            syncStagesWithSelectedControlPoint: function () { selectionCalls.syncStages += 1; },
            syncRowsWithSelectedMdrCard: function () { selectionCalls.syncRows += 1; },
            ensureSelection: function () { selectionCalls.ensure += 1; }
        },
        dataService: {
            loadData: function () {
                dataCalls.load += 1;
                return Promise.resolve();
            },
            saveData: function () {
                dataCalls.save += 1;
                return Promise.resolve();
            }
        }
    });

    assert.deepEqual(runtime.getMonitoringControlPointsData(), [{ id: "cp" }]);
    assert.deepEqual(runtime.getMonitoringMdrCardsData(), [{ id: "mdr" }]);
    assert.deepEqual(runtime.getSelectedMonitoringControlPoint(), { id: "cp" });
    assert.deepEqual(runtime.getSelectedMonitoringMdrCard(), { id: "mdr" });

    runtime.refreshMonitoringSelectionStatus();
    runtime.refreshMonitoringStagesGrid();
    runtime.refreshMonitoringRowsGrid();
    runtime.syncStagesWithSelectedControlPoint();
    runtime.syncRowsWithSelectedMdrCard();
    runtime.ensureMonitoringSelection();
    runtime.updateControls();

    assert.equal(uiCalls.refreshSelection, 1);
    assert.equal(uiCalls.update, 1);
    assert.equal(selectionCalls.refreshStages, 1);
    assert.equal(selectionCalls.refreshRows, 1);
    assert.equal(selectionCalls.syncStages, 1);
    assert.equal(selectionCalls.syncRows, 1);
    assert.equal(selectionCalls.ensure, 1);

    await runtime.loadData(true);
    await runtime.saveData();
    assert.equal(dataCalls.load, 1);
    assert.equal(dataCalls.save, 1);

    runtime.markMonitoringDirty();
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].isError, false);
    assert.match(statuses[0].message, /несохранённые изменения/i);

    assert.equal(runtime.calculateDeviationPercent(1, 1), 10);
    assert.deepEqual(runtime.calculateMdrCardMetrics({}), { totalPlanValue: 1 });
    assert.equal(runtime.createMonitoringClientId("cp"), "cp-1");
    assert.deepEqual(runtime.buildMonitoringControlPointsPayload([]), [{ id: "cp" }]);
    assert.deepEqual(runtime.buildMonitoringMdrCardsPayload([]), [{ id: "mdr" }]);
});
