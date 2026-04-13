"use strict";

(function () {
    const requiredElementKeys = [
        "monitoringSelectedElement",
        "monitoringStatusElement",
        "monitoringRefreshButton",
        "monitoringSaveButton",
        "monitoringControlPointsGridElement",
        "monitoringStagesGridElement",
        "monitoringMdrCardsGridElement",
        "monitoringMdrRowsGridElement",
        "monitoringControlPointSelectedElement",
        "monitoringMdrCardSelectedElement",
        "mdrImportFileInput",
        "mdrImportModeSelect",
        "mdrImportApplyButton",
        "mdrImportResetButton"
    ];

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsMonitoringBootstrap requires ${name}.`);
        }
    }

    function requireMethod(target, name, methodName) {
        if (!(target && typeof target[methodName] === "function")) {
            throw new Error(`ContractsMonitoringBootstrap requires ${name}.${methodName}().`);
        }
    }

    function ensureRequiredElements(elements) {
        const missing = requiredElementKeys.find(function (key) {
            return !elements[key];
        });

        if (missing) {
            throw new Error(`ContractsMonitoringBootstrap missing required element: ${missing}.`);
        }
    }

    function validateMonitoringModel(monitoringModel) {
        requireMethod(monitoringModel, "monitoringModel", "normalizeControlPoint");
        requireMethod(monitoringModel, "monitoringModel", "normalizeMdrCard");
        requireMethod(monitoringModel, "monitoringModel", "calculateDeviationPercent");
        requireMethod(monitoringModel, "monitoringModel", "calculateMdrCardMetrics");
        requireMethod(monitoringModel, "monitoringModel", "createClientId");
        requireMethod(monitoringModel, "monitoringModel", "buildControlPointsPayload");
        requireMethod(monitoringModel, "monitoringModel", "buildMdrCardsPayload");
    }

    function createCompositionContext(options) {
        const settings = options || {};
        const elements = settings.elements || {};

        ensureRequiredElements(elements);

        requireMethod(settings.monitoringGridsModule, "monitoringGridsModule", "createGrids");
        requireMethod(settings.monitoringControlsModule, "monitoringControlsModule", "createController");
        requireMethod(settings.monitoringSelectionModule, "monitoringSelectionModule", "createController");
        requireMethod(settings.monitoringDataModule, "monitoringDataModule", "createService");
        requireMethod(settings.monitoringImportModule, "monitoringImportModule", "createController");
        requireMethod(settings.monitoringMdrModule, "monitoringMdrModule", "buildMdrCardSelectionKey");
        requireMethod(settings.apiClient, "apiClient", "importMonitoringMdrForecastFact");

        validateMonitoringModel(settings.monitoringModel);

        requireFunction(settings.getSelectedContract, "getSelectedContract");
        requireFunction(settings.canEditMilestones, "canEditMilestones");
        requireFunction(settings.localizeStatus, "localizeStatus");
        requireFunction(settings.setMonitoringStatus, "setMonitoringStatus");
        requireFunction(settings.setMdrImportStatus, "setMdrImportStatus");
        requireFunction(settings.parseMdrImportFile, "parseMdrImportFile");
        requireFunction(settings.parseMdrImportItemsFromRows, "parseMdrImportItemsFromRows");

        return {
            elements: elements,
            settings: settings
        };
    }

    const exportsObject = {
        createCompositionContext: createCompositionContext
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
