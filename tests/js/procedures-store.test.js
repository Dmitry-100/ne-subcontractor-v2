"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const proceduresStoreModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-store.js"));

function createDevExpressData() {
    const holder = { config: null };
    holder.devExpressData = {
        CustomStore: function (config) {
            holder.config = config;
            return { __storeConfig: config };
        }
    };

    return holder;
}

function createProceduresDataStub() {
    return {
        loadProcedures: async function () {
            return {
                items: [{ id: "p1" }, { id: "p2" }],
                totalCount: 2,
                paged: false
            };
        },
        createProcedure: async function () {
            return { lotId: "LOT-001" };
        },
        getDetails: async function () {
            return { id: "p1", objectName: "Проверка", attachments: [] };
        },
        updateProcedure: async function () {
            return { objectName: "Проверка 2" };
        },
        deleteProcedure: async function () { }
    };
}

test("procedures store: validates required dependencies", () => {
    assert.throws(function () {
        proceduresStoreModule.createStore({});
    }, /DevExpress\.data\.CustomStore/i);

    const devExpressHolder = createDevExpressData();
    assert.throws(function () {
        proceduresStoreModule.createStore({
            devExpressData: devExpressHolder.devExpressData,
            proceduresData: {}
        });
    }, /createPayload/i);
});

test("procedures store: load/insert/update/remove calls services and updates statuses", async () => {
    const devExpressHolder = createDevExpressData();
    const proceduresData = createProceduresDataStub();
    const statusLog = [];
    const removedSelections = [];

    proceduresStoreModule.createStore({
        devExpressData: devExpressHolder.devExpressData,
        proceduresData: proceduresData,
        createPayload: function (values) {
            return { payloadType: "create", values: values };
        },
        updatePayload: function (details, values) {
            return { payloadType: "update", details: details, values: values };
        },
        appendFilterHint: function (message) {
            return `${message} [с URL-фильтром]`;
        },
        setStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        },
        getSelectedProcedure: function () {
            return { id: "p-remove" };
        },
        applySelection: async function (selection) {
            removedSelections.push(selection);
        }
    });

    const store = devExpressHolder.config;
    const loaded = await store.load();
    assert.equal(loaded.length, 2);
    assert.match(statusLog[0].message, /Загружено процедур: 2/);
    assert.match(statusLog[0].message, /URL-фильтром/);

    const created = await store.insert({ objectName: "Test" });
    assert.equal(created.lotId, "LOT-001");
    assert.equal(statusLog[1].isError, false);
    assert.match(statusLog[1].message, /Процедура создана/);

    const updated = await store.update("p1", { objectName: "Updated" });
    assert.equal(updated.objectName, "Проверка 2");
    assert.equal(statusLog[2].isError, false);
    assert.match(statusLog[2].message, /обновлена/);

    await store.remove("p-remove");
    assert.deepEqual(removedSelections, [null]);
    assert.equal(statusLog[3].isError, false);
    assert.equal(statusLog[3].message, "Процедура удалена.");
});

test("procedures store: remove does not clear selection when another item is selected", async () => {
    const devExpressHolder = createDevExpressData();
    const proceduresData = createProceduresDataStub();
    let applySelectionCalls = 0;

    proceduresStoreModule.createStore({
        devExpressData: devExpressHolder.devExpressData,
        proceduresData: proceduresData,
        createPayload: function (values) {
            return values;
        },
        updatePayload: function (details) {
            return details;
        },
        appendFilterHint: function (message) {
            return message;
        },
        setStatus: function () { },
        getSelectedProcedure: function () {
            return { id: "p-another" };
        },
        applySelection: async function () {
            applySelectionCalls += 1;
        }
    });

    await devExpressHolder.config.remove("p-remove");
    assert.equal(applySelectionCalls, 0);
});

test("procedures store: load returns paged payload when server paging is enabled", async () => {
    const devExpressHolder = createDevExpressData();
    const statusLog = [];
    const queryCalls = [];

    proceduresStoreModule.createStore({
        devExpressData: devExpressHolder.devExpressData,
        proceduresData: {
            loadProcedures: async function (loadOptions) {
                queryCalls.push(loadOptions);
                return {
                    items: [{ id: "p31" }],
                    totalCount: 57,
                    paged: true
                };
            },
            createProcedure: async function () { return null; },
            getDetails: async function () { return null; },
            updateProcedure: async function () { return null; },
            deleteProcedure: async function () { return undefined; }
        },
        createPayload: function (values) { return values; },
        updatePayload: function (details) { return details; },
        appendFilterHint: function (message) { return message; },
        setStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        },
        getSelectedProcedure: function () { return null; },
        applySelection: async function () {}
    });

    const result = await devExpressHolder.config.load({ skip: 30, take: 15 });

    assert.deepEqual(queryCalls, [{ skip: 30, take: 15 }]);
    assert.deepEqual(result, {
        data: [{ id: "p31" }],
        totalCount: 57
    });
    assert.deepEqual(statusLog.at(-1), {
        message: "Загружено процедур: 1 (всего: 57).",
        isError: false
    });
});
