"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const filterHelpers = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-filter-helpers.js"));
const payloadHelpers = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-payload-helpers.js"));
const importHelpers = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-import-helpers.js"));

test("contracts filter helpers: url state + clear url contract", () => {
    const state = filterHelpers.readUrlFilterState("?status=Draft,Signed&search=abc", ["Draft", "Signed", "Closed"]);
    assert.deepEqual(state.statuses, ["Draft", "Signed"]);
    assert.equal(state.searchText, "abc");
    assert.equal(filterHelpers.clearUrlFilters("https://demo.local/Home/Contracts?status=Draft&search=abc#tab"), "/Home/Contracts#tab");
});

test("contracts payload helpers: milestones payload and parse error body", () => {
    const payload = payloadHelpers.buildMilestonesPayload([
        {
            title: "Этап А",
            plannedDate: "2026-04-10",
            progressPercent: 25
        }
    ]);

    assert.equal(payload.length, 1);
    assert.equal(payload[0].title, "Этап А");
    assert.equal(payload[0].progressPercent, 25);
    assert.equal(payloadHelpers.parseErrorBody("{\"detail\":\"Ошибка\"}", 400), "Ошибка");
});

test("contracts import helpers: parse MDR rows", () => {
    const rows = [
        ["Карточка", "Отчетная дата", "Код строки", "Прогноз", "Факт"],
        ["Карточка 1", "2026-04-10", "ROW-1", "10", "9.5"]
    ];

    const parsed = importHelpers.parseMdrImportItemsFromRows(rows);

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].cardTitle, "Карточка 1");
    assert.equal(parsed[0].rowCode, "ROW-1");
    assert.equal(parsed[0].forecastValue, 10);
    assert.equal(parsed[0].factValue, 9.5);
});
