"use strict";

(function () {
    function createHelpers(options) {
        const settings = options || {};
        const statusCaptions = settings.statusCaptions || {};

        function parseErrorBody(rawText, statusCode) {
            if (!rawText) {
                return "Ошибка запроса (" + statusCode + ").";
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

        function formatPercent(value) {
            if (typeof value !== "number" || Number.isNaN(value)) {
                return "н/д";
            }

            return value.toFixed(2) + "%";
        }

        function formatMoney(value) {
            if (typeof value !== "number" || Number.isNaN(value)) {
                return "0";
            }

            return value.toLocaleString("ru-RU", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function formatDate(value) {
            if (!value) {
                return "Без срока";
            }

            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
                return "Без срока";
            }

            return parsed.toLocaleDateString("ru-RU");
        }

        function localizeStatus(value) {
            return statusCaptions[String(value || "").trim()] || String(value || "Неизвестно");
        }

        function localizePriority(priorityCode) {
            const normalized = String(priorityCode || "").trim().toLowerCase();
            if (normalized === "high") {
                return "Высокий";
            }

            if (normalized === "low") {
                return "Низкий";
            }

            return "Обычный";
        }

        function getLotCountByStatus(stages, statusName) {
            const entries = Array.isArray(stages) ? stages : [];
            const normalized = String(statusName || "").trim().toLowerCase();
            const row = entries.find(function (stage) {
                return String(stage.status || "").trim().toLowerCase() === normalized;
            });

            return row && typeof row.count === "number" ? row.count : 0;
        }

        return {
            parseErrorBody: parseErrorBody,
            formatPercent: formatPercent,
            formatMoney: formatMoney,
            formatDate: formatDate,
            localizeStatus: localizeStatus,
            localizePriority: localizePriority,
            getLotCountByStatus: getLotCountByStatus
        };
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.DashboardPageHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
