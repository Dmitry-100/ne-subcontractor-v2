"use strict";

(function () {
    const csvParsingRoot =
        typeof window !== "undefined" && window.ImportsPageHelpersCsvParsing
            ? window.ImportsPageHelpersCsvParsing
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-helpers-csv-parsing.js")
                : null;

    if (!csvParsingRoot ||
        typeof csvParsingRoot.detectDelimiter !== "function" ||
        typeof csvParsingRoot.parseCsvLine !== "function" ||
        typeof csvParsingRoot.parseDelimitedText !== "function") {
        throw new Error("ImportsPageHelpersParsing requires ImportsPageHelpersCsvParsing.");
    }

    function createParsingHelpers(options) {
        const settings = options || {};
        const fieldDefinitions = Array.isArray(settings.fieldDefinitions) ? settings.fieldDefinitions : [];

        function normalizeText(value) {
            return String(value ?? "")
                .trim()
                .toLowerCase()
                .replace(/[\s_\-]+/g, "");
        }

        function isRowEmpty(values) {
            if (!Array.isArray(values)) {
                return true;
            }

            return values.every(function (value) {
                return String(value ?? "").trim().length === 0;
            });
        }

        const detectDelimiter = csvParsingRoot.detectDelimiter;
        const parseCsvLine = csvParsingRoot.parseCsvLine;
        const parseDelimitedText = csvParsingRoot.parseDelimitedText;

        function ensureUniqueColumnNames(values) {
            const nameUsage = new Map();
            return values.map(function (value, index) {
                const baseName = String(value ?? "").trim() || `Column ${index + 1}`;
                const normalized = normalizeText(baseName);
                const count = (nameUsage.get(normalized) || 0) + 1;
                nameUsage.set(normalized, count);
                return count === 1 ? baseName : `${baseName} (${count})`;
            });
        }

        function deriveColumns(rows, hasHeader) {
            const maxColumns = rows.reduce(function (max, row) {
                const count = Array.isArray(row) ? row.length : 0;
                return Math.max(max, count);
            }, 0);

            if (maxColumns === 0) {
                throw new Error("В исходном файле не обнаружены колонки.");
            }

            const defaultNames = Array.from({ length: maxColumns }, function (_, index) {
                return `Column ${index + 1}`;
            });

            if (!hasHeader) {
                return {
                    columns: defaultNames,
                    dataStartIndex: 0
                };
            }

            const headerRow = rows[0] || [];
            const resolved = Array.from({ length: maxColumns }, function (_, index) {
                return String(headerRow[index] ?? "").trim() || `Column ${index + 1}`;
            });

            return {
                columns: ensureUniqueColumnNames(resolved),
                dataStartIndex: 1
            };
        }

        function findColumnIndex(columns, synonyms) {
            const normalizedColumns = columns.map(normalizeText);

            for (let i = 0; i < synonyms.length; i += 1) {
                const synonym = normalizeText(synonyms[i]);
                const exact = normalizedColumns.indexOf(synonym);
                if (exact >= 0) {
                    return exact;
                }
            }

            for (let i = 0; i < synonyms.length; i += 1) {
                const synonym = normalizeText(synonyms[i]);
                const contains = normalizedColumns.findIndex(function (value) {
                    return value.includes(synonym);
                });
                if (contains >= 0) {
                    return contains;
                }
            }

            return -1;
        }

        function buildAutoMapping(columns, hasHeader) {
            const mapping = {};
            fieldDefinitions.forEach(function (field) {
                mapping[field.key] = findColumnIndex(columns, field.synonyms);
            });

            if (!hasHeader) {
                if (mapping.projectCode < 0 && columns.length >= 1) {
                    mapping.projectCode = 0;
                }
                if (mapping.objectWbs < 0 && columns.length >= 2) {
                    mapping.objectWbs = 1;
                }
                if (mapping.disciplineCode < 0 && columns.length >= 3) {
                    mapping.disciplineCode = 2;
                }
                if (mapping.manHours < 0 && columns.length >= 4) {
                    mapping.manHours = 3;
                }
                if (mapping.plannedStartDate < 0 && columns.length >= 5) {
                    mapping.plannedStartDate = 4;
                }
                if (mapping.plannedFinishDate < 0 && columns.length >= 6) {
                    mapping.plannedFinishDate = 5;
                }
            }

            return mapping;
        }

        return {
            normalizeText: normalizeText,
            isRowEmpty: isRowEmpty,
            detectDelimiter: detectDelimiter,
            parseCsvLine: parseCsvLine,
            parseDelimitedText: parseDelimitedText,
            ensureUniqueColumnNames: ensureUniqueColumnNames,
            deriveColumns: deriveColumns,
            findColumnIndex: findColumnIndex,
            buildAutoMapping: buildAutoMapping
        };
    }

    const exportsObject = {
        createParsingHelpers: createParsingHelpers
    };

    if (typeof window !== "undefined") {
        window.ImportsPageHelpersParsing = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
