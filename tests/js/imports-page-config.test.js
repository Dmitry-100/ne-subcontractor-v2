"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const configModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-config.js"));

test("imports config: createConfig returns required limits and dictionaries", () => {
    const config = configModule.createConfig();

    assert.equal(config.previewRowLimit, 200);
    assert.equal(config.maxImportRows, 10000);
    assert.deepEqual(config.importStatusTransitions.Validated, ["ReadyForLotting", "Rejected"]);
    assert.equal(config.importStatusLabels.ValidatedWithErrors, "Проверен с ошибками");
});

test("imports config: createConfig exposes canonical field definitions", () => {
    const config = configModule.createConfig();

    assert.equal(config.fieldDefinitions.length, 7);
    assert.deepEqual(config.fieldDefinitions.map(function (field) {
        return field.key;
    }), [
        "rowNumber",
        "projectCode",
        "objectWbs",
        "disciplineCode",
        "manHours",
        "plannedStartDate",
        "plannedFinishDate"
    ]);
});

test("imports config: createConfig returns a fresh copy on each call", () => {
    const first = configModule.createConfig();
    const second = configModule.createConfig();

    first.importStatusLabels.Uploaded = "changed";
    first.fieldDefinitions[0].label = "changed-label";
    first.importStatusTransitions.Validated.push("Custom");

    assert.equal(second.importStatusLabels.Uploaded, "Загружен");
    assert.equal(second.fieldDefinitions[0].label, "Номер строки");
    assert.deepEqual(second.importStatusTransitions.Validated, ["ReadyForLotting", "Rejected"]);
});
