"use strict";

(function () {
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

    function normalizeGuid(value) {
        if (value === null || value === undefined) {
            return null;
        }

        const text = String(value).trim();
        return text.length === 0 ? null : text;
    }

    function calculateTotalManHours(items) {
        if (!Array.isArray(items)) {
            return 0;
        }

        return items.reduce(function (sum, item) {
            const value = Number(item?.manHours);
            return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
    }

    function toListItem(details, fallback) {
        if (!details || typeof details !== "object") {
            return fallback;
        }

        const items = Array.isArray(details.items) ? details.items : [];
        return {
            id: details.id ?? fallback?.id,
            code: details.code ?? fallback?.code ?? "",
            name: details.name ?? fallback?.name ?? "",
            status: details.status ?? fallback?.status ?? "Draft",
            responsibleCommercialUserId: details.responsibleCommercialUserId ?? null,
            itemsCount: items.length,
            totalManHours: calculateTotalManHours(items)
        };
    }

    function mapItemsForRequest(items) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items.map(function (item) {
            return {
                projectId: item.projectId,
                objectWbs: item.objectWbs,
                disciplineCode: item.disciplineCode,
                manHours: item.manHours,
                plannedStartDate: item.plannedStartDate,
                plannedFinishDate: item.plannedFinishDate
            };
        });
    }

    function parseTransitionError(error) {
        return error?.message || "Ошибка выполнения перехода.";
    }

    function createHelpers(options) {
        const settings = options || {};
        const statusOrder = Array.isArray(settings.statusOrder) ? settings.statusOrder.slice() : [];
        const statusCaptions = settings.statusCaptions || {};

        function localizeStatus(status) {
            const key = String(status || "");
            return statusCaptions[key] || key;
        }

        function nextStatus(currentStatus) {
            const index = statusOrder.indexOf(currentStatus);
            return index >= 0 && index < statusOrder.length - 1 ? statusOrder[index + 1] : null;
        }

        function previousStatus(currentStatus) {
            const index = statusOrder.indexOf(currentStatus);
            return index > 0 ? statusOrder[index - 1] : null;
        }

        return {
            localizeStatus: localizeStatus,
            normalizeGuid: normalizeGuid,
            calculateTotalManHours: calculateTotalManHours,
            toListItem: toListItem,
            mapItemsForRequest: mapItemsForRequest,
            nextStatus: nextStatus,
            previousStatus: previousStatus,
            parseTransitionError: parseTransitionError
        };
    }

    const exportsObject = {
        parseErrorBody: parseErrorBody,
        normalizeGuid: normalizeGuid,
        calculateTotalManHours: calculateTotalManHours,
        toListItem: toListItem,
        mapItemsForRequest: mapItemsForRequest,
        parseTransitionError: parseTransitionError,
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.LotsHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
