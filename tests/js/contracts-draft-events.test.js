"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const draftEventsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-draft-events.js"));

test("draft events: validates required dependencies", () => {
    assert.throws(function () {
        draftEventsModule.createEvents({});
    }, /readProcedureId/i);
});

test("draft events: validates GUID before API call", () => {
    const statuses = [];
    const events = draftEventsModule.createEvents({
        readProcedureId: function () { return "bad-guid"; },
        readPayload: function () { return {}; },
        isGuid: function () { return false; },
        createDraftFromProcedure: function () { return Promise.resolve({}); },
        setDraftStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        clearDraftInputs: function () {},
        onDraftCreated: function () { return Promise.resolve(); }
    });

    events.onCreateDraftClick();
    assert.deepEqual(statuses.at(-1), {
        message: "Поле «Идентификатор процедуры» должно содержать корректный GUID.",
        isError: true
    });
});

test("draft events: creates draft, clears inputs and notifies callback", async () => {
    const statuses = [];
    const apiCalls = [];
    let clearCalls = 0;
    const createdItems = [];

    const events = draftEventsModule.createEvents({
        readProcedureId: function () { return "guid-1"; },
        readPayload: function () {
            return {
                contractNumber: "SC-1"
            };
        },
        isGuid: function () { return true; },
        createDraftFromProcedure: function (procedureId, payload) {
            apiCalls.push({ procedureId: procedureId, payload: payload });
            return Promise.resolve({
                id: "contract-1",
                contractNumber: "SC-1"
            });
        },
        setDraftStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        clearDraftInputs: function () {
            clearCalls += 1;
        },
        onDraftCreated: function (created) {
            createdItems.push(created);
            return Promise.resolve();
        }
    });

    events.onCreateDraftClick();
    await new Promise(function (resolve) { setImmediate(resolve); });

    assert.deepEqual(apiCalls, [{
        procedureId: "guid-1",
        payload: {
            contractNumber: "SC-1"
        }
    }]);
    assert.equal(clearCalls, 1);
    assert.equal(createdItems.length, 1);
    assert.match(statuses.at(-1).message, /Черновик договора 'SC-1' создан/i);
    assert.equal(statuses.at(-1).isError, false);
});

test("draft events: reports createDraft failure", async () => {
    const statuses = [];
    const events = draftEventsModule.createEvents({
        readProcedureId: function () { return "guid-1"; },
        readPayload: function () { return {}; },
        isGuid: function () { return true; },
        createDraftFromProcedure: function () {
            return Promise.reject(new Error("draft create failed"));
        },
        setDraftStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        clearDraftInputs: function () {},
        onDraftCreated: function () { return Promise.resolve(); }
    });

    events.onCreateDraftClick();
    await new Promise(function (resolve) { setImmediate(resolve); });

    assert.deepEqual(statuses.at(-1), {
        message: "draft create failed",
        isError: true
    });
});
