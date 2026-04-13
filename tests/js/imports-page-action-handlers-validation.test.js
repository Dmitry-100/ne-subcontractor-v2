"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const validationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers-validation.js"));

function createControl() {
    return {
        disabled: false,
        hidden: false,
        value: "",
        options: []
    };
}

function createValidOptions() {
    return {
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
        queueXmlInboxItem: async function () {},
        loadXmlInbox: async function () {},
        buildLotRecommendations: async function () {},
        applyLotRecommendations: async function () {},
        updateLotActionButtons: function () {},
        applyBatchTransition: async function () {},
        loadBatchHistory: async function () {},
        downloadValidationReport: function () {},
        downloadLotReconciliationReport: function () {},
        getRawRows: function () { return []; },
        getParsedRows: function () { return []; },
        getSelectedBatch: function () { return null; },
        setUploadStatus: function () {},
        setMappingStatus: function () {},
        setXmlStatus: function () {},
        setLotStatus: function () {},
        setTransitionStatus: function () {}
    };
}

test("imports action handlers validation: checks required controls", () => {
    assert.throws(function () {
        validationModule.normalizeAndValidate({});
    }, /required controls are missing/i);
});

test("imports action handlers validation: checks callbacks contracts", () => {
    const options = createValidOptions();
    options.parseSelectedFile = null;

    assert.throws(function () {
        validationModule.normalizeAndValidate(options);
    }, /required action callbacks are missing/i);
});

test("imports action handlers validation: returns normalized object", () => {
    const options = createValidOptions();
    const normalized = validationModule.normalizeAndValidate(options);

    assert.equal(normalized.parseButton, options.parseButton);
    assert.equal(typeof normalized.bindTableInteractions, "function");
    assert.equal(typeof normalized.setUploadStatus, "function");
});
