"use strict";

(function () {
    const REQUIRED_ROOT_KEYS = [
        "importsPageHelpersRoot",
        "importsPageApiRoot",
        "importsPageStatusRoot",
        "importsPageWorkflowRoot",
        "importsPageWorkflowUiRoot",
        "importsPageMappingRoot",
        "importsPageTableModelsRoot",
        "importsPageMappingUiRoot",
        "importsPageBatchTablesRoot",
        "importsPageXmlRoot",
        "importsPageUploadRoot",
        "importsPageReportsRoot",
        "importsPageBatchesRoot",
        "importsPageXmlInboxRoot",
        "importsPageLotTablesRoot",
        "importsPageLotOrchestrationRoot",
        "importsPageInteractionsRoot",
        "importsPageWorkbookRoot",
        "importsPageFileParserRoot",
        "importsPageLotStateRoot"
    ];

    const REQUIRED_CONTROL_KEYS = [
        "uploadStatusElement",
        "batchesStatusElement",
        "mappingStatusElement",
        "transitionStatusElement",
        "xmlStatusElement",
        "lotStatusElement",
        "mappingGrid",
        "previewWrap",
        "previewTable",
        "batchesTable",
        "invalidTable",
        "invalidWrapElement",
        "historyTable",
        "historyWrapElement",
        "detailsElement",
        "detailsTitleElement",
        "detailsSummaryElement",
        "transitionTargetSelect",
        "transitionReasonInput",
        "transitionApplyButton",
        "historyRefreshButton",
        "downloadInvalidReportButton",
        "downloadFullReportButton",
        "downloadLotReconciliationReportButton",
        "lotBuildButton",
        "lotApplyButton",
        "xmlTable",
        "lotGroupsTable",
        "lotSelectedTable"
    ];

    const REQUIRED_STATESTORE_METHODS = [
        "getSelectedBatch",
        "setSelectedBatch",
        "getSelectedBatchId",
        "getLotRecommendations",
        "setLotRecommendations",
        "getLotRecommendationsBatchId",
        "setLotRecommendationsBatchId",
        "getLotSelectionsByKey",
        "setLotSelectionsByKey",
        "clearDetailsPoll",
        "setDetailsPollHandle"
    ];

    function hasRequiredMembers(source, keys) {
        if (!source || typeof source !== "object") {
            return false;
        }

        for (let index = 0; index < keys.length; index += 1) {
            const key = keys[index];
            if (!source[key]) {
                return false;
            }
        }

        return true;
    }

    function hasRequiredMethods(source, methods) {
        if (!source || typeof source !== "object") {
            return false;
        }

        for (let index = 0; index < methods.length; index += 1) {
            const methodName = methods[index];
            if (typeof source[methodName] !== "function") {
                return false;
            }
        }

        return true;
    }

    function normalizeAndValidate(options) {
        const settings = options || {};
        const normalized = {
            controls: settings.controls || null,
            roots: settings.roots || null,
            config: settings.config || null,
            stateStore: settings.stateStore || null,
            endpoint: settings.endpoint || "",
            xmlInboxEndpoint: settings.xmlInboxEndpoint || "",
            lotRecommendationsEndpoint: settings.lotRecommendationsEndpoint || "",
            loadBatchHistory: settings.loadBatchHistory || null,
            scheduleTimeout: settings.scheduleTimeout || null,
            getSheetJs: settings.getSheetJs || null,
            openWindow: settings.openWindow || null
        };

        if (!hasRequiredMembers(normalized.roots, REQUIRED_ROOT_KEYS)) {
            throw new Error("createServicesWiring: required roots are missing.");
        }

        if (!hasRequiredMembers(normalized.controls, REQUIRED_CONTROL_KEYS)) {
            throw new Error("createServicesWiring: required controls are missing.");
        }

        if (!normalized.config ||
            !Array.isArray(normalized.config.fieldDefinitions) ||
            !normalized.config.importStatusTransitions ||
            !normalized.config.importStatusLabels ||
            typeof normalized.config.previewRowLimit !== "number" ||
            typeof normalized.config.maxImportRows !== "number") {
            throw new Error("createServicesWiring: config is invalid.");
        }

        if (!hasRequiredMethods(normalized.stateStore, REQUIRED_STATESTORE_METHODS)) {
            throw new Error("createServicesWiring: stateStore contract is invalid.");
        }

        if (!normalized.endpoint ||
            !normalized.xmlInboxEndpoint ||
            !normalized.lotRecommendationsEndpoint ||
            typeof normalized.loadBatchHistory !== "function" ||
            typeof normalized.scheduleTimeout !== "function" ||
            typeof normalized.getSheetJs !== "function" ||
            typeof normalized.openWindow !== "function") {
            throw new Error("createServicesWiring: required callbacks and endpoints are missing.");
        }

        return normalized;
    }

    const exportsObject = {
        normalizeAndValidate: normalizeAndValidate
    };

    if (typeof window !== "undefined") {
        window.ImportsPageServicesWiringValidation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
