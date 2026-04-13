"use strict";

(function () {
    function defaultParseApiError(rawText, statusCode, statusText) {
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

    function createApiClient(options) {
        const settings = options || {};
        const fetchImpl = settings.fetchImpl || fetch;
        const parseApiError = settings.parseApiError || defaultParseApiError;
        const rulesApi = settings.rulesApi || "/api/sla/rules";
        const violationsApi = settings.violationsApi || "/api/sla/violations";
        const runApi = settings.runApi || "/api/sla/run";

        async function request(url, options) {
            const requestOptions = options || {};
            const hasBody = typeof requestOptions.body === "string";
            const response = await fetchImpl(url, {
                credentials: "include",
                ...requestOptions,
                headers: {
                    Accept: "application/json",
                    ...(hasBody ? { "Content-Type": "application/json" } : {})
                }
            });

            if (!response.ok) {
                let bodyText = "";
                try {
                    bodyText = await response.text();
                } catch {
                    bodyText = "";
                }

                throw new Error(parseApiError(bodyText, response.status, response.statusText));
            }

            if (response.status === 204) {
                return null;
            }

            const responseText = await response.text();
            if (!responseText) {
                return null;
            }

            return JSON.parse(responseText);
        }

        async function getRules() {
            return request(rulesApi, { method: "GET" });
        }

        async function saveRules(items) {
            return request(rulesApi, {
                method: "PUT",
                body: JSON.stringify({
                    items: Array.isArray(items) ? items : []
                })
            });
        }

        async function getViolations(includeResolved) {
            const includeResolvedValue = includeResolved ? "true" : "false";
            return request(violationsApi + "?includeResolved=" + includeResolvedValue, {
                method: "GET"
            });
        }

        async function runMonitoring(sendNotifications) {
            const sendNotificationsValue = sendNotifications ? "true" : "false";
            return request(runApi + "?sendNotifications=" + sendNotificationsValue, {
                method: "POST"
            });
        }

        async function saveViolationReason(violationId, payload) {
            return request(violationsApi + "/" + encodeURIComponent(violationId) + "/reason", {
                method: "PUT",
                body: JSON.stringify(payload || {})
            });
        }

        return {
            request: request,
            getRules: getRules,
            saveRules: saveRules,
            getViolations: getViolations,
            runMonitoring: runMonitoring,
            saveViolationReason: saveViolationReason
        };
    }

    const exportsObject = {
        createApiClient: createApiClient
    };

    if (typeof window !== "undefined") {
        window.SlaPageApi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
