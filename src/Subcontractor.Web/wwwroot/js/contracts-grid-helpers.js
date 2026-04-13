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

    const filterHelpers = resolveModule("ContractsGridFilterHelpers", "./contracts-grid-filter-helpers.js", [
        "appendFilterHint",
        "buildStatusFilter",
        "clearUrlFilters",
        "describeUrlFilters",
        "readUrlFilterState"
    ]);

    const payloadHelpers = resolveModule("ContractsGridPayloadHelpers", "./contracts-grid-payload-helpers.js", [
        "buildMilestonesPayload",
        "isGuid",
        "normalizeGuid",
        "parseErrorBody",
        "toNullableDate",
        "toNumber"
    ]);

    const importHelpers = resolveModule("ContractsGridImportHelpers", "./contracts-grid-import-helpers.js", [
        "isRowEmpty",
        "parseMdrImportFile",
        "parseMdrImportItemsFromRows"
    ]);

    const exportsObject = Object.assign({}, filterHelpers, payloadHelpers, importHelpers);

    if (typeof window !== "undefined") {
        window.ContractsGridHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
