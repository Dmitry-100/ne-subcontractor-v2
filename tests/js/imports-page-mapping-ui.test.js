"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const mappingUiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-mapping-ui.js"));

const FIELD_DEFINITIONS = [
    { key: "projectCode", label: "Код проекта", required: true },
    { key: "manHours", label: "Трудозатраты", required: false }
];

test("imports mapping ui: createMappingUiService validates dependencies", () => {
    assert.throws(
        function () {
            mappingUiModule.createMappingUiService({});
        },
        /fieldDefinitions/);
});

test("imports mapping ui: build model and render mapping grid via callback", () => {
    const rendered = [];
    const service = mappingUiModule.createMappingUiService({
        fieldDefinitions: FIELD_DEFINITIONS,
        buildPreviewModel: function () {
            return { headers: [], rows: [] };
        },
        previewRowLimit: 200,
        renderMappingGridView: function (model) {
            rendered.push(model);
        },
        readMappingFromUiValues: function () {
            return {};
        },
        renderPreviewView: function () {}
    });

    const model = service.renderMappingGrid(
        ["Код проекта", "Трудозатраты"],
        { projectCode: 0, manHours: 1 });

    assert.equal(model.fields.length, 2);
    assert.equal(model.fields[0].required, true);
    assert.equal(model.fields[0].selected, "0");
    assert.equal(model.fields[0].emptyOptionLabel, "Выберите колонку источника...");
    assert.equal(model.fields[1].selected, "1");
    assert.equal(model.fields[1].emptyOptionLabel, "Не сопоставлено");
    assert.equal(rendered.length, 1);
    assert.equal(rendered[0].fields[0].key, "projectCode");
});

test("imports mapping ui: readMappingFromUi delegates to callback", () => {
    const service = mappingUiModule.createMappingUiService({
        fieldDefinitions: FIELD_DEFINITIONS,
        buildPreviewModel: function () {
            return { headers: [], rows: [] };
        },
        previewRowLimit: 200,
        renderMappingGridView: function () {},
        readMappingFromUiValues: function (fields) {
            assert.equal(fields.length, 2);
            return {
                projectCode: 0,
                manHours: -1
            };
        },
        renderPreviewView: function () {}
    });

    assert.deepEqual(service.readMappingFromUi(), {
        projectCode: 0,
        manHours: -1
    });
});

test("imports mapping ui: renderPreviewTable builds model and sends to callback", () => {
    const rendered = [];
    const buildCalls = [];
    const service = mappingUiModule.createMappingUiService({
        fieldDefinitions: FIELD_DEFINITIONS,
        buildPreviewModel: function (rows, previewRowLimit) {
            buildCalls.push({ rows: rows, previewRowLimit: previewRowLimit });
            return {
                headers: ["h1"],
                rows: [{ cells: ["v1"] }]
            };
        },
        previewRowLimit: 99,
        renderMappingGridView: function () {},
        readMappingFromUiValues: function () {
            return {};
        },
        renderPreviewView: function (model) {
            rendered.push(model);
        }
    });

    const rows = [{ rowNumber: 1 }];
    const model = service.renderPreviewTable(rows);

    assert.equal(buildCalls.length, 1);
    assert.equal(buildCalls[0].previewRowLimit, 99);
    assert.equal(buildCalls[0].rows.length, 1);
    assert.equal(rendered.length, 1);
    assert.deepEqual(model, rendered[0]);
});
