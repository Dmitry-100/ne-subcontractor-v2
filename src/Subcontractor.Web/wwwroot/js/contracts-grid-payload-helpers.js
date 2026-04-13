"use strict";

(function () {
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

    function toNullableDate(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    function toNumber(value, fallbackValue) {
        if (value === null || value === undefined || value === "") {
            return fallbackValue;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : fallbackValue;
    }

    function parseErrorBody(rawText, statusCode) {
        if (!rawText) {
            return `Ошибка запроса (${statusCode}).`;
        }

        try {
            const body = JSON.parse(rawText);
            if (body && typeof body.detail === "string" && body.detail.trim().length > 0) {
                return body.detail;
            }

            if (body && typeof body.error === "string" && body.error.trim().length > 0) {
                return body.error;
            }

            if (body && typeof body.title === "string" && body.title.trim().length > 0) {
                return body.title;
            }
        } catch {
            return rawText;
        }

        return rawText;
    }

    function buildMilestonesPayload(items) {
        const source = Array.isArray(items) ? items : [];

        return source.map(function (item, index) {
            const title = String(item.title ?? "").trim();
            if (!title) {
                throw new Error(`Этап #${index + 1}: наименование обязательно.`);
            }

            const plannedDate = toNullableDate(item.plannedDate);
            if (!plannedDate) {
                throw new Error(`Этап #${index + 1}: плановая дата обязательна.`);
            }

            const progressPercent = toNumber(item.progressPercent, 0);
            if (progressPercent < 0 || progressPercent > 100) {
                throw new Error(`Этап #${index + 1}: прогресс должен быть в диапазоне 0..100.`);
            }

            const sortOrder = Number.isFinite(Number(item.sortOrder))
                ? Math.max(0, Math.trunc(Number(item.sortOrder)))
                : index;

            const notes = item.notes === null || item.notes === undefined
                ? null
                : String(item.notes).trim() || null;

            return {
                title: title,
                plannedDate: plannedDate,
                actualDate: toNullableDate(item.actualDate),
                progressPercent: progressPercent,
                sortOrder: sortOrder,
                notes: notes
            };
        });
    }

    const exportsObject = {
        buildMilestonesPayload: buildMilestonesPayload,
        isGuid: isGuid,
        normalizeGuid: normalizeGuid,
        parseErrorBody: parseErrorBody,
        toNullableDate: toNullableDate,
        toNumber: toNumber
    };

    if (typeof window !== "undefined") {
        window.ContractsGridPayloadHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
