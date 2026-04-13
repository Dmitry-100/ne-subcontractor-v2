"use strict";

(function () {
    const pagingHelpersRoot =
        typeof window !== "undefined" && window.ContractorsDataPagingHelpers
            ? window.ContractorsDataPagingHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./contractors-data-paging-helpers.js")
                : null;

    if (!pagingHelpersRoot ||
        typeof pagingHelpersRoot.buildRegistryLoadQuery !== "function" ||
        typeof pagingHelpersRoot.buildRegistryStatusMessage !== "function" ||
        typeof pagingHelpersRoot.tryReadPagedPayload !== "function") {
        throw new Error("ContractorsData requires ContractorsDataPagingHelpers.");
    }
    const dependenciesRoot =
        typeof window !== "undefined" && window.ContractorsDataDependencies
            ? window.ContractorsDataDependencies
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./contractors-data-dependencies.js")
                : null;

    if (!dependenciesRoot ||
        typeof dependenciesRoot.validateDataRuntimeDependencies !== "function") {
        throw new Error("ContractorsData requires ContractorsDataDependencies.");
    }

    function createDataRuntime(options) {
        const settings = options || {};
        const validatedDependencies = dependenciesRoot.validateDataRuntimeDependencies({
            apiClient: settings.apiClient,
            grids: settings.grids,
            uiState: settings.uiState
        });
        const apiClient = validatedDependencies.apiClient;
        const contractorsGridInstance = validatedDependencies.grids.contractorsGridInstance;
        const historyGridInstance = validatedDependencies.grids.historyGridInstance;
        const analyticsGridInstance = validatedDependencies.grids.analyticsGridInstance;
        const uiState = validatedDependencies.uiState;

        let contractorsCache = [];
        let selectedContractor = null;
        let registryStore = null;

        function getSelectedContractor() {
            return selectedContractor;
        }

        async function loadContractors() {
            if (registryStore && typeof contractorsGridInstance.refresh === "function") {
                await contractorsGridInstance.refresh();
                return contractorsCache;
            }

            const payload = await apiClient.getContractors();
            contractorsCache = Array.isArray(payload) ? payload : [];
            contractorsGridInstance.option("dataSource", contractorsCache);
            uiState.setStatus(`Загружено подрядчиков: ${contractorsCache.length}.`, false);
            return contractorsCache;
        }

        function createRegistryStore(devExpressData) {
            if (!devExpressData || typeof devExpressData.CustomStore !== "function") {
                throw new Error("ContractorsData requires devExpressData.CustomStore for registry store.");
            }

            registryStore = new devExpressData.CustomStore({
                key: "id",
                load: async function (loadOptions) {
                    const query = pagingHelpersRoot.buildRegistryLoadQuery(loadOptions);
                    const payload = await apiClient.getContractors(query);
                    const pagedPayload = pagingHelpersRoot.tryReadPagedPayload(payload);

                    if (pagedPayload) {
                        contractorsCache = pagedPayload.items.slice();
                        const statusMessage = pagingHelpersRoot.buildRegistryStatusMessage(
                            contractorsCache.length,
                            pagedPayload.totalCount);
                        uiState.setStatus(statusMessage, false);

                        return {
                            data: contractorsCache,
                            totalCount: pagedPayload.totalCount
                        };
                    }

                    contractorsCache = Array.isArray(payload) ? payload : [];
                    uiState.setStatus(`Загружено подрядчиков: ${contractorsCache.length}.`, false);
                    return contractorsCache;
                }
            });

            return registryStore;
        }

        async function loadHistory(contractorId) {
            if (!contractorId) {
                historyGridInstance.option("dataSource", []);
                uiState.setHistoryStatus("История пока не загружена.", false);
                return [];
            }

            if (typeof historyGridInstance.ensureInitialized === "function") {
                historyGridInstance.ensureInitialized();
            }

            const history = await apiClient.getRatingHistory(contractorId);
            const rows = Array.isArray(history) ? history : [];
            historyGridInstance.option("dataSource", rows);
            uiState.setHistoryStatus(`Загружено записей истории: ${rows.length}.`, false);
            return rows;
        }

        async function loadAnalytics() {
            if (typeof analyticsGridInstance.ensureInitialized === "function") {
                analyticsGridInstance.ensureInitialized();
            }

            const analytics = await apiClient.getRatingAnalytics();
            const rows = Array.isArray(analytics) ? analytics : [];
            analyticsGridInstance.option("dataSource", rows);
            uiState.setAnalyticsStatus(`Загружено аналитических строк: ${rows.length}.`, false);
            return rows;
        }

        function handleContractorSelectionChanged(selected) {
            selectedContractor = selected || null;
            uiState.updateSelectionUi();

            if (!selectedContractor) {
                historyGridInstance.option("dataSource", []);
                uiState.setHistoryStatus("История пока не загружена.", false);
                return;
            }

            uiState.setHistoryStatus("Загружаем историю...", false);
            loadHistory(selectedContractor.id).catch(function (error) {
                uiState.setHistoryStatus(`Не удалось загрузить историю: ${error.message}`, true);
            });
        }

        async function refreshContractorsAndReselect(contractorId) {
            await loadContractors();
            if (!contractorId) {
                contractorsGridInstance.clearSelection();
                selectedContractor = null;
                uiState.updateSelectionUi();
                return null;
            }

            await contractorsGridInstance.selectRows([contractorId], false);
            selectedContractor = contractorsCache.find(function (item) {
                return item.id === contractorId;
            }) || null;
            uiState.updateSelectionUi();
            return selectedContractor;
        }

        return {
            getSelectedContractor: getSelectedContractor,
            createRegistryStore: createRegistryStore,
            loadContractors: loadContractors,
            loadHistory: loadHistory,
            loadAnalytics: loadAnalytics,
            handleContractorSelectionChanged: handleContractorSelectionChanged,
            refreshContractorsAndReselect: refreshContractorsAndReselect
        };
    }

    const exportsObject = {
        createDataRuntime: createDataRuntime
    };

    if (typeof window !== "undefined") {
        window.ContractorsData = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
