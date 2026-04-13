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
            throw new Error(`Не удалось загрузить модуль imports bootstrap: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] === "undefined";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные members: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    const validationModule = resolveModule(
        "ImportsPageBootstrapValidation",
        "./imports-page-bootstrap-validation.js",
        ["CONTROL_SELECTORS", "MODULE_REQUIREMENTS", "resolveControls", "resolveModuleRoots"]);

    const compositionModule = resolveModule(
        "ImportsPageBootstrapComposition",
        "./imports-page-bootstrap-composition.js",
        ["createBootstrapContextCore"]);

    function createBootstrapContext(options) {
        const settings = options || {};
        const hostDocument = settings.document || null;
        const hostWindow = settings.window || null;
        const logError = typeof settings.logError === "function" ? settings.logError : function () {};

        if (!hostDocument || typeof hostDocument.querySelector !== "function") {
            throw new Error("createBootstrapContext: document with querySelector is required.");
        }

        return compositionModule.createBootstrapContextCore({
            hostDocument: hostDocument,
            hostWindow: hostWindow,
            logError: logError,
            controlSelectors: validationModule.CONTROL_SELECTORS,
            moduleRequirements: validationModule.MODULE_REQUIREMENTS,
            resolveControls: validationModule.resolveControls,
            resolveModuleRoots: validationModule.resolveModuleRoots
        });
    }

    const exportsObject = {
        createBootstrapContext: createBootstrapContext
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
