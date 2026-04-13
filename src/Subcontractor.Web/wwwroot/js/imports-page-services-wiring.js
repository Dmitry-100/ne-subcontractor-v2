"use strict";

(function () {
    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль imports services wiring: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    const validationModule = resolveModule(
        "ImportsPageServicesWiringValidation",
        "./imports-page-services-wiring-validation.js",
        ["normalizeAndValidate"]);

    const foundationModule = resolveModule(
        "ImportsPageServicesWiringFoundation",
        "./imports-page-services-wiring-foundation.js",
        ["createFoundationServices"]);

    const orchestrationModule = resolveModule(
        "ImportsPageServicesWiringOrchestration",
        "./imports-page-services-wiring-orchestration.js",
        ["createOrchestrationServices"]);

    function createServicesWiring(options) {
        const normalized = validationModule.normalizeAndValidate(options);
        const foundation = foundationModule.createFoundationServices(normalized);
        const orchestration = orchestrationModule.createOrchestrationServices({
            controls: normalized.controls,
            roots: normalized.roots,
            stateStore: normalized.stateStore,
            endpoint: normalized.endpoint,
            xmlInboxEndpoint: normalized.xmlInboxEndpoint,
            lotRecommendationsEndpoint: normalized.lotRecommendationsEndpoint,
            loadBatchHistory: normalized.loadBatchHistory,
            scheduleTimeout: normalized.scheduleTimeout,
            foundation: foundation
        });

        return {
            apiClient: foundation.apiClient,
            setUploadStatus: foundation.setUploadStatus,
            setBatchesStatus: foundation.setBatchesStatus,
            setMappingStatus: foundation.setMappingStatus,
            setTransitionStatus: foundation.setTransitionStatus,
            setXmlStatus: foundation.setXmlStatus,
            setLotStatus: foundation.setLotStatus,
            setWorkflowActionsEnabled: orchestration.setWorkflowActionsEnabled,
            importsPageMapping: foundation.importsPageMapping,
            importsPageMappingUi: foundation.importsPageMappingUi,
            importsPageBatchTables: foundation.importsPageBatchTables,
            importsPageUpload: foundation.importsPageUpload,
            importsPageReports: foundation.importsPageReports,
            importsPageBatches: orchestration.importsPageBatches,
            importsPageXmlInbox: orchestration.importsPageXmlInbox,
            importsPageLot: orchestration.importsPageLot,
            importsPageInteractions: orchestration.importsPageInteractions,
            importsPageFileParser: foundation.importsPageFileParser
        };
    }

    const exportsObject = {
        createServicesWiring: createServicesWiring
    };

    if (typeof window !== "undefined") {
        window.ImportsPageServicesWiring = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
