"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const panelEventsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-execution-panel-events.js"));

test("execution panel events: validates required dependencies", () => {
    assert.throws(function () {
        panelEventsModule.createEvents({});
    }, /persistMilestones/i);
});

test("execution panel events: init row and persistence callbacks preserve behavior", async () => {
    const persistMessages = [];
    const statuses = [];

    const events = panelEventsModule.createEvents({
        persistMilestones: function (message) {
            persistMessages.push(message);
            return Promise.resolve();
        },
        setExecutionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        }
    });

    const initEvent = {
        component: {
            option: function (name) {
                if (name === "dataSource") {
                    return [{}, {}, {}];
                }

                return [];
            }
        },
        data: {}
    };
    events.onInitNewRow(initEvent);
    assert.equal(initEvent.data.sortOrder, 3);
    assert.equal(initEvent.data.progressPercent, 0);

    events.onRowInserted();
    events.onRowUpdated();
    events.onRowRemoved();
    await new Promise(function (resolve) { setImmediate(resolve); });

    assert.deepEqual(persistMessages, ["Этап добавлен.", "Этап обновлён.", "Этап удалён."]);

    events.onDataErrorOccurred({
        error: {
            message: "Ошибка сохранения"
        }
    });

    assert.deepEqual(statuses.at(-1), {
        message: "Ошибка сохранения",
        isError: true
    });
});

test("execution panel events: persistence failure is surfaced via status", async () => {
    const statuses = [];

    const events = panelEventsModule.createEvents({
        persistMilestones: function () {
            return Promise.reject(new Error("save failed"));
        },
        setExecutionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        }
    });

    events.onRowInserted();
    await new Promise(function (resolve) { setImmediate(resolve); });

    assert.deepEqual(statuses.at(-1), {
        message: "save failed",
        isError: true
    });
});
