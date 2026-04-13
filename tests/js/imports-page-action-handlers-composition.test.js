"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const compositionModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers-composition.js"));

function createControl() {
    return {
        disabled: false,
        hidden: false,
        value: "",
        options: []
    };
}

function createNormalizedOptions(overrides) {
    const calls = {
        setUploadStatus: [],
        setMappingStatus: [],
        setTransitionStatus: [],
        downloadValidationReport: [],
        downloadLotReconciliationReport: [],
        loadBatchHistory: 0
    };

    const options = {
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
        xmlContentInput: createControl(),
        parseSelectedFile: async function () {},
        applyMappingToRows: function () {},
        rebuildMappingFromRaw: function () {},
        resetWizard: function () {},
        uploadBatch: async function () {},
        loadBatches: async function () {},
        queueXmlInboxItem: async function () {
            return null;
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
        getRawRows: function () { return []; },
        getParsedRows: function () { return []; },
        getSelectedBatch: function () { return null; },
        setUploadStatus: function (message, isError) {
            calls.setUploadStatus.push({ message: message, isError: isError });
        },
        setMappingStatus: function (message, isError) {
            calls.setMappingStatus.push({ message: message, isError: isError });
        },
        setXmlStatus: function () {},
        setLotStatus: function () {},
        setTransitionStatus: function (message, isError) {
            calls.setTransitionStatus.push({ message: message, isError: isError });
        }
    };

    options.transitionTargetSelect.options = [];
    options.transitionTargetSelect.value = "Validated";
    options.transitionReasonInput.value = "reason";

    return {
        calls: calls,
        options: Object.assign(options, overrides || {})
    };
}

test("imports action handlers composition: parse error branch updates statuses", async () => {
    const setup = createNormalizedOptions({
        parseSelectedFile: async function () {
            throw new Error("broken parser");
        }
    });
    const handlers = compositionModule.createHandlers(setup.options);

    await handlers.onParseClick();

    assert.equal(setup.options.parseButton.disabled, false);
    assert.equal(setup.options.uploadButton.disabled, true);
    assert.equal(setup.options.previewWrap.hidden, true);
    assert.equal(setup.options.parseSummaryElement.hidden, true);
    assert.deepEqual(setup.calls.setUploadStatus, [{
        message: "Ошибка разбора: broken parser",
        isError: true
    }]);
    assert.deepEqual(setup.calls.setMappingStatus, [{
        message: "Сопоставление недоступно: broken parser",
        isError: true
    }]);
});

test("imports action handlers composition: history and reports are skipped without selected batch", async () => {
    const setup = createNormalizedOptions();
    const handlers = compositionModule.createHandlers(setup.options);

    await handlers.onHistoryRefreshClick();
    handlers.onDownloadInvalidReportClick();
    handlers.onDownloadFullReportClick();
    handlers.onDownloadLotReconciliationReportClick();

    assert.equal(setup.calls.loadBatchHistory, 0);
    assert.deepEqual(setup.calls.downloadValidationReport, []);
    assert.deepEqual(setup.calls.downloadLotReconciliationReport, []);
});

test("imports action handlers composition: history and reports use selected batch id", async () => {
    const setup = createNormalizedOptions({
        getSelectedBatch: function () {
            return { id: "batch-1" };
        }
    });
    const handlers = compositionModule.createHandlers(setup.options);

    await handlers.onHistoryRefreshClick();
    handlers.onDownloadInvalidReportClick();
    handlers.onDownloadFullReportClick();
    handlers.onDownloadLotReconciliationReportClick();

    assert.equal(setup.calls.loadBatchHistory, 1);
    assert.deepEqual(setup.calls.downloadValidationReport, [
        { batchId: "batch-1", includeValidRows: false },
        { batchId: "batch-1", includeValidRows: true }
    ]);
    assert.deepEqual(setup.calls.downloadLotReconciliationReport, ["batch-1"]);
    assert.deepEqual(setup.calls.setTransitionStatus, [{
        message: "История обновлена.",
        isError: false
    }]);
});
