"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-helpers.js"));

function createHelpers() {
    return helpersModule.createHelpers({
        importStatusLabels: {
            Uploaded: "Загружен",
            Processing: "Обрабатывается"
        },
        fieldDefinitions: [
            { key: "rowNumber", required: false, synonyms: ["row"] },
            { key: "projectCode", required: true, synonyms: ["projectcode", "project"] },
            { key: "objectWbs", required: true, synonyms: ["objectwbs", "wbs"] },
            { key: "disciplineCode", required: true, synonyms: ["disciplinecode", "discipline"] },
            { key: "manHours", required: true, synonyms: ["manhours", "hours"] },
            { key: "plannedStartDate", required: false, synonyms: ["plannedstartdate", "start"] },
            { key: "plannedFinishDate", required: false, synonyms: ["plannedfinishdate", "finish"] }
        ]
    });
}

test("imports-page helpers: localize status and parse delimited content", () => {
    const helpers = createHelpers();
    assert.equal(helpers.localizeImportStatus("Uploaded"), "Загружен");
    assert.equal(helpers.localizeImportStatus("Unknown"), "Unknown");

    const rows = helpers.parseDelimitedText("Project;Wbs\nP-1;OBJ-1\n");
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], ["Project", "Wbs"]);
    assert.deepEqual(rows[1], ["P-1", "OBJ-1"]);
});

test("imports-page helpers: derive columns with unique header names", () => {
    const helpers = createHelpers();
    const derived = helpers.deriveColumns([
        ["Project", "Project", ""],
        ["P-1", "P-1-A", "10"]
    ], true);

    assert.deepEqual(derived.columns, ["Project", "Project (2)", "Column 3"]);
    assert.equal(derived.dataStartIndex, 1);
});

test("imports-page helpers: build auto mapping with and without header", () => {
    const helpers = createHelpers();
    const withHeader = helpers.buildAutoMapping(
        ["Project code", "Object WBS", "Discipline", "Man Hours", "Planned Start Date", "Planned Finish Date"],
        true);

    assert.equal(withHeader.projectCode, 0);
    assert.equal(withHeader.objectWbs, 1);
    assert.equal(withHeader.disciplineCode, 2);
    assert.equal(withHeader.manHours, 3);

    const noHeader = helpers.buildAutoMapping(["A", "B", "C", "D", "E", "F"], false);
    assert.equal(noHeader.projectCode, 0);
    assert.equal(noHeader.objectWbs, 1);
    assert.equal(noHeader.disciplineCode, 2);
    assert.equal(noHeader.manHours, 3);
    assert.equal(noHeader.plannedStartDate, 4);
    assert.equal(noHeader.plannedFinishDate, 5);
});

test("imports-page helpers: mapRawRow builds valid row payload", () => {
    const helpers = createHelpers();
    const row = helpers.mapRawRow(
        ["12", "prj-01", "obj-1", "disc-a", "42,5", "01.02.2026", "2026-02-15"],
        {
            rowNumber: 0,
            projectCode: 1,
            objectWbs: 2,
            disciplineCode: 3,
            manHours: 4,
            plannedStartDate: 5,
            plannedFinishDate: 6
        },
        1);

    assert.equal(row.rowNumber, 12);
    assert.equal(row.projectCode, "PRJ-01");
    assert.equal(row.objectWbs, "obj-1");
    assert.equal(row.disciplineCode, "DISC-A");
    assert.equal(row.manHours, 42.5);
    assert.equal(row.plannedStartDate, "2026-02-01");
    assert.equal(row.plannedFinishDate, "2026-02-15");
    assert.equal(row.isLocallyValid, true);
    assert.equal(row.localValidationMessage, "");
});

test("imports-page helpers: mapRawRow collects validation errors", () => {
    const helpers = createHelpers();
    const row = helpers.mapRawRow(
        ["", "", "", "", "-5", "2026-03-10", "2026-03-01"],
        {
            rowNumber: 0,
            projectCode: 1,
            objectWbs: 2,
            disciplineCode: 3,
            manHours: 4,
            plannedStartDate: 5,
            plannedFinishDate: 6
        },
        9);

    assert.equal(row.rowNumber, 9);
    assert.equal(row.isLocallyValid, false);
    assert.match(row.localValidationMessage, /Код проекта обязателен/);
    assert.match(row.localValidationMessage, /Объект WBS обязателен/);
    assert.match(row.localValidationMessage, /Код дисциплины обязателен/);
    assert.match(row.localValidationMessage, /Трудозатраты не могут быть отрицательными/);
    assert.match(row.localValidationMessage, /Плановая дата начала должна быть <= плановой дате окончания/);
});

test("imports-page helpers: formatters and default XML filename", () => {
    const helpers = createHelpers();
    const formattedNumber = helpers.formatNumber(12345.678);
    assert.match(formattedNumber, /12/);
    assert.match(formattedNumber, /345/);

    assert.equal(helpers.formatDateRange(null, null), "-");
    assert.match(helpers.formatDateRange("2026-01-10", "2026-01-15"), /\d{2}\.\d{2}\.\d{4}/);

    const fileName = helpers.buildDefaultXmlFileName(new Date(2026, 3, 8, 7, 6, 5));
    assert.equal(fileName, "express-plan-20260408-070605.xml");
});
