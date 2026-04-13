"use strict";

(function () {
    function normalizeAndValidate(options) {
        const settings = options || {};

        const normalized = {
            mappingOrchestrationRoot: settings.mappingOrchestrationRoot || null,
            wizardSessionRoot: settings.wizardSessionRoot || null,
            actionHandlersRoot: settings.actionHandlersRoot || null,
            actionBindingsRoot: settings.actionBindingsRoot || null,
            controls: settings.controls || null,
            stateStore: settings.stateStore || null,
            mappingUi: settings.mappingUi || null,
            mappingService: settings.mappingService || null,
            fileParser: settings.fileParser || null,
            uploadHelpers: settings.uploadHelpers || null,
            apiClient: settings.apiClient || null,
            batchesService: settings.batchesService || null,
            lotService: settings.lotService || null,
            xmlInboxService: settings.xmlInboxService || null,
            reportsHelpers: settings.reportsHelpers || null,
            interactionsService: settings.interactionsService || null,
            queuedEndpoint: settings.queuedEndpoint || "",
            loadBatchHistory: settings.loadBatchHistory || null,
            setMappingStatus: settings.setMappingStatus || null,
            setUploadStatus: settings.setUploadStatus || null,
            setWorkflowActionsEnabled: settings.setWorkflowActionsEnabled || null,
            setTransitionStatus: settings.setTransitionStatus || null,
            setXmlStatus: settings.setXmlStatus || null,
            setLotStatus: settings.setLotStatus || null
        };

        if (!normalized.mappingOrchestrationRoot ||
            typeof normalized.mappingOrchestrationRoot.createMappingOrchestrationService !== "function") {
            throw new Error("createSessionWiring: mappingOrchestrationRoot.createMappingOrchestrationService is required.");
        }

        if (!normalized.wizardSessionRoot || typeof normalized.wizardSessionRoot.createWizardSessionService !== "function") {
            throw new Error("createSessionWiring: wizardSessionRoot.createWizardSessionService is required.");
        }

        if (!normalized.actionHandlersRoot || typeof normalized.actionHandlersRoot.createActionHandlers !== "function") {
            throw new Error("createSessionWiring: actionHandlersRoot.createActionHandlers is required.");
        }

        if (!normalized.actionBindingsRoot || typeof normalized.actionBindingsRoot.createActionBindingsService !== "function") {
            throw new Error("createSessionWiring: actionBindingsRoot.createActionBindingsService is required.");
        }

        if (!normalized.controls ||
            !normalized.controls.fileInput ||
            !normalized.controls.parseButton ||
            !normalized.controls.applyMappingButton ||
            !normalized.controls.uploadButton ||
            !normalized.controls.transitionTargetSelect) {
            throw new Error("createSessionWiring: required controls are missing.");
        }

        if (!normalized.stateStore ||
            typeof normalized.stateStore.getRawRows !== "function" ||
            typeof normalized.stateStore.getParsedRows !== "function" ||
            typeof normalized.stateStore.getSelectedBatch !== "function" ||
            typeof normalized.stateStore.setParsedRows !== "function") {
            throw new Error("createSessionWiring: stateStore contract is invalid.");
        }

        if (!normalized.mappingUi ||
            !normalized.mappingService ||
            !normalized.fileParser ||
            !normalized.uploadHelpers ||
            !normalized.apiClient ||
            !normalized.batchesService ||
            !normalized.lotService ||
            !normalized.xmlInboxService ||
            !normalized.reportsHelpers ||
            !normalized.interactionsService ||
            !normalized.queuedEndpoint ||
            typeof normalized.loadBatchHistory !== "function" ||
            typeof normalized.setMappingStatus !== "function" ||
            typeof normalized.setUploadStatus !== "function" ||
            typeof normalized.setWorkflowActionsEnabled !== "function" ||
            typeof normalized.setTransitionStatus !== "function" ||
            typeof normalized.setXmlStatus !== "function" ||
            typeof normalized.setLotStatus !== "function") {
            throw new Error("createSessionWiring: service dependencies are missing.");
        }

        return normalized;
    }

    const exportsObject = {
        normalizeAndValidate: normalizeAndValidate
    };

    if (typeof window !== "undefined") {
        window.ImportsPageSessionWiringValidation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
