"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const storeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-data-store.js"));

function createDevExpressDataStub() {
    return {
        CustomStore: function CustomStore(config) {
            return config;
        }
    };
}

function createHelpersStub() {
    return {
        normalizeGuid: function (value) {
            if (!value) {
                return null;
            }

            return String(value).trim();
        },
        toListItem: function (details, current) {
            return {
                id: details.id,
                code: details.code || current?.code || "",
                name: details.name || current?.name || "",
                status: details.status || current?.status || "Draft",
                responsibleCommercialUserId: details.responsibleCommercialUserId ?? current?.responsibleCommercialUserId ?? null,
                itemsCount: Array.isArray(details.items) ? details.items.length : (current?.itemsCount ?? 0),
                totalManHours: Array.isArray(details.items)
                    ? details.items.reduce(function (sum, item) { return sum + Number(item?.plannedManHours ?? 0); }, 0)
                    : (current?.totalManHours ?? 0)
            };
        },
        mapItemsForRequest: function (items) {
            const list = Array.isArray(items) ? items : [];
            return list.map(function (item) {
                return {
                    id: item.id,
                    quantity: item.quantity,
                    plannedManHours: item.plannedManHours
                };
            });
        }
    };
}

test("lots data store: validates required dependencies", () => {
    assert.throws(function () {
        storeModule.createStore({});
    }, /devExpressData.CustomStore/i);

    assert.throws(function () {
        storeModule.createStore({
            devExpressData: createDevExpressDataStub(),
            apiClient: {},
            helpers: {},
            setStatus: function () {},
            core: {}
        });
    }, /apiClient.getLots/i);
});

test("lots data store: load/insert/update/remove use core contracts", async () => {
    const statusMessages = [];
    const updatePayloads = [];
    const deletedIds = [];
    const coreCalls = {
        setLotsCache: [],
        addLotToCache: [],
        setLotDetails: [],
        replaceLotInCache: [],
        removeLotFromCache: [],
        applySelection: []
    };

    let selectedLot = { id: "lot-2" };

    const core = {
        setLotsCache: function (rows) {
            coreCalls.setLotsCache.push(rows);
            return rows;
        },
        addLotToCache: function (row) {
            coreCalls.addLotToCache.push(row);
        },
        findLotById: function () {
            return {
                id: "lot-1",
                code: "LOT-1",
                name: "Лот 1",
                status: "Draft",
                responsibleCommercialUserId: null
            };
        },
        getLotDetails: async function () {
            return {
                id: "lot-1",
                items: [{ id: "item-1", quantity: 2, plannedManHours: 3 }]
            };
        },
        setLotDetails: function (lotId, details) {
            coreCalls.setLotDetails.push({ lotId: lotId, details: details });
        },
        replaceLotInCache: function (lotId, updated) {
            coreCalls.replaceLotInCache.push({ lotId: lotId, updated: updated });
        },
        deleteLotDetails: function (lotId) {
            coreCalls.setLotDetails.push({ deleted: lotId });
        },
        removeLotFromCache: function (lotId) {
            coreCalls.removeLotFromCache.push(lotId);
        },
        getSelectedLot: function () {
            return selectedLot;
        },
        applySelection: function (value) {
            coreCalls.applySelection.push(value);
            selectedLot = value;
        }
    };

    const apiClient = {
        getLots: async function () {
            return [{ id: "lot-1" }];
        },
        createLot: async function (payload) {
            return {
                id: "lot-2",
                code: payload.code,
                name: payload.name,
                status: "Draft",
                items: []
            };
        },
        updateLot: async function (lotId, payload) {
            updatePayloads.push({ lotId: lotId, payload: payload });
            return {
                id: lotId,
                code: "LOT-1",
                name: payload.name,
                status: "InExecution",
                items: payload.items
            };
        },
        deleteLot: async function (lotId) {
            deletedIds.push(lotId);
        }
    };

    const store = storeModule.createStore({
        devExpressData: createDevExpressDataStub(),
        apiClient: apiClient,
        helpers: createHelpersStub(),
        setStatus: function (message) {
            statusMessages.push(message);
        },
        core: core
    });

    const loaded = await store.load();
    assert.equal(loaded.length, 1);

    const created = await store.insert({
        code: " LOT-2 ",
        name: " Лот 2 ",
        responsibleCommercialUserId: " user-2 "
    });
    assert.equal(created.id, "lot-2");

    const updated = await store.update("lot-1", { name: "Лот 1 (обновлён)" });
    assert.equal(updated.status, "InExecution");
    assert.equal(updatePayloads.length, 1);
    assert.equal(updatePayloads[0].payload.items.length, 1);

    await store.remove("lot-2");
    assert.deepEqual(deletedIds, ["lot-2"]);
    assert.deepEqual(coreCalls.applySelection, [null]);
    assert.deepEqual(coreCalls.removeLotFromCache, ["lot-2"]);
    assert.equal(coreCalls.setLotsCache.length, 1);
    assert.equal(coreCalls.addLotToCache.length, 1);
    assert.equal(coreCalls.replaceLotInCache.length, 1);
    assert.ok(statusMessages.some(function (message) { return message.includes("Загружено лотов"); }));
    assert.ok(statusMessages.some(function (message) { return message.includes("Лот 'LOT-2' создан."); }));
    assert.ok(statusMessages.some(function (message) { return message.includes("Лот 'LOT-1' обновлён."); }));
    assert.ok(statusMessages.some(function (message) { return message === "Лот удалён."; }));
});

test("lots data store: load supports paged payload and returns data/totalCount", async () => {
    const queryCalls = [];
    const statusMessages = [];

    const core = {
        setLotsCache: function (rows) {
            return rows;
        },
        addLotToCache: function () {},
        findLotById: function () { return null; },
        getLotDetails: async function () { return null; },
        setLotDetails: function () {},
        replaceLotInCache: function () {},
        deleteLotDetails: function () {},
        removeLotFromCache: function () {},
        getSelectedLot: function () { return null; },
        applySelection: function () {}
    };

    const apiClient = {
        getLots: async function (query) {
            queryCalls.push(query);
            return {
                items: [{ id: "lot-31", code: "LOT-31" }],
                totalCount: 57,
                skip: query?.skip ?? 0,
                take: query?.take ?? 15
            };
        },
        createLot: async function () { return null; },
        updateLot: async function () { return null; },
        deleteLot: async function () {}
    };

    const store = storeModule.createStore({
        devExpressData: createDevExpressDataStub(),
        apiClient: apiClient,
        helpers: createHelpersStub(),
        setStatus: function (message) {
            statusMessages.push(message);
        },
        core: core
    });

    const result = await store.load({
        skip: 30,
        take: 15,
        searchValue: "лот-31"
    });

    assert.deepEqual(queryCalls, [{
        skip: 30,
        take: 15,
        requireTotalCount: true,
        search: "лот-31"
    }]);
    assert.deepEqual(result, {
        data: [{ id: "lot-31", code: "LOT-31" }],
        totalCount: 57
    });
    assert.ok(statusMessages.some(function (message) {
        return message === "Загружено лотов: 1 (всего: 57).";
    }));
});
