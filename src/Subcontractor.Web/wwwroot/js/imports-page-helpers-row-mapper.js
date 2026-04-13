"use strict";

(function () {
    function createRowMapper() {
        function parseNumber(rawValue) {
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

        function formatDateIso(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }

        function parseDate(rawValue) {
            const normalized = String(rawValue ?? "").trim();
            if (!normalized) {
                return { value: null, error: null };
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

        function mapRawRow(rowValues, mapping, fallbackRowNumber) {
            function valueAt(index) {
                if (!Number.isInteger(index) || index < 0 || index >= rowValues.length) {
                    return "";
                }

                return String(rowValues[index] ?? "").trim();
            }

            const errors = [];

            const rawRowNumber = valueAt(mapping.rowNumber);
            let rowNumber = Number.parseInt(rawRowNumber, 10);
            if (!Number.isInteger(rowNumber) || rowNumber <= 0) {
                rowNumber = fallbackRowNumber;
            }

            const projectCode = valueAt(mapping.projectCode).toUpperCase();
            const objectWbs = valueAt(mapping.objectWbs);
            const disciplineCode = valueAt(mapping.disciplineCode).toUpperCase();

            const manHoursParsed = parseNumber(valueAt(mapping.manHours));
            const manHours = Number.isFinite(manHoursParsed) ? manHoursParsed : 0;

            const startDate = parseDate(valueAt(mapping.plannedStartDate));
            const finishDate = parseDate(valueAt(mapping.plannedFinishDate));

            if (!projectCode) {
                errors.push("Код проекта обязателен");
            }

            if (!objectWbs) {
                errors.push("Объект WBS обязателен");
            }

            if (!disciplineCode) {
                errors.push("Код дисциплины обязателен");
            }

            if (!Number.isFinite(manHoursParsed)) {
                errors.push("Трудозатраты должны быть числом");
            } else if (manHoursParsed < 0) {
                errors.push("Трудозатраты не могут быть отрицательными");
            }

            if (startDate.error) {
                errors.push("Плановая дата начала: " + startDate.error);
            }

            if (finishDate.error) {
                errors.push("Плановая дата окончания: " + finishDate.error);
            }

            if (startDate.value && finishDate.value && startDate.value > finishDate.value) {
                errors.push("Плановая дата начала должна быть <= плановой дате окончания");
            }

            return {
                rowNumber: rowNumber,
                projectCode: projectCode,
                objectWbs: objectWbs,
                disciplineCode: disciplineCode,
                manHours: manHours,
                plannedStartDate: startDate.value,
                plannedFinishDate: finishDate.value,
                isLocallyValid: errors.length === 0,
                localValidationMessage: errors.length > 0 ? errors.join("; ") : ""
            };
        }

        return {
            parseNumber: parseNumber,
            formatDateIso: formatDateIso,
            parseDate: parseDate,
            mapRawRow: mapRawRow
        };
    }

    const exportsObject = {
        createRowMapper: createRowMapper
    };

    if (typeof window !== "undefined") {
        window.ImportsPageHelpersRowMapper = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
