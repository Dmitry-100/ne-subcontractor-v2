"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const importFileParsing = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-import-file-parsing.js"));

test("contracts import file parsing: parseDelimitedText detects delimiter and quoted values", () => {
    const rows = importFileParsing.parseDelimitedText("\uFEFFКарточка;Отчетная дата;Код строки\n\"Card;A\";2026-04-12;ROW-1\n");
    assert.equal(rows.length, 2);
    assert.equal(rows[0][0], "Карточка");
    assert.equal(rows[1][0], "Card;A");
    assert.equal(rows[1][2], "ROW-1");
});

test("contracts import file parsing: parseMdrImportFile handles csv and xlsx branches", async () => {
    const csvRows = await importFileParsing.parseMdrImportFile({
        name: "mdr.csv",
        text: async function () {
            return "Карточка,Отчетная дата,Код строки,Прогноз,Факт\nCard,2026-04-12,ROW-1,10,9\n";
        }
    });
    assert.equal(csvRows.length, 2);

    const xlsxRows = await importFileParsing.parseMdrImportFile(
        {
            name: "mdr.xlsx",
            arrayBuffer: async function () {
                return new Uint8Array([1, 2, 3]).buffer;
            }
        },
        {
            read: function () {
                return {
                    SheetNames: ["Sheet1"],
                    Sheets: {
                        Sheet1: {}
                    }
                };
            },
            utils: {
                sheet_to_json: function () {
                    return [
                        ["Карточка", "Отчетная дата"],
                        ["Card", "2026-04-12"],
                        ["", ""]
                    ];
                }
            }
        });

    assert.equal(xlsxRows.length, 2);
});

test("contracts import file parsing: parseMdrImportFile validates unsupported extension", async () => {
    await assert.rejects(async () => {
        await importFileParsing.parseMdrImportFile({
            name: "mdr.pdf",
            text: async function () { return ""; }
        });
    }, /Неподдерживаемый формат файла/i);
});
