"use strict";

(function () {
    function toFiniteInteger(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return null;
        }

        return Math.trunc(number);
    }

    function tryReadPagedPayload(payload) {
        if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
            return null;
        }

        const totalCountValue = toFiniteInteger(payload.totalCount);
        const totalCount = totalCountValue !== null && totalCountValue >= 0
            ? totalCountValue
            : payload.items.length;

        return {
            items: payload.items,
            totalCount: totalCount
        };
    }

    function buildRegistryLoadQuery(loadOptions) {
        const options = loadOptions || {};
        const skip = toFiniteInteger(options.skip);
        const take = toFiniteInteger(options.take);
        const search = typeof options.searchValue === "string"
            ? options.searchValue.trim()
            : "";
        const hasPagingQuery = (skip !== null && skip >= 0) || (take !== null && take > 0);

        const query = {};
        if (hasPagingQuery) {
            query.skip = skip !== null && skip >= 0 ? skip : 0;
            query.take = take !== null && take > 0 ? take : 15;
            query.requireTotalCount = true;
        }

        if (search.length > 0) {
            query.search = search;
        }

        return Object.keys(query).length > 0 ? query : null;
    }

    function buildRegistryStatusMessage(loadedCount, totalCount) {
        const loaded = Number(loadedCount || 0);
        const total = Number(totalCount || 0);
        if (loaded === total) {
            return `Загружено подрядчиков: ${loaded}.`;
        }

        return `Загружено подрядчиков: ${loaded} (всего: ${total}).`;
    }

    const exportsObject = {
        buildRegistryLoadQuery: buildRegistryLoadQuery,
        buildRegistryStatusMessage: buildRegistryStatusMessage,
        toFiniteInteger: toFiniteInteger,
        tryReadPagedPayload: tryReadPagedPayload
    };

    if (typeof window !== "undefined") {
        window.ContractorsDataPagingHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
