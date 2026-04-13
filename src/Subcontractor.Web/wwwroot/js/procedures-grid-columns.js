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
            throw new Error(`Не удалось загрузить модуль columns: ${globalName}.`);
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

    const historyModule = resolveModule(
        "ProceduresGridColumnsHistory",
        "./procedures-grid-columns-history.js",
        ["createColumns"]);

    const shortlistModule = resolveModule(
        "ProceduresGridColumnsShortlist",
        "./procedures-grid-columns-shortlist.js",
        ["createColumns"]);

    const registryModule = resolveModule(
        "ProceduresGridColumnsRegistry",
        "./procedures-grid-columns-registry.js",
        ["createColumns"]);

    function createColumns(options) {
        const settings = options || {};

        const historyColumns = historyModule.createColumns({
            localizeStatus: settings.localizeStatus
        });

        const shortlistColumns = shortlistModule.createColumns({
            localizeBoolean: settings.localizeBoolean,
            localizeContractorStatus: settings.localizeContractorStatus,
            localizeReliabilityClass: settings.localizeReliabilityClass
        });

        const proceduresColumns = registryModule.createColumns({
            approvalModeLookup: settings.approvalModeLookup,
            statusLookup: settings.statusLookup
        });

        return Object.assign({}, historyColumns, shortlistColumns, proceduresColumns);
    }

    const exportsObject = {
        createColumns: createColumns
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridColumns = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
