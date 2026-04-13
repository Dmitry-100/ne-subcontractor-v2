"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const mappingModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-mapping.js"));

function createMappingService(overrides) {
    const options = overrides || {};
    return mappingModule.createMappingService({
        fieldDefinitions: options.fieldDefinitions || [
            { key: "projectCode", label: "Код проекта", required: true },
            { key: "objectWbs", label: "Объект WBS", required: true },
            { key: "disciplineCode", label: "Код дисциплины", required: false }
        ],
        maxImportRows: options.maxImportRows || 10000,
        previewRowLimit: options.previewRowLimit || 200,
        deriveColumns: options.deriveColumns || function () {
            return { columns: ["A", "B", "C"], dataStartIndex: 1 };
        },
        buildAutoMapping: options.buildAutoMapping || function () {
            return { projectCode: 0, objectWbs: 1, disciplineCode: 2 };
        },
        isRowEmpty: options.isRowEmpty || function (row) {
            return !Array.isArray(row) || row.every(function (value) {
                return String(value ?? "").trim().length === 0;
            });
        },
        mapRawRow: options.mapRawRow || function (rowValues, mapping, fallbackRowNumber) {
            return {
                rowNumber: fallbackRowNumber,
                projectCode: rowValues[mapping.projectCode] || "",
                objectWbs: rowValues[mapping.objectWbs] || "",
                isLocallyValid: fallbackRowNumber % 2 === 1
            };
        }
    });
}

test("imports mapping: createMappingService validates required dependencies", () => {
    assert.throws(() => mappingModule.createMappingService({}), /отсутствуют обязательные зависимости/);
});

test("imports mapping: buildMappingFromRaw keeps valid previous mapping when requested", () => {
    const service = createMappingService({
        deriveColumns: function () {
            return { columns: ["A", "B", "C"], dataStartIndex: 1 };
        },
        buildAutoMapping: function () {
            return { projectCode: 0, objectWbs: 1, disciplineCode: 2 };
        }
    });

    const result = service.buildMappingFromRaw(
        [["h1", "h2", "h3"], ["v1", "v2", "v3"]],
        true,
        { projectCode: 2, objectWbs: -1, disciplineCode: 1 },
        true);

    assert.deepEqual(result.sourceColumns, ["A", "B", "C"]);
    assert.equal(result.dataStartRowIndex, 1);
    assert.deepEqual(result.mapping, {
        projectCode: 2,
        objectWbs: 1,
        disciplineCode: 1
    });
});

test("imports mapping: applyMapping validates required mapping", () => {
    const service = createMappingService();
    assert.throws(() => service.applyMapping(
        [["h1", "h2"], ["v1", "v2"]],
        1,
        { projectCode: -1, objectWbs: 1, disciplineCode: 2 }),
    /Отсутствуют обязательные сопоставления: Код проекта/);
});

test("imports mapping: applyMapping builds rows and summary text", () => {
    const service = createMappingService({ previewRowLimit: 2 });
    const result = service.applyMapping(
        [["h1", "h2"], ["p1", "w1"], ["", ""], ["p2", "w2"]],
        1,
        { projectCode: 0, objectWbs: 1, disciplineCode: 2 });

    assert.equal(result.rows.length, 2);
    assert.equal(result.invalidLocalCount, 0);
    assert.match(result.parseSummaryText, /Разобрано строк: 2/);
    assert.match(result.parseSummaryText, /Локальных ошибок валидации: 0/);
    assert.match(result.mappingStatusMessage, /Сопоставление применено/);
    assert.match(result.uploadStatusMessage, /Файл разобран и сопоставлен/);
});

test("imports mapping: applyMapping enforces max row limit", () => {
    const service = createMappingService({ maxImportRows: 1 });
    assert.throws(() => service.applyMapping(
        [["h1", "h2"], ["p1", "w1"], ["p2", "w2"]],
        1,
        { projectCode: 0, objectWbs: 1, disciplineCode: 2 }),
    /максимально допустимо 1/);
});
