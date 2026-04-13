"use strict";

(function () {
    function normalizeImportHeader(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/\uFEFF/g, "")
            .replace(/[^a-zа-я0-9]+/gi, "");
    }

    function formatDateIso(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function parseImportDate(rawValue) {
        const normalized = String(rawValue ?? "").trim();
        if (!normalized) {
            return { value: null, error: "пустая дата" };
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            return { value: normalized, error: null };
        }

        const dotted = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (dotted) {
            return { value: `${dotted[3]}-${dotted[2]}-${dotted[1]}`, error: null };
        }

        const parsed = new Date(normalized);
        if (Number.isNaN(parsed.getTime())) {
            return { value: null, error: "некорректный формат даты" };
        }

        return { value: formatDateIso(parsed), error: null };
    }

    function parseImportNumber(rawValue) {
        const normalized = String(rawValue ?? "")
            .trim()
            .replace(/\s+/g, "")
            .replace(",", ".");

        if (!normalized) {
            return Number.NaN;
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    function resolveImportHeaderMap(headerRow) {
        const normalizedHeaders = (Array.isArray(headerRow) ? headerRow : []).map(normalizeImportHeader);
        const resolve = function (tokens) {
            for (let index = 0; index < normalizedHeaders.length; index += 1) {
                if (tokens.includes(normalizedHeaders[index])) {
                    return index;
                }
            }

            return -1;
        };

        return {
            cardTitle: resolve(["cardtitle", "title", "card", "карточка", "наименованиекарточки", "заголовоккарточки"]),
            reportingDate: resolve(["reportingdate", "reportdate", "датаотчета", "отчетнаядата"]),
            rowCode: resolve(["rowcode", "кодстроки", "код"]),
            forecastValue: resolve(["forecastvalue", "forecast", "прогноз", "значениепрогноз"]),
            factValue: resolve(["factvalue", "fact", "факт", "значениефакт"])
        };
    }

    function isRowEmpty(values) {
        return !Array.isArray(values) || values.every(function (value) {
            return String(value ?? "").trim().length === 0;
        });
    }

    function parseMdrImportItemsFromRows(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error("Файл импорта не содержит данных.");
        }

        const headerRow = rows[0];
        const map = resolveImportHeaderMap(headerRow);
        const missingColumns = [];
        if (map.cardTitle < 0) {
            missingColumns.push("Название карточки");
        }

        if (map.reportingDate < 0) {
            missingColumns.push("Отчетная дата");
        }

        if (map.rowCode < 0) {
            missingColumns.push("Код строки");
        }

        if (map.forecastValue < 0) {
            missingColumns.push("Прогноз");
        }

        if (map.factValue < 0) {
            missingColumns.push("Факт");
        }

        if (missingColumns.length > 0) {
            throw new Error(`Не найдены обязательные колонки: ${missingColumns.join(", ")}.`);
        }

        const errors = [];
        const items = [];

        for (let index = 1; index < rows.length; index += 1) {
            const row = Array.isArray(rows[index]) ? rows[index] : [];
            if (isRowEmpty(row)) {
                continue;
            }

            const sourceRowNumber = index + 1;
            const cardTitle = String(row[map.cardTitle] ?? "").trim();
            const rowCode = String(row[map.rowCode] ?? "").trim();
            const reportingDateResult = parseImportDate(row[map.reportingDate]);
            const forecastValue = parseImportNumber(row[map.forecastValue]);
            const factValue = parseImportNumber(row[map.factValue]);
            const rowErrors = [];

            if (!cardTitle) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Название карточки" обязательно.`);
            }

            if (!rowCode) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Код строки" обязательно.`);
            }

            if (reportingDateResult.error) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Отчетная дата" — ${reportingDateResult.error}.`);
            }

            if (!Number.isFinite(forecastValue) || forecastValue < 0) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Прогноз" должно быть неотрицательным числом.`);
            }

            if (!Number.isFinite(factValue) || factValue < 0) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Факт" должно быть неотрицательным числом.`);
            }

            if (rowErrors.length > 0) {
                errors.push(...rowErrors);
                continue;
            }

            items.push({
                sourceRowNumber: sourceRowNumber,
                cardTitle: cardTitle,
                reportingDate: reportingDateResult.value,
                rowCode: rowCode,
                forecastValue: Number(forecastValue.toFixed(2)),
                factValue: Number(factValue.toFixed(2))
            });
        }

        if (errors.length > 0) {
            const preview = errors.slice(0, 12).join(" ");
            throw new Error(errors.length > 12
                ? `${preview} Показаны первые 12 ошибок из ${errors.length}.`
                : preview);
        }

        if (items.length === 0) {
            throw new Error("Не найдено валидных строк для импорта MDR.");
        }

        return items;
    }

    const exportsObject = {
        parseMdrImportItemsFromRows: parseMdrImportItemsFromRows
    };

    if (typeof window !== "undefined") {
        window.ContractsGridImportMdrRows = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
