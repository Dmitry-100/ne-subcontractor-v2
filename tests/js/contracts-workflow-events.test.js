"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const workflowEventsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-workflow-events.js"));

test("workflow events: validates required dependencies", () => {
    assert.throws(function () {
        workflowEventsModule.createEvents({});
    }, /getSelectedContract/i);
});

test("workflow events: apply handler validates selection and target", () => {
    const statuses = [];
    const events = workflowEventsModule.createEvents({
        getSelectedContract: function () { return null; },
        setTransitionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        getTargetStatus: function () { return ""; },
        getReason: function () { return ""; },
        clearReason: function () {},
        getStatusRank: function () { return 0; },
        localizeStatus: function (status) { return status; },
        transitionContract: function () { return Promise.resolve({}); },
        onTransitionCompleted: function () { return Promise.resolve(); },
        loadHistory: function () { return Promise.resolve(); }
    });

    events.onApplyClick();
    assert.deepEqual(statuses.at(-1), {
        message: "Сначала выберите договор.",
        isError: true
    });
});

test("workflow events: apply handler validates rollback reason", () => {
    const statuses = [];
    const events = workflowEventsModule.createEvents({
        getSelectedContract: function () {
            return {
                id: "contract-1",
                status: "Active"
            };
        },
        setTransitionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        getTargetStatus: function () { return "Signed"; },
        getReason: function () { return " "; },
        clearReason: function () {},
        getStatusRank: function (status) {
            return status === "Active" ? 3 : 2;
        },
        localizeStatus: function (status) { return status; },
        transitionContract: function () { return Promise.resolve({}); },
        onTransitionCompleted: function () { return Promise.resolve(); },
        loadHistory: function () { return Promise.resolve(); }
    });

    events.onApplyClick();
    assert.deepEqual(statuses.at(-1), {
        message: "Для отката статуса необходимо указать причину.",
        isError: true
    });
});

test("workflow events: apply handler executes transition and completion callback", async () => {
    const statuses = [];
    const transitionCalls = [];
    const completedIds = [];
    let reasonCleared = 0;
    let historyRefreshCalls = 0;

    const events = workflowEventsModule.createEvents({
        getSelectedContract: function () {
            return {
                id: "contract-1",
                status: "Signed"
            };
        },
        setTransitionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        getTargetStatus: function () { return "Active"; },
        getReason: function () { return "Подтверждено"; },
        clearReason: function () { reasonCleared += 1; },
        getStatusRank: function (status) {
            return status === "Signed" ? 2 : 3;
        },
        localizeStatus: function (status) {
            return status === "Signed" ? "Подписан" : "Действует";
        },
        transitionContract: function (id, payload) {
            transitionCalls.push({ id: id, payload: payload });
            return Promise.resolve({
                fromStatus: "Signed",
                toStatus: "Active"
            });
        },
        onTransitionCompleted: function (id) {
            completedIds.push(id);
            return Promise.resolve();
        },
        loadHistory: function (showStatusMessage) {
            historyRefreshCalls += showStatusMessage ? 1 : 0;
            return Promise.resolve();
        }
    });

    events.onApplyClick();
    await new Promise(function (resolve) { setImmediate(resolve); });

    assert.deepEqual(transitionCalls, [{
        id: "contract-1",
        payload: {
            targetStatus: "Active",
            reason: "Подтверждено"
        }
    }]);
    assert.deepEqual(completedIds, ["contract-1"]);
    assert.equal(reasonCleared, 1);
    assert.match(statuses.at(-1).message, /Переход выполнен/i);
    assert.equal(statuses.at(-1).isError, false);

    events.onHistoryRefreshClick();
    assert.equal(historyRefreshCalls, 1);
});

test("workflow events: apply handler reports transition error", async () => {
    const statuses = [];
    const events = workflowEventsModule.createEvents({
        getSelectedContract: function () {
            return {
                id: "contract-1",
                status: "Signed"
            };
        },
        setTransitionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        getTargetStatus: function () { return "Active"; },
        getReason: function () { return ""; },
        clearReason: function () {},
        getStatusRank: function () { return 0; },
        localizeStatus: function (status) { return status; },
        transitionContract: function () {
            return Promise.reject(new Error("transition failed"));
        },
        onTransitionCompleted: function () { return Promise.resolve(); },
        loadHistory: function () { return Promise.resolve(); }
    });

    events.onApplyClick();
    await new Promise(function (resolve) { setImmediate(resolve); });

    assert.deepEqual(statuses.at(-1), {
        message: "transition failed",
        isError: true
    });
});
