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
            throw new Error(`Не удалось загрузить модуль procedures grid: ${globalName}.`);
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

    const moduleRoot = document.querySelector("[data-procedures-module]");
    if (!moduleRoot) {
        return;
    }

    const bootstrapStatusElement = moduleRoot.querySelector("[data-procedures-status]");
    function reportBootstrapError(message) {
        if (!bootstrapStatusElement) {
            return;
        }

        bootstrapStatusElement.textContent = message;
        bootstrapStatusElement.classList.add("procedures-status--error");
    }

    const proceduresBootstrapRoot = window.ProceduresBootstrap;
    if (!proceduresBootstrapRoot || typeof proceduresBootstrapRoot.createBootstrapContext !== "function") {
        reportBootstrapError("Скрипт ProceduresBootstrap не загружен. Проверьте порядок подключения скриптов.");
        return;
    }

    const bootstrapContext = proceduresBootstrapRoot.createBootstrapContext({
        document: document,
        window: window,
        logError: reportBootstrapError
    });
    if (!bootstrapContext) {
        return;
    }

    let proceduresGridRuntimeRoot = null;
    try {
        proceduresGridRuntimeRoot = resolveModule(
            "ProceduresGridRuntime",
            "./procedures-grid-runtime.js",
            ["initializeProceduresGrid"]);
    } catch (error) {
        reportBootstrapError(error.message);
        return;
    }

    try {
        proceduresGridRuntimeRoot.initializeProceduresGrid({
            window: window,
            endpoint: bootstrapContext.endpoint,
            controls: bootstrapContext.controls,
            moduleRoots: bootstrapContext.moduleRoots
        });
    } catch (error) {
        reportBootstrapError(`Не удалось инициализировать страницу процедур: ${error.message}`);
    }
})();
