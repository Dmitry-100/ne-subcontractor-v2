"use strict";

(function () {
    function fallbackToNumber(value, fallbackValue) {
        if (value === null || value === undefined || value === "") {
            return fallbackValue;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallbackValue;
    }

    function fallbackToNullableDate(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    function toSortOrder(value, fallbackIndex) {
        return Number.isFinite(Number(value))
            ? Math.max(0, Math.trunc(Number(value)))
            : fallbackIndex;
    }

    function toOptionalText(value) {
        return value === null || value === undefined
            ? null
            : String(value).trim() || null;
    }

    function resolveOptionFunction(options, name, fallback) {
        return typeof options?.[name] === "function" ? options[name] : fallback;
    }

    function createStageRequestItem(stage, index, options) {
        const toNumber = resolveOptionFunction(options, "toNumber", fallbackToNumber);
        const toNullableDate = resolveOptionFunction(options, "toNullableDate", fallbackToNullableDate);
        return {
            name: String(stage?.name || "").trim(),
            plannedDate: toNullableDate(stage?.plannedDate),
            forecastDate: toNullableDate(stage?.forecastDate),
            actualDate: toNullableDate(stage?.actualDate),
            progressPercent: toNumber(stage?.progressPercent, 0),
            sortOrder: toSortOrder(stage?.sortOrder, index),
            notes: toOptionalText(stage?.notes)
        };
    }

    function createMdrRowRequestItem(row, index, options) {
        const toNumber = resolveOptionFunction(options, "toNumber", fallbackToNumber);
        return {
            rowCode: String(row?.rowCode || "").trim(),
            description: String(row?.description || "").trim(),
            unitCode: String(row?.unitCode || "").trim(),
            planValue: toNumber(row?.planValue, 0),
            forecastValue: toNumber(row?.forecastValue, 0),
            factValue: toNumber(row?.factValue, 0),
            sortOrder: toSortOrder(row?.sortOrder, index),
            notes: toOptionalText(row?.notes)
        };
    }

    function buildControlPointsPayload(items, options) {
        const source = Array.isArray(items) ? items : [];
        const toNumber = resolveOptionFunction(options, "toNumber", fallbackToNumber);
        const toNullableDate = resolveOptionFunction(options, "toNullableDate", fallbackToNullableDate);
        const toRequestItem = resolveOptionFunction(options, "toControlPointStageRequestItem", function (stage, stageIndex) {
                return createStageRequestItem(stage, stageIndex, {
                    toNumber: toNumber,
                    toNullableDate: toNullableDate
                });
            });

        return source.map(function (point, pointIndex) {
            const name = String(point?.name || "").trim();
            if (!name) {
                throw new Error(`КП #${pointIndex + 1}: наименование обязательно.`);
            }

            const plannedDate = toNullableDate(point?.plannedDate);
            if (!plannedDate) {
                throw new Error(`КП #${pointIndex + 1}: плановая дата обязательна.`);
            }

            const progressPercent = toNumber(point?.progressPercent, 0);
            if (progressPercent < 0 || progressPercent > 100) {
                throw new Error(`КП #${pointIndex + 1}: прогресс должен быть в диапазоне 0..100.`);
            }

            const stages = Array.isArray(point?.stages) ? point.stages : [];
            const stageItems = stages.map(function (stage, stageIndex) {
                const stageName = String(stage?.name || "").trim();
                if (!stageName) {
                    throw new Error(`КП #${pointIndex + 1}, этап #${stageIndex + 1}: наименование обязательно.`);
                }

                const stagePlannedDate = toNullableDate(stage?.plannedDate);
                if (!stagePlannedDate) {
                    throw new Error(`КП #${pointIndex + 1}, этап #${stageIndex + 1}: плановая дата обязательна.`);
                }

                const stageProgress = toNumber(stage?.progressPercent, 0);
                if (stageProgress < 0 || stageProgress > 100) {
                    throw new Error(`КП #${pointIndex + 1}, этап #${stageIndex + 1}: прогресс должен быть в диапазоне 0..100.`);
                }

                return toRequestItem(stage, stageIndex);
            });

            return {
                name: name,
                responsibleRole: toOptionalText(point?.responsibleRole),
                plannedDate: plannedDate,
                forecastDate: toNullableDate(point?.forecastDate),
                actualDate: toNullableDate(point?.actualDate),
                progressPercent: progressPercent,
                sortOrder: toSortOrder(point?.sortOrder, pointIndex),
                notes: toOptionalText(point?.notes),
                stages: stageItems
            };
        });
    }

    function buildMdrCardsPayload(items, options) {
        const source = Array.isArray(items) ? items : [];
        const toNumber = resolveOptionFunction(options, "toNumber", fallbackToNumber);
        const toNullableDate = resolveOptionFunction(options, "toNullableDate", fallbackToNullableDate);
        const toRequestItem = resolveOptionFunction(options, "toMdrRowRequestItem", function (row, rowIndex) {
                return createMdrRowRequestItem(row, rowIndex, {
                    toNumber: toNumber
                });
            });

        return source.map(function (card, cardIndex) {
            const title = String(card?.title || "").trim();
            if (!title) {
                throw new Error(`MDR карточка #${cardIndex + 1}: наименование обязательно.`);
            }

            const reportingDate = toNullableDate(card?.reportingDate);
            if (!reportingDate) {
                throw new Error(`MDR карточка #${cardIndex + 1}: отчётная дата обязательна.`);
            }

            const rows = Array.isArray(card?.rows) ? card.rows : [];
            const rowItems = rows.map(function (row, rowIndex) {
                const rowCode = String(row?.rowCode || "").trim();
                if (!rowCode) {
                    throw new Error(`MDR карточка #${cardIndex + 1}, строка #${rowIndex + 1}: код строки обязателен.`);
                }

                const description = String(row?.description || "").trim();
                if (!description) {
                    throw new Error(`MDR карточка #${cardIndex + 1}, строка #${rowIndex + 1}: описание обязательно.`);
                }

                const unitCode = String(row?.unitCode || "").trim();
                if (!unitCode) {
                    throw new Error(`MDR карточка #${cardIndex + 1}, строка #${rowIndex + 1}: единица измерения обязательна.`);
                }

                const planValue = toNumber(row?.planValue, 0);
                const forecastValue = toNumber(row?.forecastValue, 0);
                const factValue = toNumber(row?.factValue, 0);
                if (planValue < 0 || forecastValue < 0 || factValue < 0) {
                    throw new Error(`MDR карточка #${cardIndex + 1}, строка #${rowIndex + 1}: значения не могут быть отрицательными.`);
                }

                return toRequestItem(row, rowIndex);
            });

            return {
                title: title,
                reportingDate: reportingDate,
                sortOrder: toSortOrder(card?.sortOrder, cardIndex),
                notes: toOptionalText(card?.notes),
                rows: rowItems
            };
        });
    }

    const exportsObject = {
        buildControlPointsPayload: buildControlPointsPayload,
        buildMdrCardsPayload: buildMdrCardsPayload
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringModelPayload = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
