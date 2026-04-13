"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const mappingOrchestrationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-mapping-orchestration.js"));

function createBaseState() {
    return {
        rawRows: [],
        sourceFileName: "",
        dataStartRowIndex: 1,
        mappingSelection: {},
        sourceColumns: [],
        parsedRows: []
    };
}

function createBaseOptions(overrides) {
    const state = createBaseState();
    const statusCalls = {
        mapping: [],
        upload: []
    };

    const options = {
        fileInput: { files: [] },
        hasHeaderCheckbox: { checked: true },
        mappingSection: { hidden: true },
        parseSummaryElement: { hidden: true, textContent: "" },
        uploadButton: { disabled: true },
        mappingUi: {
            readMappingFromUi: function () {
                return {};
            },
            renderPreviewTable: function () {},
            renderMappingGrid: function () {}
        },
        mappingService: {
            applyMapping: function () {
                return {
                    rows: [],
                    parseSummaryText: "",
                    mappingStatusMessage: "",
                    uploadStatusMessage: ""
                };
            },
            buildMappingFromRaw: function () {
                return {
                    sourceColumns: [],
                    dataStartRowIndex: 1,
                    mapping: {},
                    mappingStatusMessage: ""
                };
            }
        },
        fileParser: {
            parse: async function () {
                return {
                    rawRows: [],
                    fileName: ""
                };
            }
        },
        getRawRows: function () {
            return state.rawRows;
        },
        setRawRows: function (value) {
            state.rawRows = value;
        },
        setSourceFileName: function (value) {
            state.sourceFileName = value;
        },
        getDataStartRowIndex: function () {
            return state.dataStartRowIndex;
        },
        setDataStartRowIndex: function (value) {
            state.dataStartRowIndex = value;
        },
        getMappingSelection: function () {
            return state.mappingSelection;
        },
        setMappingSelection: function (value) {
            state.mappingSelection = value;
        },
        setSourceColumns: function (value) {
            state.sourceColumns = value;
        },
        setParsedRows: function (value) {
            state.parsedRows = value;
        },
        setMappingStatus: function (message, isError) {
            statusCalls.mapping.push({ message: message, isError: isError });
        },
        setUploadStatus: function (message, isError) {
            statusCalls.upload.push({ message: message, isError: isError });
        }
    };

    return {
        state: state,
        statusCalls: statusCalls,
        options: Object.assign(options, overrides || {})
    };
}

test("imports mapping orchestration: createMappingOrchestrationService validates dependencies", () => {
    assert.throws(
        function () {
            mappingOrchestrationModule.createMappingOrchestrationService({});
        },
        /fileInput/);
});

test("imports mapping orchestration: rebuildMappingFromRaw updates mapping state and renders grid", () => {
    const rendered = [];
    const setup = createBaseOptions({
        mappingService: {
            applyMapping: function () {
                return {
                    rows: [],
                    parseSummaryText: "",
                    mappingStatusMessage: "",
                    uploadStatusMessage: ""
                };
            },
            buildMappingFromRaw: function (rawRows, hasHeader) {
                assert.equal(Array.isArray(rawRows), true);
                assert.equal(hasHeader, true);
                return {
                    sourceColumns: ["Код проекта", "Трудозатраты"],
                    dataStartRowIndex: 2,
                    mapping: { projectCode: 0 },
                    mappingStatusMessage: "ok"
                };
            }
        },
        mappingUi: {
            readMappingFromUi: function () {
                return {};
            },
            renderPreviewTable: function () {},
            renderMappingGrid: function (columns, mapping) {
                rendered.push({ columns: columns, mapping: mapping });
            }
        }
    });
    setup.state.rawRows = [["header"], ["row"]];

    const service = mappingOrchestrationModule.createMappingOrchestrationService(setup.options);
    service.rebuildMappingFromRaw(false);

    assert.deepEqual(setup.state.sourceColumns, ["Код проекта", "Трудозатраты"]);
    assert.equal(setup.state.dataStartRowIndex, 2);
    assert.deepEqual(setup.state.mappingSelection, { projectCode: 0 });
    assert.equal(rendered.length, 1);
    assert.deepEqual(setup.statusCalls.mapping, [{ message: "ok", isError: false }]);
});

test("imports mapping orchestration: applyMappingToRows updates parsed rows, summary and statuses", () => {
    const setup = createBaseOptions({
        mappingUi: {
            readMappingFromUi: function () {
                return { projectCode: 0 };
            },
            renderPreviewTable: function (rows) {
                assert.equal(rows.length, 1);
            },
            renderMappingGrid: function () {}
        },
        mappingService: {
            applyMapping: function () {
                return {
                    rows: [{ rowNumber: 1 }],
                    parseSummaryText: "Разобрана 1 строка.",
                    mappingStatusMessage: "Сопоставление применено.",
                    uploadStatusMessage: "Файл разобран."
                };
            },
            buildMappingFromRaw: function () {
                return {
                    sourceColumns: [],
                    dataStartRowIndex: 1,
                    mapping: {},
                    mappingStatusMessage: ""
                };
            }
        }
    });
    setup.state.rawRows = [["value"]];

    const service = mappingOrchestrationModule.createMappingOrchestrationService(setup.options);
    const result = service.applyMappingToRows();

    assert.equal(result.rows.length, 1);
    assert.equal(setup.state.parsedRows.length, 1);
    assert.equal(setup.options.parseSummaryElement.hidden, false);
    assert.equal(setup.options.parseSummaryElement.textContent, "Разобрана 1 строка.");
    assert.equal(setup.options.uploadButton.disabled, false);
    assert.deepEqual(setup.statusCalls.mapping, [{ message: "Сопоставление применено.", isError: false }]);
    assert.deepEqual(setup.statusCalls.upload, [{ message: "Файл разобран.", isError: false }]);
});

test("imports mapping orchestration: parseSelectedFile parses file and opens mapping section", async () => {
    const setup = createBaseOptions({
        fileInput: { files: [{ name: "source.csv" }] },
        fileParser: {
            parse: async function () {
                return {
                    rawRows: [["header"], ["value"]],
                    fileName: "source.csv"
                };
            }
        },
        mappingService: {
            applyMapping: function () {
                return {
                    rows: [{ rowNumber: 1 }],
                    parseSummaryText: "Разобрана 1 строка.",
                    mappingStatusMessage: "Сопоставление применено.",
                    uploadStatusMessage: "Файл разобран."
                };
            },
            buildMappingFromRaw: function () {
                return {
                    sourceColumns: ["header"],
                    dataStartRowIndex: 2,
                    mapping: { projectCode: 0 },
                    mappingStatusMessage: "Готово."
                };
            }
        },
        mappingUi: {
            readMappingFromUi: function () {
                return { projectCode: 0 };
            },
            renderPreviewTable: function () {},
            renderMappingGrid: function () {}
        }
    });

    const service = mappingOrchestrationModule.createMappingOrchestrationService(setup.options);
    await service.parseSelectedFile();

    assert.equal(setup.options.mappingSection.hidden, false);
    assert.equal(setup.state.sourceFileName, "source.csv");
    assert.equal(setup.state.rawRows.length, 2);
    assert.equal(setup.state.parsedRows.length, 1);
});
