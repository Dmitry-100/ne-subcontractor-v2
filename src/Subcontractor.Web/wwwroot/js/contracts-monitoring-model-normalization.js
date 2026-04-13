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

    function createClientIdFactory() {
        let clientKeySequence = 0;

        return function createClientId(prefix) {
            clientKeySequence += 1;
            return `${prefix}-${clientKeySequence}`;
        };
    }

    function toOptionalText(value) {
        return value === null || value === undefined
            ? null
            : String(value).trim() || null;
    }

    function toSortOrder(value, fallbackIndex) {
        return Number.isFinite(Number(value))
            ? Math.max(0, Math.trunc(Number(value)))
            : fallbackIndex;
    }

    function resolveOptions(options) {
        const args = options || {};

        return {
            toNumber: typeof args.toNumber === "function"
                ? args.toNumber
                : fallbackToNumber,
            createClientId: typeof args.createClientId === "function"
                ? args.createClientId
                : createClientIdFactory(),
            toNullableDate: typeof args.toNullableDate === "function"
                ? args.toNullableDate
                : fallbackToNullableDate
        };
    }

    function normalizeControlPointStage(stage, index, options) {
        const args = resolveOptions(options);
        return {
            clientId: args.createClientId("cp-stage"),
            name: String(stage?.name || "").trim(),
            plannedDate: stage?.plannedDate || null,
            forecastDate: stage?.forecastDate || null,
            actualDate: stage?.actualDate || null,
            progressPercent: args.toNumber(stage?.progressPercent, 0),
            sortOrder: toSortOrder(stage?.sortOrder, index),
            notes: toOptionalText(stage?.notes),
            isDelayed: Boolean(stage?.isDelayed)
        };
    }

    function normalizeControlPoint(point, index, options) {
        const args = resolveOptions(options);
        const stages = (Array.isArray(point?.stages) ? point.stages : []).map(function (stage, stageIndex) {
            return normalizeControlPointStage(stage, stageIndex, args);
        });

        return {
            clientId: args.createClientId("cp"),
            name: String(point?.name || "").trim(),
            responsibleRole: toOptionalText(point?.responsibleRole),
            plannedDate: point?.plannedDate || null,
            forecastDate: point?.forecastDate || null,
            actualDate: point?.actualDate || null,
            progressPercent: args.toNumber(point?.progressPercent, 0),
            sortOrder: toSortOrder(point?.sortOrder, index),
            notes: toOptionalText(point?.notes),
            isDelayed: Boolean(point?.isDelayed),
            stages: stages
        };
    }

    function normalizeMdrRow(row, index, options) {
        const args = resolveOptions(options);
        return {
            clientId: args.createClientId("mdr-row"),
            rowCode: String(row?.rowCode || "").trim(),
            description: String(row?.description || "").trim(),
            unitCode: String(row?.unitCode || "").trim(),
            planValue: args.toNumber(row?.planValue, 0),
            forecastValue: args.toNumber(row?.forecastValue, 0),
            factValue: args.toNumber(row?.factValue, 0),
            sortOrder: toSortOrder(row?.sortOrder, index),
            notes: toOptionalText(row?.notes),
            forecastDeviationPercent: row?.forecastDeviationPercent === null || row?.forecastDeviationPercent === undefined
                ? null
                : args.toNumber(row.forecastDeviationPercent, 0),
            factDeviationPercent: row?.factDeviationPercent === null || row?.factDeviationPercent === undefined
                ? null
                : args.toNumber(row.factDeviationPercent, 0)
        };
    }

    function normalizeMdrCard(card, index, options) {
        const args = resolveOptions(options);
        const rows = (Array.isArray(card?.rows) ? card.rows : []).map(function (row, rowIndex) {
            return normalizeMdrRow(row, rowIndex, args);
        });

        return {
            clientId: args.createClientId("mdr-card"),
            title: String(card?.title || "").trim(),
            reportingDate: card?.reportingDate || null,
            sortOrder: toSortOrder(card?.sortOrder, index),
            notes: toOptionalText(card?.notes),
            totalPlanValue: args.toNumber(card?.totalPlanValue, 0),
            totalForecastValue: args.toNumber(card?.totalForecastValue, 0),
            totalFactValue: args.toNumber(card?.totalFactValue, 0),
            forecastDeviationPercent: card?.forecastDeviationPercent === null || card?.forecastDeviationPercent === undefined
                ? null
                : args.toNumber(card.forecastDeviationPercent, 0),
            factDeviationPercent: card?.factDeviationPercent === null || card?.factDeviationPercent === undefined
                ? null
                : args.toNumber(card.factDeviationPercent, 0),
            rows: rows
        };
    }

    function toControlPointStageRequestItem(stage, index, options) {
        const args = resolveOptions(options);
        return {
            name: String(stage?.name || "").trim(),
            plannedDate: args.toNullableDate(stage?.plannedDate),
            forecastDate: args.toNullableDate(stage?.forecastDate),
            actualDate: args.toNullableDate(stage?.actualDate),
            progressPercent: args.toNumber(stage?.progressPercent, 0),
            sortOrder: toSortOrder(stage?.sortOrder, index),
            notes: toOptionalText(stage?.notes)
        };
    }

    function toMdrRowRequestItem(row, index, options) {
        const args = resolveOptions(options);
        return {
            rowCode: String(row?.rowCode || "").trim(),
            description: String(row?.description || "").trim(),
            unitCode: String(row?.unitCode || "").trim(),
            planValue: args.toNumber(row?.planValue, 0),
            forecastValue: args.toNumber(row?.forecastValue, 0),
            factValue: args.toNumber(row?.factValue, 0),
            sortOrder: toSortOrder(row?.sortOrder, index),
            notes: toOptionalText(row?.notes)
        };
    }

    const exportsObject = {
        fallbackToNumber: fallbackToNumber,
        fallbackToNullableDate: fallbackToNullableDate,
        createClientIdFactory: createClientIdFactory,
        normalizeControlPoint: normalizeControlPoint,
        normalizeMdrCard: normalizeMdrCard,
        toControlPointStageRequestItem: toControlPointStageRequestItem,
        toMdrRowRequestItem: toMdrRowRequestItem
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringModelNormalization = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
