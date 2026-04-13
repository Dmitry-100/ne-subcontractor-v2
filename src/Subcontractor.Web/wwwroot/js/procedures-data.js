"use strict";

(function () {
    const proceduresDataHelpersRoot =
        typeof window !== "undefined" && window.ProceduresDataHelpers
            ? window.ProceduresDataHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./procedures-data-helpers.js")
                : null;

    if (!proceduresDataHelpersRoot ||
        typeof proceduresDataHelpersRoot.buildProceduresLoadQuery !== "function" ||
        typeof proceduresDataHelpersRoot.toPagedResult !== "function" ||
        typeof proceduresDataHelpersRoot.toListItem !== "function") {
        throw new Error("ProceduresData requires ProceduresDataHelpers.");
    }

    const toListItem = proceduresDataHelpersRoot.toListItem;

    function createDataService(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const endpoint = settings.endpoint;
        if (!apiClient || typeof apiClient.getProcedures !== "function") {
            throw new Error("createDataService: apiClient is required.");
        }

        if (!endpoint || typeof endpoint !== "string") {
            throw new Error("createDataService: endpoint is required.");
        }

        let proceduresCache = [];
        let proceduresTotalCount = 0;
        const detailsCache = new Map();

        function getCachedProcedures() {
            return proceduresCache;
        }

        function findProcedureById(procedureId) {
            return proceduresCache.find(function (item) {
                return item.id === procedureId;
            }) ?? null;
        }

        function getProceduresTotalCount() {
            return proceduresTotalCount;
        }

        async function loadProcedures(loadOptions) {
            const query = proceduresDataHelpersRoot.buildProceduresLoadQuery(loadOptions, 15);

            const payload = await apiClient.getProcedures(
                endpoint,
                query);

            const pagedResult = proceduresDataHelpersRoot.toPagedResult(payload, 15);
            if (pagedResult) {
                proceduresCache = pagedResult.items;
                proceduresTotalCount = pagedResult.totalCount;
                return {
                    items: pagedResult.items,
                    totalCount: pagedResult.totalCount,
                    paged: true
                };
            }

            proceduresCache = Array.isArray(payload) ? payload : [];
            proceduresTotalCount = proceduresCache.length;
            return {
                items: proceduresCache,
                totalCount: proceduresTotalCount,
                paged: false
            };
        }

        async function getDetails(procedureId, forceReload) {
            if (!forceReload && detailsCache.has(procedureId)) {
                return detailsCache.get(procedureId);
            }

            const details = await apiClient.getProcedureDetails(endpoint, procedureId);
            detailsCache.set(procedureId, details);
            return details;
        }

        async function createProcedure(payload) {
            const createdDetails = await apiClient.createProcedure(endpoint, payload);
            const created = toListItem(createdDetails, null);
            proceduresCache.push(created);
            proceduresTotalCount += 1;
            detailsCache.set(created.id, createdDetails);
            return created;
        }

        async function updateProcedure(procedureId, payload) {
            const current = findProcedureById(procedureId);
            const updatedDetails = await apiClient.updateProcedure(endpoint, procedureId, payload);
            detailsCache.set(procedureId, updatedDetails);

            const updated = toListItem(updatedDetails, current);
            proceduresCache = proceduresCache.map(function (item) {
                return item.id === procedureId ? updated : item;
            });

            return updated;
        }

        async function deleteProcedure(procedureId) {
            await apiClient.deleteProcedure(endpoint, procedureId);
            detailsCache.delete(procedureId);
            proceduresCache = proceduresCache.filter(function (item) {
                return item.id !== procedureId;
            });
            proceduresTotalCount = Math.max(0, proceduresTotalCount - 1);
        }

        return {
            toListItem: toListItem,
            getCachedProcedures: getCachedProcedures,
            getProceduresTotalCount: getProceduresTotalCount,
            findProcedureById: findProcedureById,
            loadProcedures: loadProcedures,
            getDetails: getDetails,
            createProcedure: createProcedure,
            updateProcedure: updateProcedure,
            deleteProcedure: deleteProcedure
        };
    }

    const exportsObject = {
        toListItem: toListItem,
        createDataService: createDataService
    };

    if (typeof window !== "undefined") {
        window.ProceduresData = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
