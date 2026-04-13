"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsData requires ${name}.`);
        }
    }

    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль LotsData: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    const coreModule = resolveModule(
        "LotsDataCore",
        "./lots-data-core.js",
        ["createDataCore"]);

    const storeModule = resolveModule(
        "LotsDataStore",
        "./lots-data-store.js",
        ["createStore"]);

    function createDataRuntime(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const helpers = settings.helpers;
        const setStatus = settings.setStatus;
        const onSelectionChanged = settings.onSelectionChanged;
        const onHistoryLoadError = settings.onHistoryLoadError;

        if (!apiClient) {
            throw new Error("LotsData requires apiClient.");
        }

        if (!helpers) {
            throw new Error("LotsData requires helpers.");
        }

        requireFunction(apiClient.getLots, "apiClient.getLots");
        requireFunction(apiClient.createLot, "apiClient.createLot");
        requireFunction(apiClient.updateLot, "apiClient.updateLot");
        requireFunction(apiClient.deleteLot, "apiClient.deleteLot");
        requireFunction(helpers.normalizeGuid, "helpers.normalizeGuid");
        requireFunction(helpers.toListItem, "helpers.toListItem");
        requireFunction(helpers.mapItemsForRequest, "helpers.mapItemsForRequest");
        requireFunction(setStatus, "setStatus callback");
        requireFunction(onSelectionChanged, "onSelectionChanged callback");
        requireFunction(onHistoryLoadError, "onHistoryLoadError callback");

        const core = coreModule.createDataCore({
            apiClient: apiClient,
            onSelectionChanged: onSelectionChanged,
            onHistoryLoadError: onHistoryLoadError
        });

        function createStore(devExpressData) {
            return storeModule.createStore({
                devExpressData: devExpressData,
                apiClient: apiClient,
                helpers: helpers,
                setStatus: setStatus,
                core: core
            });
        }

        return {
            attachGridInstances: core.attachGridInstances,
            getSelectedLot: core.getSelectedLot,
            loadHistory: core.loadHistory,
            applySelection: core.applySelection,
            refreshLotsAndReselect: core.refreshLotsAndReselect,
            createStore: createStore
        };
    }

    const exportsObject = {
        createDataRuntime: createDataRuntime
    };

    if (typeof window !== "undefined") {
        window.LotsData = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
