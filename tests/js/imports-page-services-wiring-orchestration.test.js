"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const orchestrationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring-orchestration.js"));

function createControls() {
    return {
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
        lotSelectedTable: {},
        batchesTable: {}
    };
}

function createStateStore() {
    return {
        getSelectedBatch: function () { return null; },
        setSelectedBatch: function () {},
        getSelectedBatchId: function () { return "batch-1"; },
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

test("imports services orchestration: validates required options", () => {
    assert.throws(function () {
        orchestrationModule.createOrchestrationServices({});
    }, /required options/i);
});

test("imports services orchestration: composes dependent services and callback routing", async () => {
    const captured = {
        workflowEnabled: [],
        transitionTargets: [],
        batchesStatus: [],
        xmlStatus: [],
        invalidRowsDetails: [],
        batchesOptions: null,
        interactionsOptions: null
    };

    const roots = {
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
                    retryXmlInboxItem: async function () {}
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
                return {
                    bindAll: function () {}
                };
            }
        },
        importsPageLotStateRoot: {}
    };

    const foundation = {
        apiClient: {},
        localizeImportStatus: function (value) { return value; },
        setBatchesStatus: function (message, isError) { captured.batchesStatus.push({ message: message, isError: isError }); },
        setTransitionStatus: function () {},
        setXmlStatus: function (message, isError) { captured.xmlStatus.push({ message: message, isError: isError }); },
        setLotStatus: function () {},
        importsPageWorkflow: {
            buildBatchDetailsSummary: function (details) {
                return `summary:${details.fileName}`;
            }
        },
        importsPageBatchTables: {
            renderBatchesTable: function () {},
            renderInvalidRows: function (details) {
                captured.invalidRowsDetails.push(details.fileName);
            }
        },
        importsPageTableModels: {},
        importsPageXml: {},
        importsPageHelpers: {
            formatNumber: function () { return "0"; },
            formatDateRange: function () { return "date"; }
        }
    };

    const controls = createControls();
    const orchestration = orchestrationModule.createOrchestrationServices({
        controls: controls,
        roots: roots,
        stateStore: createStateStore(),
        endpoint: "/api/imports/source-data/batches",
        xmlInboxEndpoint: "/api/imports/source-data/xml/inbox",
        lotRecommendationsEndpoint: "/api/lots/recommendations/import-batches",
        loadBatchHistory: async function () {},
        scheduleTimeout: function () { return 1; },
        foundation: foundation
    });

    assert.ok(orchestration.importsPageBatches);
    assert.ok(orchestration.importsPageXmlInbox);
    assert.ok(orchestration.importsPageLot);
    assert.ok(orchestration.importsPageInteractions);

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
    assert.equal(captured.batchesStatus.at(-1).message, "Не удалось загрузить детали пакета: boom");
    assert.equal(captured.workflowEnabled.at(-1), false);

    captured.interactionsOptions.onRetryXmlError(new Error("retry"));
    assert.equal(captured.xmlStatus.at(-1).message, "Ошибка повторной обработки: retry");
    assert.equal(captured.xmlStatus.at(-1).isError, true);
});
