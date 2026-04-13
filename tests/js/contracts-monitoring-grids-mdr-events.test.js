"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const mdrEventsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-mdr-events.js"));

test("monitoring MDR events: cards handlers validate required dependencies", () => {
    assert.throws(function () {
        mdrEventsModule.createMdrCardsEvents({});
    }, /setSelectedMonitoringMdrCardClientId/i);
});

test("monitoring MDR events: cards handlers update selection and normalize inserted row", () => {
    const state = {
        selectedId: null
    };
    const statuses = [];
    let refreshRowsCalls = 0;
    let ensureSelectionCalls = 0;
    let markDirtyCalls = 0;

    const handlers = mdrEventsModule.createMdrCardsEvents({
        gridState: {
            setSelectedMonitoringMdrCardClientId: function (value) {
                state.selectedId = value;
            }
        },
        setMonitoringStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        refreshMonitoringRowsGrid: function () {
            refreshRowsCalls += 1;
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
        selectedRowKeys: ["mdr-1"]
    });
    assert.equal(state.selectedId, "mdr-1");
    assert.equal(refreshRowsCalls, 1);

    const newRow = {
        data: {},
        component: {
            option: function () {
                return [{}, {}];
            }
        }
    };
    handlers.onInitNewRow(newRow);
    assert.equal(newRow.data.clientId, "mdr-card-id");
    assert.equal(newRow.data.sortOrder, 2);
    assert.deepEqual(newRow.data.rows, []);

    const insertEvent = {
        data: {}
    };
    handlers.onRowInserting(insertEvent);
    assert.deepEqual(insertEvent.data.rows, []);

    const updateEvent = {
        oldData: {
            clientId: "old-card",
            rows: [{ id: 1 }]
        },
        newData: {}
    };
    handlers.onRowUpdating(updateEvent);
    assert.equal(updateEvent.newData.clientId, "old-card");
    assert.deepEqual(updateEvent.newData.rows, [{ id: 1 }]);

    handlers.onRowInserted();
    handlers.onRowUpdated();
    handlers.onRowRemoved();
    assert.equal(ensureSelectionCalls, 3);
    assert.equal(markDirtyCalls, 3);

    handlers.onDataErrorOccurred({});
    assert.match(statuses.at(-1).message, /карточками MDR/i);
    assert.equal(statuses.at(-1).isError, true);
});

test("monitoring MDR events: rows handlers validate parent selection and sync dirty state", () => {
    const statuses = [];
    let syncRowsCalls = 0;
    let markDirtyCalls = 0;
    let selectedCard = null;

    const handlers = mdrEventsModule.createMdrRowsEvents({
        setMonitoringStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        syncRowsWithSelectedMdrCard: function () {
            syncRowsCalls += 1;
        },
        markMonitoringDirty: function () {
            markDirtyCalls += 1;
        },
        createMonitoringClientId: function (prefix) {
            return prefix + "-id";
        },
        getSelectedMonitoringMdrCard: function () {
            return selectedCard;
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
    assert.equal(newRow.data.clientId, "mdr-row-id");
    assert.equal(newRow.data.sortOrder, 1);
    assert.equal(newRow.data.planValue, 0);
    assert.equal(newRow.data.forecastValue, 0);
    assert.equal(newRow.data.factValue, 0);

    const insertWithoutSelection = {};
    handlers.onRowInserting(insertWithoutSelection);
    assert.equal(insertWithoutSelection.cancel, true);
    assert.match(statuses.at(-1).message, /выберите карточку mdr/i);

    selectedCard = { id: "mdr-1" };
    const insertWithSelection = {};
    handlers.onRowInserting(insertWithSelection);
    assert.equal(insertWithSelection.cancel, undefined);

    const updateEvent = {
        oldData: {
            clientId: "old-row"
        },
        newData: {}
    };
    handlers.onRowUpdating(updateEvent);
    assert.equal(updateEvent.newData.clientId, "old-row");

    handlers.onRowInserted();
    handlers.onRowUpdated();
    handlers.onRowRemoved();
    assert.equal(syncRowsCalls, 3);
    assert.equal(markDirtyCalls, 3);

    handlers.onDataErrorOccurred({});
    assert.match(statuses.at(-1).message, /строками MDR/i);
    assert.equal(statuses.at(-1).isError, true);
});
