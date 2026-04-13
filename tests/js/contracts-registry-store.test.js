"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const registryStoreModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-registry-store.js"));

function installCustomStoreStub() {
    global.window = {
        DevExpress: {
            data: {
                CustomStore: function (definition) {
                    return definition;
                }
            }
        }
    };
}

test("contracts registry store: load updates cache and status with filter hint", async () => {
    installCustomStoreStub();
    const statuses = [];
    let mutatedCalls = 0;

    const store = registryStoreModule.createContractsStore({
        apiClient: {
            listContracts: async function () {
                return [{ id: "1", contractNumber: "C-1" }];
            },
            createContract: async function () { return {}; },
            updateContract: async function () { return {}; },
            deleteContract: async function () {}
        },
        gridState: {
            setContracts: function (payload) {
                return payload;
            },
            addContract: function () {},
            findContractById: function () { return { id: "1" }; },
            replaceContractById: function () {},
            removeContractById: function () {}
        },
        payloadBuilder: {
            createRequestPayload: function () { return {}; },
            updateRequestPayload: function () { return {}; }
        },
        setStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        appendFilterHint: function (message) {
            return message + " [hint]";
        },
        onDataMutated: function () {
            mutatedCalls += 1;
        }
    });

    const rows = await store.load();
    assert.equal(rows.length, 1);
    assert.equal(statuses.at(-1).isError, false);
    assert.match(statuses.at(-1).message, /\[hint\]/i);
    assert.equal(mutatedCalls, 1);
});

test("contracts registry store: insert/update/remove preserve CRUD semantics", async () => {
    installCustomStoreStub();
    const calls = {
        createPayload: null,
        updatePayload: null,
        removedId: null,
        statuses: [],
        mutatedCalls: 0
    };

    const store = registryStoreModule.createContractsStore({
        apiClient: {
            listContracts: async function () { return []; },
            createContract: async function (payload) {
                return {
                    id: "created-1",
                    contractNumber: payload.contractNumber
                };
            },
            updateContract: async function (id, payload) {
                return {
                    id: id,
                    contractNumber: payload.contractNumber || "updated"
                };
            },
            deleteContract: async function (id) {
                calls.removedId = id;
            }
        },
        gridState: {
            setContracts: function () { return []; },
            addContract: function () {},
            findContractById: function (id) {
                return {
                    id: id,
                    contractNumber: "current"
                };
            },
            replaceContractById: function () {},
            removeContractById: function () {}
        },
        payloadBuilder: {
            createRequestPayload: function (values) {
                calls.createPayload = values;
                return values;
            },
            updateRequestPayload: function (current, values) {
                calls.updatePayload = { current: current, values: values };
                return values;
            }
        },
        setStatus: function (message, isError) {
            calls.statuses.push({ message: message, isError: isError });
        },
        appendFilterHint: function (message) {
            return message;
        },
        onDataMutated: function () {
            calls.mutatedCalls += 1;
        }
    });

    const created = await store.insert({ contractNumber: "NEW-1" });
    assert.equal(created.contractNumber, "NEW-1");
    assert.deepEqual(calls.createPayload, { contractNumber: "NEW-1" });

    const updated = await store.update("contract-9", { contractNumber: "UPD-9" });
    assert.equal(updated.id, "contract-9");
    assert.equal(calls.updatePayload.current.contractNumber, "current");
    assert.deepEqual(calls.updatePayload.values, { contractNumber: "UPD-9" });

    await store.remove("contract-9");
    assert.equal(calls.removedId, "contract-9");
    assert.equal(calls.mutatedCalls, 1);
    assert.equal(calls.statuses.at(-1).isError, false);
    assert.match(calls.statuses.at(-1).message, /договор удалён/i);
});

test("contracts registry store: load supports paged payload and returns data/totalCount", async () => {
    installCustomStoreStub();
    const statusMessages = [];
    const queryCalls = [];

    const store = registryStoreModule.createContractsStore({
        apiClient: {
            listContracts: async function (query) {
                queryCalls.push(query);
                return {
                    items: [{ id: "ctr-31", contractNumber: "CTR-31" }],
                    totalCount: 57,
                    skip: query?.skip ?? 0,
                    take: query?.take ?? 15
                };
            },
            createContract: async function () { return {}; },
            updateContract: async function () { return {}; },
            deleteContract: async function () {}
        },
        gridState: {
            setContracts: function (payload) {
                return payload;
            },
            addContract: function () {},
            findContractById: function () { return { id: "1" }; },
            replaceContractById: function () {},
            removeContractById: function () {}
        },
        payloadBuilder: {
            createRequestPayload: function () { return {}; },
            updateRequestPayload: function () { return {}; }
        },
        setStatus: function (message) {
            statusMessages.push(message);
        },
        appendFilterHint: function (message) {
            return message;
        },
        onDataMutated: function () {}
    });

    const result = await store.load({
        skip: 30,
        take: 15,
        searchValue: "CTR-31"
    });

    assert.deepEqual(queryCalls, [{
        skip: 30,
        take: 15,
        requireTotalCount: true,
        search: "CTR-31"
    }]);
    assert.deepEqual(result, {
        data: [{ id: "ctr-31", contractNumber: "CTR-31" }],
        totalCount: 57
    });
    assert.ok(statusMessages.some(function (message) {
        return message === "Загружено договоров: 1 (всего: 57).";
    }));
});
