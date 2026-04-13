"use strict";

(function () {
    const REQUIRED_CONTROLS = {
        statusElement: "[data-dashboard-status]",
        refreshButton: "[data-dashboard-refresh]",
        tasksElement: "[data-dashboard-tasks]",
        lotStatusesElement: '[data-dashboard-status-list="lots"]',
        procedureStatusesElement: '[data-dashboard-status-list="procedures"]',
        contractStatusesElement: '[data-dashboard-status-list="contracts"]'
    };

    const REQUIRED_MODULES = [
        {
            key: "dashboardHelpersRoot",
            moduleName: "DashboardPageHelpers",
            factoryName: "createHelpers",
            errorMessage: "Не удалось инициализировать модуль дашборда: helper-скрипт не загружен."
        },
        {
            key: "dashboardFormattersRoot",
            moduleName: "DashboardPageFormatters",
            factoryName: "createFormatters",
            errorMessage: "Не удалось инициализировать модуль дашборда: formatter-скрипт не загружен."
        }
    ];

    function reportError(statusElement, message, logError) {
        if (statusElement && typeof statusElement === "object") {
            statusElement.textContent = message;
            if (statusElement.classList && typeof statusElement.classList.add === "function") {
                statusElement.classList.add("dashboard-status--error");
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
                reportError(statusElement, module.errorMessage, logError);
                return null;
            }

            moduleRoots[module.key] = moduleRoot;
        }

        return moduleRoots;
    }

    function syncDisclosureHint(detailsElement) {
        if (!detailsElement) {
            return;
        }

        const summary = detailsElement.querySelector("summary");
        if (!summary) {
            return;
        }

        const hint = summary.querySelector(".dashboard-disclosure__hint");
        if (!hint) {
            return;
        }

        hint.textContent = detailsElement.open ? "свернуть" : "развернуть";
    }

    function initializeDisclosureHints(moduleRoot) {
        if (!moduleRoot || typeof moduleRoot.querySelectorAll !== "function") {
            return;
        }

        const disclosureElements = Array.from(moduleRoot.querySelectorAll(".dashboard-disclosure"));
        disclosureElements.forEach(function (detailsElement) {
            syncDisclosureHint(detailsElement);
            detailsElement.addEventListener("toggle", function () {
                syncDisclosureHint(detailsElement);
            });
        });
    }

    function createBootstrapContext(options) {
        const settings = options || {};
        const doc = settings.document || (typeof document !== "undefined" ? document : null);
        const win = settings.window || (typeof window !== "undefined" ? window : {});
        const logError = settings.logError;

        if (!doc || typeof doc.querySelector !== "function") {
            throw new Error("Dashboard bootstrap requires a document with querySelector.");
        }

        const moduleRoot = doc.querySelector("[data-dashboard-module]");
        if (!moduleRoot) {
            return null;
        }

        const controls = resolveControls(moduleRoot);
        if (!controls) {
            return null;
        }

        const moduleRoots = resolveModuleRoots(win, controls.statusElement, logError);
        if (!moduleRoots) {
            return null;
        }

        return {
            moduleRoot: moduleRoot,
            endpoint: moduleRoot.getAttribute("data-api-endpoint") || "/api/dashboard/summary",
            analyticsEndpoint: moduleRoot.getAttribute("data-analytics-endpoint") || "/api/analytics/kpi",
            controls: controls,
            moduleRoots: moduleRoots
        };
    }

    const exportsObject = {
        createBootstrapContext: createBootstrapContext,
        initializeDisclosureHints: initializeDisclosureHints
    };

    if (typeof window !== "undefined") {
        window.DashboardPageBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
