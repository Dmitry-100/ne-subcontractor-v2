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
            throw new Error(`Не удалось загрузить модуль import helpers: ${globalName}.`);
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

    const fileParsingModule = resolveModule(
        "ContractsGridImportFileParsing",
        "./contracts-grid-import-file-parsing.js",
        ["isRowEmpty", "parseDelimitedText", "parseMdrImportFile"]);

    const mdrRowsModule = resolveModule(
        "ContractsGridImportMdrRows",
        "./contracts-grid-import-mdr-rows.js",
        ["parseMdrImportItemsFromRows"]);

    const exportsObject = {
        isRowEmpty: fileParsingModule.isRowEmpty,
        parseDelimitedText: fileParsingModule.parseDelimitedText,
        parseMdrImportFile: fileParsingModule.parseMdrImportFile,
        parseMdrImportItemsFromRows: mdrRowsModule.parseMdrImportItemsFromRows
    };

    if (typeof window !== "undefined") {
        window.ContractsGridImportHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
