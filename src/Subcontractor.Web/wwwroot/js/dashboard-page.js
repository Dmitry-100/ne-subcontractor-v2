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
            throw new Error(`Не удалось загрузить модуль dashboard entrypoint: ${globalName}.`);
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

    const bootstrapRoot = window.DashboardPageBootstrap;
    if (!bootstrapRoot || typeof bootstrapRoot.createBootstrapContext !== "function") {
        return;
    }

    const runtimeModule = resolveModule(
        "DashboardPageRuntime",
        "./dashboard-page-runtime.js",
        ["initializeDashboardPage"]);

    const context = bootstrapRoot.createBootstrapContext({
        document: document,
        window: window,
        logError: function (message) {
            if (window.console && typeof window.console.error === "function") {
                window.console.error(message);
            }
        }
    });

    if (!context) {
        return;
    }

    runtimeModule.initializeDashboardPage({
        window: window,
        document: document,
        context: context,
        bootstrapRoot: bootstrapRoot
    });
})();
