"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dataServiceModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-data.js"));

function createGridStateStub() {
    const state = {
        selectedControlPointClientId: null,
        selectedMdrCardClientId: null,
        resetCalls: 0
    };

    return {
        resetMonitoringSelection: function () {
            state.resetCalls += 1;
            state.selectedControlPointClientId = null;
            state.selectedMdrCardClientId = null;
        },
        setSelectedMonitoringControlPointClientId: function (value) {
            state.selectedControlPointClientId = value;
        },
        getSelectedMonitoringControlPointClientId: function () {
            return state.selectedControlPointClientId;
        },
        setSelectedMonitoringMdrCardClientId: function (value) {
            state.selectedMdrCardClientId = value;
        },
        getSelectedMonitoringMdrCardClientId: function () {
            return state.selectedMdrCardClientId;
        },
        __state: state
    };
}

test("monitoring data service resets view state when contract is not selected", async () => {
    const gridState = createGridStateStub();
    const calls = {
        controlPoints: [],
        mdrCards: [],
        refreshStages: 0,
        refreshRows: 0
    };

    const service = dataServiceModule.createService({
        apiClient: {},
        gridState: gridState,
        getSelectedContract: function () { return null; },
        canEditMilestones: function () { return false; },
        normalizeMonitoringControlPoint: function (item) { return item; },
        normalizeMonitoringMdrCard: function (item) { return item; },
        getMonitoringControlPointsData: function () { return []; },
        getMonitoringMdrCardsData: function () { return []; },
        buildMonitoringControlPointsPayload: function () { return []; },
        buildMonitoringMdrCardsPayload: function () { return []; },
        setControlPointsData: function (items) { calls.controlPoints.push(items); },
        setMdrCardsData: function (items) { calls.mdrCards.push(items); },
        ensureMonitoringSelection: function () { },
        refreshMonitoringStagesGrid: function () { calls.refreshStages += 1; },
        refreshMonitoringRowsGrid: function () { calls.refreshRows += 1; },
        setMonitoringStatus: function () { }
    });

    await service.loadData(false);

    assert.equal(gridState.__state.resetCalls, 1);
    assert.deepEqual(calls.controlPoints.at(-1), []);
    assert.deepEqual(calls.mdrCards.at(-1), []);
    assert.equal(calls.refreshStages, 1);
    assert.equal(calls.refreshRows, 1);
});

test("monitoring data service loads payload, normalizes and publishes status", async () => {
    const gridState = createGridStateStub();
    const statusLog = [];
    const calls = {
        controlPoints: [],
        mdrCards: [],
        ensure: 0
    };

    const service = dataServiceModule.createService({
        apiClient: {
            getMonitoringControlPoints: async function () {
                return [{ code: "cp-1" }, { code: "cp-2" }];
            },
            getMonitoringMdrCards: async function () {
                return [{ code: "mdr-1" }];
            }
        },
        gridState: gridState,
        getSelectedContract: function () {
            return { id: "contract-1", status: "Active" };
        },
        canEditMilestones: function () { return true; },
        normalizeMonitoringControlPoint: function (item, index) {
            return { clientId: `cp-${index}`, code: item.code };
        },
        normalizeMonitoringMdrCard: function (item, index) {
            return { clientId: `mdr-${index}`, code: item.code };
        },
        getMonitoringControlPointsData: function () { return []; },
        getMonitoringMdrCardsData: function () { return []; },
        buildMonitoringControlPointsPayload: function () { return []; },
        buildMonitoringMdrCardsPayload: function () { return []; },
        setControlPointsData: function (items) { calls.controlPoints.push(items); },
        setMdrCardsData: function (items) { calls.mdrCards.push(items); },
        ensureMonitoringSelection: function () { calls.ensure += 1; },
        refreshMonitoringStagesGrid: function () { },
        refreshMonitoringRowsGrid: function () { },
        setMonitoringStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        }
    });

    await service.loadData(true);

    assert.equal(calls.controlPoints.at(-1).length, 2);
    assert.equal(calls.mdrCards.at(-1).length, 1);
    assert.equal(gridState.getSelectedMonitoringControlPointClientId(), "cp-0");
    assert.equal(gridState.getSelectedMonitoringMdrCardClientId(), "mdr-0");
    assert.equal(calls.ensure, 1);
    assert.equal(statusLog.at(-1).isError, false);
    assert.match(statusLog.at(-1).message, /Загружено: КП 2, MDR карточек 1\./);
});

test("monitoring data service blocks save in read-only status", async () => {
    const gridState = createGridStateStub();
    const statusLog = [];
    let saveControlPointsCalls = 0;
    let saveMdrCardsCalls = 0;

    const service = dataServiceModule.createService({
        apiClient: {
            saveMonitoringControlPoints: async function () {
                saveControlPointsCalls += 1;
                return [];
            },
            saveMonitoringMdrCards: async function () {
                saveMdrCardsCalls += 1;
                return [];
            }
        },
        gridState: gridState,
        getSelectedContract: function () {
            return { id: "contract-1", status: "Draft" };
        },
        canEditMilestones: function () { return false; },
        normalizeMonitoringControlPoint: function (item) { return item; },
        normalizeMonitoringMdrCard: function (item) { return item; },
        getMonitoringControlPointsData: function () { return []; },
        getMonitoringMdrCardsData: function () { return []; },
        buildMonitoringControlPointsPayload: function () { return []; },
        buildMonitoringMdrCardsPayload: function () { return []; },
        setControlPointsData: function () { },
        setMdrCardsData: function () { },
        ensureMonitoringSelection: function () { },
        refreshMonitoringStagesGrid: function () { },
        refreshMonitoringRowsGrid: function () { },
        setMonitoringStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        }
    });

    await service.saveData();

    assert.equal(saveControlPointsCalls, 0);
    assert.equal(saveMdrCardsCalls, 0);
    assert.equal(statusLog.at(-1).isError, true);
    assert.match(statusLog.at(-1).message, /только для чтения/i);
});
