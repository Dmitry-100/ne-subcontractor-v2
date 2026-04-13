"use strict";

(function () {
    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function supportsDisabled(value) {
        return isNodeLike(value) && typeof value.disabled !== "undefined";
    }

    function supportsHidden(value) {
        return isNodeLike(value) && typeof value.hidden !== "undefined";
    }

    function supportsValue(value) {
        return isNodeLike(value) && typeof value.value !== "undefined";
    }

    function hasOptionsLength(value) {
        return isNodeLike(value) &&
            isNodeLike(value.options) &&
            typeof value.options.length !== "undefined";
    }

    function normalizeAndValidate(options) {
        const settings = options || {};

        const normalized = {
            parseButton: settings.parseButton || null,
            uploadButton: settings.uploadButton || null,
            refreshBatchesButton: settings.refreshBatchesButton || null,
            xmlQueueButton: settings.xmlQueueButton || null,
            xmlRefreshButton: settings.xmlRefreshButton || null,
            lotBuildButton: settings.lotBuildButton || null,
            lotApplyButton: settings.lotApplyButton || null,
            transitionApplyButton: settings.transitionApplyButton || null,
            historyRefreshButton: settings.historyRefreshButton || null,
            previewWrap: settings.previewWrap || null,
            parseSummaryElement: settings.parseSummaryElement || null,
            transitionTargetSelect: settings.transitionTargetSelect || null,
            transitionReasonInput: settings.transitionReasonInput || null,
            xmlSourceInput: settings.xmlSourceInput || null,
            xmlExternalIdInput: settings.xmlExternalIdInput || null,
            xmlFileNameInput: settings.xmlFileNameInput || null,
            xmlContentInput: settings.xmlContentInput || null,
            parseSelectedFile: settings.parseSelectedFile || null,
            applyMappingToRows: settings.applyMappingToRows || null,
            rebuildMappingFromRaw: settings.rebuildMappingFromRaw || null,
            resetWizard: settings.resetWizard || null,
            uploadBatch: settings.uploadBatch || null,
            loadBatches: settings.loadBatches || null,
            queueXmlInboxItem: settings.queueXmlInboxItem || null,
            loadXmlInbox: settings.loadXmlInbox || null,
            buildLotRecommendations: settings.buildLotRecommendations || null,
            applyLotRecommendations: settings.applyLotRecommendations || null,
            updateLotActionButtons: settings.updateLotActionButtons || null,
            applyBatchTransition: settings.applyBatchTransition || null,
            loadBatchHistory: settings.loadBatchHistory || null,
            downloadValidationReport: settings.downloadValidationReport || null,
            downloadLotReconciliationReport: settings.downloadLotReconciliationReport || null,
            bindTableInteractions: typeof settings.bindTableInteractions === "function"
                ? settings.bindTableInteractions
                : function () {},
            getRawRows: settings.getRawRows || null,
            getParsedRows: settings.getParsedRows || null,
            getSelectedBatch: settings.getSelectedBatch || null,
            setUploadStatus: settings.setUploadStatus || null,
            setMappingStatus: settings.setMappingStatus || null,
            setXmlStatus: settings.setXmlStatus || null,
            setLotStatus: settings.setLotStatus || null,
            setTransitionStatus: settings.setTransitionStatus || null
        };

        if (!supportsDisabled(normalized.parseButton) ||
            !supportsDisabled(normalized.uploadButton) ||
            !supportsDisabled(normalized.refreshBatchesButton) ||
            !supportsDisabled(normalized.xmlQueueButton) ||
            !supportsDisabled(normalized.xmlRefreshButton) ||
            !supportsDisabled(normalized.lotBuildButton) ||
            !supportsDisabled(normalized.lotApplyButton) ||
            !supportsDisabled(normalized.transitionApplyButton) ||
            !supportsDisabled(normalized.historyRefreshButton) ||
            !supportsHidden(normalized.previewWrap) ||
            !supportsHidden(normalized.parseSummaryElement) ||
            !hasOptionsLength(normalized.transitionTargetSelect) ||
            !supportsValue(normalized.transitionReasonInput) ||
            !supportsValue(normalized.xmlSourceInput) ||
            !supportsValue(normalized.xmlExternalIdInput) ||
            !supportsValue(normalized.xmlFileNameInput) ||
            !supportsValue(normalized.xmlContentInput)) {
            throw new Error("createActionHandlers: required controls are missing.");
        }

        if (typeof normalized.parseSelectedFile !== "function" ||
            typeof normalized.applyMappingToRows !== "function" ||
            typeof normalized.rebuildMappingFromRaw !== "function" ||
            typeof normalized.resetWizard !== "function" ||
            typeof normalized.uploadBatch !== "function" ||
            typeof normalized.loadBatches !== "function" ||
            typeof normalized.queueXmlInboxItem !== "function" ||
            typeof normalized.loadXmlInbox !== "function" ||
            typeof normalized.buildLotRecommendations !== "function" ||
            typeof normalized.applyLotRecommendations !== "function" ||
            typeof normalized.updateLotActionButtons !== "function" ||
            typeof normalized.applyBatchTransition !== "function" ||
            typeof normalized.loadBatchHistory !== "function" ||
            typeof normalized.downloadValidationReport !== "function" ||
            typeof normalized.downloadLotReconciliationReport !== "function") {
            throw new Error("createActionHandlers: required action callbacks are missing.");
        }

        if (typeof normalized.getRawRows !== "function" ||
            typeof normalized.getParsedRows !== "function" ||
            typeof normalized.getSelectedBatch !== "function" ||
            typeof normalized.setUploadStatus !== "function" ||
            typeof normalized.setMappingStatus !== "function" ||
            typeof normalized.setXmlStatus !== "function" ||
            typeof normalized.setLotStatus !== "function" ||
            typeof normalized.setTransitionStatus !== "function") {
            throw new Error("createActionHandlers: state/status callbacks are required.");
        }

        return normalized;
    }

    const exportsObject = {
        normalizeAndValidate: normalizeAndValidate
    };

    if (typeof window !== "undefined") {
        window.ImportsPageActionHandlersValidation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
