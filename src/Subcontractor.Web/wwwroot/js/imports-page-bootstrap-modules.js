"use strict";

(function () {
    const moduleRequirementsRoot =
        typeof window !== "undefined" && window.ImportsPageBootstrapModuleRequirements
            ? window.ImportsPageBootstrapModuleRequirements
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-bootstrap-module-requirements.js")
                : null;

    if (!moduleRequirementsRoot || !Array.isArray(moduleRequirementsRoot.MODULE_REQUIREMENTS)) {
        throw new Error("ImportsPageBootstrapModules requires ImportsPageBootstrapModuleRequirements.MODULE_REQUIREMENTS.");
    }

    const MODULE_REQUIREMENTS = moduleRequirementsRoot.MODULE_REQUIREMENTS;

    function resolveModuleRoots(hostWindow, moduleRequirements, logError) {
        const requirements = Array.isArray(moduleRequirements) ? moduleRequirements : MODULE_REQUIREMENTS;
        const reportError = typeof logError === "function" ? logError : function () {};
        const moduleRoots = {};

        for (let index = 0; index < requirements.length; index += 1) {
            const requirement = requirements[index];
            const moduleRootObject = hostWindow ? hostWindow[requirement.globalName] : null;
            const hasFactory = !requirement.methodName ||
                (moduleRootObject && typeof moduleRootObject[requirement.methodName] === "function");

            if (!moduleRootObject || !hasFactory) {
                reportError(requirement.errorMessage);
                return null;
            }

            moduleRoots[requirement.key] = moduleRootObject;
        }

        return moduleRoots;
    }

    const exportsObject = {
        MODULE_REQUIREMENTS: MODULE_REQUIREMENTS,
        resolveModuleRoots: resolveModuleRoots
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBootstrapModules = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
