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
            throw new Error(`Не удалось загрузить модуль contracts grid entrypoint: ${globalName}.`);
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

    const bootstrapModule = window.ContractsGridBootstrap;
    if (!(bootstrapModule && typeof bootstrapModule.createBootstrapContext === "function")) {
        return;
    }

    const runtimeModule = resolveModule(
        "ContractsGridRuntime",
        "./contracts-grid-runtime.js",
        ["initializeContractsGrid"]);

    const context = bootstrapModule.createBootstrapContext();
    if (!context) {
        return;
    }

    runtimeModule.initializeContractsGrid({
        window: window,
        context: context
    });
})();
