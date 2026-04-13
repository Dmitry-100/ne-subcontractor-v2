"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const proceduresHelpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-helpers.js"));

function createHelpers() {
    return proceduresHelpersModule.createHelpers({
        statusCaptions: {
            Created: "Создана",
            Sent: "Отправлена",
            Completed: "Завершена",
            Canceled: "Отменена"
        },
        contractorStatusCaptions: {
            Active: "Активен"
        },
        reliabilityClassCaptions: {
            A: "A (высокая)"
        },
        approvalModes: ["InSystem", "External"]
    });
}

test("procedures helpers: readUrlFilterState parses and normalizes status/search", () => {
    const helpers = createHelpers();
    const state = helpers.readUrlFilterState(
        ["Created", "Sent", "Completed", "Canceled"],
        "?status=Sent,created,unknown,sent&search=%20abc%20");

    assert.deepEqual(state.statuses, ["Sent", "Created"]);
    assert.equal(state.searchText, "abc");
    assert.deepEqual(state.statusFilter, [["status", "=", "Sent"], "or", ["status", "=", "Created"]]);
    assert.equal(state.hasAny, true);
});

test("procedures helpers: appendFilterHint builds user-facing filter description", () => {
    const helpers = createHelpers();
    const message = helpers.appendFilterHint("Загружено процедур: 2.", {
        statuses: ["Sent", "Created"],
        searchText: "abc",
        hasAny: true
    });

    assert.equal(
        message,
        "Загружено процедур: 2. URL-фильтры: статусы: Отправлена, Создана; поиск: \"abc\".");
});

test("procedures helpers: buildUrlWithoutFilters strips status and search from URL", () => {
    const helpers = createHelpers();
    const cleared = helpers.buildUrlWithoutFilters("https://host/path?status=Sent&search=abc&x=1#tab");
    assert.equal(cleared, "/path?x=1#tab");
});

test("procedures helpers: localization helpers and fallbacks are deterministic", () => {
    const helpers = createHelpers();

    assert.equal(helpers.localizeStatus("Sent"), "Отправлена");
    assert.equal(helpers.localizeStatus("Unknown"), "Unknown");
    assert.equal(helpers.localizeContractorStatus("Active"), "Активен");
    assert.equal(helpers.localizeContractorStatus("Blocked"), "Blocked");
    assert.equal(helpers.localizeReliabilityClass("A"), "A (высокая)");
    assert.equal(helpers.localizeReliabilityClass("B"), "B");
    assert.equal(helpers.localizeBoolean(true), "Да");
    assert.equal(helpers.localizeBoolean(false), "Нет");
});

test("procedures helpers: shortlist guards and normalization rules", () => {
    const helpers = createHelpers();

    assert.equal(helpers.supportsShortlistWorkspace(null), false);
    assert.equal(helpers.supportsShortlistWorkspace({ status: "Canceled" }), false);
    assert.equal(helpers.supportsShortlistWorkspace({ status: "Completed" }), false);
    assert.equal(helpers.supportsShortlistWorkspace({ status: "Sent" }), true);

    assert.equal(helpers.normalizeMaxIncluded(""), 5);
    assert.equal(helpers.normalizeMaxIncluded("0"), 1);
    assert.equal(helpers.normalizeMaxIncluded("31"), 30);
    assert.equal(helpers.normalizeMaxIncluded("7"), 7);

    assert.equal(helpers.normalizeAdjustmentReason("  "), null);
    assert.equal(helpers.normalizeAdjustmentReason("  Обоснование  "), "Обоснование");
});

test("procedures helpers: payload normalization helpers are stable", () => {
    const helpers = createHelpers();

    assert.equal(helpers.normalizeGuid("  "), null);
    assert.equal(helpers.normalizeGuid("  abc  "), "abc");
    assert.equal(helpers.isGuid("not-a-guid"), false);
    assert.equal(helpers.isGuid("11111111-1111-4111-8111-111111111111"), true);

    assert.equal(helpers.toIsoDate(""), null);
    assert.equal(helpers.toIsoDate("not-a-date"), null);
    assert.ok(String(helpers.toIsoDate("2026-04-09")).startsWith("2026-04-09T"));

    assert.equal(helpers.toNullableNumber(""), null);
    assert.equal(helpers.toNullableNumber("abc"), null);
    assert.equal(helpers.toNullableNumber("12.5"), 12.5);

    assert.equal(helpers.normalizeRequiredString("  ", "fallback"), "fallback");
    assert.equal(helpers.normalizeRequiredString("  value  ", "fallback"), "value");

    assert.equal(helpers.normalizeNullableString("  "), null);
    assert.equal(helpers.normalizeNullableString("  value  "), "value");

    assert.equal(helpers.normalizeApprovalMode("InSystem"), "InSystem");
    assert.equal(helpers.normalizeApprovalMode("Unknown"), "InSystem");

    assert.equal(helpers.pickValue({ a: 1 }, "a", 0), 1);
    assert.equal(helpers.pickValue({ a: 1 }, "b", 0), 0);
    assert.equal(helpers.pickValue(null, "a", 0), 0);
});

test("procedures helpers: createPayload validates required fields and normalizes payload", () => {
    const helpers = createHelpers();

    assert.throws(
        () => helpers.createPayload({ lotId: "bad-guid" }),
        /корректный GUID/);

    const payload = helpers.createPayload({
        lotId: "11111111-1111-4111-8111-111111111111",
        purchaseTypeCode: "  EPC  ",
        objectName: "  Объект  ",
        workScope: "  Scope  ",
        plannedBudgetWithoutVat: "1250.50",
        approvalMode: "External",
        notes: "  note  "
    });

    assert.equal(payload.lotId, "11111111-1111-4111-8111-111111111111");
    assert.equal(payload.purchaseTypeCode, "EPC");
    assert.equal(payload.objectName, "Объект");
    assert.equal(payload.workScope, "Scope");
    assert.equal(payload.plannedBudgetWithoutVat, 1250.5);
    assert.equal(payload.approvalMode, "External");
    assert.equal(payload.notes, "note");
    assert.deepEqual(payload.attachmentFileIds, []);
});

test("procedures helpers: updatePayload merges values with details and preserves attachment ids", () => {
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
