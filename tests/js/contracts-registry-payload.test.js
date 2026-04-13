"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpers = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-helpers.js"));
const registryPayload = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-registry-payload.js"));

function createBuilder() {
    return registryPayload.createBuilder({
        toNullableDate: helpers.toNullableDate,
        toNumber: helpers.toNumber,
        isGuid: helpers.isGuid
    });
}

test("createRequestPayload normalizes valid contract payload", () => {
    const builder = createBuilder();
    const payload = builder.createRequestPayload({
        lotId: " 11111111-1111-4111-8111-111111111111 ",
        procedureId: "22222222-2222-4222-8222-222222222222",
        contractorId: "33333333-3333-4333-8333-333333333333",
        contractNumber: " Д-123 ",
        signingDate: "2026-04-08",
        amountWithoutVat: "100.5",
        vatAmount: "20.1",
        totalAmount: "120.6",
        startDate: "2026-04-10",
        endDate: "2026-12-31"
    });

    assert.equal(payload.lotId, "11111111-1111-4111-8111-111111111111");
    assert.equal(payload.contractNumber, "Д-123");
    assert.equal(payload.signingDate, "2026-04-08T00:00:00.000Z");
    assert.equal(payload.amountWithoutVat, 100.5);
    assert.equal(payload.vatAmount, 20.1);
    assert.equal(payload.totalAmount, 120.6);
    assert.equal(payload.status, "Draft");
});

test("createRequestPayload validates GUID fields", () => {
    const builder = createBuilder();

    assert.throws(() => {
        builder.createRequestPayload({
            lotId: "not-a-guid",
            procedureId: "22222222-2222-4222-8222-222222222222",
            contractorId: "33333333-3333-4333-8333-333333333333",
            contractNumber: "Д-124",
            amountWithoutVat: 100,
            vatAmount: 20,
            totalAmount: 120
        });
    }, /Идентификатор лота/i);
});

test("updateRequestPayload preserves omitted fields and handles explicit null dates", () => {
    const builder = createBuilder();
    const payload = builder.updateRequestPayload({
        contractNumber: "Д-100",
        signingDate: "2026-01-10",
        amountWithoutVat: 100,
        vatAmount: 20,
        totalAmount: 120,
        startDate: "2026-01-11",
        endDate: "2026-12-31",
        status: "OnApproval"
    }, {
        contractNumber: " Д-101 ",
        amountWithoutVat: "150",
        vatAmount: "30",
        totalAmount: "180",
        startDate: null
    });

    assert.equal(payload.contractNumber, "Д-101");
    assert.equal(payload.signingDate, "2026-01-10T00:00:00.000Z");
    assert.equal(payload.startDate, null);
    assert.equal(payload.endDate, "2026-12-31T00:00:00.000Z");
    assert.equal(payload.amountWithoutVat, 150);
    assert.equal(payload.vatAmount, 30);
    assert.equal(payload.totalAmount, 180);
    assert.equal(payload.status, "OnApproval");
});

test("updateRequestPayload validates total amount consistency", () => {
    const builder = createBuilder();

    assert.throws(() => {
        builder.updateRequestPayload({
            contractNumber: "Д-100",
            signingDate: "2026-01-10",
            amountWithoutVat: 100,
            vatAmount: 20,
            totalAmount: 120,
            status: "Draft"
        }, {
            amountWithoutVat: 500,
            vatAmount: 10,
            totalAmount: 100
        });
    }, /должна быть равна/i);
});
