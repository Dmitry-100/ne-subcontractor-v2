"use strict";

(function () {
    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function isEventTarget(value) {
        return isNodeLike(value) && typeof value.addEventListener === "function";
    }

    function supportsHidden(value) {
        return isNodeLike(value) && typeof value.hidden !== "undefined";
    }

    function supportsValue(value) {
        return isNodeLike(value) && typeof value.value !== "undefined";
    }

    function createActionBindingsService(options) {
        const settings = options || {};
        const actionHandlersRoot = settings.actionHandlersRoot ||
            (typeof window !== "undefined" ? window.ImportsPageActionHandlers : null);

        const parseButton = settings.parseButton || null;
        const applyMappingButton = settings.applyMappingButton || null;
        const hasHeaderCheckbox = settings.hasHeaderCheckbox || null;
        const resetButton = settings.resetButton || null;
        const uploadButton = settings.uploadButton || null;
        const refreshBatchesButton = settings.refreshBatchesButton || null;
        const xmlQueueButton = settings.xmlQueueButton || null;
        const xmlRefreshButton = settings.xmlRefreshButton || null;
        const lotBuildButton = settings.lotBuildButton || null;
        const lotApplyButton = settings.lotApplyButton || null;
        const transitionApplyButton = settings.transitionApplyButton || null;
        const historyRefreshButton = settings.historyRefreshButton || null;
        const downloadInvalidReportButton = settings.downloadInvalidReportButton || null;
        const downloadFullReportButton = settings.downloadFullReportButton || null;
        const downloadLotReconciliationReportButton = settings.downloadLotReconciliationReportButton || null;
        const previewWrap = settings.previewWrap || null;
        const parseSummaryElement = settings.parseSummaryElement || null;
        const transitionTargetSelect = settings.transitionTargetSelect || null;
        const transitionReasonInput = settings.transitionReasonInput || null;
        const xmlSourceInput = settings.xmlSourceInput || null;
        const xmlExternalIdInput = settings.xmlExternalIdInput || null;
        const xmlFileNameInput = settings.xmlFileNameInput || null;
        const xmlContentInput = settings.xmlContentInput || null;

        if (!isEventTarget(parseButton) ||
            !isEventTarget(applyMappingButton) ||
            !isEventTarget(hasHeaderCheckbox) ||
            !isEventTarget(resetButton) ||
            !isEventTarget(uploadButton) ||
            !isEventTarget(refreshBatchesButton) ||
            !isEventTarget(xmlQueueButton) ||
            !isEventTarget(xmlRefreshButton) ||
            !isEventTarget(lotBuildButton) ||
            !isEventTarget(lotApplyButton) ||
            !isEventTarget(transitionApplyButton) ||
            !isEventTarget(historyRefreshButton) ||
            !isEventTarget(downloadInvalidReportButton) ||
            !isEventTarget(downloadFullReportButton) ||
            !isEventTarget(downloadLotReconciliationReportButton) ||
            !supportsHidden(previewWrap) ||
            !supportsHidden(parseSummaryElement) ||
            !isNodeLike(transitionTargetSelect) ||
            !isNodeLike(transitionTargetSelect.options) ||
            typeof transitionTargetSelect.options.length === "undefined" ||
            !supportsValue(transitionReasonInput) ||
            !supportsValue(xmlSourceInput) ||
            !supportsValue(xmlExternalIdInput) ||
            !supportsValue(xmlFileNameInput) ||
            !supportsValue(xmlContentInput)) {
            throw new Error("createActionBindingsService: required controls are missing.");
        }

        if (!actionHandlersRoot || typeof actionHandlersRoot.createActionHandlers !== "function") {
            throw new Error("createActionBindingsService: actionHandlersRoot.createActionHandlers is required.");
        }

        const actionHandlers = actionHandlersRoot.createActionHandlers({
            parseButton: parseButton,
            uploadButton: uploadButton,
            refreshBatchesButton: refreshBatchesButton,
            xmlQueueButton: xmlQueueButton,
            xmlRefreshButton: xmlRefreshButton,
            lotBuildButton: lotBuildButton,
            lotApplyButton: lotApplyButton,
            transitionApplyButton: transitionApplyButton,
            historyRefreshButton: historyRefreshButton,
            previewWrap: previewWrap,
            parseSummaryElement: parseSummaryElement,
            transitionTargetSelect: transitionTargetSelect,
            transitionReasonInput: transitionReasonInput,
            xmlSourceInput: xmlSourceInput,
            xmlExternalIdInput: xmlExternalIdInput,
            xmlFileNameInput: xmlFileNameInput,
            xmlContentInput: xmlContentInput,
            parseSelectedFile: settings.parseSelectedFile,
            applyMappingToRows: settings.applyMappingToRows,
            rebuildMappingFromRaw: settings.rebuildMappingFromRaw,
            resetWizard: settings.resetWizard,
            uploadBatch: settings.uploadBatch,
            loadBatches: settings.loadBatches,
            queueXmlInboxItem: settings.queueXmlInboxItem,
            loadXmlInbox: settings.loadXmlInbox,
            buildLotRecommendations: settings.buildLotRecommendations,
            applyLotRecommendations: settings.applyLotRecommendations,
            updateLotActionButtons: settings.updateLotActionButtons,
            applyBatchTransition: settings.applyBatchTransition,
            loadBatchHistory: settings.loadBatchHistory,
            downloadValidationReport: settings.downloadValidationReport,
            downloadLotReconciliationReport: settings.downloadLotReconciliationReport,
            bindTableInteractions: settings.bindTableInteractions || function () {},
            getRawRows: settings.getRawRows,
            getParsedRows: settings.getParsedRows,
            getSelectedBatch: settings.getSelectedBatch,
            setUploadStatus: settings.setUploadStatus,
            setMappingStatus: settings.setMappingStatus,
            setXmlStatus: settings.setXmlStatus,
            setLotStatus: settings.setLotStatus,
            setTransitionStatus: settings.setTransitionStatus
        });

        if (!actionHandlers ||
            typeof actionHandlers.onParseClick !== "function" ||
            typeof actionHandlers.onApplyMappingClick !== "function" ||
            typeof actionHandlers.onHasHeaderChange !== "function" ||
            typeof actionHandlers.onResetClick !== "function" ||
            typeof actionHandlers.onUploadClick !== "function" ||
            typeof actionHandlers.onRefreshBatchesClick !== "function" ||
            typeof actionHandlers.onXmlQueueClick !== "function" ||
            typeof actionHandlers.onXmlRefreshClick !== "function" ||
            typeof actionHandlers.onLotBuildClick !== "function" ||
            typeof actionHandlers.onLotApplyClick !== "function" ||
            typeof actionHandlers.onTransitionApplyClick !== "function" ||
            typeof actionHandlers.onHistoryRefreshClick !== "function" ||
            typeof actionHandlers.onDownloadInvalidReportClick !== "function" ||
            typeof actionHandlers.onDownloadFullReportClick !== "function" ||
            typeof actionHandlers.onDownloadLotReconciliationReportClick !== "function" ||
            typeof actionHandlers.bindTableInteractions !== "function") {
            throw new Error("createActionBindingsService: action handlers contract is invalid.");
        }

        function bindAll() {
            parseButton.addEventListener("click", actionHandlers.onParseClick);
            applyMappingButton.addEventListener("click", actionHandlers.onApplyMappingClick);
            hasHeaderCheckbox.addEventListener("change", actionHandlers.onHasHeaderChange);
            resetButton.addEventListener("click", actionHandlers.onResetClick);
            uploadButton.addEventListener("click", actionHandlers.onUploadClick);
            refreshBatchesButton.addEventListener("click", actionHandlers.onRefreshBatchesClick);
            xmlQueueButton.addEventListener("click", actionHandlers.onXmlQueueClick);
            xmlRefreshButton.addEventListener("click", actionHandlers.onXmlRefreshClick);
            lotBuildButton.addEventListener("click", actionHandlers.onLotBuildClick);
            lotApplyButton.addEventListener("click", actionHandlers.onLotApplyClick);
            transitionApplyButton.addEventListener("click", actionHandlers.onTransitionApplyClick);
            historyRefreshButton.addEventListener("click", actionHandlers.onHistoryRefreshClick);
            downloadInvalidReportButton.addEventListener("click", actionHandlers.onDownloadInvalidReportClick);
            downloadFullReportButton.addEventListener("click", actionHandlers.onDownloadFullReportClick);
            downloadLotReconciliationReportButton.addEventListener("click", actionHandlers.onDownloadLotReconciliationReportClick);
            actionHandlers.bindTableInteractions();
        }

        return {
            bindAll: bindAll
        };
    }

    const exportsObject = {
        createActionBindingsService: createActionBindingsService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageActionBindings = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
