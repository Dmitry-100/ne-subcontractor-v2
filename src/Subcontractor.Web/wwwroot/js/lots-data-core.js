"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsDataCore requires ${name}.`);
        }
    }

    function createDataCore(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const onSelectionChanged = settings.onSelectionChanged;
        const onHistoryLoadError = settings.onHistoryLoadError;

        if (!apiClient) {
            throw new Error("LotsDataCore requires apiClient.");
        }

        requireFunction(apiClient.getLotDetails, "apiClient.getLotDetails");
        requireFunction(apiClient.getLotHistory, "apiClient.getLotHistory");
        requireFunction(onSelectionChanged, "onSelectionChanged callback");
        requireFunction(onHistoryLoadError, "onHistoryLoadError callback");

        let lotsGridInstance = null;
        let historyGridInstance = null;
        let lotsCache = [];
        const lotDetailsCache = new Map();
        let selectedLot = null;

        function ensureHistoryGridInstance() {
            if (!historyGridInstance || typeof historyGridInstance.option !== "function") {
                throw new Error("LotsDataCore requires historyGridInstance with option method.");
            }

            return historyGridInstance;
        }

        function ensureLotsGridInstance() {
            if (!lotsGridInstance || typeof lotsGridInstance.refresh !== "function" || typeof lotsGridInstance.selectRows !== "function") {
                throw new Error("LotsDataCore requires lotsGridInstance with refresh/selectRows methods.");
            }

            return lotsGridInstance;
        }

        function attachGridInstances(instances) {
            const value = instances || {};
            lotsGridInstance = value.lotsGridInstance || null;
            historyGridInstance = value.historyGridInstance || null;
        }

        function getSelectedLot() {
            return selectedLot;
        }

        function findLotById(lotId) {
            return lotsCache.find(function (item) {
                return item.id === lotId;
            }) || null;
        }

        function setLotsCache(rows) {
            lotsCache = Array.isArray(rows) ? rows.slice() : [];
            return lotsCache;
        }

        function addLotToCache(lot) {
            lotsCache.push(lot);
            return lot;
        }

        function replaceLotInCache(lotId, updated) {
            lotsCache = lotsCache.map(function (item) {
                return item.id === lotId ? updated : item;
            });

            return updated;
        }

        function removeLotFromCache(lotId) {
            lotsCache = lotsCache.filter(function (item) {
                return item.id !== lotId;
            });
        }

        async function getLotDetails(lotId, forceReload) {
            if (!forceReload && lotDetailsCache.has(lotId)) {
                return lotDetailsCache.get(lotId);
            }

            const details = await apiClient.getLotDetails(lotId);
            lotDetailsCache.set(lotId, details);
            return details;
        }

        function setLotDetails(lotId, details) {
            lotDetailsCache.set(lotId, details);
            return details;
        }

        function deleteLotDetails(lotId) {
            lotDetailsCache.delete(lotId);
        }

        async function loadHistory(lotId) {
            const historyGrid = ensureHistoryGridInstance();
            if (!lotId) {
                historyGrid.option("dataSource", []);
                return [];
            }

            if (typeof historyGrid.ensureInitialized === "function") {
                historyGrid.ensureInitialized();
            }

            const history = await apiClient.getLotHistory(lotId);
            const rows = Array.isArray(history) ? history : [];
            historyGrid.option("dataSource", rows);
            return rows;
        }

        function applySelection(lot) {
            const previousLot = selectedLot;
            selectedLot = lot || null;
            onSelectionChanged(selectedLot);

            if (!previousLot && !selectedLot) {
                return;
            }

            if (!selectedLot) {
                loadHistory(null).catch(function () {
                    try {
                        ensureHistoryGridInstance().option("dataSource", []);
                    } catch {
                        // noop
                    }
                });
                return;
            }

            loadHistory(selectedLot.id).catch(function (error) {
                onHistoryLoadError(error);
            });
        }

        async function refreshLotsAndReselect(lotId) {
            const lotsGrid = ensureLotsGridInstance();
            await lotsGrid.refresh();

            if (!lotId) {
                applySelection(null);
                return null;
            }

            await lotsGrid.selectRows([lotId], false);
            const refreshed = findLotById(lotId);
            applySelection(refreshed);
            return refreshed;
        }

        return {
            attachGridInstances: attachGridInstances,
            getSelectedLot: getSelectedLot,
            findLotById: findLotById,
            setLotsCache: setLotsCache,
            addLotToCache: addLotToCache,
            replaceLotInCache: replaceLotInCache,
            removeLotFromCache: removeLotFromCache,
            getLotDetails: getLotDetails,
            setLotDetails: setLotDetails,
            deleteLotDetails: deleteLotDetails,
            loadHistory: loadHistory,
            applySelection: applySelection,
            refreshLotsAndReselect: refreshLotsAndReselect
        };
    }

    const exportsObject = {
        createDataCore: createDataCore
    };

    if (typeof window !== "undefined") {
        window.LotsDataCore = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
