"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const parsingModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-helpers-parsing.js"));

function createParsingHelpers() {
    return parsingModule.createParsingHelpers({
        fieldDefinitions: [
            { key: "projectCode", synonyms: ["projectcode", "project"] },
            { key: "objectWbs", synonyms: ["objectwbs", "wbs"] },
            { key: "disciplineCode", synonyms: ["disciplinecode", "discipline"] },
            { key: "manHours", synonyms: ["manhours", "hours"] },
            { key: "plannedStartDate", synonyms: ["plannedstartdate", "start"] },
            { key: "plannedFinishDate", synonyms: ["plannedfinishdate", "finish"] }
        ]
    });
}

test("imports-page helpers parsing: parses delimited text with auto delimiter detection", () => {
    const helpers = createParsingHelpers();
    assert.equal(helpers.detectDelimiter("A;B;C"), ";");
    assert.equal(helpers.detectDelimiter("A,B,C"), ",");
    assert.equal(helpers.detectDelimiter("A\tB\tC"), "\t");

    const rows = helpers.parseDelimitedText("project;wbs\nP-1;OBJ-1\n");
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], ["project", "wbs"]);
    assert.deepEqual(rows[1], ["P-1", "OBJ-1"]);
});

test("imports-page helpers parsing: derives columns and builds mapping with header", () => {
    const helpers = createParsingHelpers();

    const derived = helpers.deriveColumns([
        ["Project", "Project", ""],
        ["P-1", "OBJ-1", "10"]
    ], true);

    assert.deepEqual(derived.columns, ["Project", "Project (2)", "Column 3"]);
    assert.equal(derived.dataStartIndex, 1);

    const mapping = helpers.buildAutoMapping(
        ["Project code", "Object WBS", "Discipline", "Man Hours", "Planned Start Date", "Planned Finish Date"],
        true);
    assert.equal(mapping.projectCode, 0);
    assert.equal(mapping.objectWbs, 1);
    assert.equal(mapping.disciplineCode, 2);
    assert.equal(mapping.manHours, 3);
    assert.equal(mapping.plannedStartDate, 4);
    assert.equal(mapping.plannedFinishDate, 5);
});

test("imports-page helpers parsing: applies positional fallback mapping without header", () => {
    const helpers = createParsingHelpers();
    const mapping = helpers.buildAutoMapping(["A", "B", "C", "D", "E", "F"], false);

    assert.equal(mapping.projectCode, 0);
    assert.equal(mapping.objectWbs, 1);
    assert.equal(mapping.disciplineCode, 2);
    assert.equal(mapping.manHours, 3);
    assert.equal(mapping.plannedStartDate, 4);
    assert.equal(mapping.plannedFinishDate, 5);
});
