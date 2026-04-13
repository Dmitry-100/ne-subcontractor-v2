"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const monitoringWiringModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-wiring.js"));

function createButton() {
    const handlers = {};

    return {
        addEventListener: function (eventName, handler) {
            handlers[eventName] = handler;
        },
        trigger: function (eventName) {
            if (typeof handlers[eventName] === "function") {
                return handlers[eventName]();
            }

            return undefined;
        }
    };
}

test("contracts monitoring wiring: bindCoreEvents validates required controls", () => {
    assert.throws(function () {
        monitoringWiringModule.bindCoreEvents({
            refreshButton: {},
            saveButton: createButton(),
            loadData: function () {},
            saveData: function () {
                return Promise.resolve();
            },
            setMonitoringStatus: function () {}
        });
    }, /refreshButton\.addEventListener/i);
});

test("contracts monitoring wiring: bindCoreEvents wires refresh/save and reports save errors", async () => {
    const refreshButton = createButton();
    const saveButton = createButton();
    const statusCalls = [];
    const loadDataCalls = [];

    monitoringWiringModule.bindCoreEvents({
        refreshButton: refreshButton,
        saveButton: saveButton,
        loadData: function (showStatusMessage) {
            loadDataCalls.push(showStatusMessage);
        },
        saveData: function () {
            return Promise.reject(new Error("save-failed"));
        },
        setMonitoringStatus: function (message, isError) {
            statusCalls.push({ message: message, isError: isError });
        }
    });

    refreshButton.trigger("click");
    assert.deepEqual(loadDataCalls, [true]);

    saveButton.trigger("click");
    await new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });

    assert.equal(statusCalls.at(-1).isError, true);
    assert.match(statusCalls.at(-1).message, /save-failed/i);
});

test("contracts monitoring wiring: createGridDataBinders returns safe data-source mutators", () => {
    const calls = [];
    const controlPointsGrid = {
        option: function (name, value) {
            calls.push({ grid: "cp", name: name, value: value });
        }
    };
    const mdrCardsGrid = {
        option: function (name, value) {
            calls.push({ grid: "mdr", name: name, value: value });
        }
    };

    const binders = monitoringWiringModule.createGridDataBinders({
        getControlPointsGrid: function () {
            return controlPointsGrid;
        },
        getStagesGrid: function () {
            return null;
        },
        getMdrCardsGrid: function () {
            return mdrCardsGrid;
        },
        getMdrRowsGrid: function () {
            return null;
        }
    });

    const grids = binders.getMonitoringGrids();
    assert.equal(grids.length, 4);
    assert.equal(grids[0], controlPointsGrid);
    assert.equal(grids[2], mdrCardsGrid);

    binders.setControlPointsData([{ id: 1 }]);
    binders.setMdrCardsData([{ id: 2 }]);

    assert.deepEqual(calls, [
        { grid: "cp", name: "dataSource", value: [{ id: 1 }] },
        { grid: "mdr", name: "dataSource", value: [{ id: 2 }] }
    ]);
});
