"use strict";

(function () {
    const dependenciesRoot =
        typeof window !== "undefined" && window.ContractorsGridEntrypointDependencies
            ? window.ContractorsGridEntrypointDependencies
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./contractors-grid-entrypoint-dependencies.js")
                : null;

    if (!dependenciesRoot ||
        typeof dependenciesRoot.requireModuleRoot !== "function" ||
        typeof dependenciesRoot.createHelpersAndApi !== "function" ||
        typeof dependenciesRoot.createUiState !== "function" ||
        typeof dependenciesRoot.createDataRuntime !== "function" ||
        typeof dependenciesRoot.createModelService !== "function" ||
        typeof dependenciesRoot.createActions !== "function") {
        throw new Error("ContractorsGridEntrypointHelpers requires ContractorsGridEntrypointDependencies.");
    }

    function composeEntrypoint(options) {
        const settings = options || {};
        const context = settings.context || {};
        const moduleRoots = context.moduleRoots || {};
        const controls = context.controls || {};
        const endpoints = context.endpoints || {};
        const windowImpl = settings.windowImpl || (typeof window !== "undefined" ? window : null);

        if (!windowImpl || !windowImpl.DevExpress || !windowImpl.DevExpress.data) {
            throw new Error("ContractorsGridEntrypointHelpers requires window.DevExpress.data.");
        }

        const gridsRoot = dependenciesRoot.requireModuleRoot(
            moduleRoots,
            "contractorsGridsRoot",
            "contractorsGridsRoot",
            "createGrids");

        const resolved = dependenciesRoot.createHelpersAndApi(moduleRoots, endpoints);
        let dataRuntime = null;

        function getSelectedContractor() {
            return dataRuntime ? dataRuntime.getSelectedContractor() : null;
        }

        const uiState = dependenciesRoot.createUiState(moduleRoots, controls, getSelectedContractor);

        function handleContractorSelectionChanged(selected) {
            if (!dataRuntime) {
                return;
            }

            dataRuntime.handleContractorSelectionChanged(selected);
        }

        const grids = gridsRoot.createGrids({
            jQueryImpl: windowImpl.jQuery,
            helpers: resolved.helpers,
            elements: {
                contractorsGridElement: controls.contractorsGridElement,
                historyGridElement: controls.historyGridElement,
                analyticsGridElement: controls.analyticsGridElement
            },
            onContractorSelectionChanged: handleContractorSelectionChanged
        });

        dataRuntime = dependenciesRoot.createDataRuntime(moduleRoots, resolved.apiClient, grids, uiState);

        const registryStore = dataRuntime.createRegistryStore(windowImpl.DevExpress.data);
        grids.contractorsGridInstance.option("dataSource", registryStore);

        const modelService = dependenciesRoot.createModelService(
            moduleRoots,
            resolved.helpers,
            resolved.apiClient,
            controls,
            uiState);
        const actions = dependenciesRoot.createActions(
            moduleRoots,
            controls,
            {
                refreshContractorsAndReselect: dataRuntime.refreshContractorsAndReselect,
                loadAnalytics: dataRuntime.loadAnalytics,
                loadHistory: dataRuntime.loadHistory,
                loadModel: modelService.loadModel,
                buildModelPayload: modelService.buildModelPayload,
                fillModelForm: modelService.fillModelForm
            },
            resolved.apiClient,
            resolved.helpers,
            uiState,
            getSelectedContractor);

        return {
            actions: actions,
            dataRuntime: dataRuntime,
            modelService: modelService,
            uiState: uiState
        };
    }

    const exportsObject = {
        composeEntrypoint: composeEntrypoint
    };

    if (typeof window !== "undefined") {
        window.ContractorsGridEntrypointHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
