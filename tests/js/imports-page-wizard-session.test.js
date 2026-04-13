"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const wizardSessionModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-wizard-session.js"));

function createBaseOptions(overrides) {
    const state = {
        parsedRows: [{ rowNumber: 1 }],
        sourceFileName: "source.csv",
        rawRows: [["a"]],
        sourceColumns: ["col"],
        dataStartRowIndex: 2,
        mappingSelection: { projectCode: 0 },
        selectedBatch: { id: "batch-1" },
        detailsPollCleared: 0
    };

    const calls = {
        setMappingStatus: [],
        setWorkflowActionsEnabled: [],
        setTransitionStatus: [],
        clearLotRecommendations: [],
        setUploadStatus: [],
        createQueuedBatch: [],
        loadBatches: [],
        buildQueuedBatchRequest: []
    };

    const options = {
        fileInput: { value: "file-token" },
        notesInput: { value: "note" },
        hasHeaderCheckbox: { checked: false },
        transitionReasonInput: { value: "reason" },
        mappingGrid: { innerHTML: "x", textContent: "" },
        mappingSection: { hidden: false },
        uploadButton: { disabled: false },
        previewWrap: { hidden: false },
        parseSummaryElement: { hidden: false, textContent: "summary" },
        detailsElement: { hidden: false },
        historyWrapElement: { hidden: false },
        invalidWrapElement: { hidden: false },
        getParsedRows: function () {
            return state.parsedRows;
        },
        setParsedRows: function (value) {
            state.parsedRows = value;
        },
        getSourceFileName: function () {
            return state.sourceFileName;
        },
        setSourceFileName: function (value) {
            state.sourceFileName = value;
        },
        setRawRows: function (value) {
            state.rawRows = value;
        },
        setSourceColumns: function (value) {
            state.sourceColumns = value;
        },
        setDataStartRowIndex: function (value) {
            state.dataStartRowIndex = value;
        },
        setMappingSelection: function (value) {
            state.mappingSelection = value;
        },
        setSelectedBatch: function (value) {
            state.selectedBatch = value;
        },
        clearDetailsPoll: function () {
            state.detailsPollCleared += 1;
        },
        buildQueuedBatchRequest: function (payload) {
            calls.buildQueuedBatchRequest.push(payload);
            return { payload: payload };
        },
        createQueuedBatch: async function (endpoint, payload) {
            calls.createQueuedBatch.push({ endpoint: endpoint, payload: payload });
            return { id: "created-batch" };
        },
        buildQueuedBatchSuccessStatus: function (created) {
            return `created:${created.id}`;
        },
        loadBatches: async function (batchId) {
            calls.loadBatches.push(batchId);
        },
        queuedEndpoint: "/api/imports/source-data/batches/queued",
        setMappingStatus: function (message, isError) {
            calls.setMappingStatus.push({ message: message, isError: isError });
        },
        setWorkflowActionsEnabled: function (enabled) {
            calls.setWorkflowActionsEnabled.push(enabled);
        },
        setTransitionStatus: function (message, isError) {
            calls.setTransitionStatus.push({ message: message, isError: isError });
        },
        clearLotRecommendations: function (message) {
            calls.clearLotRecommendations.push(message);
        },
        setUploadStatus: function (message, isError) {
            calls.setUploadStatus.push({ message: message, isError: isError });
        }
    };

    return {
        state: state,
        calls: calls,
        options: Object.assign(options, overrides || {})
    };
}

test("imports wizard session: createWizardSessionService validates dependencies", () => {
    assert.throws(
        function () {
            wizardSessionModule.createWizardSessionService({});
        },
        /required controls are missing/);
});

test("imports wizard session: uploadBatch builds payload, updates status and reloads batches", async () => {
    const setup = createBaseOptions();
    const service = wizardSessionModule.createWizardSessionService(setup.options);

    const created = await service.uploadBatch();

    assert.equal(created.id, "created-batch");
    assert.equal(setup.calls.buildQueuedBatchRequest.length, 1);
    assert.equal(setup.calls.buildQueuedBatchRequest[0].notes, "note");
    assert.equal(setup.calls.buildQueuedBatchRequest[0].sourceFileName, "source.csv");
    assert.equal(setup.calls.createQueuedBatch.length, 1);
    assert.equal(setup.calls.createQueuedBatch[0].endpoint, "/api/imports/source-data/batches/queued");
    assert.deepEqual(setup.calls.loadBatches, ["created-batch"]);
    assert.deepEqual(setup.calls.setUploadStatus, [{ message: "created:created-batch", isError: false }]);
});

test("imports wizard session: resetWizard resets state, controls and status messages", () => {
    const setup = createBaseOptions();
    const service = wizardSessionModule.createWizardSessionService(setup.options);

    service.resetWizard();

    assert.deepEqual(setup.state.parsedRows, []);
    assert.equal(setup.state.sourceFileName, "");
    assert.deepEqual(setup.state.rawRows, []);
    assert.deepEqual(setup.state.sourceColumns, []);
    assert.equal(setup.state.dataStartRowIndex, 1);
    assert.deepEqual(setup.state.mappingSelection, {});
    assert.equal(setup.state.selectedBatch, null);
    assert.equal(setup.state.detailsPollCleared, 1);

    assert.equal(setup.options.fileInput.value, "");
    assert.equal(setup.options.notesInput.value, "");
    assert.equal(setup.options.hasHeaderCheckbox.checked, true);
    assert.equal(setup.options.transitionReasonInput.value, "");
    assert.equal(setup.options.mappingGrid.innerHTML, "");
    assert.equal(setup.options.mappingSection.hidden, true);
    assert.equal(setup.options.uploadButton.disabled, true);
    assert.equal(setup.options.previewWrap.hidden, true);
    assert.equal(setup.options.parseSummaryElement.hidden, true);
    assert.equal(setup.options.parseSummaryElement.textContent, "");
    assert.equal(setup.options.detailsElement.hidden, true);
    assert.equal(setup.options.historyWrapElement.hidden, true);
    assert.equal(setup.options.invalidWrapElement.hidden, true);

    assert.deepEqual(setup.calls.setMappingStatus, [{ message: "", isError: false }]);
    assert.deepEqual(setup.calls.setWorkflowActionsEnabled, [false]);
    assert.deepEqual(setup.calls.setTransitionStatus, [{
        message: "Выберите пакет для выполнения действия процесса.",
        isError: false
    }]);
    assert.deepEqual(setup.calls.clearLotRecommendations, [
        "Выберите пакет для построения рекомендаций."
    ]);
    assert.deepEqual(setup.calls.setUploadStatus, [{
        message: "Выберите исходный файл и нажмите «Разобрать файл».",
        isError: false
    }]);
});
