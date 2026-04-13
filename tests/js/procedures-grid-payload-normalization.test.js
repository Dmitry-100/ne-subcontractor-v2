"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const normalizationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-payload-normalization.js"));

function createHelpers() {
    return normalizationModule.createHelpers({
        approvalModes: ["InSystem", "External"]
    });
}

test("procedures payload normalization: scalar helpers are deterministic", () => {
    const helpers = createHelpers();

    assert.equal(helpers.normalizeGuid("  "), null);
    assert.equal(helpers.normalizeGuid("  id  "), "id");
    assert.equal(helpers.isGuid("11111111-1111-4111-8111-111111111111"), true);
    assert.equal(helpers.isGuid("bad"), false);
    assert.equal(helpers.toIsoDate(""), null);
    assert.equal(helpers.toNullableNumber("12.5"), 12.5);
    assert.equal(helpers.normalizeRequiredString("  ", "fallback"), "fallback");
    assert.equal(helpers.normalizeNullableString("  "), null);
    assert.equal(helpers.normalizeApprovalMode("External"), "External");
    assert.equal(helpers.normalizeApprovalMode("Unknown"), "InSystem");
    assert.equal(helpers.pickValue({ a: 1 }, "a", 0), 1);
    assert.equal(helpers.pickValue({ a: 1 }, "b", 0), 0);
});

test("procedures payload normalization: createPayload validates required fields", () => {
    const helpers = createHelpers();

    assert.throws(function () {
        helpers.createPayload({ lotId: "bad-guid" });
    }, /корректный GUID/i);

    const payload = helpers.createPayload({
        lotId: "11111111-1111-4111-8111-111111111111",
        purchaseTypeCode: "  EPC  ",
        objectName: "  Объект  ",
        workScope: "  Scope  ",
        approvalMode: "External",
        plannedBudgetWithoutVat: "1250.5"
    });

    assert.equal(payload.purchaseTypeCode, "EPC");
    assert.equal(payload.objectName, "Объект");
    assert.equal(payload.workScope, "Scope");
    assert.equal(payload.approvalMode, "External");
    assert.equal(payload.plannedBudgetWithoutVat, 1250.5);
    assert.deepEqual(payload.attachmentFileIds, []);
});

test("procedures payload normalization: updatePayload merges values and keeps attachments", () => {
    const helpers = createHelpers();

    const payload = helpers.updatePayload(
        {
            requestDate: "2026-04-01",
            purchaseTypeCode: "OLD",
            initiatorUserId: "11111111-1111-4111-8111-111111111111",
            responsibleCommercialUserId: null,
            objectName: "Obj",
            workScope: "Scope",
            customerName: "Cust",
            leadOfficeCode: "MAIN",
            analyticsLevel1Code: "L1",
            analyticsLevel2Code: "L2",
            analyticsLevel3Code: "L3",
            analyticsLevel4Code: "L4",
            analyticsLevel5Code: "L5",
            customerContractNumber: "CN",
            customerContractDate: "2026-04-10",
            requiredSubcontractorDeadline: "2026-04-11",
            proposalDueDate: "2026-04-12",
            plannedBudgetWithoutVat: 100,
            notes: "N",
            approvalMode: "InSystem",
            approvalRouteCode: "R",
            containsConfidentialInfo: false,
            requiresTechnicalNegotiations: false,
            attachments: [{ id: "att-1" }, { id: "att-2" }]
        },
        {
            purchaseTypeCode: "  NEW  ",
            plannedBudgetWithoutVat: "250.4",
            notes: "  updated  ",
            containsConfidentialInfo: true
        });

    assert.equal(payload.purchaseTypeCode, "NEW");
    assert.equal(payload.plannedBudgetWithoutVat, 250.4);
    assert.equal(payload.notes, "updated");
    assert.equal(payload.containsConfidentialInfo, true);
    assert.deepEqual(payload.attachmentFileIds, ["att-1", "att-2"]);
});
