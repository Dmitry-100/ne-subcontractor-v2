"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const adminHelpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-helpers.js"));

test("admin helpers: parseErrorBody resolves detail/title/error and fallback", () => {
    const helpers = adminHelpersModule.createHelpers();
    assert.equal(
        helpers.parseErrorBody(JSON.stringify({ detail: "Ошибка валидации" }), 400),
        "Ошибка валидации");
    assert.equal(
        helpers.parseErrorBody(JSON.stringify({ title: "Конфликт" }), 409),
        "Конфликт");
    assert.equal(
        helpers.parseErrorBody("plain error", 500),
        "plain error");
    assert.equal(
        helpers.parseErrorBody("", 401),
        "Ошибка запроса (401).");
});

test("admin helpers: normalizeTypeCode and normalizeRoleNames are deterministic", () => {
    const helpers = adminHelpersModule.createHelpers();
    assert.equal(helpers.normalizeTypeCode(" purchase_type "), "PURCHASE_TYPE");
    assert.deepEqual(
        helpers.normalizeRoleNames("Admin, viewer,ADMIN, "),
        ["Admin", "viewer"]);

    assert.throws(function () {
        helpers.normalizeTypeCode(" ");
    }, /Код типа обязателен/);
});

test("admin helpers: buildReferencePayload validates and normalizes values", () => {
    const helpers = adminHelpersModule.createHelpers();

    const insertPayload = helpers.buildReferencePayload({
        itemCode: "  code_1 ",
        displayName: "  Name ",
        sortOrder: "12.9",
        isActive: 0
    }, null, true);

    assert.deepEqual(insertPayload, {
        itemCode: "CODE_1",
        displayName: "Name",
        sortOrder: 12,
        isActive: false
    });

    assert.throws(function () {
        helpers.buildReferencePayload(
            { itemCode: "new", displayName: "Name" },
            { itemCode: "OLD" },
            false);
    }, /ItemCode нельзя изменить/);
});

test("admin helpers: toStringList and buildReferenceItemsUrl", () => {
    const helpers = adminHelpersModule.createHelpers();
    assert.deepEqual(helpers.toStringList(["A", 2]), ["A", "2"]);
    assert.deepEqual(helpers.toStringList(" role "), ["role"]);
    assert.equal(
        helpers.buildReferenceItemsUrl("/api/reference-data", "PURCHASE TYPE", true),
        "/api/reference-data/PURCHASE%20TYPE/items?activeOnly=true");
});
