"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const actionBindingsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-action-bindings.js"));

function createControl() {
    const listeners = new Map();
    return {
        disabled: false,
        hidden: false,
        value: "",
        options: [],
        addEventListener: function (type, handler) {
            listeners.set(type, handler);
        },
        emit: async function (type, event) {
            const handler = listeners.get(type);
            if (typeof handler !== "function") {
                throw new Error(`No handler for event "${type}".`);
            }

            return await handler(event || {});
        }
    };
}

function createBaseOptions(overrides) {
    const controls = {
        parseButton: createControl(),
        applyMappingButton: createControl(),
        hasHeaderCheckbox: createControl(),
        resetButton: createControl(),
        uploadButton: createControl(),
        refreshBatchesButton: createControl(),
        xmlQueueButton: createControl(),
        xmlRefreshButton: createControl(),
        lotBuildButton: createControl(),
        lotApplyButton: createControl(),
        transitionApplyButton: createControl(),
        historyRefreshButton: createControl(),
        downloadInvalidReportButton: createControl(),
        downloadFullReportButton: createControl(),
        downloadLotReconciliationReportButton: createControl(),
        previewWrap: createControl(),
        parseSummaryElement: createControl(),
        transitionTargetSelect: createControl(),
        transitionReasonInput: createControl(),
        xmlSourceInput: createControl(),
        xmlExternalIdInput: createControl(),
        xmlFileNameInput: createControl(),
        xmlContentInput: createControl()
    };

    controls.transitionTargetSelect.options = [];

    const calls = {
        parseClick: 0,
        applyClick: 0,
        headerChange: 0,
        resetClick: 0,
        uploadClick: 0,
        refreshClick: 0,
        xmlQueueClick: 0,
        xmlRefreshClick: 0,
        lotBuildClick: 0,
        lotApplyClick: 0,
        transitionClick: 0,
        historyClick: 0,
        downloadInvalidClick: 0,
        downloadFullClick: 0,
        downloadLotClick: 0,
        bindTableInteractions: 0
    };

    const options = {
        parseButton: controls.parseButton,
        applyMappingButton: controls.applyMappingButton,
        hasHeaderCheckbox: controls.hasHeaderCheckbox,
        resetButton: controls.resetButton,
        uploadButton: controls.uploadButton,
        refreshBatchesButton: controls.refreshBatchesButton,
        xmlQueueButton: controls.xmlQueueButton,
        xmlRefreshButton: controls.xmlRefreshButton,
        lotBuildButton: controls.lotBuildButton,
        lotApplyButton: controls.lotApplyButton,
        transitionApplyButton: controls.transitionApplyButton,
        historyRefreshButton: controls.historyRefreshButton,
        downloadInvalidReportButton: controls.downloadInvalidReportButton,
        downloadFullReportButton: controls.downloadFullReportButton,
        downloadLotReconciliationReportButton: controls.downloadLotReconciliationReportButton,
        previewWrap: controls.previewWrap,
        parseSummaryElement: controls.parseSummaryElement,
        transitionTargetSelect: controls.transitionTargetSelect,
        transitionReasonInput: controls.transitionReasonInput,
        xmlSourceInput: controls.xmlSourceInput,
        xmlExternalIdInput: controls.xmlExternalIdInput,
        xmlFileNameInput: controls.xmlFileNameInput,
        xmlContentInput: controls.xmlContentInput,
        actionHandlersRoot: {
            createActionHandlers: function () {
                return {
                    onParseClick: async function () { calls.parseClick += 1; },
                    onApplyMappingClick: function () { calls.applyClick += 1; },
                    onHasHeaderChange: function () { calls.headerChange += 1; },
                    onResetClick: function () { calls.resetClick += 1; },
                    onUploadClick: async function () { calls.uploadClick += 1; },
                    onRefreshBatchesClick: async function () { calls.refreshClick += 1; },
                    onXmlQueueClick: async function () { calls.xmlQueueClick += 1; },
                    onXmlRefreshClick: async function () { calls.xmlRefreshClick += 1; },
                    onLotBuildClick: async function () { calls.lotBuildClick += 1; },
                    onLotApplyClick: async function () { calls.lotApplyClick += 1; },
                    onTransitionApplyClick: async function () { calls.transitionClick += 1; },
                    onHistoryRefreshClick: async function () { calls.historyClick += 1; },
                    onDownloadInvalidReportClick: function () { calls.downloadInvalidClick += 1; },
                    onDownloadFullReportClick: function () { calls.downloadFullClick += 1; },
                    onDownloadLotReconciliationReportClick: function () { calls.downloadLotClick += 1; },
                    bindTableInteractions: function () { calls.bindTableInteractions += 1; }
                };
            }
        },
        parseSelectedFile: async function () {},
        applyMappingToRows: function () {},
        rebuildMappingFromRaw: function () {},
        resetWizard: function () {},
        uploadBatch: async function () {},
        loadBatches: async function () {},
        queueXmlInboxItem: async function () { return { normalizedFileName: "x.xml" }; },
        loadXmlInbox: async function () {},
        buildLotRecommendations: async function () {},
        applyLotRecommendations: async function () {},
        updateLotActionButtons: function () {},
        applyBatchTransition: async function () {},
        loadBatchHistory: async function () {},
        downloadValidationReport: function () {},
        downloadLotReconciliationReport: function () {},
        bindTableInteractions: function () {},
        getRawRows: function () { return []; },
        getParsedRows: function () { return []; },
        getSelectedBatch: function () { return null; },
        setUploadStatus: function () {},
        setMappingStatus: function () {},
        setXmlStatus: function () {},
        setLotStatus: function () {},
        setTransitionStatus: function () {}
    };

    return {
        controls: controls,
        calls: calls,
        options: Object.assign(options, overrides || {})
    };
}

test("imports action bindings: createActionBindingsService validates dependencies", () => {
    assert.throws(
        function () {
            actionBindingsModule.createActionBindingsService({});
        },
        /required controls are missing/);
});

test("imports action bindings: validates action handlers root contract", () => {
    const setup = createBaseOptions({
        actionHandlersRoot: {}
    });

    assert.throws(
        function () {
            actionBindingsModule.createActionBindingsService(setup.options);
        },
        /actionHandlersRoot\.createActionHandlers is required/);
});

test("imports action bindings: bindAll wires handler callbacks to controls", async () => {
    const setup = createBaseOptions();
    const service = actionBindingsModule.createActionBindingsService(setup.options);

    service.bindAll();

    await setup.controls.parseButton.emit("click");
    await setup.controls.applyMappingButton.emit("click");
    await setup.controls.hasHeaderCheckbox.emit("change");
    await setup.controls.resetButton.emit("click");
    await setup.controls.uploadButton.emit("click");
    await setup.controls.refreshBatchesButton.emit("click");
    await setup.controls.xmlQueueButton.emit("click");
    await setup.controls.xmlRefreshButton.emit("click");
    await setup.controls.lotBuildButton.emit("click");
    await setup.controls.lotApplyButton.emit("click");
    await setup.controls.transitionApplyButton.emit("click");
    await setup.controls.historyRefreshButton.emit("click");
    await setup.controls.downloadInvalidReportButton.emit("click");
    await setup.controls.downloadFullReportButton.emit("click");
    await setup.controls.downloadLotReconciliationReportButton.emit("click");

    assert.equal(setup.calls.parseClick, 1);
    assert.equal(setup.calls.applyClick, 1);
    assert.equal(setup.calls.headerChange, 1);
    assert.equal(setup.calls.resetClick, 1);
    assert.equal(setup.calls.uploadClick, 1);
    assert.equal(setup.calls.refreshClick, 1);
    assert.equal(setup.calls.xmlQueueClick, 1);
    assert.equal(setup.calls.xmlRefreshClick, 1);
    assert.equal(setup.calls.lotBuildClick, 1);
    assert.equal(setup.calls.lotApplyClick, 1);
    assert.equal(setup.calls.transitionClick, 1);
    assert.equal(setup.calls.historyClick, 1);
    assert.equal(setup.calls.downloadInvalidClick, 1);
    assert.equal(setup.calls.downloadFullClick, 1);
    assert.equal(setup.calls.downloadLotClick, 1);
    assert.equal(setup.calls.bindTableInteractions, 1);
});
