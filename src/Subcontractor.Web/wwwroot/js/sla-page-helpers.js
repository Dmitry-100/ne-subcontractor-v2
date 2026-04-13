"use strict";

(function () {
    function createHelpers(options) {
        const settings = options || {};
        const cssGlobal = settings.cssGlobal || (typeof window !== "undefined" ? window.CSS : null);

        function localizeSeverity(value) {
            const normalized = String(value || "").trim().toLowerCase();
            if (normalized === "overdue") {
                return "Просрочка";
            }

            if (normalized === "warning") {
                return "Предупреждение";
            }

            return String(value || "");
        }

        function formatDate(value) {
            if (!value) {
                return "";
            }

            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return value;
            }

            return date.toLocaleDateString("ru-RU");
        }

        function parseApiError(rawText, statusCode, statusText) {
            const fallback = Number.isFinite(statusCode)
                ? String(statusCode) + " " + String(statusText || "").trim()
                : "Ошибка запроса.";

            if (!rawText) {
                return fallback.trim();
            }

            try {
                const payload = JSON.parse(rawText);
                if (payload && typeof payload.detail === "string" && payload.detail.trim().length > 0) {
                    return payload.detail;
                }

                if (payload && typeof payload.error === "string" && payload.error.trim().length > 0) {
                    return payload.error;
                }

                if (payload && typeof payload.title === "string" && payload.title.trim().length > 0) {
                    return payload.title;
                }
            } catch {
                return rawText;
            }

            return rawText;
        }

        function getErrorMessage(error) {
            return error && error.message ? error.message : String(error);
        }

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function cssEscape(value) {
            if (cssGlobal && typeof cssGlobal.escape === "function") {
                return cssGlobal.escape(value);
            }

            return String(value).replace(/"/g, '\\"');
        }

        return {
            localizeSeverity: localizeSeverity,
            formatDate: formatDate,
            parseApiError: parseApiError,
            getErrorMessage: getErrorMessage,
            escapeHtml: escapeHtml,
            cssEscape: cssEscape
        };
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.SlaPageHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
