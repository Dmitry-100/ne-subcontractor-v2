"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpers = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-helpers.js"));

test("readUrlFilterState parses and deduplicates statuses from URL", () => {
    const state = helpers.readUrlFilterState("?status=draft,SIGNED,draft&search=  test query  ", [
        "Draft",
        "Signed",
        "Closed"
    ]);

    assert.deepEqual(state.statuses, ["Draft", "Signed"]);
    assert.equal(state.searchText, "test query");
    assert.equal(state.hasAny, true);
    assert.deepEqual(state.statusFilter, [["status", "=", "Draft"], "or", ["status", "=", "Signed"]]);
});

test("buildMilestonesPayload builds normalized payload for valid rows", () => {
    const payload = helpers.buildMilestonesPayload([
        {
            title: " Этап 1 ",
            plannedDate: "2026-04-08",
            actualDate: "",
            progressPercent: "80",
            sortOrder: "2.9",
            notes: "  комментарий  "
        }
    ]);

    assert.equal(payload.length, 1);
    assert.equal(payload[0].title, "Этап 1");
    assert.equal(payload[0].plannedDate, "2026-04-08T00:00:00.000Z");
    assert.equal(payload[0].actualDate, null);
    assert.equal(payload[0].progressPercent, 80);
    assert.equal(payload[0].sortOrder, 2);
    assert.equal(payload[0].notes, "комментарий");
});

test("buildMilestonesPayload validates progress range", () => {
    assert.throws(() => {
        helpers.buildMilestonesPayload([
            {
                title: "Этап 1",
                plannedDate: "2026-04-08",
                progressPercent: 120
            }
        ]);
    }, /диапазоне 0\.\.100/i);
});

test("parseMdrImportItemsFromRows parses valid MDR rows", () => {
    const rows = [
        ["Карточка", "Отчетная дата", "Код строки", "Прогноз", "Факт"],
        ["Карточка 1", "08.04.2026", "ROW-1", "10,5", "9.25"]
    ];

    const items = helpers.parseMdrImportItemsFromRows(rows);
    assert.equal(items.length, 1);
    assert.deepEqual(items[0], {
        sourceRowNumber: 2,
        cardTitle: "Карточка 1",
        reportingDate: "2026-04-08",
        rowCode: "ROW-1",
        forecastValue: 10.5,
        factValue: 9.25
    });
});

test("parseMdrImportItemsFromRows validates required headers", () => {
    const rows = [
        ["Название карточки", "Отчетная дата", "Код строки", "Прогноз"],
        ["Карточка 1", "2026-04-08", "ROW-1", "10"]
    ];

    assert.throws(() => {
        helpers.parseMdrImportItemsFromRows(rows);
    }, /Не найдены обязательные колонки/i);
});
