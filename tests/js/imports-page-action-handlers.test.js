"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const actionHandlersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers.js"));

function createControl() {
    return {
        disabled: false,
        hidden: false,
        value: "",
        options: []
    };
}

function createBaseOptions(overrides) {
    const calls = {
        setUploadStatus: [],
        setMappingStatus: [],
        setXmlStatus: [],
        setLotStatus: [],
        setTransitionStatus: [],
        parseSelectedFile: 0,
        uploadBatch: 0,
        loadBatchHistory: 0,
        queueXmlInboxItem: [],
        downloadValidationReport: [],
        downloadLotReconciliationReport: []
    };

    const controls = {
        parseButton: createControl(),
        uploadButton: createControl(),
        refreshBatchesButton: createControl(),
        xmlQueueButton: createControl(),
        xmlRefreshButton: createControl(),
        lotBuildButton: createControl(),
        lotApplyButton: createControl(),
        transitionApplyButton: createControl(),
        historyRefreshButton: createControl(),
        previewWrap: createControl(),
        parseSummaryElement: createControl(),
        transitionTargetSelect: createControl(),
        transitionReasonInput: createControl(),
        xmlSourceInput: createControl(),
        xmlExternalIdInput: createControl(),
        xmlFileNameInput: createControl(),
        xmlContentInput: createControl()
    };

    controls.transitionTargetSelect.value = "Validated";
    controls.transitionTargetSelect.options = [];
    controls.transitionReasonInput.value = "reason";
    controls.xmlSourceInput.value = "source";
    controls.xmlExternalIdInput.value = "ext";
    controls.xmlFileNameInput.value = "file.xml";
    controls.xmlContentInput.value = "<xml />";

    const state = {
        rawRows: [],
        parsedRows: [],
        selectedBatch: null
    };

    const options = {
        parseButton: controls.parseButton,
        uploadButton: controls.uploadButton,
        refreshBatchesButton: controls.refreshBatchesButton,
        xmlQueueButton: controls.xmlQueueButton,
        xmlRefreshButton: controls.xmlRefreshButton,
        lotBuildButton: controls.lotBuildButton,
        lotApplyButton: controls.lotApplyButton,
        transitionApplyButton: controls.transitionApplyButton,
        historyRefreshButton: controls.historyRefreshButton,
        previewWrap: controls.previewWrap,
        parseSummaryElement: controls.parseSummaryElement,
        transitionTargetSelect: controls.transitionTargetSelect,
        transitionReasonInput: controls.transitionReasonInput,
        xmlSourceInput: controls.xmlSourceInput,
        xmlExternalIdInput: controls.xmlExternalIdInput,
        xmlFileNameInput: controls.xmlFileNameInput,
        xmlContentInput: controls.xmlContentInput,
        parseSelectedFile: async function () {
            calls.parseSelectedFile += 1;
        },
        applyMappingToRows: function () {},
        rebuildMappingFromRaw: function () {},
        resetWizard: function () {},
        uploadBatch: async function () {
            calls.uploadBatch += 1;
        },
        loadBatches: async function () {},
        queueXmlInboxItem: async function (request) {
            calls.queueXmlInboxItem.push(request);
            return { normalizedFileName: "normalized.xml" };
        },
        loadXmlInbox: async function () {},
        buildLotRecommendations: async function () {},
        applyLotRecommendations: async function () {},
        updateLotActionButtons: function () {},
        applyBatchTransition: async function () {},
        loadBatchHistory: async function () {
            calls.loadBatchHistory += 1;
        },
        downloadValidationReport: function (batchId, includeValidRows) {
            calls.downloadValidationReport.push({ batchId: batchId, includeValidRows: includeValidRows });
        },
        downloadLotReconciliationReport: function (batchId) {
            calls.downloadLotReconciliationReport.push(batchId);
        },
        bindTableInteractions: function () {},
        getRawRows: function () {
            return state.rawRows;
        },
        getParsedRows: function () {
            return state.parsedRows;
        },
        getSelectedBatch: function () {
            return state.selectedBatch;
        },
        setUploadStatus: function (message, isError) {
            calls.setUploadStatus.push({ message: message, isError: isError });
        },
        setMappingStatus: function (message, isError) {
            calls.setMappingStatus.push({ message: message, isError: isError });
        },
        setXmlStatus: function (message, isError) {
            calls.setXmlStatus.push({ message: message, isError: isError });
        },
        setLotStatus: function (message, isError) {
            calls.setLotStatus.push({ message: message, isError: isError });
        },
        setTransitionStatus: function (message, isError) {
            calls.setTransitionStatus.push({ message: message, isError: isError });
        }
    };

    return {
        controls: controls,
        state: state,
        calls: calls,
        options: Object.assign(options, overrides || {})
    };
}

test("imports action handlers: validates required controls/callbacks", () => {
    assert.throws(
        function () {
            actionHandlersModule.createActionHandlers({});
        },
        /required controls are missing/);
});

test("imports action handlers: parse click handles parser error and restores button state", async () => {
    const setup = createBaseOptions({
        parseSelectedFile: async function () {
            throw new Error("broken parser");
        }
    });

    const handlers = actionHandlersModule.createActionHandlers(setup.options);
    await handlers.onParseClick();

    assert.equal(setup.controls.parseButton.disabled, false);
    assert.equal(setup.controls.uploadButton.disabled, true);
    assert.equal(setup.controls.previewWrap.hidden, true);
    assert.equal(setup.controls.parseSummaryElement.hidden, true);
    assert.deepEqual(setup.calls.setUploadStatus, [{
        message: "Ошибка разбора: broken parser",
        isError: true
    }]);
    assert.deepEqual(setup.calls.setMappingStatus, [{
        message: "Сопоставление недоступно: broken parser",
        isError: true
    }]);
});

test("imports action handlers: upload click re-enables button when parsed rows exist", async () => {
    const setup = createBaseOptions();
    setup.state.parsedRows = [{ rowNumber: 1 }];
    const handlers = actionHandlersModule.createActionHandlers(setup.options);

    await handlers.onUploadClick();

    assert.equal(setup.calls.uploadBatch, 1);
    assert.equal(setup.controls.uploadButton.disabled, false);
});

test("imports action handlers: xml queue updates normalized filename", async () => {
    const setup = createBaseOptions();
    const handlers = actionHandlersModule.createActionHandlers(setup.options);

    await handlers.onXmlQueueClick();

    assert.equal(setup.controls.xmlFileNameInput.value, "normalized.xml");
    assert.equal(setup.calls.queueXmlInboxItem.length, 1);
});

test("imports action handlers: history/report handlers ignore empty selection", async () => {
    const setup = createBaseOptions();
    setup.state.selectedBatch = null;
    const handlers = actionHandlersModule.createActionHandlers(setup.options);

    await handlers.onHistoryRefreshClick();
    handlers.onDownloadInvalidReportClick();
    handlers.onDownloadFullReportClick();
    handlers.onDownloadLotReconciliationReportClick();

    assert.equal(setup.calls.loadBatchHistory, 0);
    assert.deepEqual(setup.calls.downloadValidationReport, []);
    assert.deepEqual(setup.calls.downloadLotReconciliationReport, []);
});
