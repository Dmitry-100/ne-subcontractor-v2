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
            throw new Error(`Не удалось загрузить модуль imports-page helpers: ${globalName}.`);
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

    const parsingRoot = resolveModule(
        "ImportsPageHelpersParsing",
        "./imports-page-helpers-parsing.js",
        ["createParsingHelpers"]);
    const rowMapperRoot = resolveModule(
        "ImportsPageHelpersRowMapper",
        "./imports-page-helpers-row-mapper.js",
        ["createRowMapper"]);

    function createHelpers(options) {
        const settings = options || {};
        const importStatusLabels = settings.importStatusLabels || {};
        const parsingHelpers = parsingRoot.createParsingHelpers({
            fieldDefinitions: settings.fieldDefinitions
        });
        const rowMapper = rowMapperRoot.createRowMapper();

        function localizeImportStatus(status) {
            const key = String(status || "").trim();
            return importStatusLabels[key] || key;
        }

        function formatNumber(value) {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return String(value ?? "");
            }

            return number.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
        }

        function formatShortDate(value) {
            if (!value) {
                return "";
            }

            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return String(value);
            }

            return date.toLocaleDateString("ru-RU");
        }

        function formatDateRange(startDate, finishDate) {
            if (startDate && finishDate) {
                return `${formatShortDate(startDate)} - ${formatShortDate(finishDate)}`;
            }

            if (startDate) {
                return `с ${formatShortDate(startDate)}`;
            }

            if (finishDate) {
                return `до ${formatShortDate(finishDate)}`;
            }

            return "-";
        }

        function buildDefaultXmlFileName(now) {
            const date = now instanceof Date ? now : new Date();
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            const hh = String(date.getHours()).padStart(2, "0");
            const min = String(date.getMinutes()).padStart(2, "0");
            const sec = String(date.getSeconds()).padStart(2, "0");
            return `express-plan-${yyyy}${mm}${dd}-${hh}${min}${sec}.xml`;
        }

        return Object.assign({}, parsingHelpers, rowMapper, {
            localizeImportStatus: localizeImportStatus,
            formatNumber: formatNumber,
            formatShortDate: formatShortDate,
            formatDateRange: formatDateRange,
            buildDefaultXmlFileName: buildDefaultXmlFileName
        });
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.ImportsPageHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
