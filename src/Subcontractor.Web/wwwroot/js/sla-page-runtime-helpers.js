"use strict";

(function () {
    function ensureModuleRoots(moduleRoots) {
        const roots = moduleRoots || {};
        const helpersRoot = roots.helpersRoot;
        if (!helpersRoot || typeof helpersRoot.createHelpers !== "function") {
            throw new Error("Не удалось инициализировать модуль SLA: helper-скрипт не загружен.");
        }

        const apiRoot = roots.apiRoot;
        if (!apiRoot || typeof apiRoot.createApiClient !== "function") {
            throw new Error("Не удалось инициализировать модуль SLA: API-скрипт не загружен.");
        }

        const rulesRoot = roots.rulesRoot;
        if (!rulesRoot ||
            typeof rulesRoot.createDraftRule !== "function" ||
            typeof rulesRoot.renderRulesMarkup !== "function" ||
            typeof rulesRoot.collectRulesFromRows !== "function") {
            throw new Error("Не удалось инициализировать модуль SLA: rules-скрипт не загружен.");
        }

        const violationsRoot = roots.violationsRoot;
        if (!violationsRoot ||
            typeof violationsRoot.renderViolationsMarkup !== "function" ||
            typeof violationsRoot.buildViolationReasonPayload !== "function") {
            throw new Error("Не удалось инициализировать модуль SLA: violations-скрипт не загружен.");
        }
    }

    function resolveFetchImpl(settings, hostWindow) {
        const config = settings || {};
        return config.fetchImpl ||
            (hostWindow && typeof hostWindow.fetch === "function" ? hostWindow.fetch.bind(hostWindow) : null) ||
            (typeof fetch === "function" ? fetch : null);
    }

    function resolveControls(moduleElement) {
        const controls = {
            rulesBody: moduleElement.querySelector("[data-sla-rules-body]"),
            violationsBody: moduleElement.querySelector("[data-sla-violations-body]"),
            includeResolvedInput: moduleElement.querySelector("[data-sla-include-resolved]"),
            runButton: moduleElement.querySelector("[data-sla-run]"),
            refreshViolationsButton: moduleElement.querySelector("[data-sla-refresh-violations]"),
            addRuleButton: moduleElement.querySelector("[data-sla-add-rule]"),
            saveRulesButton: moduleElement.querySelector("[data-sla-save-rules]"),
            reloadRulesButton: moduleElement.querySelector("[data-sla-reload-rules]")
        };

        const missingControls = Object.keys(controls).filter(function (name) {
            return !controls[name] || typeof controls[name].addEventListener !== "function" && name !== "rulesBody" && name !== "violationsBody";
        });

        if (!controls.rulesBody || !controls.violationsBody || missingControls.length > 0) {
            throw new Error("Не удалось инициализировать модуль SLA: не найдены обязательные элементы интерфейса.");
        }

        return controls;
    }

    function createApiOptions(moduleElement, fetchImpl, parseApiError) {
        return {
            rulesApi: moduleElement.dataset.rulesApi || "/api/sla/rules",
            violationsApi: moduleElement.dataset.violationsApi || "/api/sla/violations",
            runApi: moduleElement.dataset.runApi || "/api/sla/run",
            fetchImpl: fetchImpl,
            parseApiError: parseApiError
        };
    }

    function formatRunMonitoringStatus(result) {
        return "Цикл SLA завершен. Активно: " +
            result.activeViolations +
            ", открыто: " +
            result.openViolations +
            ", отправлено: " +
            result.notificationSuccessCount +
            ", ошибки: " +
            result.notificationFailureCount +
            ".";
    }

    const exportsObject = {
        ensureModuleRoots: ensureModuleRoots,
        resolveFetchImpl: resolveFetchImpl,
        resolveControls: resolveControls,
        createApiOptions: createApiOptions,
        formatRunMonitoringStatus: formatRunMonitoringStatus
    };

    if (typeof window !== "undefined") {
        window.SlaPageRuntimeHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
