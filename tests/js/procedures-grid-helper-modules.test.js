"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const localizationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-localization-helpers.js"));

const filterModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-filter-helpers.js"));

const payloadModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-payload-helpers.js"));

test("procedures helper modules: localization helpers return expected captions", () => {
    const helpers = localizationModule.createHelpers({
        statusCaptions: { Sent: "Отправлена" },
        contractorStatusCaptions: { Active: "Активен" },
        reliabilityClassCaptions: { A: "A (высокая)" }
    });

    assert.equal(helpers.localizeStatus("Sent"), "Отправлена");
    assert.equal(helpers.localizeContractorStatus("Active"), "Активен");
    assert.equal(helpers.localizeReliabilityClass("A"), "A (высокая)");
    assert.equal(helpers.localizeBoolean(true), "Да");
});

test("procedures helper modules: filter helpers parse url state", () => {
    const helpers = filterModule.createHelpers({
        localizeStatus: function (status) { return status === "Sent" ? "Отправлена" : String(status || ""); }
    });

    const state = helpers.readUrlFilterState(["Sent", "Created"], "?status=sent,Created&search=abc");
    assert.deepEqual(state.statuses, ["Sent", "Created"]);
    assert.equal(helpers.appendFilterHint("OK", state), "OK URL-фильтры: статусы: Отправлена, Created; поиск: \"abc\".");
});

test("procedures helper modules: payload helpers validate and normalize create payload", () => {
    const helpers = payloadModule.createHelpers({
        approvalModes: ["InSystem", "External"]
    });

    const payload = helpers.createPayload({
        lotId: "11111111-1111-4111-8111-111111111111",
        purchaseTypeCode: "  EPC  ",
        objectName: "  Obj  ",
        workScope: "  Scope  ",
        approvalMode: "External",
        plannedBudgetWithoutVat: "125.5"
    });

    assert.equal(payload.purchaseTypeCode, "EPC");
    assert.equal(payload.objectName, "Obj");
    assert.equal(payload.workScope, "Scope");
    assert.equal(payload.approvalMode, "External");
    assert.equal(payload.plannedBudgetWithoutVat, 125.5);
});
