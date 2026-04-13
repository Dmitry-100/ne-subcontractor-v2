"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const kpEventsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-kp-events.js"));

test("monitoring KP events: control points handlers validate required dependencies", () => {
    assert.throws(function () {
        kpEventsModule.createControlPointsEvents({});
    }, /setSelectedMonitoringControlPointClientId/i);
});

test("monitoring KP events: control points handlers update selection and normalize rows", () => {
    const state = {
        selectedId: null
    };
    const statuses = [];
    let refreshStagesCalls = 0;
    let ensureSelectionCalls = 0;
    let markDirtyCalls = 0;

    const handlers = kpEventsModule.createControlPointsEvents({
        gridState: {
            setSelectedMonitoringControlPointClientId: function (value) {
                state.selectedId = value;
            }
        },
        setMonitoringStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        refreshMonitoringStagesGrid: function () {
            refreshStagesCalls += 1;
        },
        ensureMonitoringSelection: function () {
            ensureSelectionCalls += 1;
        },
        markMonitoringDirty: function () {
            markDirtyCalls += 1;
        },
        createMonitoringClientId: function (prefix) {
            return prefix + "-id";
        }
    });

    handlers.onSelectionChanged({
        selectedRowKeys: ["cp-1"]
    });
    assert.equal(state.selectedId, "cp-1");
    assert.equal(refreshStagesCalls, 1);

    const newRow = {
        data: {},
        component: {
            option: function () {
                return [{}, {}];
            }
        }
    };
    handlers.onInitNewRow(newRow);
    assert.equal(newRow.data.clientId, "cp-id");
    assert.equal(newRow.data.sortOrder, 2);
    assert.equal(newRow.data.progressPercent, 0);
    assert.equal(newRow.data.isDelayed, false);
    assert.deepEqual(newRow.data.stages, []);

    const insertEvent = {
        data: {}
    };
    handlers.onRowInserting(insertEvent);
    assert.deepEqual(insertEvent.data.stages, []);

    const updateEvent = {
        oldData: {
            clientId: "old-cp",
            stages: [{ id: 1 }]
        },
        newData: {}
    };
    handlers.onRowUpdating(updateEvent);
    assert.equal(updateEvent.newData.clientId, "old-cp");
    assert.deepEqual(updateEvent.newData.stages, [{ id: 1 }]);

    handlers.onRowInserted();
    handlers.onRowUpdated();
    handlers.onRowRemoved();
    assert.equal(ensureSelectionCalls, 3);
    assert.equal(markDirtyCalls, 3);

    handlers.onDataErrorOccurred({});
    assert.match(statuses.at(-1).message, /контрольными точками/i);
    assert.equal(statuses.at(-1).isError, true);
});

test("monitoring KP events: stages handlers validate parent selection and sync dirty state", () => {
    const statuses = [];
    let syncStagesCalls = 0;
    let markDirtyCalls = 0;
    let selectedControlPoint = null;

    const handlers = kpEventsModule.createStagesEvents({
        setMonitoringStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        syncStagesWithSelectedControlPoint: function () {
            syncStagesCalls += 1;
        },
        markMonitoringDirty: function () {
            markDirtyCalls += 1;
        },
        createMonitoringClientId: function (prefix) {
            return prefix + "-id";
        },
        getSelectedMonitoringControlPoint: function () {
            return selectedControlPoint;
        }
    });

    const newRow = {
        data: {},
        component: {
            option: function () {
                return [{}];
            }
        }
    };
    handlers.onInitNewRow(newRow);
    assert.equal(newRow.data.clientId, "cp-stage-id");
    assert.equal(newRow.data.sortOrder, 1);
    assert.equal(newRow.data.progressPercent, 0);
    assert.equal(newRow.data.isDelayed, false);

    const insertWithoutSelection = {};
    handlers.onRowInserting(insertWithoutSelection);
    assert.equal(insertWithoutSelection.cancel, true);
    assert.match(statuses.at(-1).message, /выберите контрольную точку/i);

    selectedControlPoint = { id: "cp-1" };
    const insertWithSelection = {};
    handlers.onRowInserting(insertWithSelection);
    assert.equal(insertWithSelection.cancel, undefined);

    const updateEvent = {
        oldData: {
            clientId: "old-stage"
        },
        newData: {}
    };
    handlers.onRowUpdating(updateEvent);
    assert.equal(updateEvent.newData.clientId, "old-stage");

    handlers.onRowInserted();
    handlers.onRowUpdated();
    handlers.onRowRemoved();
    assert.equal(syncStagesCalls, 3);
    assert.equal(markDirtyCalls, 3);

    handlers.onDataErrorOccurred({});
    assert.match(statuses.at(-1).message, /этапами контрольной точки/i);
    assert.equal(statuses.at(-1).isError, true);
});
