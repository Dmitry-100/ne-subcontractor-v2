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

    function createApiClient(options) {
        const settings = options || {};
        const fetchImpl = settings.fetchImpl || fetch;
        const endpoint = settings.endpoint || "/api/contractors";
        const ratingModelEndpoint = settings.ratingModelEndpoint || `${endpoint}/rating/model`;
        const ratingRecalculateEndpoint = settings.ratingRecalculateEndpoint || `${endpoint}/rating/recalculate`;
        const ratingAnalyticsEndpoint = settings.ratingAnalyticsEndpoint || `${endpoint}/rating/analytics`;

        function toInteger(value) {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return null;
            }

            return Math.trunc(number);
        }

        function buildListUrl(query) {
            if (!query || typeof query !== "object") {
                return endpoint;
            }

            const queryParts = [];
            const search = String(query.search ?? "").trim();
            if (search.length > 0) {
                queryParts.push(`search=${encodeURIComponent(search)}`);
            }

            const skip = toInteger(query.skip);
            if (skip !== null && skip >= 0) {
                queryParts.push(`skip=${encodeURIComponent(String(skip))}`);
            }

            const take = toInteger(query.take);
            if (take !== null && take > 0) {
                queryParts.push(`take=${encodeURIComponent(String(take))}`);
            }

            if (query.requireTotalCount) {
                queryParts.push("requireTotalCount=true");
            }

            if (queryParts.length === 0) {
                return endpoint;
            }

            return `${endpoint}?${queryParts.join("&")}`;
        }

        async function request(url, options) {
            const requestOptions = options || {};
            const hasBody = typeof requestOptions.body === "string";
            const headers = {
                Accept: "application/json"
            };

            if (hasBody) {
                headers["Content-Type"] = "application/json";
            }

            const response = await fetchImpl(url, {
                credentials: "include",
                ...requestOptions,
                headers: headers
            });

            if (!response.ok) {
                const bodyText = await response.text();
                throw new Error(parseErrorBody(bodyText, response.status));
            }

            if (response.status === 204) {
                return null;
            }

            const text = await response.text();
            if (!text) {
                return null;
            }

            return JSON.parse(text);
        }

        async function getContractors(query) {
            return request(buildListUrl(query), { method: "GET" });
        }

        async function getRatingModel() {
            return request(ratingModelEndpoint, { method: "GET" });
        }

        async function updateRatingModel(payload) {
            return request(ratingModelEndpoint, {
                method: "PUT",
                body: JSON.stringify(payload || {})
            });
        }

        async function recalculateRatings(payload) {
            return request(ratingRecalculateEndpoint, {
                method: "POST",
                body: JSON.stringify(payload || {})
            });
        }

        async function getRatingAnalytics() {
            return request(ratingAnalyticsEndpoint, { method: "GET" });
        }

        async function getRatingHistory(contractorId) {
            return request(`${endpoint}/${contractorId}/rating/history?top=50`, {
                method: "GET"
            });
        }

        async function saveManualAssessment(contractorId, payload) {
            return request(`${endpoint}/${contractorId}/rating/manual-assessment`, {
                method: "POST",
                body: JSON.stringify(payload || {})
            });
        }

        return {
            request: request,
            getContractors: getContractors,
            getRatingModel: getRatingModel,
            updateRatingModel: updateRatingModel,
            recalculateRatings: recalculateRatings,
            getRatingAnalytics: getRatingAnalytics,
            getRatingHistory: getRatingHistory,
            saveManualAssessment: saveManualAssessment
        };
    }

    const exportsObject = {
        parseErrorBody: parseErrorBody,
        createApiClient: createApiClient
    };

    if (typeof window !== "undefined") {
        window.ContractorsApi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
