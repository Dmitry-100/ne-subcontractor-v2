"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dataModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-data.js"));

test("procedures data: toListItem maps details to list shape", () => {
    const mapped = dataModule.toListItem({
        id: "proc-1",
        lotId: "LOT-1",
        status: "Created",
        purchaseTypeCode: "PT-1",
        objectName: "Тестовая процедура",
        approvalMode: "InSystem",
        workScope: "Монтаж",
        plannedBudgetWithoutVat: 1200,
        notes: "ok"
    }, null);

    assert.equal(mapped.id, "proc-1");
    assert.equal(mapped.lotId, "LOT-1");
    assert.equal(mapped.objectName, "Тестовая процедура");
    assert.equal(mapped.notes, "ok");
});

test("procedures data: createDataService validates required options", () => {
    assert.throws(
        function () {
            dataModule.createDataService({ endpoint: "/api/procedures" });
        },
        /apiClient is required/);

    assert.throws(
        function () {
            dataModule.createDataService({ apiClient: { getProcedures: async function () {} } });
        },
        /endpoint is required/);
});

test("procedures data: service loads, creates, updates and deletes cache", async () => {
    const initialList = [
        { id: "proc-1", objectName: "A", lotId: "LOT-1", status: "Created" }
    ];

    const detailsById = {
        "proc-1": {
            id: "proc-1",
            lotId: "LOT-1",
            status: "Created",
            purchaseTypeCode: "PT-1",
            objectName: "A"
        }
    };

    const apiClient = {
        getProcedures: async function () {
            return initialList.slice();
        },
        getProcedureDetails: async function (endpoint, procedureId) {
            return detailsById[procedureId];
        },
        createProcedure: async function () {
            return {
                id: "proc-2",
                lotId: "LOT-2",
                status: "DocumentsPreparation",
                purchaseTypeCode: "PT-2",
                objectName: "B"
            };
        },
        updateProcedure: async function (endpoint, procedureId) {
            return {
                id: procedureId,
                lotId: "LOT-1",
                status: "OnApproval",
                purchaseTypeCode: "PT-1",
                objectName: "A updated"
            };
        },
        deleteProcedure: async function () {
            return undefined;
        }
    };

    const service = dataModule.createDataService({
        apiClient: apiClient,
        endpoint: "/api/procedures"
    });

    const loaded = await service.loadProcedures();
    assert.equal(loaded.items.length, 1);
    assert.equal(service.getProceduresTotalCount(), 1);
    assert.equal(service.findProcedureById("proc-1").objectName, "A");

    const created = await service.createProcedure({ objectName: "B" });
    assert.equal(created.id, "proc-2");
    assert.equal(service.getCachedProcedures().length, 2);

    const updated = await service.updateProcedure("proc-1", { objectName: "A updated" });
    assert.equal(updated.objectName, "A updated");
    assert.equal(service.findProcedureById("proc-1").status, "OnApproval");

    await service.deleteProcedure("proc-2");
    assert.equal(service.findProcedureById("proc-2"), null);
    assert.equal(service.getCachedProcedures().length, 1);
    assert.equal(service.getProceduresTotalCount(), 1);
});

test("procedures data: getDetails uses cache unless forceReload=true", async () => {
    let detailsCalls = 0;
    const apiClient = {
        getProcedures: async function () {
            return [];
        },
        getProcedureDetails: async function () {
            detailsCalls += 1;
            return {
                id: "proc-1",
                lotId: "LOT-1",
                status: "Created",
                purchaseTypeCode: "PT-1",
                objectName: `name-${detailsCalls}`
            };
        },
        createProcedure: async function () { throw new Error("unexpected"); },
        updateProcedure: async function () { throw new Error("unexpected"); },
        deleteProcedure: async function () { throw new Error("unexpected"); }
    };

    const service = dataModule.createDataService({
        apiClient: apiClient,
        endpoint: "/api/procedures"
    });

    const first = await service.getDetails("proc-1", false);
    const second = await service.getDetails("proc-1", false);
    const third = await service.getDetails("proc-1", true);

    assert.equal(first.objectName, "name-1");
    assert.equal(second.objectName, "name-1");
    assert.equal(third.objectName, "name-2");
    assert.equal(detailsCalls, 2);
});

test("procedures data: loadProcedures supports paged payload", async () => {
    const queryCalls = [];
    const service = dataModule.createDataService({
        endpoint: "/api/procedures?status=OnApproval",
        apiClient: {
            getProcedures: async function (endpoint, query) {
                queryCalls.push({ endpoint: endpoint, query: query });
                return {
                    items: [{ id: "proc-31", objectName: "P31" }],
                    totalCount: 57,
                    skip: query?.skip ?? 0,
                    take: query?.take ?? 15
                };
            },
            getProcedureDetails: async function () { return null; },
            createProcedure: async function () { return null; },
            updateProcedure: async function () { return null; },
            deleteProcedure: async function () { return undefined; }
        }
    });

    const payload = await service.loadProcedures({
        skip: 30,
        take: 15,
        searchValue: "процедура"
    });

    assert.deepEqual(queryCalls, [{
        endpoint: "/api/procedures?status=OnApproval",
        query: {
            skip: 30,
            take: 15,
            requireTotalCount: true,
            search: "процедура"
        }
    }]);
    assert.equal(payload.items.length, 1);
    assert.equal(payload.totalCount, 57);
    assert.equal(payload.paged, true);
    assert.equal(service.getCachedProcedures().length, 1);
    assert.equal(service.getProceduresTotalCount(), 57);
});
