"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const csvParsingModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-helpers-csv-parsing.js"));

test("imports-page csv parsing helpers: detects delimiter and parses quoted csv line", () => {
    assert.equal(csvParsingModule.detectDelimiter("A;B;C"), ";");
    assert.equal(csvParsingModule.detectDelimiter("A,B,C"), ",");
    assert.equal(csvParsingModule.detectDelimiter("A\tB\tC"), "\t");

    assert.deepEqual(
        csvParsingModule.parseCsvLine("\"A,B\",C", ","),
        ["A,B", "C"]);
});

test("imports-page csv parsing helpers: parseDelimitedText skips empty lines", () => {
    const rows = csvParsingModule.parseDelimitedText("\n\nproject;wbs\nP-1;OBJ-1\n");
    assert.deepEqual(rows, [
        ["project", "wbs"],
        ["P-1", "OBJ-1"]
    ]);
});

test("imports-page csv parsing helpers: parseDelimitedText validates empty file", () => {
    assert.throws(function () {
        csvParsingModule.parseDelimitedText("   \n\t\n");
    }, /Файл пуст/);
});
