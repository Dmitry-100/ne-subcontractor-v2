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

    function buildUrl(endpoint, path) {
        if (!path) {
            return endpoint;
        }

        return `${endpoint}/${path}`;
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

        const projectId = String(query.projectId ?? "").trim();
        if (projectId.length > 0) {
            queryParts.push(`projectId=${encodeURIComponent(projectId)}`);
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

    const exportsObject = {
        parseErrorBody: parseErrorBody,
        buildUrl: buildUrl,
        buildListUrl: buildListUrl
    };

    if (typeof window !== "undefined") {
        window.LotsApiHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
