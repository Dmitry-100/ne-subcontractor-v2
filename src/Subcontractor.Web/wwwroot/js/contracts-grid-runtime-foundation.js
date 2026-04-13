"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`ContractsGridRuntimeFoundation requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsGridRuntimeFoundation requires ${name}.`);
        }
    }

    function createRuntimeFoundation(options) {
        const settings = options || {};
        const hostWindow = settings.hostWindow;
        const moduleRoot = settings.moduleRoot;
        const elements = settings.elements;
        const modules = settings.modules;

        requireObject(hostWindow, "hostWindow");
        requireObject(moduleRoot, "moduleRoot");
        requireObject(elements, "elements");
        requireObject(modules, "modules");

        const helpers = modules.helpers;
        const contractsApiModule = modules.contractsApiModule;
        const monitoringModelModule = modules.monitoringModelModule;
        const stateModule = modules.stateModule;
        const executionModule = modules.executionModule;

        requireObject(helpers, "modules.helpers");
        requireFunction(contractsApiModule?.createClient, "modules.contractsApiModule.createClient");
        requireFunction(monitoringModelModule?.createModel, "modules.monitoringModelModule.createModel");
        requireFunction(stateModule?.createState, "modules.stateModule.createState");
        requireFunction(executionModule?.canEditMilestones, "modules.executionModule.canEditMilestones");

        const endpoint = moduleRoot.getAttribute("data-api-endpoint") || "/api/contracts";
        const apiClient = contractsApiModule.createClient({
            endpoint: endpoint,
            parseErrorBody: helpers.parseErrorBody
        });
        const monitoringModel = monitoringModelModule.createModel({
            toNumber: helpers.toNumber,
            toNullableDate: helpers.toNullableDate
        });
        const gridState = stateModule.createState();

        const statusValues = ["Draft", "OnApproval", "Signed", "Active", "Closed"];
        const statusCaptions = {
            Draft: "Черновик",
            OnApproval: "На согласовании",
            Signed: "Подписан",
            Active: "Действует",
            Closed: "Закрыт"
        };
        const statusLookup = statusValues.map(function (value) {
            return {
                value: value,
                text: statusCaptions[value] || value
            };
        });
        const locationSearch = hostWindow.location && typeof hostWindow.location.search === "string"
            ? hostWindow.location.search
            : "";
        const urlFilterState = helpers.readUrlFilterState(locationSearch, statusValues);

        function localizeStatus(status) {
            return statusCaptions[String(status || "")] || String(status || "");
        }

        function appendFilterHint(message) {
            return helpers.appendFilterHint(message, urlFilterState, localizeStatus);
        }

        function clearUrlFilters() {
            const locationObject = hostWindow.location;
            if (!locationObject || typeof locationObject.href !== "string") {
                return;
            }

            const targetUrl = helpers.clearUrlFilters(locationObject.href);
            if (typeof locationObject.assign === "function") {
                locationObject.assign(targetUrl);
                return;
            }

            locationObject.href = targetUrl;
        }

        function setStatus(message, isError) {
            elements.statusElement.textContent = message;
            elements.statusElement.classList.toggle("contracts-status--error", Boolean(isError));
        }

        function setMonitoringStatus(message, isError) {
            elements.monitoringStatusElement.textContent = message;
            elements.monitoringStatusElement.classList.toggle("contracts-monitoring-status--error", Boolean(isError));
        }

        function setMdrImportStatus(message, isError) {
            elements.mdrImportStatusElement.textContent = message;
            elements.mdrImportStatusElement.classList.toggle("contracts-monitoring-status--error", Boolean(isError));
        }

        function getSelectedContract() {
            return gridState.getSelectedContract();
        }

        function getStatusRank(status) {
            return statusValues.indexOf(String(status || ""));
        }

        function canEditMilestones(status) {
            return executionModule.canEditMilestones(status);
        }

        return {
            hostWindow: hostWindow,
            modules: modules,
            elements: elements,
            helpers: helpers,
            executionModule: executionModule,
            apiClient: apiClient,
            monitoringModel: monitoringModel,
            gridState: gridState,
            statusValues: statusValues,
            statusLookup: statusLookup,
            urlFilterState: urlFilterState,
            appendFilterHint: appendFilterHint,
            clearUrlFilters: clearUrlFilters,
            setStatus: setStatus,
            setMonitoringStatus: setMonitoringStatus,
            setMdrImportStatus: setMdrImportStatus,
            localizeStatus: localizeStatus,
            getSelectedContract: getSelectedContract,
            getStatusRank: getStatusRank,
            canEditMilestones: canEditMilestones
        };
    }

    const exportsObject = {
        createRuntimeFoundation: createRuntimeFoundation
    };

    if (typeof window !== "undefined") {
        window.ContractsGridRuntimeFoundation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
