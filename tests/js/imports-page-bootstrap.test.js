"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const bootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap.js"));

const REQUIRED_CONTROL_SELECTORS = [
    "[data-imports-file]",
    "[data-imports-notes]",
    "[data-imports-parse]",
    "[data-imports-reset]",
    "[data-imports-upload]",
    "[data-imports-upload-status]",
    "[data-imports-mapping]",
    "[data-imports-has-header]",
    "[data-imports-mapping-grid]",
    "[data-imports-apply-mapping]",
    "[data-imports-mapping-status]",
    "[data-imports-parse-summary]",
    "[data-imports-preview-wrap]",
    "[data-imports-preview-table]",
    "[data-imports-refresh]",
    "[data-imports-batches-status]",
    "[data-imports-batches-table]",
    "[data-imports-details]",
    "[data-imports-details-title]",
    "[data-imports-details-summary]",
    "[data-imports-download-invalid-report]",
    "[data-imports-download-full-report]",
    "[data-imports-download-lot-reconciliation-report]",
    "[data-imports-target-status]",
    "[data-imports-transition-reason]",
    "[data-imports-apply-transition]",
    "[data-imports-transition-status]",
    "[data-imports-history-refresh]",
    "[data-imports-invalid-wrap]",
    "[data-imports-invalid-table]",
    "[data-imports-history-wrap]",
    "[data-imports-history-table]",
    "[data-imports-xml-source]",
    "[data-imports-xml-external-id]",
    "[data-imports-xml-file-name]",
    "[data-imports-xml-content]",
    "[data-imports-xml-queue]",
    "[data-imports-xml-refresh]",
    "[data-imports-xml-status]",
    "[data-imports-xml-table]",
    "[data-imports-lot-build]",
    "[data-imports-lot-apply]",
    "[data-imports-lot-status]",
    "[data-imports-lot-groups-table]",
    "[data-imports-lot-selected-table]"
];

function createRequiredControls() {
    const controls = {};
    for (let index = 0; index < REQUIRED_CONTROL_SELECTORS.length; index += 1) {
        controls[REQUIRED_CONTROL_SELECTORS[index]] = { selector: REQUIRED_CONTROL_SELECTORS[index] };
    }

    return controls;
}

function createModuleRoot(attributes, controls) {
    const attributeMap = attributes || {};
    const controlMap = controls || {};
    return {
        getAttribute: function (name) {
            return Object.prototype.hasOwnProperty.call(attributeMap, name)
                ? attributeMap[name]
                : null;
        },
        querySelector: function (selector) {
            return Object.prototype.hasOwnProperty.call(controlMap, selector)
                ? controlMap[selector]
                : null;
        }
    };
}

function createDocument(moduleRoot) {
    return {
        querySelector: function (selector) {
            if (selector === "[data-imports-module]") {
                return moduleRoot;
            }

            return null;
        }
    };
}

function createRequiredWindowModules(overrides) {
    const modules = {
        ImportsPageHelpers: { createHelpers: function () {} },
        ImportsPageApi: { createApiClient: function () {} },
        ImportsPageLotState: {},
        ImportsPageWorkflow: { createWorkflow: function () {} },
        ImportsPageWorkflowUi: { createWorkflowUiService: function () {} },
        ImportsPageMapping: { createMappingService: function () {} },
        ImportsPageMappingOrchestration: { createMappingOrchestrationService: function () {} },
        ImportsPageFileParser: { createFileParser: function () {} },
        ImportsPageWorkbook: { createWorkbookParser: function () {} },
        ImportsPageXml: { createXmlHelpers: function () {} },
        ImportsPageXmlInbox: { createXmlInboxService: function () {} },
        ImportsPageUpload: { createUploadHelpers: function () {} },
        ImportsPageTableModels: { createTableModels: function () {} },
        ImportsPageBatches: { createBatchesService: function () {} },
        ImportsPageReports: { createReportsHelpers: function () {} },
        ImportsPageLotOrchestration: { createLotOrchestrationService: function () {} },
        ImportsPageLotTables: { createLotTablesService: function () {} },
        ImportsPageBatchTables: { createBatchTablesService: function () {} },
        ImportsPageMappingUi: { createMappingUiService: function () {} },
        ImportsPageStatus: { createStatusService: function () {} },
        ImportsPageWizardSession: { createWizardSessionService: function () {} },
        ImportsPageActionHandlers: { createActionHandlers: function () {} },
        ImportsPageActionBindings: { createActionBindingsService: function () {} },
        ImportsPageSessionWiring: { createSessionWiring: function () {} },
        ImportsPageServicesWiring: { createServicesWiring: function () {} },
        ImportsPageRuntime: { createRuntimeService: function () {} },
        ImportsPageState: { createStateStore: function () {} },
        ImportsPageConfig: { createConfig: function () {} },
        ImportsPageInteractions: { createInteractionsService: function () {} }
    };

    return Object.assign(modules, overrides || {});
}

test("imports bootstrap: createBootstrapContext validates required document", () => {
    assert.throws(
        function () {
            bootstrapModule.createBootstrapContext({});
        },
        /document with querySelector/);
});

test("imports bootstrap: returns null when imports module root is missing", () => {
    const result = bootstrapModule.createBootstrapContext({
        document: createDocument(null),
        window: createRequiredWindowModules()
    });

    assert.equal(result, null);
});

test("imports bootstrap: returns null when a required control is missing", () => {
    const controls = createRequiredControls();
    delete controls["[data-imports-preview-table]"];
    const moduleRoot = createModuleRoot({}, controls);

    const result = bootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: createRequiredWindowModules()
    });

    assert.equal(result, null);
});

test("imports bootstrap: logs missing module dependency and returns null", () => {
    const loggedMessages = [];
    const moduleRoot = createModuleRoot({}, createRequiredControls());

    const result = bootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: createRequiredWindowModules({
            ImportsPageRuntime: {}
        }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(result, null);
    assert.deepEqual(loggedMessages, ["ImportsPageRuntime не загружен. Проверьте порядок подключения скриптов."]);
});

test("imports bootstrap: logs missing action handlers module dependency", () => {
    const loggedMessages = [];
    const moduleRoot = createModuleRoot({}, createRequiredControls());

    const result = bootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: createRequiredWindowModules({
            ImportsPageActionHandlers: {}
        }),
        logError: function (message) {
            loggedMessages.push(message);
        }
    });

    assert.equal(result, null);
    assert.deepEqual(loggedMessages, ["ImportsPageActionHandlers не загружен. Проверьте порядок подключения скриптов."]);
});

test("imports bootstrap: resolves defaults, endpoints, controls and module roots", () => {
    const controls = createRequiredControls();
    const attributes = {
        "data-batches-api-endpoint": "/api/custom/batches",
        "data-xml-inbox-api-endpoint": "/api/custom/xml/inbox",
        "data-lot-recommendations-api-endpoint": "/api/custom/lots/recommendations"
    };
    const moduleRoot = createModuleRoot(attributes, controls);
    const windowModules = createRequiredWindowModules();

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(moduleRoot),
        window: windowModules
    });

    assert.equal(context.endpoint, "/api/custom/batches");
    assert.equal(context.queuedEndpoint, "/api/custom/batches/queued");
    assert.equal(context.xmlInboxEndpoint, "/api/custom/xml/inbox");
    assert.equal(context.lotRecommendationsEndpoint, "/api/custom/lots/recommendations");
    assert.equal(context.controls.previewTable, controls["[data-imports-preview-table]"]);
    assert.equal(context.moduleRoots.importsPageHelpersRoot, windowModules.ImportsPageHelpers);
    assert.equal(context.moduleRoots.importsPageLotStateRoot, windowModules.ImportsPageLotState);
});
