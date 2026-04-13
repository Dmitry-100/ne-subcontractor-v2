"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const compositionModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring-composition.js"));

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

test("imports session wiring composition: builds mapping/wizard/actions graph", async () => {
    const captured = {
        actionOptions: null,
        bindCalls: 0,
        batchesCalls: [],
        transitions: [],
        queueRequests: [],
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

    const session = compositionModule.createComposition({
        mappingOrchestrationRoot: {
            createMappingOrchestrationService: function () {
                return mappingService;
            }
        },
        wizardSessionRoot: {
            createWizardSessionService: function () {
                return wizardService;
            }
        },
        actionHandlersRoot: {
            createActionHandlers: function () {}
        },
        actionBindingsRoot: {
            createActionBindingsService: function (options) {
                captured.actionOptions = options;
                return {
                    bindAll: function () {
                        captured.bindCalls += 1;
                    }
                };
            }
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
                captured.batchesCalls.push(batchId || null);
            },
            applyBatchTransition: async function (targetStatus, reason) {
                captured.transitions.push({ targetStatus: targetStatus, reason: reason });
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
                captured.queueRequests.push(request);
                return { queued: true };
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

    session.bindActions();
    assert.equal(captured.bindCalls, 1);

    await captured.actionOptions.loadBatches();
    await captured.actionOptions.applyBatchTransition("Rejected", "reason");
    await captured.actionOptions.queueXmlInboxItem({ id: "xml-1" });
    await captured.actionOptions.loadBatchHistory("batch-7");

    assert.deepEqual(captured.batchesCalls, [null]);
    assert.deepEqual(captured.transitions, [{ targetStatus: "Rejected", reason: "reason" }]);
    assert.deepEqual(captured.queueRequests, [{ id: "xml-1" }]);
    assert.deepEqual(captured.historyCalls, ["batch-7"]);
    assert.equal(captured.actionOptions.parseSelectedFile, mappingService.parseSelectedFile);
    assert.equal(captured.actionOptions.uploadBatch, wizardService.uploadBatch);
});
