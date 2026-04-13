"use strict";

(function () {
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
        const text = String(line ?? "");

        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];

            if (char === "\"") {
                if (inQuotes && text[i + 1] === "\"") {
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
            throw new Error("Файл пуст.");
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

    const exportsObject = {
        detectDelimiter: detectDelimiter,
        parseCsvLine: parseCsvLine,
        parseDelimitedText: parseDelimitedText
    };

    if (typeof window !== "undefined") {
        window.ImportsPageHelpersCsvParsing = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
