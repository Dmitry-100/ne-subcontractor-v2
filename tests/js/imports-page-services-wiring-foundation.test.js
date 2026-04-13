"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const foundationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring-foundation.js"));

function createControls() {
    return {
        uploadStatusElement: {},
        batchesStatusElement: {},
        mappingStatusElement: {},
        transitionStatusElement: {},
        xmlStatusElement: {},
        lotStatusElement: {},
        mappingGrid: {},
        previewWrap: {},
        previewTable: {},
        batchesTable: {},
        invalidTable: {},
        invalidWrapElement: {},
        historyTable: {},
        historyWrapElement: {}
    };
}

function createConfig() {
    return {
        fieldDefinitions: [{ key: "projectCode" }],
        importStatusTransitions: { Validated: ["Rejected"] },
        importStatusLabels: { Validated: "Проверен" },
        previewRowLimit: 200,
        maxImportRows: 10000
    };
}

test("imports services foundation: validates required options", () => {
    assert.throws(function () {
        foundationModule.createFoundationServices({});
    }, /required options/i);
});

test("imports services foundation: composes base services graph", () => {
    const captured = {
        workflowOptions: null,
        reportsOptions: null,
        workbookOptions: null
    };

    const roots = {
        importsPageHelpersRoot: {
            createHelpers: function () {
                return {
                    localizeImportStatus: function (value) { return value; },
                    deriveColumns: function () {},
                    buildAutoMapping: function () {},
                    isRowEmpty: function () { return false; },
                    mapRawRow: function () {},
                    buildDefaultXmlFileName: function () { return "file.xml"; },
                    formatNumber: function () { return "0"; },
                    formatDateRange: function () { return "date-range"; },
                    parseDelimitedText: function () { return []; }
                };
            }
        },
        importsPageApiRoot: {
            createApiClient: function () {
                return { id: "api-client" };
            }
        },
        importsPageStatusRoot: {
            createStatusService: function () {
                return {
                    setUploadStatus: function () {},
                    setBatchesStatus: function () {},
                    setMappingStatus: function () {},
                    setTransitionStatus: function () {},
                    setXmlStatus: function () {},
                    setLotStatus: function () {}
                };
            }
        },
        importsPageWorkflowRoot: {
            createWorkflow: function (options) {
                captured.workflowOptions = options;
                return { id: "workflow" };
            }
        },
        importsPageMappingRoot: {
            createMappingService: function () {
                return { id: "mapping" };
            }
        },
        importsPageTableModelsRoot: {
            createTableModels: function () {
                return {
                    buildPreviewModel: function () {
                        return { header: [] };
                    }
                };
            }
        },
        importsPageMappingUiRoot: {
            createMappingUiService: function () {
                return { id: "mapping-ui" };
            }
        },
        importsPageBatchTablesRoot: {
            createBatchTablesService: function () {
                return { id: "batch-tables" };
            }
        },
        importsPageXmlRoot: {
            createXmlHelpers: function () {
                return { id: "xml" };
            }
        },
        importsPageUploadRoot: {
            createUploadHelpers: function () {
                return { id: "upload" };
            }
        },
        importsPageReportsRoot: {
            createReportsHelpers: function (options) {
                captured.reportsOptions = options;
                return { id: "reports" };
            }
        },
        importsPageWorkbookRoot: {
            createWorkbookParser: function (options) {
                captured.workbookOptions = options;
                return {
                    parseWorkbookFile: function () {
                        return [];
                    }
                };
            }
        },
        importsPageFileParserRoot: {
            createFileParser: function () {
                return { id: "file-parser" };
            }
        }
    };

    const foundation = foundationModule.createFoundationServices({
        controls: createControls(),
        roots: roots,
        config: createConfig(),
        endpoint: "/api/imports/source-data/batches",
        getSheetJs: function () { return {}; },
        openWindow: function () {}
    });

    assert.equal(foundation.apiClient.id, "api-client");
    assert.equal(foundation.importsPageMapping.id, "mapping");
    assert.equal(foundation.importsPageReports.id, "reports");
    assert.equal(foundation.importsPageFileParser.id, "file-parser");
    assert.equal(captured.workflowOptions.transitions.Validated[0], "Rejected");
    assert.equal(captured.reportsOptions.endpoint, "/api/imports/source-data/batches");
    assert.equal(typeof captured.workbookOptions.getSheetJs, "function");
});
