"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const importMdrRows = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-import-mdr-rows.js"));

test("contracts import mdr rows: parses valid rows with numeric/date normalization", () => {
    const items = importMdrRows.parseMdrImportItemsFromRows([
        ["Карточка", "Отчетная дата", "Код строки", "Прогноз", "Факт"],
        [" Карточка 1 ", "12.04.2026", " ROW-1 ", "10,5", "9.25"]
    ]);

    assert.equal(items.length, 1);
    assert.deepEqual(items[0], {
        sourceRowNumber: 2,
        cardTitle: "Карточка 1",
        reportingDate: "2026-04-12",
        rowCode: "ROW-1",
        forecastValue: 10.5,
        factValue: 9.25
    });
});

test("contracts import mdr rows: validates required columns", () => {
    assert.throws(() => {
        importMdrRows.parseMdrImportItemsFromRows([
            ["Карточка", "Отчетная дата", "Код строки", "Прогноз"],
            ["Card", "2026-04-12", "ROW-1", "10"]
        ]);
    }, /Не найдены обязательные колонки/i);
});

test("contracts import mdr rows: aggregates row errors and limits preview", () => {
    assert.throws(() => {
        importMdrRows.parseMdrImportItemsFromRows([
            ["Карточка", "Отчетная дата", "Код строки", "Прогноз", "Факт"],
            ["", "bad-date", "", "-1", "-5"]
        ]);
    }, /Строка 2: поле "Название карточки" обязательно/i);
});
