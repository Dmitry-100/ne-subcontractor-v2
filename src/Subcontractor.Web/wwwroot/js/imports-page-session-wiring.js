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
            throw new Error(`Не удалось загрузить модуль imports session wiring: ${globalName}.`);
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
        "ImportsPageSessionWiringValidation",
        "./imports-page-session-wiring-validation.js",
        ["normalizeAndValidate"]);

    const compositionModule = resolveModule(
        "ImportsPageSessionWiringComposition",
        "./imports-page-session-wiring-composition.js",
        ["createComposition"]);

    function createSessionWiring(options) {
        const normalized = validationModule.normalizeAndValidate(options);
        return compositionModule.createComposition(normalized);
    }

    const exportsObject = {
        createSessionWiring: createSessionWiring
    };

    if (typeof window !== "undefined") {
        window.ImportsPageSessionWiring = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
