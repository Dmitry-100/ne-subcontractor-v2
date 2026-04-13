"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const servicesWiringModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring.js"));

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
        historyWrapElement: {},
        detailsElement: { hidden: true },
        detailsTitleElement: { textContent: "" },
        detailsSummaryElement: { textContent: "" },
        transitionTargetSelect: {},
        transitionReasonInput: {},
        transitionApplyButton: {},
        historyRefreshButton: {},
        downloadInvalidReportButton: {},
        downloadFullReportButton: {},
        downloadLotReconciliationReportButton: {},
        lotBuildButton: { disabled: false },
        lotApplyButton: { disabled: false },
        xmlTable: {},
        lotGroupsTable: {},
        lotSelectedTable: {}
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

function createStateStore() {
    return {
        getSelectedBatch: function () { return null; },
        setSelectedBatch: function () {},
        getSelectedBatchId: function () { return null; },
        getLotRecommendations: function () { return null; },
        setLotRecommendations: function () {},
        getLotRecommendationsBatchId: function () { return null; },
        setLotRecommendationsBatchId: function () {},
        getLotSelectionsByKey: function () { return new Map(); },
        setLotSelectionsByKey: function () {},
        clearDetailsPoll: function () {},
        setDetailsPollHandle: function () {}
    };
}

function createRoots(captured) {
    const statusCalls = captured.statusCalls;

    return {
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
                return {
                    getBatchHistory: async function () {
                        return [];
                    }
                };
            }
        },
        importsPageStatusRoot: {
            createStatusService: function () {
                return {
                    setUploadStatus: function (message, isError) { statusCalls.upload.push({ message: message, isError: isError }); },
                    setBatchesStatus: function (message, isError) { statusCalls.batches.push({ message: message, isError: isError }); },
                    setMappingStatus: function (message, isError) { statusCalls.mapping.push({ message: message, isError: isError }); },
                    setTransitionStatus: function (message, isError) { statusCalls.transition.push({ message: message, isError: isError }); },
                    setXmlStatus: function (message, isError) { statusCalls.xml.push({ message: message, isError: isError }); },
                    setLotStatus: function (message, isError) { statusCalls.lot.push({ message: message, isError: isError }); }
                };
            }
        },
        importsPageWorkflowRoot: {
            createWorkflow: function () {
                return {
                    buildBatchDetailsSummary: function (details) {
                        return `summary:${details.fileName}`;
                    }
                };
            }
        },
        importsPageWorkflowUiRoot: {
            createWorkflowUiService: function () {
                return {
                    setWorkflowActionsEnabled: function (value) {
                        captured.workflowEnabled.push(value);
                    },
                    renderTransitionTargets: function (status) {
                        captured.transitionTargets.push(status);
                    }
                };
            }
        },
        importsPageMappingRoot: {
            createMappingService: function () {
                return { id: "mapping-service" };
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
                return {
                    renderBatchesTable: function () {},
                    renderInvalidRows: function (details) {
                        captured.invalidRowsDetails.push(details.fileName);
                    },
                    renderHistoryTable: function () {}
                };
            }
        },
        importsPageXmlRoot: {
            createXmlHelpers: function () {
                return { id: "xml-helpers" };
            }
        },
        importsPageUploadRoot: {
            createUploadHelpers: function () {
                return { id: "upload-helpers" };
            }
        },
        importsPageReportsRoot: {
            createReportsHelpers: function () {
                return {
                    downloadValidationReport: function () {},
                    downloadLotReconciliationReport: function () {}
                };
            }
        },
        importsPageBatchesRoot: {
            createBatchesService: function (options) {
                captured.batchesOptions = options;
                return {
                    loadBatchDetails: async function () {},
                    loadBatches: async function () {},
                    applyBatchTransition: async function () {}
                };
            }
        },
        importsPageXmlInboxRoot: {
            createXmlInboxService: function () {
                return {
                    retryXmlInboxItem: async function () {},
                    loadXmlInbox: async function () {}
                };
            }
        },
        importsPageLotTablesRoot: {
            createLotTablesService: function () {
                return {
                    renderLotGroupsTable: function () {},
                    renderLotSelectedTable: function () {}
                };
            }
        },
        importsPageLotOrchestrationRoot: {
            createLotOrchestrationService: function () {
                return {
                    updateActionButtons: function () {},
                    clearRecommendations: function () {},
                    onDetailsLoaded: function () {},
                    setGroupSelected: function () {},
                    setGroupLotCode: function () {},
                    setGroupLotName: function () {},
                    getRecommendations: function () { return []; },
                    getRecommendationsBatchId: function () { return null; }
                };
            }
        },
        importsPageInteractionsRoot: {
            createInteractionsService: function (options) {
                captured.interactionsOptions = options;
                return { bindAll: function () {} };
            }
        },
        importsPageWorkbookRoot: {
            createWorkbookParser: function () {
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
        },
        importsPageLotStateRoot: {}
    };
}

test("imports services wiring: validates required roots", () => {
    assert.throws(
        function () {
            servicesWiringModule.createServicesWiring({});
        },
        /required roots/);
});

test("imports services wiring: composes services and keeps detail/error callbacks", async () => {
    const captured = {
        statusCalls: {
            upload: [],
            batches: [],
            mapping: [],
            transition: [],
            xml: [],
            lot: []
        },
        workflowEnabled: [],
        transitionTargets: [],
        invalidRowsDetails: [],
        batchesOptions: null,
        interactionsOptions: null
    };

    const controls = createControls();
    const loadBatchHistory = async function () {};
    const services = servicesWiringModule.createServicesWiring({
        controls: controls,
        roots: createRoots(captured),
        config: createConfig(),
        stateStore: createStateStore(),
        endpoint: "/api/imports/source-data/batches",
        xmlInboxEndpoint: "/api/imports/source-data/xml/inbox",
        lotRecommendationsEndpoint: "/api/lots/recommendations/import-batches",
        loadBatchHistory: loadBatchHistory,
        scheduleTimeout: function () { return 1; },
        getSheetJs: function () { return {}; },
        openWindow: function () {}
    });

    assert.ok(services.apiClient);
    assert.ok(services.importsPageBatches);
    assert.ok(services.importsPageXmlInbox);
    assert.ok(services.importsPageLot);
    assert.ok(services.importsPageInteractions);
    assert.ok(services.importsPageFileParser);
    assert.equal(captured.batchesOptions.onLoadBatchHistory, loadBatchHistory);

    captured.batchesOptions.onDetailsLoaded({
        fileName: "batch.csv",
        status: "Validated"
    });

    assert.equal(controls.detailsElement.hidden, false);
    assert.equal(controls.detailsTitleElement.textContent, "Пакет: batch.csv");
    assert.equal(controls.detailsSummaryElement.textContent, "summary:batch.csv");
    assert.deepEqual(captured.invalidRowsDetails, ["batch.csv"]);
    assert.deepEqual(captured.transitionTargets, ["Validated"]);
    assert.deepEqual(captured.workflowEnabled, [true]);

    captured.batchesOptions.onDetailsError(new Error("boom"));
    assert.equal(captured.statusCalls.batches.at(-1).message, "Не удалось загрузить детали пакета: boom");
    assert.equal(captured.statusCalls.batches.at(-1).isError, true);
    assert.equal(captured.workflowEnabled.at(-1), false);

    captured.interactionsOptions.onRetryXmlError(new Error("retry"));
    assert.equal(captured.statusCalls.xml.at(-1).message, "Ошибка повторной обработки: retry");
    assert.equal(captured.statusCalls.xml.at(-1).isError, true);
});
