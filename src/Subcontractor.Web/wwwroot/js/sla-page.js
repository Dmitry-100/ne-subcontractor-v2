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
            throw new Error(`Не удалось загрузить модуль SLA: ${globalName}.`);
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

    if (typeof document === "undefined" || !document || typeof document.querySelector !== "function") {
        return;
    }

    const moduleElement = document.querySelector("[data-sla-module]");
    if (!moduleElement) {
        return;
    }

    const statusElement = moduleElement.querySelector("[data-sla-status]");

    function setStatus(text, isError) {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = text;
        statusElement.classList.toggle("dashboard-status--error", Boolean(isError));
    }

    let runtimeRoot = null;
    try {
        runtimeRoot = resolveModule(
            "SlaPageRuntime",
            "./sla-page-runtime.js",
            ["initializeSlaPage"]);
    } catch (error) {
        setStatus(error.message, true);
        return;
    }

    try {
        runtimeRoot.initializeSlaPage({
            window: window,
            moduleElement: moduleElement,
            setStatus: setStatus,
            fetchImpl: typeof fetch === "function" ? fetch : null,
            moduleRoots: {
                helpersRoot: window.SlaPageHelpers,
                apiRoot: window.SlaPageApi,
                rulesRoot: window.SlaPageRules,
                violationsRoot: window.SlaPageViolations
            }
        });
    } catch (error) {
        setStatus(error.message, true);
    }
})();
