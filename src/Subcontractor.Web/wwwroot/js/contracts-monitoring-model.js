"use strict";

(function () {
    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль contracts monitoring model: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    const normalizationModule = resolveModule(
        "ContractsMonitoringModelNormalization",
        "./contracts-monitoring-model-normalization.js",
        [
            "fallbackToNumber",
            "fallbackToNullableDate",
            "createClientIdFactory",
            "normalizeControlPoint",
            "normalizeMdrCard",
            "toControlPointStageRequestItem",
            "toMdrRowRequestItem"
        ]);

    const metricsModule = resolveModule(
        "ContractsMonitoringModelMetrics",
        "./contracts-monitoring-model-metrics.js",
        [
            "calculateDeviationPercent",
            "calculateMdrCardMetrics"
        ]);

    const payloadModule = resolveModule(
        "ContractsMonitoringModelPayload",
        "./contracts-monitoring-model-payload.js",
        [
            "buildControlPointsPayload",
            "buildMdrCardsPayload"
        ]);

    function createModel(options) {
        const toNumber = typeof options?.toNumber === "function"
            ? options.toNumber
            : normalizationModule.fallbackToNumber;
        const toNullableDate = typeof options?.toNullableDate === "function"
            ? options.toNullableDate
            : normalizationModule.fallbackToNullableDate;
        const createMonitoringClientId = normalizationModule.createClientIdFactory();

        function normalizeControlPoint(point, index) {
            return normalizationModule.normalizeControlPoint(point, index, {
                toNumber: toNumber,
                createClientId: createMonitoringClientId
            });
        }

        function normalizeMdrCard(card, index) {
            return normalizationModule.normalizeMdrCard(card, index, {
                toNumber: toNumber,
                createClientId: createMonitoringClientId
            });
        }

        function toControlPointStageRequestItem(stage, index) {
            return normalizationModule.toControlPointStageRequestItem(stage, index, {
                toNumber: toNumber,
                toNullableDate: toNullableDate
            });
        }

        function toMdrRowRequestItem(row, index) {
            return normalizationModule.toMdrRowRequestItem(row, index, {
                toNumber: toNumber
            });
        }

        function calculateDeviationPercent(planValue, actualValue) {
            return metricsModule.calculateDeviationPercent(planValue, actualValue, {
                toNumber: toNumber
            });
        }

        function calculateMdrCardMetrics(card) {
            return metricsModule.calculateMdrCardMetrics(card, {
                toNumber: toNumber,
                calculateDeviationPercent: calculateDeviationPercent
            });
        }

        function buildControlPointsPayload(items) {
            return payloadModule.buildControlPointsPayload(items, {
                toNumber: toNumber,
                toNullableDate: toNullableDate,
                toControlPointStageRequestItem: toControlPointStageRequestItem
            });
        }

        function buildMdrCardsPayload(items) {
            return payloadModule.buildMdrCardsPayload(items, {
                toNumber: toNumber,
                toNullableDate: toNullableDate,
                toMdrRowRequestItem: toMdrRowRequestItem
            });
        }

        return {
            buildControlPointsPayload: buildControlPointsPayload,
            buildMdrCardsPayload: buildMdrCardsPayload,
            calculateDeviationPercent: calculateDeviationPercent,
            calculateMdrCardMetrics: calculateMdrCardMetrics,
            createClientId: createMonitoringClientId,
            normalizeControlPoint: normalizeControlPoint,
            normalizeMdrCard: normalizeMdrCard
        };
    }

    const exportsObject = {
        createModel: createModel
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringModel = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
