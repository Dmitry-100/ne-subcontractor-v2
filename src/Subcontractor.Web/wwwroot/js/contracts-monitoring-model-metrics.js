"use strict";

(function () {
    function fallbackToNumber(value, fallbackValue) {
        if (value === null || value === undefined || value === "") {
            return fallbackValue;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallbackValue;
    }

    function calculateDeviationPercent(planValue, actualValue, options) {
        const toNumber = typeof options?.toNumber === "function"
            ? options.toNumber
            : fallbackToNumber;
        const plan = toNumber(planValue, 0);
        const actual = toNumber(actualValue, 0);
        if (plan <= 0) {
            return null;
        }

        return Number((((actual - plan) / plan) * 100).toFixed(2));
    }

    function calculateMdrCardMetrics(card, options) {
        const toNumber = typeof options?.toNumber === "function"
            ? options.toNumber
            : fallbackToNumber;
        const calculateDeviation = typeof options?.calculateDeviationPercent === "function"
            ? options.calculateDeviationPercent
            : function (plan, actual) {
                return calculateDeviationPercent(plan, actual, { toNumber: toNumber });
            };

        const rows = Array.isArray(card?.rows) ? card.rows : [];
        const totalPlanValue = rows.reduce(function (sum, row) {
            return sum + toNumber(row?.planValue, 0);
        }, 0);
        const totalForecastValue = rows.reduce(function (sum, row) {
            return sum + toNumber(row?.forecastValue, 0);
        }, 0);
        const totalFactValue = rows.reduce(function (sum, row) {
            return sum + toNumber(row?.factValue, 0);
        }, 0);

        return {
            totalPlanValue: Number(totalPlanValue.toFixed(2)),
            totalForecastValue: Number(totalForecastValue.toFixed(2)),
            totalFactValue: Number(totalFactValue.toFixed(2)),
            forecastDeviationPercent: calculateDeviation(totalPlanValue, totalForecastValue),
            factDeviationPercent: calculateDeviation(totalPlanValue, totalFactValue)
        };
    }

    const exportsObject = {
        calculateDeviationPercent: calculateDeviationPercent,
        calculateMdrCardMetrics: calculateMdrCardMetrics
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringModelMetrics = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
