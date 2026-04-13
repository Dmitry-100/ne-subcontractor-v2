"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-helpers.js"));

function createHelpers() {
    return helpersModule.createHelpers({
        statusCaptions: {
            Draft: "Черновик",
            InProcurement: "В закупке"
        }
    });
}

test("dashboard-page helpers: parseErrorBody prefers detail then error then title", () => {
    const helpers = createHelpers();

    assert.equal(
        helpers.parseErrorBody(JSON.stringify({ detail: "Подробная ошибка", error: "Ошибка", title: "Заголовок" }), 400),
        "Подробная ошибка");
    assert.equal(
        helpers.parseErrorBody(JSON.stringify({ error: "Ошибка", title: "Заголовок" }), 500),
        "Ошибка");
    assert.equal(
        helpers.parseErrorBody(JSON.stringify({ title: "Заголовок" }), 404),
        "Заголовок");
    assert.equal(helpers.parseErrorBody("Plain text error", 400), "Plain text error");
    assert.equal(helpers.parseErrorBody("", 503), "Ошибка запроса (503).");
});

test("dashboard-page helpers: formatters return localized values", () => {
    const helpers = createHelpers();

    assert.equal(helpers.formatPercent(12.345), "12.35%");
    assert.equal(helpers.formatPercent(Number.NaN), "н/д");
    assert.equal(helpers.formatMoney(12345.678), "12 345,68");
    assert.equal(helpers.formatMoney(undefined), "0");
    assert.equal(helpers.formatDate("2026-04-11T10:00:00Z"), "11.04.2026");
    assert.equal(helpers.formatDate(""), "Без срока");
});

test("dashboard-page helpers: localization and lot funnel helpers", () => {
    const helpers = createHelpers();

    assert.equal(helpers.localizeStatus("Draft"), "Черновик");
    assert.equal(helpers.localizeStatus("UnknownStatus"), "UnknownStatus");
    assert.equal(helpers.localizeStatus(""), "Неизвестно");

    assert.equal(helpers.localizePriority("HIGH"), "Высокий");
    assert.equal(helpers.localizePriority("low"), "Низкий");
    assert.equal(helpers.localizePriority("normal"), "Обычный");

    const stages = [
        { status: "Draft", count: 4 },
        { status: "InProcurement", count: 2 }
    ];
    assert.equal(helpers.getLotCountByStatus(stages, "draft"), 4);
    assert.equal(helpers.getLotCountByStatus(stages, "Contracted"), 0);
});
