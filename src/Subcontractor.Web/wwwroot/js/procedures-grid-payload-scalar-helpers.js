"use strict";

(function () {
    function createScalarHelpers(options) {
        const settings = options || {};
        const approvalModes = Array.isArray(settings.approvalModes) && settings.approvalModes.length > 0
            ? settings.approvalModes
            : ["InSystem", "External"];

        function normalizeGuid(value) {
            if (value === null || value === undefined) {
                return null;
            }

            const text = String(value).trim();
            return text.length === 0 ? null : text;
        }

        function isGuid(value) {
            if (typeof value !== "string") {
                return false;
            }

            return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
        }

        function toIsoDate(value) {
            if (value === null || value === undefined || value === "") {
                return null;
            }

            const date = value instanceof Date ? value : new Date(value);
            return Number.isNaN(date.getTime()) ? null : date.toISOString();
        }

        function toNullableNumber(value) {
            if (value === null || value === undefined || value === "") {
                return null;
            }

            const number = Number(value);
            return Number.isFinite(number) ? number : null;
        }

        function normalizeRequiredString(value, fallback) {
            const text = String(value ?? "").trim();
            return text.length > 0 ? text : fallback;
        }

        function normalizeNullableString(value) {
            if (value === null || value === undefined) {
                return null;
            }

            const text = String(value).trim();
            return text.length > 0 ? text : null;
        }

        function normalizeApprovalMode(value) {
            const normalized = String(value ?? "").trim();
            return approvalModes.includes(normalized) ? normalized : "InSystem";
        }

        function pickValue(values, key, fallback) {
            if (!values || typeof values !== "object") {
                return fallback;
            }

            return Object.prototype.hasOwnProperty.call(values, key)
                ? values[key]
                : fallback;
        }

        return {
            isGuid: isGuid,
            normalizeApprovalMode: normalizeApprovalMode,
            normalizeGuid: normalizeGuid,
            normalizeNullableString: normalizeNullableString,
            normalizeRequiredString: normalizeRequiredString,
            pickValue: pickValue,
            toIsoDate: toIsoDate,
            toNullableNumber: toNullableNumber
        };
    }

    const exportsObject = {
        createScalarHelpers: createScalarHelpers
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridPayloadScalarHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
