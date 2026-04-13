"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const fileParserModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-file-parser.js"));

test("imports file parser: createFileParser validates dependencies", () => {
    assert.throws(() => fileParserModule.createFileParser({}), /отсутствуют обязательные зависимости/);
});

test("imports file parser: resolves extension and identifies file families", () => {
    const parser = fileParserModule.createFileParser({
        parseDelimitedText: function () { return []; },
        parseWorkbookFile: async function () { return []; }
    });

    assert.equal(parser.resolveExtension("plan.CSV"), "csv");
    assert.equal(parser.resolveExtension("report.xlsx"), "xlsx");
    assert.equal(parser.isDelimitedExtension("txt"), true);
    assert.equal(parser.isWorkbookExtension("xls"), true);
    assert.equal(parser.isDelimitedExtension("pdf"), false);
});

test("imports file parser: parses delimited files via text parser", async () => {
    let parseTextInput = null;
    const parser = fileParserModule.createFileParser({
        parseDelimitedText: function (text) {
            parseTextInput = text;
            return [["h1"], ["v1"]];
        },
        parseWorkbookFile: async function () {
            throw new Error("workbook parser should not be called");
        }
    });

    const result = await parser.parse({
        name: "source-data.csv",
        text: async function () { return "h1\nv1\n"; }
    });

    assert.equal(parseTextInput, "h1\nv1\n");
    assert.equal(result.fileName, "source-data.csv");
    assert.equal(result.extension, "csv");
    assert.deepEqual(result.rawRows, [["h1"], ["v1"]]);
});

test("imports file parser: parses workbook files via workbook parser", async () => {
    const parser = fileParserModule.createFileParser({
        parseDelimitedText: function () {
            throw new Error("text parser should not be called");
        },
        parseWorkbookFile: async function (file) {
            assert.equal(file.name, "source-data.xlsx");
            return [["h1"], ["v1"]];
        }
    });

    const result = await parser.parse({
        name: "source-data.xlsx",
        text: async function () { return ""; }
    });

    assert.equal(result.extension, "xlsx");
    assert.equal(result.rawRows.length, 2);
});

test("imports file parser: validates unsupported extensions and empty content", async () => {
    const parser = fileParserModule.createFileParser({
        parseDelimitedText: function () { return []; },
        parseWorkbookFile: async function () { return []; }
    });

    await assert.rejects(async function () {
        await parser.parse({
            name: "source-data.json",
            text: async function () { return "{}"; }
        });
    }, /Неподдерживаемый тип файла/);

    await assert.rejects(async function () {
        await parser.parse({
            name: "source-data.csv",
            text: async function () { return ""; }
        });
    }, /Исходный файл не содержит строк/);
});
