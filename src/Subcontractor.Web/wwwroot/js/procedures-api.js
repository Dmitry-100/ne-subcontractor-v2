"use strict";

(function () {
    const helpersRoot =
        typeof window !== "undefined" && window.ProceduresApiRequestHelpers
            ? window.ProceduresApiRequestHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./procedures-api-request-helpers.js")
                : null;

    if (!helpersRoot ||
        typeof helpersRoot.parseErrorBody !== "function" ||
        typeof helpersRoot.appendQueryToUrl !== "function" ||
        typeof helpersRoot.createRequest !== "function") {
        throw new Error("ProceduresApi requires ProceduresApiRequestHelpers.");
    }

    const parseErrorBody = helpersRoot.parseErrorBody;

    function createApiClient(options) {
        const settings = options || {};
        const fetchImpl = settings.fetchImpl || fetch;
        const request = helpersRoot.createRequest(fetchImpl, parseErrorBody);

        async function getProcedures(endpoint, query) {
            return request(helpersRoot.appendQueryToUrl(endpoint, query), { method: "GET" });
        }

        function get(url) {
            return request(url, { method: "GET" });
        }
        function post(url, payload) {
            return request(url, {
                method: "POST",
                body: JSON.stringify(payload || {})
            });
        }
        function put(url, payload) {
            return request(url, {
                method: "PUT",
                body: JSON.stringify(payload || {})
            });
        }

        function remove(url) {
            return request(url, { method: "DELETE" });
        }

        async function createProcedure(endpoint, payload) {
            return post(endpoint, payload);
        }

        async function updateProcedure(endpoint, procedureId, payload) {
            return put(`${endpoint}/${procedureId}`, payload);
        }

        async function deleteProcedure(endpoint, procedureId) {
            return remove(`${endpoint}/${procedureId}`);
        }

        async function getProcedureDetails(endpoint, procedureId) {
            return get(`${endpoint}/${procedureId}`);
        }

        async function getProcedureHistory(endpoint, procedureId) {
            return get(`${endpoint}/${procedureId}/history`);
        }

        async function transitionProcedure(endpoint, procedureId, payload) {
            return post(`${endpoint}/${procedureId}/transition`, payload);
        }

        async function getShortlistRecommendations(endpoint, procedureId) {
            return get(`${endpoint}/${procedureId}/shortlist/recommendations`);
        }

        async function getShortlistAdjustments(endpoint, procedureId) {
            return get(`${endpoint}/${procedureId}/shortlist/adjustments`);
        }

        async function applyShortlistRecommendations(endpoint, procedureId, payload) {
            return post(`${endpoint}/${procedureId}/shortlist/recommendations/apply`, payload);
        }

        return {
            request: request,
            getProcedures: getProcedures,
            createProcedure: createProcedure,
            updateProcedure: updateProcedure,
            deleteProcedure: deleteProcedure,
            getProcedureDetails: getProcedureDetails,
            getProcedureHistory: getProcedureHistory,
            transitionProcedure: transitionProcedure,
            getShortlistRecommendations: getShortlistRecommendations,
            getShortlistAdjustments: getShortlistAdjustments,
            applyShortlistRecommendations: applyShortlistRecommendations
        };
    }

    const exportsObject = {
        parseErrorBody: parseErrorBody,
        createApiClient: createApiClient
    };

    if (typeof window !== "undefined") {
        window.ProceduresApi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
