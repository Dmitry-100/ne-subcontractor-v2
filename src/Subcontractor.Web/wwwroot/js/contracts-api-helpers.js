"use strict";

(function () {
    function fallbackParseErrorBody(rawText, statusCode) {
        if (!rawText) {
            return `Ошибка запроса (${statusCode}).`;
        }

        return rawText;
    }

    function resolveParseErrorBody(customParser) {
        if (typeof customParser === "function") {
            return customParser;
        }

        const helpers = typeof window !== "undefined" ? window.ContractsGridHelpers : null;
        if (helpers && typeof helpers.parseErrorBody === "function") {
            return helpers.parseErrorBody;
        }

        return fallbackParseErrorBody;
    }

    function encodePathSegment(value, name) {
        const text = String(value || "").trim();
        if (!text) {
            throw new Error(`Не задан обязательный параметр '${name}'.`);
        }

        return encodeURIComponent(text);
    }

    function toInteger(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return null;
        }

        return Math.trunc(number);
    }

    function buildListUrl(endpoint, query) {
        if (!query || typeof query !== "object") {
            return endpoint;
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

        const procedureId = String(query.procedureId ?? "").trim();
        if (procedureId.length > 0) {
            queryParts.push(`procedureId=${encodeURIComponent(procedureId)}`);
        }

        const contractorId = String(query.contractorId ?? "").trim();
        if (contractorId.length > 0) {
            queryParts.push(`contractorId=${encodeURIComponent(contractorId)}`);
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

    async function request(url, options, parseErrorBody, fetchImpl) {
        const hasBody = options && typeof options.body === "string";
        const headers = {
            Accept: "application/json"
        };

        if (hasBody) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetchImpl(url, {
            credentials: "include",
            ...options,
            headers: headers
        });

        if (!response.ok) {
            const bodyText = await response.text();
            throw new Error(parseErrorBody(bodyText, response.status));
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    const exportsObject = {
        resolveParseErrorBody: resolveParseErrorBody,
        encodePathSegment: encodePathSegment,
        buildListUrl: buildListUrl,
        request: request
    };

    if (typeof window !== "undefined") {
        window.ContractsApiHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
