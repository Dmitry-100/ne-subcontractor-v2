"use strict";

(function () {
    function resolveHelpers(settings) {
        if (settings && typeof settings.helpers === "object") {
            return settings.helpers;
        }

        if (typeof window !== "undefined" && window.LotsApiHelpers) {
            return window.LotsApiHelpers;
        }

        if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            try {
                return require("./lots-api-helpers.js");
            } catch {
                return null;
            }
        }

        return null;
    }

    function ensureHelperContract(helpers) {
        if (!helpers ||
            typeof helpers.parseErrorBody !== "function" ||
            typeof helpers.buildUrl !== "function" ||
            typeof helpers.buildListUrl !== "function") {
            throw new Error("LotsApi requires helper methods.");
        }
    }

    function createApiClient(options) {
        const settings = options || {};
        const endpoint = settings.endpoint;
        const fetchImpl = settings.fetchImpl || fetch;
        const helpers = resolveHelpers(settings);

        if (!endpoint || typeof endpoint !== "string") {
            throw new Error("LotsApi requires endpoint.");
        }

        ensureHelperContract(helpers);

        const parseErrorBodyImpl = settings.parseErrorBody || helpers.parseErrorBody;

        async function request(path, requestOptions) {
            const optionsWithDefaults = requestOptions || {};
            const hasBody = typeof optionsWithDefaults.body === "string";
            const headers = {
                Accept: "application/json"
            };
            const requestUrl = typeof path === "string" && path.startsWith(endpoint)
                ? path
                : helpers.buildUrl(endpoint, path);

            if (hasBody) {
                headers["Content-Type"] = "application/json";
            }

            const response = await fetchImpl(requestUrl, {
                credentials: "include",
                ...optionsWithDefaults,
                headers: headers
            });

            if (!response.ok) {
                const bodyText = await response.text();
                throw new Error(parseErrorBodyImpl(bodyText, response.status));
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

        async function getLots(query) {
            return request(helpers.buildListUrl(endpoint, query), { method: "GET" });
        }

        async function createLot(payload) {
            return request(null, {
                method: "POST",
                body: JSON.stringify(payload || {})
            });
        }

        async function updateLot(lotId, payload) {
            return request(lotId, {
                method: "PUT",
                body: JSON.stringify(payload || {})
            });
        }

        async function deleteLot(lotId) {
            return request(lotId, {
                method: "DELETE"
            });
        }

        async function getLotDetails(lotId) {
            return request(lotId, {
                method: "GET"
            });
        }

        async function getLotHistory(lotId) {
            return request(`${lotId}/history`, {
                method: "GET"
            });
        }

        async function transitionLot(lotId, payload) {
            return request(`${lotId}/transition`, {
                method: "POST",
                body: JSON.stringify(payload || {})
            });
        }

        return {
            request: request,
            getLots: getLots,
            createLot: createLot,
            updateLot: updateLot,
            deleteLot: deleteLot,
            getLotDetails: getLotDetails,
            getLotHistory: getLotHistory,
            transitionLot: transitionLot
        };
    }

    const defaultHelpers = resolveHelpers({});
    ensureHelperContract(defaultHelpers);

    const exportsObject = {
        parseErrorBody: defaultHelpers.parseErrorBody,
        createApiClient: createApiClient
    };

    if (typeof window !== "undefined") {
        window.LotsApi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
