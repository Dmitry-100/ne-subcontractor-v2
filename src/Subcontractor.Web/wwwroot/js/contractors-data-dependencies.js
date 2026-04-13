"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractorsData requires ${name}.`);
        }
    }

    function requireGridInstance(value, name) {
        if (!value || typeof value.option !== "function") {
            throw new Error(`ContractorsData requires ${name}.`);
        }
    }

    function validateDataRuntimeDependencies(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const grids = settings.grids || {};
        const uiState = settings.uiState || {};

        if (!apiClient) {
            throw new Error("ContractorsData requires apiClient.");
        }

        requireFunction(apiClient.getContractors, "apiClient.getContractors");
        requireFunction(apiClient.getRatingHistory, "apiClient.getRatingHistory");
        requireFunction(apiClient.getRatingAnalytics, "apiClient.getRatingAnalytics");

        const contractorsGridInstance = grids.contractorsGridInstance;
        const historyGridInstance = grids.historyGridInstance;
        const analyticsGridInstance = grids.analyticsGridInstance;

        requireGridInstance(contractorsGridInstance, "grids.contractorsGridInstance");
        requireGridInstance(historyGridInstance, "grids.historyGridInstance");
        requireGridInstance(analyticsGridInstance, "grids.analyticsGridInstance");

        if (typeof contractorsGridInstance.clearSelection !== "function") {
            throw new Error("ContractorsData requires grids.contractorsGridInstance.clearSelection.");
        }

        requireFunction(contractorsGridInstance.selectRows, "grids.contractorsGridInstance.selectRows");
        requireFunction(uiState.setStatus, "uiState.setStatus");
        requireFunction(uiState.setHistoryStatus, "uiState.setHistoryStatus");
        requireFunction(uiState.setAnalyticsStatus, "uiState.setAnalyticsStatus");
        requireFunction(uiState.updateSelectionUi, "uiState.updateSelectionUi");

        return {
            apiClient: apiClient,
            grids: {
                contractorsGridInstance: contractorsGridInstance,
                historyGridInstance: historyGridInstance,
                analyticsGridInstance: analyticsGridInstance
            },
            uiState: uiState
        };
    }

    const exportsObject = {
        requireFunction: requireFunction,
        requireGridInstance: requireGridInstance,
        validateDataRuntimeDependencies: validateDataRuntimeDependencies
    };

    if (typeof window !== "undefined") {
        window.ContractorsDataDependencies = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
