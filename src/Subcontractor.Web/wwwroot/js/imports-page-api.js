"use strict";

(function () {
    function parseErrorBody(bodyText, statusCode) {
        const fallback = `Ошибка запроса (${statusCode}).`;
        const text = String(bodyText || "");
        if (!text) {
            return fallback;
        }

        try {
            const body = JSON.parse(text);
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
            return text;
        }

        return text;
    }

    function buildValidationReportUrl(endpoint, batchId, includeValidRows) {
        const query = includeValidRows ? "?includeValidRows=true" : "";
        return `${endpoint}/${batchId}/validation-report${query}`;
    }

    function buildLotReconciliationReportUrl(endpoint, batchId) {
        return `${endpoint}/${batchId}/lot-reconciliation-report`;
    }

    function createApiClient(options) {
        const settings = options || {};
        const fetchImpl = settings.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
        if (typeof fetchImpl !== "function") {
            throw new Error("Fetch API недоступен для imports-page API client.");
        }

        async function parseError(response) {
            const bodyText = await response.text();
            return parseErrorBody(bodyText, response.status);
        }

        async function request(url, requestOptions) {
            const normalizedOptions = requestOptions || {};
            const hasBody = typeof normalizedOptions.body === "string";
            const headers = {
                Accept: "application/json"
            };

            if (hasBody) {
                headers["Content-Type"] = "application/json";
            }

            const customHeaders = normalizedOptions.headers && typeof normalizedOptions.headers === "object"
                ? normalizedOptions.headers
                : {};

            const response = await fetchImpl(url, {
                credentials: "include",
                ...normalizedOptions,
                headers: {
                    ...headers,
                    ...customHeaders
                }
            });

            if (!response.ok) {
                throw new Error(await parseError(response));
            }

            if (response.status === 204) {
                return null;
            }

            const bodyText = await response.text();
            if (!bodyText) {
                return null;
            }

            return JSON.parse(bodyText);
        }

        function getBatches(endpoint) {
            return request(endpoint, { method: "GET" });
        }

        function getBatchDetails(endpoint, batchId) {
            return request(`${endpoint}/${batchId}`, { method: "GET" });
        }

        function getBatchHistory(endpoint, batchId) {
            return request(`${endpoint}/${batchId}/history`, { method: "GET" });
        }

        function createQueuedBatch(queuedEndpoint, payload) {
            return request(queuedEndpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        function transitionBatch(endpoint, batchId, payload) {
            return request(`${endpoint}/${batchId}/transition`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        function getXmlInbox(xmlInboxEndpoint) {
            return request(xmlInboxEndpoint, { method: "GET" });
        }

        function queueXmlInboxItem(xmlInboxEndpoint, payload) {
            return request(xmlInboxEndpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        function retryXmlInboxItem(xmlInboxEndpoint, itemId) {
            return request(`${xmlInboxEndpoint}/${itemId}/retry`, { method: "POST" });
        }

        function getLotRecommendations(lotRecommendationsEndpoint, batchId) {
            return request(`${lotRecommendationsEndpoint}/${batchId}`, { method: "GET" });
        }

        function applyLotRecommendations(lotRecommendationsEndpoint, batchId, payload) {
            return request(`${lotRecommendationsEndpoint}/${batchId}/apply`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        return {
            request: request,
            buildValidationReportUrl: function (endpoint, batchId, includeValidRows) {
                return buildValidationReportUrl(endpoint, batchId, includeValidRows);
            },
            buildLotReconciliationReportUrl: function (endpoint, batchId) {
                return buildLotReconciliationReportUrl(endpoint, batchId);
            },
            getBatches: getBatches,
            getBatchDetails: getBatchDetails,
            getBatchHistory: getBatchHistory,
            createQueuedBatch: createQueuedBatch,
            transitionBatch: transitionBatch,
            getXmlInbox: getXmlInbox,
            queueXmlInboxItem: queueXmlInboxItem,
            retryXmlInboxItem: retryXmlInboxItem,
            getLotRecommendations: getLotRecommendations,
            applyLotRecommendations: applyLotRecommendations
        };
    }

    const exportsObject = {
        createApiClient: createApiClient,
        parseErrorBody: parseErrorBody,
        buildValidationReportUrl: buildValidationReportUrl,
        buildLotReconciliationReportUrl: buildLotReconciliationReportUrl
    };

    if (typeof window !== "undefined") {
        window.ImportsPageApi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
