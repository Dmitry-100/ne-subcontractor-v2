"use strict";

(function () {
    function isRowEmpty(values) {
        return !Array.isArray(values) || values.every(function (value) {
            return String(value ?? "").trim().length === 0;
        });
    }

    function detectDelimiter(headerLine) {
        const candidates = [",", ";", "\t"];
        let selected = ",";
        let bestCount = -1;

        candidates.forEach(function (delimiter) {
            const count = String(headerLine ?? "").split(delimiter).length - 1;
            if (count > bestCount) {
                bestCount = count;
                selected = delimiter;
            }
        });

        return selected;
    }

    function parseCsvLine(line, delimiter) {
        const result = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            if (char === "\"") {
                if (inQuotes && line[i + 1] === "\"") {
                    current += "\"";
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === delimiter && !inQuotes) {
                result.push(current);
                current = "";
                continue;
            }

            current += char;
        }

        result.push(current);
        return result;
    }

    function parseDelimitedText(rawText) {
        const lines = String(rawText ?? "")
            .replace(/\uFEFF/g, "")
            .split(/\r?\n/);

        let headerIndex = 0;
        while (headerIndex < lines.length && lines[headerIndex].trim().length === 0) {
            headerIndex += 1;
        }

        if (headerIndex >= lines.length) {
            throw new Error("Файл импорта пуст.");
        }

        const delimiter = detectDelimiter(lines[headerIndex]);
        const rows = [];
        for (let i = headerIndex; i < lines.length; i += 1) {
            const line = lines[i];
            if (!line || line.trim().length === 0) {
                continue;
            }

            rows.push(parseCsvLine(line, delimiter));
        }

        return rows;
    }

    async function parseWorkbookRows(file, xlsx) {
        if (!(xlsx && xlsx.read && xlsx.utils && xlsx.utils.sheet_to_json)) {
            throw new Error("Парсер XLSX не загружен. Проверьте подключение SheetJS.");
        }

        const bytes = await file.arrayBuffer();
        const workbook = xlsx.read(bytes, { type: "array", raw: false });
        if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
            throw new Error("Книга XLSX не содержит листов.");
        }

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: false,
            raw: false,
            defval: ""
        });

        return (Array.isArray(rows) ? rows : []).filter(function (row) {
            return !isRowEmpty(row);
        });
    }

    async function parseMdrImportFile(file, xlsx) {
        const extension = String(file?.name || "")
            .split(".")
            .pop()
            ?.toLowerCase();

        if (extension === "csv" || extension === "txt") {
            const text = await file.text();
            return parseDelimitedText(text);
        }

        if (extension === "xlsx" || extension === "xls") {
            return parseWorkbookRows(file, xlsx);
        }

        throw new Error("Неподдерживаемый формат файла. Используйте .csv, .txt, .xlsx или .xls.");
    }

    const exportsObject = {
        isRowEmpty: isRowEmpty,
        parseDelimitedText: parseDelimitedText,
        parseMdrImportFile: parseMdrImportFile
    };

    if (typeof window !== "undefined") {
        window.ContractsGridImportFileParsing = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
