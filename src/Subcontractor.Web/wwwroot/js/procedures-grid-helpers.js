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
            throw new Error(`Не удалось загрузить модуль helpers: ${globalName}.`);
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

    const localizationModule = resolveModule(
        "ProceduresGridLocalizationHelpers",
        "./procedures-grid-localization-helpers.js",
        ["createHelpers"]);

    const filterModule = resolveModule(
        "ProceduresGridFilterHelpers",
        "./procedures-grid-filter-helpers.js",
        ["createHelpers"]);

    const payloadModule = resolveModule(
        "ProceduresGridPayloadHelpers",
        "./procedures-grid-payload-helpers.js",
        ["createHelpers"]);

    function createHelpers(options) {
        const settings = options || {};

        const localizationHelpers = localizationModule.createHelpers({
            statusCaptions: settings.statusCaptions || {},
            contractorStatusCaptions: settings.contractorStatusCaptions || {},
            reliabilityClassCaptions: settings.reliabilityClassCaptions || {}
        });

        const filterHelpers = filterModule.createHelpers({
            localizeStatus: localizationHelpers.localizeStatus
        });

        const payloadHelpers = payloadModule.createHelpers({
            approvalModes: settings.approvalModes
        });

        return Object.assign({}, localizationHelpers, filterHelpers, payloadHelpers);
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
