"use strict";

(function () {
    function createComposition(options) {
        const settings = options || {};

        const mappingOrchestrationRoot = settings.mappingOrchestrationRoot;
        const wizardSessionRoot = settings.wizardSessionRoot;
        const actionHandlersRoot = settings.actionHandlersRoot;
        const actionBindingsRoot = settings.actionBindingsRoot;
        const controls = settings.controls;
        const stateStore = settings.stateStore;
        const mappingUi = settings.mappingUi;
        const mappingService = settings.mappingService;
        const fileParser = settings.fileParser;
        const uploadHelpers = settings.uploadHelpers;
        const apiClient = settings.apiClient;
        const batchesService = settings.batchesService;
        const lotService = settings.lotService;
        const xmlInboxService = settings.xmlInboxService;
        const reportsHelpers = settings.reportsHelpers;
        const interactionsService = settings.interactionsService;
        const queuedEndpoint = settings.queuedEndpoint;
        const loadBatchHistory = settings.loadBatchHistory;
        const setMappingStatus = settings.setMappingStatus;
        const setUploadStatus = settings.setUploadStatus;
        const setWorkflowActionsEnabled = settings.setWorkflowActionsEnabled;
        const setTransitionStatus = settings.setTransitionStatus;
        const setXmlStatus = settings.setXmlStatus;
        const setLotStatus = settings.setLotStatus;

        const importsPageMappingOrchestration = mappingOrchestrationRoot.createMappingOrchestrationService({
            fileInput: controls.fileInput,
            hasHeaderCheckbox: controls.hasHeaderCheckbox,
            mappingSection: controls.mappingSection,
            parseSummaryElement: controls.parseSummaryElement,
            uploadButton: controls.uploadButton,
            mappingUi: mappingUi,
            mappingService: mappingService,
            fileParser: fileParser,
            getRawRows: stateStore.getRawRows,
            setRawRows: stateStore.setRawRows,
            setSourceFileName: stateStore.setSourceFileName,
            getDataStartRowIndex: stateStore.getDataStartRowIndex,
            setDataStartRowIndex: stateStore.setDataStartRowIndex,
            getMappingSelection: stateStore.getMappingSelection,
            setMappingSelection: stateStore.setMappingSelection,
            setSourceColumns: stateStore.setSourceColumns,
            setParsedRows: stateStore.setParsedRows,
            setMappingStatus: setMappingStatus,
            setUploadStatus: setUploadStatus
        });

        const importsPageWizardSession = wizardSessionRoot.createWizardSessionService({
            fileInput: controls.fileInput,
            notesInput: controls.notesInput,
            hasHeaderCheckbox: controls.hasHeaderCheckbox,
            transitionReasonInput: controls.transitionReasonInput,
            mappingGrid: controls.mappingGrid,
            mappingSection: controls.mappingSection,
            uploadButton: controls.uploadButton,
            previewWrap: controls.previewWrap,
            parseSummaryElement: controls.parseSummaryElement,
            detailsElement: controls.detailsElement,
            historyWrapElement: controls.historyWrapElement,
            invalidWrapElement: controls.invalidWrapElement,
            getParsedRows: stateStore.getParsedRows,
            setParsedRows: stateStore.setParsedRows,
            getSourceFileName: stateStore.getSourceFileName,
            setSourceFileName: stateStore.setSourceFileName,
            setRawRows: stateStore.setRawRows,
            setSourceColumns: stateStore.setSourceColumns,
            setDataStartRowIndex: stateStore.setDataStartRowIndex,
            setMappingSelection: stateStore.setMappingSelection,
            setSelectedBatch: stateStore.setSelectedBatch,
            clearDetailsPoll: stateStore.clearDetailsPoll,
            buildQueuedBatchRequest: uploadHelpers.buildQueuedBatchRequest,
            createQueuedBatch: function (targetEndpoint, payload) {
                return apiClient.createQueuedBatch(targetEndpoint, payload);
            },
            buildQueuedBatchSuccessStatus: uploadHelpers.buildQueuedBatchSuccessStatus,
            loadBatches: async function (targetBatchId) {
                await batchesService.loadBatches(targetBatchId);
            },
            queuedEndpoint: queuedEndpoint,
            setMappingStatus: setMappingStatus,
            setWorkflowActionsEnabled: setWorkflowActionsEnabled,
            setTransitionStatus: setTransitionStatus,
            clearLotRecommendations: function (message) {
                lotService.clearRecommendations(message);
            },
            setUploadStatus: setUploadStatus
        });

        const importsPageActionBindings = actionBindingsRoot.createActionBindingsService({
            actionHandlersRoot: actionHandlersRoot,
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
            parseSelectedFile: importsPageMappingOrchestration.parseSelectedFile,
            applyMappingToRows: importsPageMappingOrchestration.applyMappingToRows,
            rebuildMappingFromRaw: importsPageMappingOrchestration.rebuildMappingFromRaw,
            resetWizard: importsPageWizardSession.resetWizard,
            uploadBatch: importsPageWizardSession.uploadBatch,
            loadBatches: async function () {
                await batchesService.loadBatches();
            },
            queueXmlInboxItem: async function (request) {
                return await xmlInboxService.queueXmlInboxItem(request);
            },
            loadXmlInbox: async function () {
                await xmlInboxService.loadXmlInbox();
            },
            buildLotRecommendations: async function () {
                await lotService.buildRecommendations();
            },
            applyLotRecommendations: async function () {
                await lotService.applyRecommendations();
            },
            updateLotActionButtons: function () {
                lotService.updateActionButtons();
            },
            applyBatchTransition: async function (targetStatus, reason) {
                await batchesService.applyBatchTransition(targetStatus, reason);
            },
            loadBatchHistory: loadBatchHistory,
            downloadValidationReport: function (batchId, includeValidRows) {
                reportsHelpers.downloadValidationReport(batchId, includeValidRows);
            },
            downloadLotReconciliationReport: function (batchId) {
                reportsHelpers.downloadLotReconciliationReport(batchId);
            },
            bindTableInteractions: function () {
                interactionsService.bindAll();
            },
            getRawRows: stateStore.getRawRows,
            getParsedRows: stateStore.getParsedRows,
            getSelectedBatch: stateStore.getSelectedBatch,
            setUploadStatus: setUploadStatus,
            setMappingStatus: setMappingStatus,
            setXmlStatus: setXmlStatus,
            setLotStatus: setLotStatus,
            setTransitionStatus: setTransitionStatus
        });

        return {
            applyMappingToRows: importsPageMappingOrchestration.applyMappingToRows,
            rebuildMappingFromRaw: importsPageMappingOrchestration.rebuildMappingFromRaw,
            parseSelectedFile: importsPageMappingOrchestration.parseSelectedFile,
            uploadBatch: importsPageWizardSession.uploadBatch,
            resetWizard: importsPageWizardSession.resetWizard,
            bindActions: function () {
                importsPageActionBindings.bindAll();
            }
        };
    }

    const exportsObject = {
        createComposition: createComposition
    };

    if (typeof window !== "undefined") {
        window.ImportsPageSessionWiringComposition = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
