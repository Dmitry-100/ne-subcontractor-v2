"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const validationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-session-wiring-validation.js"));

function createControls() {
    return {
        fileInput: {},
        parseButton: {},
        applyMappingButton: {},
        uploadButton: {},
        transitionTargetSelect: {}
    };
}

function createStateStore() {
    return {
        getRawRows: function () { return []; },
        getParsedRows: function () { return []; },
        getSelectedBatch: function () { return null; },
        setParsedRows: function () {}
    };
}

function createDependencies() {
    return {
        mappingUi: {},
        mappingService: {},
        fileParser: {},
        uploadHelpers: {},
        apiClient: {},
        batchesService: {},
        lotService: {},
        xmlInboxService: {},
        reportsHelpers: {},
        interactionsService: {},
        queuedEndpoint: "/api/imports/source-data/batches/queued",
        loadBatchHistory: async function () {},
        setMappingStatus: function () {},
        setUploadStatus: function () {},
        setWorkflowActionsEnabled: function () {},
        setTransitionStatus: function () {},
        setXmlStatus: function () {},
        setLotStatus: function () {}
    };
}

test("imports session wiring validation: checks required roots", () => {
    assert.throws(function () {
        validationModule.normalizeAndValidate({});
    }, /mappingOrchestrationRoot/i);
});

test("imports session wiring validation: checks controls and service dependencies", () => {
    assert.throws(function () {
        validationModule.normalizeAndValidate({
            mappingOrchestrationRoot: { createMappingOrchestrationService: function () {} },
            wizardSessionRoot: { createWizardSessionService: function () {} },
            actionHandlersRoot: { createActionHandlers: function () {} },
            actionBindingsRoot: { createActionBindingsService: function () {} },
            stateStore: createStateStore(),
            controls: {},
            ...createDependencies()
        });
    }, /required controls/i);

    assert.throws(function () {
        validationModule.normalizeAndValidate({
            mappingOrchestrationRoot: { createMappingOrchestrationService: function () {} },
            wizardSessionRoot: { createWizardSessionService: function () {} },
            actionHandlersRoot: { createActionHandlers: function () {} },
            actionBindingsRoot: { createActionBindingsService: function () {} },
            stateStore: createStateStore(),
            controls: createControls(),
            ...createDependencies(),
            queuedEndpoint: ""
        });
    }, /service dependencies/i);
});

test("imports session wiring validation: normalizes valid options", () => {
    const normalized = validationModule.normalizeAndValidate({
        mappingOrchestrationRoot: { createMappingOrchestrationService: function () {} },
        wizardSessionRoot: { createWizardSessionService: function () {} },
        actionHandlersRoot: { createActionHandlers: function () {} },
        actionBindingsRoot: { createActionBindingsService: function () {} },
        controls: createControls(),
        stateStore: createStateStore(),
        ...createDependencies()
    });

    assert.equal(typeof normalized.loadBatchHistory, "function");
    assert.equal(normalized.queuedEndpoint, "/api/imports/source-data/batches/queued");
    assert.ok(normalized.controls.parseButton);
});
