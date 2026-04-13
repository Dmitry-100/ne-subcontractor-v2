"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const importsPageModulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page.js");

function loadImportsPage(windowMock, documentMock) {
    delete require.cache[importsPageModulePath];
    const previousConsole = global.console;
    global.window = windowMock;
    global.document = documentMock || {};
    if (windowMock && windowMock.console) {
        global.console = windowMock.console;
    }
    require(importsPageModulePath);

    return function cleanup() {
        delete global.window;
        delete global.document;
        global.console = previousConsole;
    };
}

async function waitForSettled() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(function (resolve) {
        setImmediate(resolve);
    });
}

function createRoots(overrides) {
    const roots = {
        importsPageHelpersRoot: { id: "helpers-root" },
        importsPageApiRoot: { id: "api-root" },
        importsPageStatusRoot: { id: "status-root" },
        importsPageWorkflowRoot: { id: "workflow-root" },
        importsPageWorkflowUiRoot: { id: "workflow-ui-root" },
        importsPageMappingRoot: { id: "mapping-root" },
        importsPageTableModelsRoot: { id: "table-models-root" },
        importsPageMappingUiRoot: { id: "mapping-ui-root" },
        importsPageBatchTablesRoot: { id: "batch-tables-root" },
        importsPageXmlRoot: { id: "xml-root" },
        importsPageUploadRoot: { id: "upload-root" },
        importsPageReportsRoot: { id: "reports-root" },
        importsPageBatchesRoot: { id: "batches-root" },
        importsPageXmlInboxRoot: { id: "xml-inbox-root" },
        importsPageLotTablesRoot: { id: "lot-tables-root" },
        importsPageLotOrchestrationRoot: { id: "lot-orchestration-root" },
        importsPageInteractionsRoot: { id: "interactions-root" },
        importsPageWorkbookRoot: { id: "workbook-root" },
        importsPageFileParserRoot: { id: "file-parser-root" },
        importsPageLotStateRoot: { id: "lot-state-root" },
        importsPageMappingOrchestrationRoot: { id: "mapping-orchestration-root" },
        importsPageWizardSessionRoot: { id: "wizard-session-root" },
        importsPageActionHandlersRoot: { id: "action-handlers-root" },
        importsPageActionBindingsRoot: { id: "action-bindings-root" }
    };

    return Object.assign(roots, overrides || {});
}

test("imports page entrypoint: returns early when bootstrap module is missing", () => {
    const errors = [];
    const cleanup = loadImportsPage({
        console: {
            error: function (message) {
                errors.push(message);
            }
        }
    });
    cleanup();

    assert.equal(errors.length, 1);
    assert.match(errors[0], /ImportsPageBootstrap/i);
});

test("imports page entrypoint: returns early when bootstrap context is null", () => {
    const events = {
        bootstrapCalls: 0
    };

    const cleanup = loadImportsPage({
        console: {
            error: function () {}
        },
        ImportsPageBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return null;
            }
        }
    }, { id: "doc" });
    cleanup();

    assert.equal(events.bootstrapCalls, 1);
});

test("imports page entrypoint: composes wiring and runtime services", async () => {
    const events = {
        bootstrapOptions: null,
        stateOptions: null,
        configCalls: 0,
        servicesWiringOptions: null,
        sessionWiringOptions: null,
        sessionLoadBatchHistoryPromises: [],
        sessionLoadBatchHistoryResults: [],
        bindActionsCalls: 0,
        runtimeOptions: null,
        runtimeInitializeCalls: 0,
        runtimeLoadHistoryCalls: [],
        apiGetBatchHistoryCalls: [],
        renderHistoryCalls: []
    };

    const controls = {
        id: "imports-controls"
    };

    const servicesWiringResult = {
        apiClient: {
            getBatchHistory: async function (endpoint, batchId) {
                events.apiGetBatchHistoryCalls.push({ endpoint: endpoint, batchId: batchId });
                return [{ id: "history-1" }];
            }
        },
        importsPageBatchTables: {
            renderHistoryTable: function (history) {
                events.renderHistoryCalls.push(history);
            }
        },
        importsPageMappingUi: { id: "mapping-ui" },
        importsPageMapping: { id: "mapping-service" },
        importsPageFileParser: { id: "file-parser" },
        importsPageUpload: { id: "upload-helpers" },
        importsPageBatches: {
            loadBatches: async function () {}
        },
        importsPageLot: { id: "lot-service" },
        importsPageXmlInbox: {
            loadXmlInbox: async function () {}
        },
        importsPageReports: { id: "reports-helpers" },
        importsPageInteractions: { id: "interactions-service" },
        setMappingStatus: function () {},
        setUploadStatus: function () {},
        setWorkflowActionsEnabled: function () {},
        setTransitionStatus: function () {},
        setXmlStatus: function () {},
        setLotStatus: function () {},
        setBatchesStatus: function () {}
    };

    const roots = createRoots({
        importsPageStateRoot: {
            createStateStore: function (options) {
                events.stateOptions = options;
                return { id: "state-store" };
            }
        },
        importsPageConfigRoot: {
            createConfig: function () {
                events.configCalls += 1;
                return { id: "imports-config" };
            }
        },
        importsPageServicesWiringRoot: {
            createServicesWiring: function (options) {
                events.servicesWiringOptions = options;
                return servicesWiringResult;
            }
        },
        importsPageSessionWiringRoot: {
            createSessionWiring: function (options) {
                events.sessionWiringOptions = options;
                events.sessionLoadBatchHistoryPromises.push(
                    options.loadBatchHistory("batch-before-runtime").then(function (history) {
                        events.sessionLoadBatchHistoryResults.push(history);
                    }));
                return {
                    bindActions: function () {
                        events.bindActionsCalls += 1;
                    },
                    resetWizard: function () {}
                };
            }
        },
        importsPageRuntimeRoot: {
            createRuntimeService: function (options) {
                events.runtimeOptions = options;
                return {
                    loadBatchHistory: async function (batchId) {
                        events.runtimeLoadHistoryCalls.push(batchId);
                        return [];
                    },
                    initialize: async function () {
                        events.runtimeInitializeCalls += 1;
                    }
                };
            }
        }
    });

    const windowMock = {
        console: {
            error: function () {}
        },
        setTimeout: function () { return 123; },
        clearTimeout: function () {},
        open: function () {},
        XLSX: { id: "xlsx-runtime" },
        ImportsPageBootstrap: {
            createBootstrapContext: function (options) {
                events.bootstrapOptions = options;
                return {
                    endpoint: "/api/custom/imports",
                    queuedEndpoint: "/api/custom/imports/queued",
                    xmlInboxEndpoint: "/api/custom/imports/xml",
                    lotRecommendationsEndpoint: "/api/custom/imports/lot",
                    controls: controls,
                    moduleRoots: roots
                };
            }
        }
    };

    const cleanup = loadImportsPage(windowMock, { id: "doc" });
    await waitForSettled();
    await Promise.all(events.sessionLoadBatchHistoryPromises);

    assert.equal(events.bootstrapOptions.window, windowMock);
    assert.equal(typeof events.bootstrapOptions.logError, "function");
    assert.equal(typeof events.stateOptions.clearTimeout, "function");
    assert.equal(events.configCalls, 1);

    assert.equal(events.servicesWiringOptions.endpoint, "/api/custom/imports");
    assert.equal(events.servicesWiringOptions.xmlInboxEndpoint, "/api/custom/imports/xml");
    assert.equal(events.servicesWiringOptions.lotRecommendationsEndpoint, "/api/custom/imports/lot");
    assert.equal(events.servicesWiringOptions.controls, controls);
    assert.equal(events.servicesWiringOptions.config.id, "imports-config");
    assert.equal(events.servicesWiringOptions.stateStore.id, "state-store");
    assert.equal(events.servicesWiringOptions.roots.importsPageHelpersRoot.id, "helpers-root");
    assert.equal(typeof events.servicesWiringOptions.loadBatchHistory, "function");
    assert.equal(typeof events.servicesWiringOptions.scheduleTimeout, "function");
    assert.equal(typeof events.servicesWiringOptions.getSheetJs, "function");

    assert.deepEqual(events.sessionLoadBatchHistoryResults, [[{ id: "history-1" }]]);
    assert.deepEqual(events.apiGetBatchHistoryCalls, [{ endpoint: "/api/custom/imports", batchId: "batch-before-runtime" }]);
    assert.deepEqual(events.renderHistoryCalls, [[{ id: "history-1" }]]);

    assert.equal(events.sessionWiringOptions.queuedEndpoint, "/api/custom/imports/queued");
    assert.equal(events.sessionWiringOptions.mappingUi.id, "mapping-ui");
    assert.equal(typeof events.sessionWiringOptions.loadBatchHistory, "function");
    assert.equal(events.bindActionsCalls, 1);

    const runtimeHistory = await events.servicesWiringOptions.loadBatchHistory("batch-1");
    assert.deepEqual(runtimeHistory, []);
    assert.deepEqual(events.runtimeLoadHistoryCalls, ["batch-1"]);

    assert.equal(events.runtimeOptions.endpoint, "/api/custom/imports");
    assert.equal(typeof events.runtimeOptions.loadBatches, "function");
    assert.equal(typeof events.runtimeOptions.loadXmlInbox, "function");
    assert.equal(events.runtimeInitializeCalls, 1);
    cleanup();
});

test("imports page entrypoint: initialize failure updates batches status", async () => {
    const events = {
        setBatchesStatusCalls: []
    };

    const roots = createRoots({
        importsPageStateRoot: {
            createStateStore: function () {
                return { id: "state-store" };
            }
        },
        importsPageConfigRoot: {
            createConfig: function () {
                return { id: "imports-config" };
            }
        },
        importsPageServicesWiringRoot: {
            createServicesWiring: function () {
                return {
                    apiClient: {
                        getBatchHistory: async function () { return []; }
                    },
                    importsPageBatchTables: {
                        renderHistoryTable: function () {}
                    },
                    importsPageMappingUi: {},
                    importsPageMapping: {},
                    importsPageFileParser: {},
                    importsPageUpload: {},
                    importsPageBatches: {
                        loadBatches: async function () {}
                    },
                    importsPageLot: {},
                    importsPageXmlInbox: {
                        loadXmlInbox: async function () {}
                    },
                    importsPageReports: {},
                    importsPageInteractions: {},
                    setMappingStatus: function () {},
                    setUploadStatus: function () {},
                    setWorkflowActionsEnabled: function () {},
                    setTransitionStatus: function () {},
                    setXmlStatus: function () {},
                    setLotStatus: function () {},
                    setBatchesStatus: function (message, isError) {
                        events.setBatchesStatusCalls.push({ message: message, isError: isError });
                    }
                };
            }
        },
        importsPageSessionWiringRoot: {
            createSessionWiring: function () {
                return {
                    bindActions: function () {},
                    resetWizard: function () {}
                };
            }
        },
        importsPageRuntimeRoot: {
            createRuntimeService: function () {
                return {
                    loadBatchHistory: async function () {
                        return [];
                    },
                    initialize: async function () {
                        throw new Error("runtime failed");
                    }
                };
            }
        }
    });

    const cleanup = loadImportsPage({
        console: {
            error: function () {}
        },
        setTimeout: function () { return 1; },
        clearTimeout: function () {},
        open: function () {},
        XLSX: {},
        ImportsPageBootstrap: {
            createBootstrapContext: function () {
                return {
                    endpoint: "/api/custom/imports",
                    queuedEndpoint: "/api/custom/imports/queued",
                    xmlInboxEndpoint: "/api/custom/imports/xml",
                    lotRecommendationsEndpoint: "/api/custom/imports/lot",
                    controls: {},
                    moduleRoots: roots
                };
            }
        }
    }, { id: "doc" });

    await waitForSettled();
    cleanup();

    assert.equal(events.setBatchesStatusCalls.length, 1);
    assert.match(events.setBatchesStatusCalls[0].message, /Не удалось инициализировать модуль импорта/i);
    assert.equal(events.setBatchesStatusCalls[0].isError, true);
});
