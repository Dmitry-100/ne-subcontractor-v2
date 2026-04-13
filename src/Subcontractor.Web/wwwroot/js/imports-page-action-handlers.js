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
            throw new Error(`Не удалось загрузить модуль imports action handlers: ${globalName}.`);
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

    const validationModule = resolveModule(
        "ImportsPageActionHandlersValidation",
        "./imports-page-action-handlers-validation.js",
        ["normalizeAndValidate"]);

    const compositionModule = resolveModule(
        "ImportsPageActionHandlersComposition",
        "./imports-page-action-handlers-composition.js",
        ["createHandlers"]);

    function createActionHandlers(options) {
        const normalized = validationModule.normalizeAndValidate(options);
        return compositionModule.createHandlers(normalized);
    }

    const exportsObject = {
        createActionHandlers: createActionHandlers
    };

    if (typeof window !== "undefined") {
        window.ImportsPageActionHandlers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
