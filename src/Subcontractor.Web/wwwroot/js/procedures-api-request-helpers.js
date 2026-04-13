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

    function toInteger(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return null;
        }
        return Math.trunc(number);
    }

    function appendQueryToUrl(url, query) {
        if (!query || typeof query !== "object") {
            return url;
        }

        const queryParts = [];
        const search = String(query.search ?? "").trim();
        if (search.length > 0) {
            queryParts.push(`search=${encodeURIComponent(search)}`);
        }
        const status = String(query.status ?? "").trim();
        if (status.length > 0) {
            queryParts.push(`status=${encodeURIComponent(status)}`);
        }
        const lotId = String(query.lotId ?? "").trim();
        if (lotId.length > 0) {
            queryParts.push(`lotId=${encodeURIComponent(lotId)}`);
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
            return url;
        }

        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}${queryParts.join("&")}`;
    }

    function createRequest(fetchImpl, parseErrorBodyImpl) {
        if (typeof fetchImpl !== "function") {
            throw new Error("ProceduresApi helpers require fetch implementation.");
        }

        const parseBody = typeof parseErrorBodyImpl === "function"
            ? parseErrorBodyImpl
            : parseErrorBody;

        return async function request(url, options) {
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
                throw new Error(parseBody(bodyText, response.status));
            }

            if (response.status === 204) {
                return null;
            }

            const text = await response.text();
            if (!text) {
                return null;
            }

            return JSON.parse(text);
        };
    }

    const exportsObject = {
        parseErrorBody: parseErrorBody,
        appendQueryToUrl: appendQueryToUrl,
        createRequest: createRequest
    };

    if (typeof window !== "undefined") {
        window.ProceduresApiRequestHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
