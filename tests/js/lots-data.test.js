"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotsDataModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-data.js"));

function createDevExpressDataStub() {
    return {
        CustomStore: function CustomStore(config) {
            return config;
        }
    };
}

function createHistoryGridStub() {
    return {
        optionCalls: [],
        option: function (key, value) {
            this.optionCalls.push({ key: key, value: value });
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

test("lots data: createDataRuntime validates required dependencies", () => {
    assert.throws(function () {
        lotsDataModule.createDataRuntime({});
    }, /apiClient/i);

    assert.throws(function () {
        lotsDataModule.createDataRuntime({
            apiClient: {
                getLots: async function () {},
                createLot: async function () {},
                updateLot: async function () {},
                deleteLot: async function () {},
                getLotDetails: async function () {},
                getLotHistory: async function () {}
            },
            helpers: createHelpersStub(),
            setStatus: "invalid",
            onSelectionChanged: function () {},
            onHistoryLoadError: function () {}
        });
    }, /setStatus callback/i);
});

test("lots data: store load/insert/update/remove updates cache and statuses", async () => {
    const statusMessages = [];
    const selectionEvents = [];
    const updatePayloads = [];
    const deletedIds = [];

    const listRows = [
        {
            id: "lot-1",
            code: "LOT-1",
            name: "Лот 1",
            status: "Draft",
            responsibleCommercialUserId: null,
            itemsCount: 1,
            totalManHours: 3
        }
    ];

    const detailsById = {
        "lot-1": {
            id: "lot-1",
            code: "LOT-1",
            name: "Лот 1",
            status: "Draft",
            responsibleCommercialUserId: null,
            items: [
                { id: "item-1", quantity: 2, plannedManHours: 3 }
            ]
        }
    };

    const apiClient = {
        getLots: async function () {
            return listRows.slice();
        },
        createLot: async function (payload) {
            return {
                id: "lot-2",
                code: payload.code,
                name: payload.name,
                status: "Draft",
                responsibleCommercialUserId: payload.responsibleCommercialUserId,
                items: [
                    { id: "item-2", quantity: 1, plannedManHours: 1.5 }
                ]
            };
        },
        updateLot: async function (lotId, payload) {
            updatePayloads.push({ lotId: lotId, payload: payload });
            return {
                id: lotId,
                code: "LOT-1",
                name: payload.name,
                status: "InProcurement",
                responsibleCommercialUserId: payload.responsibleCommercialUserId,
                items: payload.items
            };
        },
        deleteLot: async function (lotId) {
            deletedIds.push(lotId);
        },
        getLotDetails: async function (lotId) {
            return detailsById[lotId];
        },
        getLotHistory: async function () {
            return [];
        }
    };

    const runtime = lotsDataModule.createDataRuntime({
        apiClient: apiClient,
        helpers: createHelpersStub(),
        setStatus: function (message, isError) {
            statusMessages.push({ message: message, isError: isError });
        },
        onSelectionChanged: function (selectedLot) {
            selectionEvents.push(selectedLot ? selectedLot.id : null);
        },
        onHistoryLoadError: function () {}
    });

    runtime.attachGridInstances({
        historyGridInstance: createHistoryGridStub()
    });

    const store = runtime.createStore(createDevExpressDataStub());
    const loaded = await store.load();
    assert.equal(loaded.length, 1);

    const created = await store.insert({
        code: " LOT-2 ",
        name: "Лот 2",
        responsibleCommercialUserId: " user-2 "
    });
    assert.equal(created.id, "lot-2");

    const updated = await store.update("lot-1", { name: "Лот 1 (обновлён)" });
    assert.equal(updated.status, "InProcurement");
    assert.equal(updatePayloads.length, 1);
    assert.equal(updatePayloads[0].payload.items.length, 1);

    runtime.applySelection(created);
    await store.remove("lot-2");

    assert.deepEqual(deletedIds, ["lot-2"]);
    assert.equal(runtime.getSelectedLot(), null);
    assert.deepEqual(selectionEvents, ["lot-2", null]);
    assert.ok(statusMessages.some(function (entry) { return entry.message.includes("Загружено лотов: 1."); }));
    assert.ok(statusMessages.some(function (entry) { return entry.message.includes("Лот 'LOT-2' создан."); }));
    assert.ok(statusMessages.some(function (entry) { return entry.message.includes("Лот 'LOT-1' обновлён."); }));
    assert.ok(statusMessages.some(function (entry) { return entry.message === "Лот удалён."; }));
});

test("lots data: refreshLotsAndReselect reloads grid and selection", async () => {
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

    const apiClient = {
        getLots: async function () {
            return [
                {
                    id: "lot-1",
                    code: "LOT-1",
                    name: "Лот 1",
                    status: "Draft",
                    responsibleCommercialUserId: null,
                    itemsCount: 0,
                    totalManHours: 0
                }
            ];
        },
        createLot: async function () { throw new Error("unexpected createLot"); },
        updateLot: async function () { throw new Error("unexpected updateLot"); },
        deleteLot: async function () { throw new Error("unexpected deleteLot"); },
        getLotDetails: async function () { throw new Error("unexpected getLotDetails"); },
        getLotHistory: async function () {
            throw new Error("history failed");
        }
    };

    const runtime = lotsDataModule.createDataRuntime({
        apiClient: apiClient,
        helpers: createHelpersStub(),
        setStatus: function () {},
        onSelectionChanged: function (selectedLot) {
            selectionEvents.push(selectedLot ? selectedLot.id : null);
        },
        onHistoryLoadError: function (error) {
            historyErrors.push(error.message);
        }
    });

    runtime.attachGridInstances({
        lotsGridInstance: lotsGrid,
        historyGridInstance: historyGrid
    });

    const store = runtime.createStore(createDevExpressDataStub());
    await store.load();
    await runtime.refreshLotsAndReselect("lot-1");
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(lotsGrid.refreshCalls, 1);
    assert.deepEqual(lotsGrid.selectRowsCalls, [{ keys: ["lot-1"], preserve: false }]);
    assert.equal(runtime.getSelectedLot().id, "lot-1");
    assert.deepEqual(selectionEvents, ["lot-1"]);
    assert.deepEqual(historyErrors, ["history failed"]);
});

test("lots data: loadHistory clears history grid when lot is not selected", async () => {
    const historyGrid = createHistoryGridStub();
    const runtime = lotsDataModule.createDataRuntime({
        apiClient: {
            getLots: async function () { return []; },
            createLot: async function () { throw new Error("unexpected createLot"); },
            updateLot: async function () { throw new Error("unexpected updateLot"); },
            deleteLot: async function () { throw new Error("unexpected deleteLot"); },
            getLotDetails: async function () { throw new Error("unexpected getLotDetails"); },
            getLotHistory: async function () { throw new Error("unexpected getLotHistory"); }
        },
        helpers: createHelpersStub(),
        setStatus: function () {},
        onSelectionChanged: function () {},
        onHistoryLoadError: function () {}
    });

    runtime.attachGridInstances({
        historyGridInstance: historyGrid
    });

    const rows = await runtime.loadHistory(null);
    assert.deepEqual(rows, []);
    assert.deepEqual(historyGrid.optionCalls, [{ key: "dataSource", value: [] }]);
});
