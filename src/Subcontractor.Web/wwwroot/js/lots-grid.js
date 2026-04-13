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
            throw new Error(`Не удалось загрузить модуль lots grid entrypoint: ${globalName}.`);
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

    const lotsBootstrapRoot = window.LotsBootstrap;
    if (!lotsBootstrapRoot || typeof lotsBootstrapRoot.createBootstrapContext !== "function") {
        return;
    }

    const runtimeModule = resolveModule(
        "LotsGridRuntime",
        "./lots-grid-runtime.js",
        ["initializeLotsGrid"]);

    const context = lotsBootstrapRoot.createBootstrapContext();
    if (!context) {
        return;
    }

    runtimeModule.initializeLotsGrid({
        window: window,
        context: context
    });
})();
