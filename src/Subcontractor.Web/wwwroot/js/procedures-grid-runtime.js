"use strict";

(function () {
    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль procedures grid runtime: ${globalName}.`);
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

    const foundationModule = resolveModule(
        "ProceduresGridRuntimeFoundation",
        "./procedures-grid-runtime-foundation.js",
        ["resolveRuntimeOptions", "createUiState"]);
    const bindingsModule = resolveModule(
        "ProceduresGridRuntimeBindings",
        "./procedures-grid-runtime-bindings.js",
        ["createCompositionContext"]);
    const workspaceModule = resolveModule(
        "ProceduresGridRuntimeWorkspace",
        "./procedures-grid-runtime-workspace.js",
        ["createWorkspaceComposition"]);

    function initializeProceduresGrid(options) {
        const resolvedOptions = foundationModule.resolveRuntimeOptions(options);
        const hostWindow = resolvedOptions.hostWindow;
        const endpoint = resolvedOptions.endpoint;
        const controls = resolvedOptions.controls;
        const moduleRoots = resolvedOptions.moduleRoots;

        const proceduresConfigRoot = moduleRoots.proceduresConfigRoot;
        const proceduresConfig = proceduresConfigRoot.createConfig();
        const compositionContext = bindingsModule.createCompositionContext({
            controls: controls,
            moduleRoots: moduleRoots,
            proceduresConfig: proceduresConfig
        });

        const services = compositionContext.proceduresServicesRoot.createServices({
            moduleRoots: moduleRoots,
            proceduresConfig: proceduresConfig,
            endpoint: endpoint,
            locationSearch: hostWindow.location.search || ""
        });
        const proceduresGridHelpers = services.gridHelpers;
        const urlFilterState = services.urlFilterState;
        const apiClient = services.apiClient;
        const proceduresWorkflow = services.workflow;
        const proceduresColumns = services.columns;
        const proceduresData = services.dataService;

        const uiState = foundationModule.createUiState({
            hostWindow: hostWindow,
            controls: controls,
            gridHelpers: proceduresGridHelpers,
            urlFilterState: urlFilterState
        });

        let gridInstance = null;
        let historyGridInstance = null;
        let shortlistGridInstance = null;
        let shortlistAdjustmentsGridInstance = null;
        let shortlistWorkspace = null;
        let selectionController = null;
        let transitionController = null;

        const appendFilterHint = uiState.appendFilterHint;
        const clearUrlFilters = uiState.clearUrlFilters;
        const setStatus = uiState.setStatus;
        const setTransitionStatus = uiState.setTransitionStatus;
        const setShortlistStatus = uiState.setShortlistStatus;
        const setShortlistAdjustmentsStatus = uiState.setShortlistAdjustmentsStatus;

        async function refreshGridAndReselect(procedureId) {
            if (!gridInstance) {
                return;
            }

            await gridInstance.refresh();
            if (!procedureId) {
                return;
            }

            await gridInstance.selectRows([procedureId], false);
            const refreshed = proceduresData.findProcedureById(procedureId);
            await selectionController.applySelection(refreshed ?? null);
        }

        const store = compositionContext.proceduresStoreRoot.createStore({
            devExpressData: hostWindow.DevExpress.data,
            proceduresData: proceduresData,
            createPayload: proceduresGridHelpers.createPayload,
            updatePayload: proceduresGridHelpers.updatePayload,
            appendFilterHint: appendFilterHint,
            setStatus: setStatus,
            getSelectedProcedure: function () {
                return selectionController?.getSelectedProcedure() ?? null;
            },
            applySelection: function (selected) {
                return selectionController.applySelection(selected);
            }
        });

        const workspaceComposition = workspaceModule.createWorkspaceComposition({
            hostWindow: hostWindow,
            endpoint: endpoint,
            compositionContext: compositionContext,
            proceduresColumns: proceduresColumns,
            proceduresWorkflow: proceduresWorkflow,
            proceduresGridHelpers: proceduresGridHelpers,
            apiClient: apiClient,
            setTransitionStatus: setTransitionStatus,
            setShortlistStatus: setShortlistStatus,
            setShortlistAdjustmentsStatus: setShortlistAdjustmentsStatus,
            refreshGridAndReselect: refreshGridAndReselect
        });

        historyGridInstance = workspaceComposition.historyGridInstance;
        selectionController = workspaceComposition.selectionController;
        transitionController = workspaceComposition.transitionController;
        shortlistGridInstance = workspaceComposition.shortlistGridInstance;
        shortlistAdjustmentsGridInstance = workspaceComposition.shortlistAdjustmentsGridInstance;
        shortlistWorkspace = workspaceComposition.shortlistWorkspace;

        const registryCallbacks = compositionContext.proceduresRegistryEventsRoot.createGridCallbacks({
            getGridInstance: function () {
                return gridInstance;
            },
            hasAnyUrlFilter: urlFilterState.hasAny,
            clearUrlFilters: clearUrlFilters,
            applySelection: function (selected) {
                return selectionController.applySelection(selected);
            },
            setTransitionStatus: setTransitionStatus,
            setStatus: setStatus
        });

        gridInstance = compositionContext.proceduresGridsRoot.createProceduresGrid({
            jQuery: hostWindow.jQuery,
            element: compositionContext.gridElement,
            store: store,
            columns: proceduresColumns.proceduresColumns,
            urlFilterState: urlFilterState,
            onEditorPreparing: registryCallbacks.onEditorPreparing,
            onSelectionChanged: registryCallbacks.onSelectionChanged,
            onToolbarPreparing: registryCallbacks.onToolbarPreparing,
            onDataErrorOccurred: registryCallbacks.onDataErrorOccurred
        });

        selectionController.applySelection(null).catch(function (error) {
            setTransitionStatus(`Не удалось инициализировать выбор процедуры: ${error.message}`, true);
        });

        return {
            gridInstance: gridInstance,
            historyGridInstance: historyGridInstance,
            shortlistGridInstance: shortlistGridInstance,
            shortlistAdjustmentsGridInstance: shortlistAdjustmentsGridInstance,
            selectionController: selectionController,
            transitionController: transitionController,
            shortlistWorkspace: shortlistWorkspace
        };
    }

    const exportsObject = {
        initializeProceduresGrid: initializeProceduresGrid
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
