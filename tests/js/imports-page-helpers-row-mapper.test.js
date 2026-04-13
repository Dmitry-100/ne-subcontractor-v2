"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const rowMapperModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-helpers-row-mapper.js"));

function createRowMapper() {
    return rowMapperModule.createRowMapper();
}

test("imports-page helpers row-mapper: parses numbers and dates", () => {
    const mapper = createRowMapper();
    assert.equal(mapper.parseNumber("42,5"), 42.5);
    assert.ok(Number.isNaN(mapper.parseNumber("abc")));

    assert.deepEqual(mapper.parseDate("2026-04-12"), { value: "2026-04-12", error: null });
    assert.deepEqual(mapper.parseDate("12.04.2026"), { value: "2026-04-12", error: null });
    assert.equal(mapper.parseDate("bad-date").error, "некорректный формат даты");
});

test("imports-page helpers row-mapper: maps row into validated payload", () => {
    const mapper = createRowMapper();

    const mapped = mapper.mapRawRow(
        ["", "prj-01", "obj-1", "disc-a", "42,5", "01.02.2026", "2026-02-15"],
        {
            rowNumber: 0,
            projectCode: 1,
            objectWbs: 2,
            disciplineCode: 3,
            manHours: 4,
            plannedStartDate: 5,
            plannedFinishDate: 6
        },
        7);

    assert.equal(mapped.rowNumber, 7);
    assert.equal(mapped.projectCode, "PRJ-01");
    assert.equal(mapped.objectWbs, "obj-1");
    assert.equal(mapped.disciplineCode, "DISC-A");
    assert.equal(mapped.manHours, 42.5);
    assert.equal(mapped.plannedStartDate, "2026-02-01");
    assert.equal(mapped.plannedFinishDate, "2026-02-15");
    assert.equal(mapped.isLocallyValid, true);
    assert.equal(mapped.localValidationMessage, "");
});

test("imports-page helpers row-mapper: returns validation errors", () => {
    const mapper = createRowMapper();

    const mapped = mapper.mapRawRow(
        ["", "", "", "", "-1", "2026-04-20", "2026-04-10"],
        {
            rowNumber: 0,
            projectCode: 1,
            objectWbs: 2,
            disciplineCode: 3,
            manHours: 4,
            plannedStartDate: 5,
            plannedFinishDate: 6
        },
        3);

    assert.equal(mapped.rowNumber, 3);
    assert.equal(mapped.isLocallyValid, false);
    assert.match(mapped.localValidationMessage, /Код проекта обязателен/);
    assert.match(mapped.localValidationMessage, /Объект WBS обязателен/);
    assert.match(mapped.localValidationMessage, /Код дисциплины обязателен/);
    assert.match(mapped.localValidationMessage, /Трудозатраты не могут быть отрицательными/);
    assert.match(mapped.localValidationMessage, /Плановая дата начала должна быть <= плановой дате окончания/);
});
