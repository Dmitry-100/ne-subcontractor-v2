"use strict";

(function () {
    function createMappingService(options) {
        const settings = options || {};
        const fieldDefinitions = Array.isArray(settings.fieldDefinitions) ? settings.fieldDefinitions : [];
        const maxImportRows = Number(settings.maxImportRows || 10000);
        const previewRowLimit = Number(settings.previewRowLimit || 200);

        const deriveColumns = settings.deriveColumns;
        const buildAutoMapping = settings.buildAutoMapping;
        const isRowEmpty = settings.isRowEmpty;
        const mapRawRow = settings.mapRawRow;

        if (typeof deriveColumns !== "function" ||
            typeof buildAutoMapping !== "function" ||
            typeof isRowEmpty !== "function" ||
            typeof mapRawRow !== "function") {
            throw new Error("ImportsPageMapping: отсутствуют обязательные зависимости.");
        }

        function collectMissingRequiredFields(mapping) {
            const sourceMapping = mapping || {};
            return fieldDefinitions
                .filter(function (field) {
                    return field.required && (!Number.isInteger(sourceMapping[field.key]) || sourceMapping[field.key] < 0);
                })
                .map(function (field) {
                    return field.label;
                });
        }

        function buildMappingFromRaw(rawRows, hasHeader, previousMapping, keepPreviousSelection) {
            const derived = deriveColumns(rawRows, hasHeader);
            const sourceColumns = derived.columns;
            const dataStartRowIndex = derived.dataStartIndex;

            const autoMapping = buildAutoMapping(sourceColumns, hasHeader);
            const resolvedMapping = {};
            const previous = previousMapping || {};

            fieldDefinitions.forEach(function (field) {
                const previousValue = keepPreviousSelection ? previous[field.key] : -1;
                if (Number.isInteger(previousValue) && previousValue >= 0 && previousValue < sourceColumns.length) {
                    resolvedMapping[field.key] = previousValue;
                } else {
                    resolvedMapping[field.key] = autoMapping[field.key];
                }
            });

            return {
                sourceColumns: sourceColumns,
                dataStartRowIndex: dataStartRowIndex,
                mapping: resolvedMapping,
                mappingStatusMessage: "Проверьте сопоставление колонок и нажмите «Применить сопоставление»."
            };
        }

        function applyMapping(rawRows, dataStartRowIndex, mapping) {
            if (!Array.isArray(rawRows) || rawRows.length === 0) {
                throw new Error("Сначала разберите исходный файл.");
            }

            const missingRequiredFields = collectMissingRequiredFields(mapping);
            if (missingRequiredFields.length > 0) {
                throw new Error("Отсутствуют обязательные сопоставления: " + missingRequiredFields.join(", ") + ".");
            }

            const rows = [];
            for (let index = dataStartRowIndex; index < rawRows.length; index += 1) {
                const rowValues = rawRows[index];
                if (!Array.isArray(rowValues) || isRowEmpty(rowValues)) {
                    continue;
                }

                rows.push(mapRawRow(rowValues, mapping, index - dataStartRowIndex + 1));
            }

            if (rows.length === 0) {
                throw new Error("После сопоставления не найдено строк с данными.");
            }

            if (rows.length > maxImportRows) {
                throw new Error(`Источник содержит ${rows.length} строк, максимально допустимо ${maxImportRows}.`);
            }

            const invalidLocalCount = rows.filter(function (row) { return !row.isLocallyValid; }).length;
            return {
                rows: rows,
                invalidLocalCount: invalidLocalCount,
                parseSummaryText:
                    `Разобрано строк: ${rows.length}. Локальных ошибок валидации: ${invalidLocalCount}. ` +
                    `Предпросмотр показывает первые ${Math.min(rows.length, previewRowLimit)} строк.`,
                mappingStatusMessage:
                    `Сопоставление применено. Разобрано строк: ${rows.length}, локальных ошибок: ${invalidLocalCount}.`,
                uploadStatusMessage: "Файл разобран и сопоставлен. Проверьте предпросмотр и загрузите пакет."
            };
        }

        return {
            buildMappingFromRaw: buildMappingFromRaw,
            applyMapping: applyMapping
        };
    }

    const exportsObject = {
        createMappingService: createMappingService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageMapping = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
