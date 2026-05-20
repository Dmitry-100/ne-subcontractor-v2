"use strict";

(function () {
    function createWorkbookParser(options) {
        const settings = options || {};
        if (typeof settings.getSheetJs !== "function" ||
            typeof settings.isRowEmpty !== "function") {
            throw new Error("В ImportsPageWorkbook отсутствуют обязательные зависимости.");
        }

        const getSheetJs = settings.getSheetJs;
        const isRowEmpty = settings.isRowEmpty;
        const preferredSheetNames = Array.isArray(settings.preferredSheetNames)
            ? settings.preferredSheetNames
            : ["данные из экспресс"];
        const onSheetWarning = typeof settings.onSheetWarning === "function"
            ? settings.onSheetWarning
            : function () {};

        function normalizeSheetName(value) {
            return String(value ?? "")
                .trim()
                .toLowerCase()
                .replace(/[^0-9a-zа-яё]+/gi, "");
        }

        function selectSheetName(workbook) {
            const sheetNames = workbook.SheetNames;
            const preferred = preferredSheetNames
                .map(normalizeSheetName)
                .filter(function (value) {
                    return value.length > 0;
                });

            const matched = sheetNames.find(function (name) {
                const normalizedName = normalizeSheetName(name);
                return preferred.some(function (preferredName) {
                    return normalizedName === preferredName || normalizedName.includes(preferredName);
                });
            });

            if (matched) {
                return matched;
            }

            const fallback = sheetNames[0];
            if (preferredSheetNames.length > 0) {
                onSheetWarning(
                    `В книге не найден лист «${preferredSheetNames[0]}». Использован первый лист «${fallback}».`);
            }

            return fallback;
        }

        async function parseWorkbookFile(file) {
            const sheetJs = getSheetJs();
            if (!(sheetJs && sheetJs.read && sheetJs.utils && sheetJs.utils.sheet_to_json)) {
                throw new Error("Парсер XLSX не загружен. Проверьте доступ к SheetJS (CDN или локальный режим).");
            }

            const bytes = await file.arrayBuffer();
            const workbook = sheetJs.read(bytes, { type: "array", raw: false });
            if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
                throw new Error("Книга не содержит листов.");
            }

            const sheetName = selectSheetName(workbook);
            const sheet = workbook.Sheets[sheetName];
            const rows = sheetJs.utils.sheet_to_json(sheet, {
                header: 1,
                blankrows: false,
                raw: false,
                defval: ""
            });

            return (Array.isArray(rows) ? rows : []).filter(function (row) {
                return !isRowEmpty(row);
            });
        }

        return {
            parseWorkbookFile: parseWorkbookFile
        };
    }

    const exportsObject = {
        createWorkbookParser: createWorkbookParser
    };

    if (typeof window !== "undefined") {
        window.ImportsPageWorkbook = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
