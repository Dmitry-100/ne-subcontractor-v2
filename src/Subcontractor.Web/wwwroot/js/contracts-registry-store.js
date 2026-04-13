"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsRegistryStore requires ${name}.`);
        }
    }

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

    function createContractsStore(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const gridState = settings.gridState;
        const payloadBuilder = settings.payloadBuilder;
        const setStatus = settings.setStatus;
        const appendFilterHint = settings.appendFilterHint;
        const onDataMutated = settings.onDataMutated;

        requireFunction(apiClient?.listContracts, "apiClient.listContracts");
        requireFunction(apiClient?.createContract, "apiClient.createContract");
        requireFunction(apiClient?.updateContract, "apiClient.updateContract");
        requireFunction(apiClient?.deleteContract, "apiClient.deleteContract");
        requireFunction(gridState?.setContracts, "gridState.setContracts");
        requireFunction(gridState?.addContract, "gridState.addContract");
        requireFunction(gridState?.findContractById, "gridState.findContractById");
        requireFunction(gridState?.replaceContractById, "gridState.replaceContractById");
        requireFunction(gridState?.removeContractById, "gridState.removeContractById");
        requireFunction(payloadBuilder?.createRequestPayload, "payloadBuilder.createRequestPayload");
        requireFunction(payloadBuilder?.updateRequestPayload, "payloadBuilder.updateRequestPayload");
        requireFunction(setStatus, "setStatus");
        requireFunction(appendFilterHint, "appendFilterHint");
        requireFunction(onDataMutated, "onDataMutated");

        if (!(window?.DevExpress?.data?.CustomStore)) {
            throw new Error("ContractsRegistryStore requires window.DevExpress.data.CustomStore.");
        }

        return new window.DevExpress.data.CustomStore({
            key: "id",
            load: async function (loadOptions) {
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

                const payload = await apiClient.listContracts(Object.keys(query).length > 0 ? query : null);
                const pagedPayload = tryReadPagedPayload(payload);
                if (pagedPayload) {
                    const rows = gridState.setContracts(pagedPayload.items);
                    const statusMessage = pagedPayload.totalCount === rows.length
                        ? `Загружено договоров: ${rows.length}.`
                        : `Загружено договоров: ${rows.length} (всего: ${pagedPayload.totalCount}).`;
                    setStatus(appendFilterHint(statusMessage), false);
                    onDataMutated();
                    return {
                        data: rows,
                        totalCount: pagedPayload.totalCount
                    };
                }

                const contracts = gridState.setContracts(Array.isArray(payload) ? payload : []);
                setStatus(appendFilterHint(`Загружено договоров: ${contracts.length}.`), false);
                onDataMutated();
                return contracts;
            },
            insert: async function (values) {
                const payload = payloadBuilder.createRequestPayload(values);
                const created = await apiClient.createContract(payload);

                gridState.addContract(created);
                setStatus(`Договор '${created.contractNumber}' создан.`, false);
                return created;
            },
            update: async function (key, values) {
                const current = gridState.findContractById(key);

                if (!current) {
                    throw new Error("Текущая запись договора не найдена в кэше.");
                }

                const payload = payloadBuilder.updateRequestPayload(current, values);
                const updated = await apiClient.updateContract(key, payload);

                gridState.replaceContractById(key, updated);
                setStatus(`Договор '${updated.contractNumber}' обновлён.`, false);
                return updated;
            },
            remove: async function (key) {
                await apiClient.deleteContract(key);

                gridState.removeContractById(key);
                setStatus("Договор удалён.", false);
                onDataMutated();
            }
        });
    }

    const exportsObject = {
        createContractsStore: createContractsStore
    };

    if (typeof window !== "undefined") {
        window.ContractsRegistryStore = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
