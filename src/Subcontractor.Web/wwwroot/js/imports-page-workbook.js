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

            const firstSheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheetName];
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
