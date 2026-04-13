"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const validationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-services-wiring-validation.js"));

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

function createRoots() {
    return {
        importsPageHelpersRoot: {},
        importsPageApiRoot: {},
        importsPageStatusRoot: {},
        importsPageWorkflowRoot: {},
        importsPageWorkflowUiRoot: {},
        importsPageMappingRoot: {},
        importsPageTableModelsRoot: {},
        importsPageMappingUiRoot: {},
        importsPageBatchTablesRoot: {},
        importsPageXmlRoot: {},
        importsPageUploadRoot: {},
        importsPageReportsRoot: {},
        importsPageBatchesRoot: {},
        importsPageXmlInboxRoot: {},
        importsPageLotTablesRoot: {},
        importsPageLotOrchestrationRoot: {},
        importsPageInteractionsRoot: {},
        importsPageWorkbookRoot: {},
        importsPageFileParserRoot: {},
        importsPageLotStateRoot: {}
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

function createConfig() {
    return {
        fieldDefinitions: [{ key: "projectCode" }],
        importStatusTransitions: { Validated: ["Rejected"] },
        importStatusLabels: { Validated: "Проверен" },
        previewRowLimit: 200,
        maxImportRows: 10000
    };
}

test("imports services wiring validation: checks required roots and controls", () => {
    assert.throws(function () {
        validationModule.normalizeAndValidate({});
    }, /required roots/i);

    assert.throws(function () {
        validationModule.normalizeAndValidate({
            roots: createRoots()
        });
    }, /required controls/i);
});

test("imports services wiring validation: normalizes valid options", () => {
    const normalized = validationModule.normalizeAndValidate({
        controls: createControls(),
        roots: createRoots(),
        config: createConfig(),
        stateStore: createStateStore(),
        endpoint: "/api/imports/source-data/batches",
        xmlInboxEndpoint: "/api/imports/source-data/xml/inbox",
        lotRecommendationsEndpoint: "/api/lots/recommendations/import-batches",
        loadBatchHistory: async function () {},
        scheduleTimeout: function () { return 1; },
        getSheetJs: function () { return {}; },
        openWindow: function () {}
    });

    assert.equal(normalized.endpoint, "/api/imports/source-data/batches");
    assert.equal(typeof normalized.loadBatchHistory, "function");
    assert.ok(normalized.controls.previewTable);
    assert.ok(normalized.roots.importsPageApiRoot);
});
