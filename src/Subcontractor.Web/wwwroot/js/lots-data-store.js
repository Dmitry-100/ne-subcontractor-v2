"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsDataStore requires ${name}.`);
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

    function createStore(options) {
        const settings = options || {};
        const devExpressData = settings.devExpressData;
        const apiClient = settings.apiClient;
        const helpers = settings.helpers;
        const setStatus = settings.setStatus;
        const core = settings.core;

        if (!devExpressData || typeof devExpressData.CustomStore !== "function") {
            throw new Error("LotsDataStore requires devExpressData.CustomStore.");
        }

        if (!apiClient) {
            throw new Error("LotsDataStore requires apiClient.");
        }

        if (!helpers) {
            throw new Error("LotsDataStore requires helpers.");
        }

        if (!core) {
            throw new Error("LotsDataStore requires core.");
        }

        requireFunction(apiClient.getLots, "apiClient.getLots");
        requireFunction(apiClient.createLot, "apiClient.createLot");
        requireFunction(apiClient.updateLot, "apiClient.updateLot");
        requireFunction(apiClient.deleteLot, "apiClient.deleteLot");
        requireFunction(helpers.normalizeGuid, "helpers.normalizeGuid");
        requireFunction(helpers.toListItem, "helpers.toListItem");
        requireFunction(helpers.mapItemsForRequest, "helpers.mapItemsForRequest");
        requireFunction(setStatus, "setStatus callback");
        requireFunction(core.setLotsCache, "core.setLotsCache");
        requireFunction(core.addLotToCache, "core.addLotToCache");
        requireFunction(core.findLotById, "core.findLotById");
        requireFunction(core.getLotDetails, "core.getLotDetails");
        requireFunction(core.setLotDetails, "core.setLotDetails");
        requireFunction(core.replaceLotInCache, "core.replaceLotInCache");
        requireFunction(core.deleteLotDetails, "core.deleteLotDetails");
        requireFunction(core.removeLotFromCache, "core.removeLotFromCache");
        requireFunction(core.getSelectedLot, "core.getSelectedLot");
        requireFunction(core.applySelection, "core.applySelection");

        return new devExpressData.CustomStore({
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

                const payload = await apiClient.getLots(Object.keys(query).length > 0 ? query : null);
                const pagedPayload = tryReadPagedPayload(payload);
                if (pagedPayload) {
                    const rows = core.setLotsCache(pagedPayload.items);
                    setStatus(`Загружено лотов: ${rows.length} (всего: ${pagedPayload.totalCount}).`, false);
                    return {
                        data: rows,
                        totalCount: pagedPayload.totalCount
                    };
                }

                const rows = core.setLotsCache(Array.isArray(payload) ? payload : []);
                setStatus(`Загружено лотов: ${rows.length}.`, false);
                return rows;
            },
            insert: async function (values) {
                const payload = {
                    code: String(values.code ?? "").trim(),
                    name: String(values.name ?? "").trim(),
                    responsibleCommercialUserId: helpers.normalizeGuid(values.responsibleCommercialUserId),
                    items: []
                };

                if (!payload.code) {
                    throw new Error("Код лота обязателен.");
                }

                if (!payload.name) {
                    throw new Error("Наименование лота обязательно.");
                }

                const createdDetails = await apiClient.createLot(payload);
                const created = helpers.toListItem(createdDetails, null);
                core.addLotToCache(created);
                core.setLotDetails(created.id, createdDetails);
                setStatus(`Лот '${created.code}' создан.`, false);
                return created;
            },
            update: async function (key, values) {
                const current = core.findLotById(key);
                const details = await core.getLotDetails(key, false);
                const payload = {
                    name: String(values.name ?? current?.name ?? "").trim(),
                    responsibleCommercialUserId: values.responsibleCommercialUserId !== undefined
                        ? helpers.normalizeGuid(values.responsibleCommercialUserId)
                        : helpers.normalizeGuid(current?.responsibleCommercialUserId),
                    items: helpers.mapItemsForRequest(details?.items)
                };

                if (!payload.name) {
                    throw new Error("Наименование лота обязательно.");
                }

                const updatedDetails = await apiClient.updateLot(key, payload);
                core.setLotDetails(key, updatedDetails);
                const updated = helpers.toListItem(updatedDetails, current);
                core.replaceLotInCache(key, updated);
                setStatus(`Лот '${updated.code}' обновлён.`, false);
                return updated;
            },
            remove: async function (key) {
                await apiClient.deleteLot(key);
                core.deleteLotDetails(key);
                core.removeLotFromCache(key);

                const selectedLot = core.getSelectedLot();
                if (selectedLot && selectedLot.id === key) {
                    core.applySelection(null);
                }

                setStatus("Лот удалён.", false);
            }
        });
    }

    const exportsObject = {
        createStore: createStore
    };

    if (typeof window !== "undefined") {
        window.LotsDataStore = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
