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
            throw new Error(`Не удалось загрузить модуль procedures shortlist: ${globalName}.`);
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
        "ProceduresShortlistValidation",
        "./procedures-shortlist-validation.js",
        ["validateAndNormalizeOptions"]);

    const runtimeModule = resolveModule(
        "ProceduresShortlistRuntime",
        "./procedures-shortlist-runtime.js",
        ["createShortlistWorkspaceRuntime"]);

    function createShortlistWorkspace(options) {
        const settings = validationModule.validateAndNormalizeOptions(options);
        return runtimeModule.createShortlistWorkspaceRuntime(settings);
    }

    const exportsObject = {
        createShortlistWorkspace: createShortlistWorkspace
    };

    if (typeof window !== "undefined") {
        window.ProceduresShortlist = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
