"use strict";

(function () {
    const REQUIRED_CONTROLS = {
        statusElement: "[data-contractors-status]",
        ratingStatusElement: "[data-contractors-rating-status]",
        selectedElement: "[data-contractors-selected]",
        historyStatusElement: "[data-contractors-history-status]",
        analyticsStatusElement: "[data-contractors-analytics-status]",
        refreshButton: "[data-contractors-refresh]",
        recalcAllButton: "[data-contractors-recalculate-all]",
        recalcSelectedButton: "[data-contractors-recalculate-selected]",
        reloadModelButton: "[data-contractors-reload-model]",
        saveModelButton: "[data-contractors-save-model]",
        manualSaveButton: "[data-contractors-manual-save]",
        versionCodeInput: "[data-contractors-model-version-code]",
        modelNameInput: "[data-contractors-model-name]",
        modelNotesInput: "[data-contractors-model-notes]",
        weightDeliveryInput: "[data-contractors-weight-delivery]",
        weightCommercialInput: "[data-contractors-weight-commercial]",
        weightClaimInput: "[data-contractors-weight-claim]",
        weightManualInput: "[data-contractors-weight-manual]",
        weightWorkloadInput: "[data-contractors-weight-workload]",
        manualScoreInput: "[data-contractors-manual-score]",
        manualCommentInput: "[data-contractors-manual-comment]",
        contractorsGridElement: "[data-contractors-grid]",
        historyGridElement: "[data-contractors-history-grid]",
        analyticsGridElement: "[data-contractors-analytics-grid]"
    };

    const REQUIRED_MODULES = [
        {
            key: "contractorsGridHelpersRoot",
            moduleName: "ContractorsGridHelpers",
            factoryName: "createHelpers"
        },
        {
            key: "contractorsApiRoot",
            moduleName: "ContractorsApi",
            factoryName: "createApiClient"
        },
        {
            key: "contractorsGridsRoot",
            moduleName: "ContractorsGrids",
            factoryName: "createGrids"
        },
        {
            key: "contractorsDataRoot",
            moduleName: "ContractorsData",
            factoryName: "createDataRuntime"
        },
        {
            key: "contractorsModelRoot",
            moduleName: "ContractorsModel",
            factoryName: "createModelService"
        },
        {
            key: "contractorsUiStateRoot",
            moduleName: "ContractorsUiState",
            factoryName: "createUiState"
        },
        {
            key: "contractorsActionsRoot",
            moduleName: "ContractorsActions",
            factoryName: "createActions"
        }
    ];

    function isStatusElement(element) {
        return element && typeof element === "object";
    }

    function reportError(statusElement, message, logError) {
        if (isStatusElement(statusElement)) {
            statusElement.textContent = message;
            if (statusElement.classList && typeof statusElement.classList.add === "function") {
                statusElement.classList.add("contractors-status--error");
            }
        }

        if (typeof logError === "function") {
            logError(message);
        }
    }

    function resolveControls(moduleRoot) {
        const controls = {};
        const entries = Object.entries(REQUIRED_CONTROLS);
        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index];
            const controlKey = entry[0];
            const selector = entry[1];
            const control = moduleRoot.querySelector(selector);
            if (!control) {
                return null;
            }

            controls[controlKey] = control;
        }

        return controls;
    }

    function resolveModuleRoots(win, statusElement, logError) {
        const moduleRoots = {};
        for (let index = 0; index < REQUIRED_MODULES.length; index += 1) {
            const module = REQUIRED_MODULES[index];
            const moduleRoot = win[module.moduleName];
            if (!moduleRoot || typeof moduleRoot[module.factoryName] !== "function") {
                reportError(
                    statusElement,
                    `Скрипт ${module.moduleName} не загружен. Проверьте порядок подключения скриптов.`,
                    logError);
                return null;
            }

            moduleRoots[module.key] = moduleRoot;
        }

        return moduleRoots;
    }

    function createBootstrapContext(options) {
        const settings = options || {};
        const doc = settings.document || (typeof document !== "undefined" ? document : null);
        const win = settings.window || (typeof window !== "undefined" ? window : {});
        const logError = settings.logError;

        if (!doc || typeof doc.querySelector !== "function") {
            throw new Error("Contractors bootstrap requires a document with querySelector.");
        }

        const moduleRoot = doc.querySelector("[data-contractors-module]");
        if (!moduleRoot) {
            return null;
        }

        const controls = resolveControls(moduleRoot);
        if (!controls) {
            return null;
        }

        const statusElement = controls.statusElement;
        if (!(win.jQuery && win.DevExpress && win.DevExpress.data)) {
            reportError(statusElement, "Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).", logError);
            return null;
        }

        const moduleRoots = resolveModuleRoots(win, statusElement, logError);
        if (!moduleRoots) {
            return null;
        }

        const endpoints = {
            endpoint: moduleRoot.getAttribute("data-api-endpoint") || "/api/contractors",
            ratingModelEndpoint: moduleRoot.getAttribute("data-rating-model-endpoint") || "/api/contractors/rating/model",
            ratingRecalculateEndpoint: moduleRoot.getAttribute("data-rating-recalculate-endpoint") || "/api/contractors/rating/recalculate",
            ratingAnalyticsEndpoint: moduleRoot.getAttribute("data-rating-analytics-endpoint") || "/api/contractors/rating/analytics"
        };

        return {
            moduleRoot: moduleRoot,
            endpoints: endpoints,
            controls: controls,
            moduleRoots: moduleRoots
        };
    }

    const exportsObject = {
        createBootstrapContext: createBootstrapContext
    };

    if (typeof window !== "undefined") {
        window.ContractorsBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
