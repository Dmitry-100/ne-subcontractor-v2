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
            throw new Error(`Не удалось загрузить модуль imports bootstrap validation: ${globalName}.`);
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

    const controlsModule = resolveModule(
        "ImportsPageBootstrapControls",
        "./imports-page-bootstrap-controls.js",
        ["CONTROL_SELECTORS", "resolveControls"]);

    const modulesModule = resolveModule(
        "ImportsPageBootstrapModules",
        "./imports-page-bootstrap-modules.js",
        ["MODULE_REQUIREMENTS", "resolveModuleRoots"]);

    const exportsObject = {
        CONTROL_SELECTORS: controlsModule.CONTROL_SELECTORS,
        MODULE_REQUIREMENTS: modulesModule.MODULE_REQUIREMENTS,
        resolveControls: controlsModule.resolveControls,
        resolveModuleRoots: modulesModule.resolveModuleRoots
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBootstrapValidation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
