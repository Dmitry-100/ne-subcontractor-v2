"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const coreModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-data-core.js"));

function createHistoryGridStub() {
    return {
        optionCalls: [],
        option: function (key, value) {
            this.optionCalls.push({ key: key, value: value });
        }
    };
}

test("lots data core: validates required dependencies", () => {
    assert.throws(function () {
        coreModule.createDataCore({});
    }, /apiClient/i);

    assert.throws(function () {
        coreModule.createDataCore({
            apiClient: {
                getLotDetails: async function () {},
                getLotHistory: async function () {}
            },
            onSelectionChanged: "invalid",
            onHistoryLoadError: function () {}
        });
    }, /onSelectionChanged callback/i);
});

test("lots data core: loadHistory clears history grid for empty lot", async () => {
    const historyGrid = createHistoryGridStub();

    const core = coreModule.createDataCore({
        apiClient: {
            getLotDetails: async function () { return null; },
            getLotHistory: async function () { return []; }
        },
        onSelectionChanged: function () {},
        onHistoryLoadError: function () {}
    });

    core.attachGridInstances({
        historyGridInstance: historyGrid
    });

    const rows = await core.loadHistory(null);
    assert.deepEqual(rows, []);
    assert.deepEqual(historyGrid.optionCalls, [{ key: "dataSource", value: [] }]);
});

test("lots data core: applySelection and refreshLotsAndReselect keep selection flow", async () => {
    const selectionEvents = [];
    const historyErrors = [];
    const historyGrid = createHistoryGridStub();
    const lotsGrid = {
        refreshCalls: 0,
        selectRowsCalls: [],
        refresh: async function () {
            this.refreshCalls += 1;
        },
        selectRows: async function (keys, preserve) {
            this.selectRowsCalls.push({ keys: keys, preserve: preserve });
        }
    };

    const core = coreModule.createDataCore({
        apiClient: {
            getLotDetails: async function () { return null; },
            getLotHistory: async function () {
                throw new Error("history failed");
            }
        },
        onSelectionChanged: function (selectedLot) {
            selectionEvents.push(selectedLot ? selectedLot.id : null);
        },
        onHistoryLoadError: function (error) {
            historyErrors.push(error.message);
        }
    });

    core.setLotsCache([
        {
            id: "lot-1",
            code: "LOT-1",
            name: "Лот 1",
            status: "Draft"
        }
    ]);

    core.attachGridInstances({
        lotsGridInstance: lotsGrid,
        historyGridInstance: historyGrid
    });

    await core.refreshLotsAndReselect("lot-1");
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(core.getSelectedLot().id, "lot-1");
    assert.deepEqual(selectionEvents, ["lot-1"]);
    assert.deepEqual(historyErrors, ["history failed"]);
    assert.equal(lotsGrid.refreshCalls, 1);
    assert.deepEqual(lotsGrid.selectRowsCalls, [{ keys: ["lot-1"], preserve: false }]);
});
