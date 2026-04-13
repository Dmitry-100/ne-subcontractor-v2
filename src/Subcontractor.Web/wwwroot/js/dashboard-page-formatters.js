"use strict";

(function () {
    function toFiniteNumber(value) {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === "string" && value.trim().length > 0) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }

        return null;
    }

    function clampPercent(value) {
        if (!Number.isFinite(value)) {
            return 0;
        }

        if (value < 0) {
            return 0;
        }

        if (value > 100) {
            return 100;
        }

        return value;
    }

    function formatCompactPercent(value) {
        const normalized = clampPercent(value);
        if (normalized >= 10 || normalized === 0) {
            return normalized.toFixed(0) + "%";
        }

        return normalized.toFixed(1) + "%";
    }

    function formatCompactMoney(value) {
        const numeric = toFiniteNumber(value);
        if (numeric === null) {
            return "0";
        }

        const absolute = Math.abs(numeric);
        if (absolute >= 1_000_000_000) {
            return (numeric / 1_000_000_000).toFixed(2).replace(".", ",") + " млрд";
        }

        if (absolute >= 1_000_000) {
            return (numeric / 1_000_000).toFixed(2).replace(".", ",") + " млн";
        }

        if (absolute >= 1_000) {
            return (numeric / 1_000).toFixed(1).replace(".", ",") + " тыс";
        }

        return numeric.toLocaleString("ru-RU", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }

    function createFormatters() {
        return {
            toFiniteNumber: toFiniteNumber,
            clampPercent: clampPercent,
            formatCompactPercent: formatCompactPercent,
            formatCompactMoney: formatCompactMoney
        };
    }

    const exportsObject = {
        createFormatters: createFormatters
    };

    if (typeof window !== "undefined") {
        window.DashboardPageFormatters = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
