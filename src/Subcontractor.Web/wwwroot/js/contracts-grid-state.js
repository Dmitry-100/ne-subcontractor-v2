"use strict";

(function () {
    function toNullableId(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        return value;
    }

    function createState() {
        let contractsCache = [];
        let selectedContractId = null;
        let selectedMonitoringControlPointClientId = null;
        let selectedMonitoringMdrCardClientId = null;

        return {
            addContract: function (contract) {
                contractsCache.push(contract);
            },
            findContractById: function (contractId) {
                return contractsCache.find(function (item) {
                    return item.id === contractId;
                }) || null;
            },
            getContracts: function () {
                return contractsCache;
            },
            getContractsCount: function () {
                return contractsCache.length;
            },
            getSelectedContract: function () {
                if (!selectedContractId) {
                    return null;
                }

                return contractsCache.find(function (item) {
                    return item.id === selectedContractId;
                }) || null;
            },
            getSelectedContractId: function () {
                return selectedContractId;
            },
            getSelectedMonitoringControlPointClientId: function () {
                return selectedMonitoringControlPointClientId;
            },
            getSelectedMonitoringMdrCardClientId: function () {
                return selectedMonitoringMdrCardClientId;
            },
            removeContractById: function (contractId) {
                contractsCache = contractsCache.filter(function (item) {
                    return item.id !== contractId;
                });

                if (selectedContractId === contractId) {
                    selectedContractId = null;
                }
            },
            replaceContractById: function (contractId, updatedContract) {
                contractsCache = contractsCache.map(function (item) {
                    return item.id === contractId ? updatedContract : item;
                });
            },
            resetMonitoringSelection: function () {
                selectedMonitoringControlPointClientId = null;
                selectedMonitoringMdrCardClientId = null;
            },
            setContracts: function (items) {
                contractsCache = Array.isArray(items) ? items : [];
                return contractsCache;
            },
            setSelectedContractId: function (contractId) {
                selectedContractId = toNullableId(contractId);
                return selectedContractId;
            },
            setSelectedMonitoringControlPointClientId: function (clientId) {
                selectedMonitoringControlPointClientId = toNullableId(clientId);
                return selectedMonitoringControlPointClientId;
            },
            setSelectedMonitoringMdrCardClientId: function (clientId) {
                selectedMonitoringMdrCardClientId = toNullableId(clientId);
                return selectedMonitoringMdrCardClientId;
            }
        };
    }

    window.ContractsGridState = {
        createState: createState
    };
})();
