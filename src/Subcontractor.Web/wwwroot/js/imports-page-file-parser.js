"use strict";

(function () {
    function createFileParser(options) {
        const settings = options || {};
        const parseDelimitedText = settings.parseDelimitedText;
        const parseWorkbookFile = settings.parseWorkbookFile;

        if (typeof parseDelimitedText !== "function" || typeof parseWorkbookFile !== "function") {
            throw new Error("ImportsPageFileParser: отсутствуют обязательные зависимости.");
        }

        function resolveExtension(fileName) {
            const normalized = String(fileName || "");
            const extension = normalized.split(".").pop();
            return String(extension || "").toLowerCase();
        }

        function isDelimitedExtension(extension) {
            return extension === "csv" || extension === "txt";
        }

        function isWorkbookExtension(extension) {
            return extension === "xlsx" || extension === "xls";
        }

        async function parse(file) {
            if (!file) {
                throw new Error("Сначала выберите исходный файл.");
            }

            const fileName = file.name || "source-data.csv";
            const extension = resolveExtension(fileName);

            let parsedRawRows = [];
            if (isDelimitedExtension(extension)) {
                const text = await file.text();
                parsedRawRows = parseDelimitedText(text);
            } else if (isWorkbookExtension(extension)) {
                parsedRawRows = await parseWorkbookFile(file);
            } else {
                throw new Error("Неподдерживаемый тип файла. Используйте .csv, .txt, .xlsx или .xls.");
            }

            if (!Array.isArray(parsedRawRows) || parsedRawRows.length === 0) {
                throw new Error("Исходный файл не содержит строк.");
            }

            return {
                fileName: fileName,
                rawRows: parsedRawRows,
                extension: extension
            };
        }

        return {
            parse: parse,
            resolveExtension: resolveExtension,
            isDelimitedExtension: isDelimitedExtension,
            isWorkbookExtension: isWorkbookExtension
        };
    }

    const exportsObject = {
        createFileParser: createFileParser
    };

    if (typeof window !== "undefined") {
        window.ImportsPageFileParser = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
