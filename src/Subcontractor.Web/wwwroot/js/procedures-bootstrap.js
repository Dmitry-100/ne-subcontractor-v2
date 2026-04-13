"use strict";

(function () {
    const CONTROL_SELECTORS = {
        gridElement: "[data-procedures-grid]",
        historyGridElement: "[data-procedures-history-grid]",
        statusElement: "[data-procedures-status]",
        selectedElement: "[data-procedures-selected]",
        transitionStatusElement: "[data-procedures-transition-status]",
        targetSelect: "[data-procedures-target]",
        reasonInput: "[data-procedures-reason]",
        applyButton: "[data-procedures-apply]",
        historyRefreshButton: "[data-procedures-history-refresh]",
        shortlistSelectedElement: "[data-procedures-shortlist-selected]",
        shortlistMaxIncludedInput: "[data-procedures-shortlist-max-included]",
        shortlistAdjustmentReasonInput: "[data-procedures-shortlist-adjustment-reason]",
        shortlistBuildButton: "[data-procedures-shortlist-build]",
        shortlistApplyButton: "[data-procedures-shortlist-apply]",
        shortlistAdjustmentsRefreshButton: "[data-procedures-shortlist-adjustments-refresh]",
        shortlistStatusElement: "[data-procedures-shortlist-status]",
        shortlistAdjustmentsStatusElement: "[data-procedures-shortlist-adjustments-status]",
        shortlistGridElement: "[data-procedures-shortlist-grid]",
        shortlistAdjustmentsGridElement: "[data-procedures-shortlist-adjustments-grid]"
    };

    const MODULE_REQUIREMENTS = [
        {
            key: "proceduresConfigRoot",
            globalName: "ProceduresConfig",
            methodName: "createConfig",
            errorMessage: "Скрипт ProceduresConfig не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresServicesRoot",
            globalName: "ProceduresServices",
            methodName: "createServices",
            errorMessage: "Скрипт ProceduresServices не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresGridHelpersRoot",
            globalName: "ProceduresGridHelpers",
            methodName: "createHelpers",
            errorMessage: "Скрипт ProceduresGridHelpers не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresApiRoot",
            globalName: "ProceduresApi",
            methodName: "createApiClient",
            errorMessage: "Скрипт ProceduresApi не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresWorkflowRoot",
            globalName: "ProceduresWorkflow",
            methodName: "createWorkflow",
            errorMessage: "Скрипт ProceduresWorkflow не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresGridColumnsRoot",
            globalName: "ProceduresGridColumns",
            methodName: "createColumns",
            errorMessage: "Скрипт ProceduresGridColumns не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresGridsRoot",
            globalName: "ProceduresGrids",
            methodName: "createProceduresGrid",
            errorMessage: "Скрипт ProceduresGrids не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresStoreRoot",
            globalName: "ProceduresStore",
            methodName: "createStore",
            errorMessage: "Скрипт ProceduresStore не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresRegistryEventsRoot",
            globalName: "ProceduresRegistryEvents",
            methodName: "createGridCallbacks",
            errorMessage: "Скрипт ProceduresRegistryEvents не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresDataRoot",
            globalName: "ProceduresData",
            methodName: "createDataService",
            errorMessage: "Скрипт ProceduresData не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresShortlistRoot",
            globalName: "ProceduresShortlist",
            methodName: "createShortlistWorkspace",
            errorMessage: "Скрипт ProceduresShortlist не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresSelectionRoot",
            globalName: "ProceduresSelection",
            methodName: "createSelectionController",
            errorMessage: "Скрипт ProceduresSelection не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "proceduresTransitionRoot",
            globalName: "ProceduresTransition",
            methodName: "createTransitionController",
            errorMessage: "Скрипт ProceduresTransition не загружен. Проверьте порядок подключения скриптов."
        }
    ];

    function createBootstrapContext(options) {
        const settings = options || {};
        const hostDocument = settings.document || null;
        const hostWindow = settings.window || null;
        const logError = typeof settings.logError === "function" ? settings.logError : function () {};

        if (!hostDocument || typeof hostDocument.querySelector !== "function") {
            throw new Error("createBootstrapContext: document with querySelector is required.");
        }

        const moduleRoot = hostDocument.querySelector("[data-procedures-module]");
        if (!moduleRoot) {
            return null;
        }

        const controls = {};
        const controlNames = Object.keys(CONTROL_SELECTORS);
        for (let index = 0; index < controlNames.length; index += 1) {
            const controlName = controlNames[index];
            controls[controlName] = moduleRoot.querySelector(CONTROL_SELECTORS[controlName]);
            if (!controls[controlName]) {
                return null;
            }
        }

        if (!(hostWindow && hostWindow.jQuery && hostWindow.DevExpress && hostWindow.DevExpress.data)) {
            logError("Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).");
            return null;
        }

        const moduleRoots = {};
        for (let index = 0; index < MODULE_REQUIREMENTS.length; index += 1) {
            const requirement = MODULE_REQUIREMENTS[index];
            const moduleRootObject = hostWindow[requirement.globalName];
            const hasFactory = moduleRootObject && typeof moduleRootObject[requirement.methodName] === "function";
            if (!hasFactory) {
                logError(requirement.errorMessage);
                return null;
            }

            moduleRoots[requirement.key] = moduleRootObject;
        }

        return {
            endpoint: moduleRoot.getAttribute("data-api-endpoint") || "/api/procedures",
            controls: controls,
            moduleRoots: moduleRoots
        };
    }

    const exportsObject = {
        createBootstrapContext: createBootstrapContext
    };

    if (typeof window !== "undefined") {
        window.ProceduresBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
