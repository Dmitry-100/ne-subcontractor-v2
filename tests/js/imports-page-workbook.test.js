"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const workbookModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-workbook.js"));

test("imports workbook: createWorkbookParser validates required dependencies", () => {
    assert.throws(() => workbookModule.createWorkbookParser({}), /отсутствуют обязательные зависимости/);
});

test("imports workbook: parseWorkbookFile validates SheetJS availability at runtime", async () => {
    const parser = workbookModule.createWorkbookParser({
        getSheetJs: function () {
            return null;
        },
        isRowEmpty: function () {
            return false;
        }
    });

    await assert.rejects(
        parser.parseWorkbookFile({
            arrayBuffer: async function () {
                return new ArrayBuffer(8);
            }
        }),
        /Парсер XLSX не загружен/);
});

test("imports workbook: parseWorkbookFile throws when workbook has no sheets", async () => {
    const parser = workbookModule.createWorkbookParser({
        getSheetJs: function () {
            return {
                read: function () {
                    return {
                        SheetNames: [],
                        Sheets: {}
                    };
                },
                utils: {
                    sheet_to_json: function () {
                        return [];
                    }
                }
            };
        },
        isRowEmpty: function () {
            return false;
        }
    });

    await assert.rejects(
        parser.parseWorkbookFile({
            arrayBuffer: async function () {
                return new ArrayBuffer(8);
            }
        }),
        /Книга не содержит листов/);
});

test("imports workbook: parseWorkbookFile returns filtered non-empty rows", async () => {
    let capturedReadOptions = null;
    let capturedSheetToJsonOptions = null;

    const parser = workbookModule.createWorkbookParser({
        getSheetJs: function () {
            return {
                read: function (_bytes, options) {
                    capturedReadOptions = options;
                    return {
                        SheetNames: ["Sheet1"],
                        Sheets: {
                            Sheet1: { id: "sheet-1" }
                        }
                    };
                },
                utils: {
                    sheet_to_json: function (_sheet, options) {
                        capturedSheetToJsonOptions = options;
                        return [
                            ["header1", "header2"],
                            ["value1", "value2"],
                            ["", ""]
                        ];
                    }
                }
            };
        },
        isRowEmpty: function (row) {
            return Array.isArray(row) && row.every(function (value) {
                return String(value || "").trim().length === 0;
            });
        }
    });

    const rows = await parser.parseWorkbookFile({
        arrayBuffer: async function () {
            return new ArrayBuffer(8);
        }
    });

    assert.deepEqual(capturedReadOptions, { type: "array", raw: false });
    assert.deepEqual(capturedSheetToJsonOptions, {
        header: 1,
        blankrows: false,
        raw: false,
        defval: ""
    });
    assert.deepEqual(rows, [
        ["header1", "header2"],
        ["value1", "value2"]
    ]);
});
