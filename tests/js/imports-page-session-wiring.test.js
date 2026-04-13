"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const sessionWiringModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring.js"));

function createControls() {
    return {
        fileInput: {},
        notesInput: {},
        parseButton: {},
        applyMappingButton: {},
        resetButton: {},
        uploadButton: {},
        hasHeaderCheckbox: {},
        mappingGrid: {},
        mappingSection: {},
        parseSummaryElement: {},
        previewWrap: {},
        detailsElement: {},
        historyWrapElement: {},
        invalidWrapElement: {},
        refreshBatchesButton: {},
        xmlQueueButton: {},
        xmlRefreshButton: {},
        lotBuildButton: {},
        lotApplyButton: {},
        transitionApplyButton: {},
        historyRefreshButton: {},
        downloadInvalidReportButton: {},
        downloadFullReportButton: {},
        downloadLotReconciliationReportButton: {},
        transitionTargetSelect: {},
        transitionReasonInput: {},
        xmlSourceInput: {},
        xmlExternalIdInput: {},
        xmlFileNameInput: {},
        xmlContentInput: {}
    };
}

function createStateStore() {
    return {
        getRawRows: function () { return []; },
        setRawRows: function () {},
        setSourceFileName: function () {},
        getDataStartRowIndex: function () { return 1; },
        setDataStartRowIndex: function () {},
        getMappingSelection: function () { return {}; },
        setMappingSelection: function () {},
        setSourceColumns: function () {},
        setParsedRows: function () {},
        getParsedRows: function () { return []; },
        getSourceFileName: function () { return ""; },
        setSelectedBatch: function () {},
        clearDetailsPoll: function () {},
        getSelectedBatch: function () { return null; }
    };
}

test("imports session wiring: validates required roots", () => {
    assert.throws(
        function () {
            sessionWiringModule.createSessionWiring({});
        },
        /mappingOrchestrationRoot/);
});

test("imports session wiring: requires actionHandlersRoot factory", () => {
    assert.throws(
        function () {
            sessionWiringModule.createSessionWiring({
                mappingOrchestrationRoot: { createMappingOrchestrationService: function () {} },
                wizardSessionRoot: { createWizardSessionService: function () {} },
                actionBindingsRoot: { createActionBindingsService: function () {} },
                actionHandlersRoot: {},
                controls: createControls(),
                stateStore: createStateStore(),
                mappingUi: {},
                mappingService: {},
                fileParser: {},
                uploadHelpers: {
                    buildQueuedBatchRequest: function () {},
                    buildQueuedBatchSuccessStatus: function () {}
                },
                apiClient: { createQueuedBatch: async function () {} },
                batchesService: { loadBatches: async function () {}, applyBatchTransition: async function () {} },
                lotService: {
                    clearRecommendations: function () {},
                    buildRecommendations: async function () {},
                    applyRecommendations: async function () {},
                    updateActionButtons: function () {}
                },
                xmlInboxService: {
                    queueXmlInboxItem: async function () { return {}; },
                    loadXmlInbox: async function () {}
                },
                reportsHelpers: {
                    downloadValidationReport: function () {},
                    downloadLotReconciliationReport: function () {}
                },
                interactionsService: { bindAll: function () {} },
                queuedEndpoint: "/api/imports/source-data/batches/queued",
                loadBatchHistory: async function () {},
                setMappingStatus: function () {},
                setUploadStatus: function () {},
                setWorkflowActionsEnabled: function () {},
                setTransitionStatus: function () {},
                setXmlStatus: function () {},
                setLotStatus: function () {}
            });
        },
        /actionHandlersRoot\.createActionHandlers/);
});

test("imports session wiring: creates mapping/wizard/action wiring and binds actions", async () => {
    const captured = {
        mappingOptions: null,
        wizardOptions: null,
        actionOptions: null,
        bindActionsCalls: 0,
        loadBatchesCalls: [],
        transitionCalls: [],
        queueCalls: [],
        historyCalls: []
    };

    const mappingService = {
        applyMappingToRows: function () {},
        rebuildMappingFromRaw: function () {},
        parseSelectedFile: async function () {}
    };
    const wizardService = {
        uploadBatch: async function () {},
        resetWizard: function () {}
    };
    const actionService = {
        bindAll: function () {
            captured.bindActionsCalls += 1;
        }
    };

    const wiring = sessionWiringModule.createSessionWiring({
        mappingOrchestrationRoot: {
            createMappingOrchestrationService: function (options) {
                captured.mappingOptions = options;
                return mappingService;
            }
        },
        wizardSessionRoot: {
            createWizardSessionService: function (options) {
                captured.wizardOptions = options;
                return wizardService;
            }
        },
        actionBindingsRoot: {
            createActionBindingsService: function (options) {
                captured.actionOptions = options;
                return actionService;
            }
        },
        actionHandlersRoot: {
            createActionHandlers: function () {}
        },
        controls: createControls(),
        stateStore: createStateStore(),
        mappingUi: {},
        mappingService: {},
        fileParser: {},
        uploadHelpers: {
            buildQueuedBatchRequest: function () {},
            buildQueuedBatchSuccessStatus: function () {}
        },
        apiClient: {
            createQueuedBatch: async function () {}
        },
        batchesService: {
            loadBatches: async function (batchId) {
                captured.loadBatchesCalls.push(batchId || null);
            },
            applyBatchTransition: async function (targetStatus, reason) {
                captured.transitionCalls.push({ targetStatus: targetStatus, reason: reason });
            }
        },
        lotService: {
            clearRecommendations: function () {},
            buildRecommendations: async function () {},
            applyRecommendations: async function () {},
            updateActionButtons: function () {}
        },
        xmlInboxService: {
            queueXmlInboxItem: async function (request) {
                captured.queueCalls.push(request);
                return { id: "ok" };
            },
            loadXmlInbox: async function () {}
        },
        reportsHelpers: {
            downloadValidationReport: function () {},
            downloadLotReconciliationReport: function () {}
        },
        interactionsService: {
            bindAll: function () {}
        },
        queuedEndpoint: "/api/imports/source-data/batches/queued",
        loadBatchHistory: async function (batchId) {
            captured.historyCalls.push(batchId);
        },
        setMappingStatus: function () {},
        setUploadStatus: function () {},
        setWorkflowActionsEnabled: function () {},
        setTransitionStatus: function () {},
        setXmlStatus: function () {},
        setLotStatus: function () {}
    });

    assert.equal(typeof wiring.applyMappingToRows, "function");
    assert.equal(typeof wiring.rebuildMappingFromRaw, "function");
    assert.equal(typeof wiring.parseSelectedFile, "function");
    assert.equal(typeof wiring.uploadBatch, "function");
    assert.equal(typeof wiring.resetWizard, "function");
    assert.equal(typeof wiring.bindActions, "function");

    wiring.bindActions();
    assert.equal(captured.bindActionsCalls, 1);

    await captured.actionOptions.loadBatches();
    await captured.actionOptions.applyBatchTransition("Rejected", "reason");
    await captured.actionOptions.queueXmlInboxItem({ id: "xml-1" });
    await captured.actionOptions.loadBatchHistory("batch-7");

    assert.deepEqual(captured.loadBatchesCalls, [null]);
    assert.deepEqual(captured.transitionCalls, [{ targetStatus: "Rejected", reason: "reason" }]);
    assert.deepEqual(captured.queueCalls, [{ id: "xml-1" }]);
    assert.deepEqual(captured.historyCalls, ["batch-7"]);
    assert.equal(captured.actionOptions.parseSelectedFile, mappingService.parseSelectedFile);
    assert.equal(captured.actionOptions.uploadBatch, wizardService.uploadBatch);
});
