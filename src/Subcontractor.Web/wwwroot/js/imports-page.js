"use strict";

(function () {
    const importsPageBootstrapRoot = window.ImportsPageBootstrap;
    if (!importsPageBootstrapRoot || typeof importsPageBootstrapRoot.createBootstrapContext !== "function") {
        console.error("ImportsPageBootstrap не загружен. Проверьте порядок подключения скриптов.");
        return;
    }

    const bootstrapContext = importsPageBootstrapRoot.createBootstrapContext({
        document: document,
        window: window,
        logError: function (message) {
            console.error(message);
        }
    });
    if (!bootstrapContext) {
        return;
    }

    const endpoint = bootstrapContext.endpoint;
    const queuedEndpoint = bootstrapContext.queuedEndpoint;
    const xmlInboxEndpoint = bootstrapContext.xmlInboxEndpoint;
    const lotRecommendationsEndpoint = bootstrapContext.lotRecommendationsEndpoint;
    const controls = bootstrapContext.controls;
    const moduleRoots = bootstrapContext.moduleRoots;

    const importsPageState = moduleRoots.importsPageStateRoot.createStateStore({
        clearTimeout: function (handle) {
            window.clearTimeout(handle);
        }
    });
    const importsPageConfig = moduleRoots.importsPageConfigRoot.createConfig();

    let services = null;
    let importsPageRuntime = null;

    async function loadBatchHistory(batchId) {
        if (importsPageRuntime) {
            return importsPageRuntime.loadBatchHistory(batchId);
        }

        const history = await services.apiClient.getBatchHistory(endpoint, batchId);
        services.importsPageBatchTables.renderHistoryTable(history);
        return history;
    }

    services = moduleRoots.importsPageServicesWiringRoot.createServicesWiring({
        controls: controls,
        roots: {
            importsPageHelpersRoot: moduleRoots.importsPageHelpersRoot,
            importsPageApiRoot: moduleRoots.importsPageApiRoot,
            importsPageStatusRoot: moduleRoots.importsPageStatusRoot,
            importsPageWorkflowRoot: moduleRoots.importsPageWorkflowRoot,
            importsPageWorkflowUiRoot: moduleRoots.importsPageWorkflowUiRoot,
            importsPageMappingRoot: moduleRoots.importsPageMappingRoot,
            importsPageTableModelsRoot: moduleRoots.importsPageTableModelsRoot,
            importsPageMappingUiRoot: moduleRoots.importsPageMappingUiRoot,
            importsPageBatchTablesRoot: moduleRoots.importsPageBatchTablesRoot,
            importsPageXmlRoot: moduleRoots.importsPageXmlRoot,
            importsPageUploadRoot: moduleRoots.importsPageUploadRoot,
            importsPageReportsRoot: moduleRoots.importsPageReportsRoot,
            importsPageBatchesRoot: moduleRoots.importsPageBatchesRoot,
            importsPageXmlInboxRoot: moduleRoots.importsPageXmlInboxRoot,
            importsPageLotTablesRoot: moduleRoots.importsPageLotTablesRoot,
            importsPageLotOrchestrationRoot: moduleRoots.importsPageLotOrchestrationRoot,
            importsPageInteractionsRoot: moduleRoots.importsPageInteractionsRoot,
            importsPageWorkbookRoot: moduleRoots.importsPageWorkbookRoot,
            importsPageFileParserRoot: moduleRoots.importsPageFileParserRoot,
            importsPageLotStateRoot: moduleRoots.importsPageLotStateRoot
        },
        config: importsPageConfig,
        stateStore: importsPageState,
        endpoint: endpoint,
        xmlInboxEndpoint: xmlInboxEndpoint,
        lotRecommendationsEndpoint: lotRecommendationsEndpoint,
        loadBatchHistory: loadBatchHistory,
        scheduleTimeout: function (handler, delay) {
            return window.setTimeout(handler, delay);
        },
        getSheetJs: function () {
            return window.XLSX;
        },
        openWindow: function (url, target, features) {
            return window.open(url, target, features);
        }
    });

    const importsPageSessionWiring = moduleRoots.importsPageSessionWiringRoot.createSessionWiring({
        mappingOrchestrationRoot: moduleRoots.importsPageMappingOrchestrationRoot,
        wizardSessionRoot: moduleRoots.importsPageWizardSessionRoot,
        actionHandlersRoot: moduleRoots.importsPageActionHandlersRoot,
        actionBindingsRoot: moduleRoots.importsPageActionBindingsRoot,
        controls: controls,
        stateStore: importsPageState,
        mappingUi: services.importsPageMappingUi,
        mappingService: services.importsPageMapping,
        fileParser: services.importsPageFileParser,
        uploadHelpers: services.importsPageUpload,
        apiClient: services.apiClient,
        batchesService: services.importsPageBatches,
        lotService: services.importsPageLot,
        xmlInboxService: services.importsPageXmlInbox,
        reportsHelpers: services.importsPageReports,
        interactionsService: services.importsPageInteractions,
        queuedEndpoint: queuedEndpoint,
        loadBatchHistory: loadBatchHistory,
        setMappingStatus: services.setMappingStatus,
        setUploadStatus: services.setUploadStatus,
        setWorkflowActionsEnabled: services.setWorkflowActionsEnabled,
        setTransitionStatus: services.setTransitionStatus,
        setXmlStatus: services.setXmlStatus,
        setLotStatus: services.setLotStatus
    });

    importsPageSessionWiring.bindActions();

    importsPageRuntime = moduleRoots.importsPageRuntimeRoot.createRuntimeService({
        apiClient: services.apiClient,
        endpoint: endpoint,
        renderHistoryTable: services.importsPageBatchTables.renderHistoryTable,
        resetWizard: importsPageSessionWiring.resetWizard,
        setXmlStatus: services.setXmlStatus,
        setBatchesStatus: services.setBatchesStatus,
        loadXmlInbox: async function () {
            await services.importsPageXmlInbox.loadXmlInbox();
        },
        loadBatches: async function () {
            await services.importsPageBatches.loadBatches();
        }
    });

    importsPageRuntime.initialize().catch(function (error) {
        services.setBatchesStatus(`Не удалось инициализировать модуль импорта: ${error.message}`, true);
    });
})();
