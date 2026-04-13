"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`Procedures grid runtime workspace requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`Procedures grid runtime workspace requires ${name}.`);
        }
    }

    function isEmptyArrayDataSourceSet(key, value, hasValue) {
        return hasValue && key === "dataSource" && Array.isArray(value) && value.length === 0;
    }

    function createDeferredGrid(factory) {
        requireFunction(factory, "grid factory");

        let gridInstance = null;
        let pendingDataSource = null;
        let hasPendingDataSource = false;

        function ensureInitialized() {
            if (!gridInstance) {
                gridInstance = factory();
                requireObject(gridInstance, "grid instance");
                requireFunction(gridInstance.option, "grid instance option");

                if (hasPendingDataSource) {
                    gridInstance.option("dataSource", pendingDataSource);
                    hasPendingDataSource = false;
                    pendingDataSource = null;
                }
            }

            return gridInstance;
        }

        function option(key, value) {
            const hasValue = arguments.length > 1;
            if (!gridInstance && isEmptyArrayDataSourceSet(key, value, hasValue)) {
                hasPendingDataSource = true;
                pendingDataSource = value;
                return value;
            }

            const instance = ensureInitialized();
            if (hasValue) {
                return instance.option(key, value);
            }

            return instance.option(key);
        }

        return {
            option: option,
            ensureInitialized: ensureInitialized,
            isInitialized: function () {
                return Boolean(gridInstance);
            },
            getInstance: function () {
                return gridInstance;
            }
        };
    }

    function createWorkspaceComposition(options) {
        const settings = options || {};
        const hostWindow = settings.hostWindow;
        const endpoint = settings.endpoint;
        const compositionContext = settings.compositionContext;
        const proceduresColumns = settings.proceduresColumns;
        const proceduresWorkflow = settings.proceduresWorkflow;
        const proceduresGridHelpers = settings.proceduresGridHelpers;
        const apiClient = settings.apiClient;
        const setTransitionStatus = settings.setTransitionStatus;
        const setShortlistStatus = settings.setShortlistStatus;
        const setShortlistAdjustmentsStatus = settings.setShortlistAdjustmentsStatus;
        const refreshGridAndReselect = settings.refreshGridAndReselect;

        requireObject(hostWindow, "hostWindow");
        requireFunction(hostWindow.jQuery, "hostWindow.jQuery");
        requireObject(compositionContext, "compositionContext");
        requireObject(proceduresColumns, "proceduresColumns");
        requireObject(proceduresWorkflow, "proceduresWorkflow");
        requireObject(proceduresGridHelpers, "proceduresGridHelpers");
        requireObject(apiClient, "apiClient");
        requireFunction(setTransitionStatus, "setTransitionStatus");
        requireFunction(setShortlistStatus, "setShortlistStatus");
        requireFunction(setShortlistAdjustmentsStatus, "setShortlistAdjustmentsStatus");
        requireFunction(refreshGridAndReselect, "refreshGridAndReselect");

        const historyGridInstance = createDeferredGrid(function () {
            return compositionContext.proceduresGridsRoot.createHistoryGrid({
                jQuery: hostWindow.jQuery,
                element: compositionContext.historyGridElement,
                columns: proceduresColumns.historyColumns
            });
        });

        const selectionController = compositionContext.proceduresSelectionRoot.createSelectionController({
            selectedElement: compositionContext.selectedElement,
            shortlistSelectedElement: compositionContext.shortlistSelectedElement,
            buildProcedureSelectionSummary: proceduresWorkflow.buildProcedureSelectionSummary,
            buildShortlistSelectionSummary: proceduresWorkflow.buildShortlistSelectionSummary,
            setTransitionStatus: setTransitionStatus,
            onHistoryResetFailed: function () {
                historyGridInstance?.option("dataSource", []);
            }
        });

        const transitionController = compositionContext.proceduresTransitionRoot.createTransitionController({
            targetSelect: compositionContext.targetSelect,
            reasonInput: compositionContext.reasonInput,
            applyButton: compositionContext.applyButton,
            historyRefreshButton: compositionContext.historyRefreshButton,
            historyGrid: historyGridInstance,
            endpoint: endpoint,
            apiClient: apiClient,
            transitionMap: compositionContext.transitionMap,
            localizeStatus: proceduresGridHelpers.localizeStatus,
            validateTransitionRequest: proceduresWorkflow.validateTransitionRequest,
            buildTransitionSuccessMessage: proceduresWorkflow.buildTransitionSuccessMessage,
            getSelectedProcedure: function () {
                return selectionController.getSelectedProcedure();
            },
            setTransitionStatus: setTransitionStatus,
            refreshGridAndReselect: refreshGridAndReselect
        });
        transitionController.bindEvents();

        const shortlistGridInstance = createDeferredGrid(function () {
            return compositionContext.proceduresGridsRoot.createShortlistGrid({
                jQuery: hostWindow.jQuery,
                element: compositionContext.shortlistGridElement,
                columns: proceduresColumns.shortlistColumns
            });
        });

        const shortlistAdjustmentsGridInstance = createDeferredGrid(function () {
            return compositionContext.proceduresGridsRoot.createShortlistAdjustmentsGrid({
                jQuery: hostWindow.jQuery,
                element: compositionContext.shortlistAdjustmentsGridElement,
                columns: proceduresColumns.shortlistAdjustmentsColumns
            });
        });

        const shortlistWorkspace = compositionContext.proceduresShortlistRoot.createShortlistWorkspace({
            maxIncludedInput: compositionContext.shortlistMaxIncludedInput,
            adjustmentReasonInput: compositionContext.shortlistAdjustmentReasonInput,
            buildButton: compositionContext.shortlistBuildButton,
            applyButton: compositionContext.shortlistApplyButton,
            adjustmentsRefreshButton: compositionContext.shortlistAdjustmentsRefreshButton,
            shortlistGrid: shortlistGridInstance,
            shortlistAdjustmentsGrid: shortlistAdjustmentsGridInstance,
            endpoint: endpoint,
            apiClient: apiClient,
            workflow: proceduresWorkflow,
            getSelectedProcedure: function () {
                return selectionController.getSelectedProcedure();
            },
            supportsShortlistWorkspace: proceduresGridHelpers.supportsShortlistWorkspace,
            normalizeMaxIncluded: proceduresGridHelpers.normalizeMaxIncluded,
            normalizeAdjustmentReason: proceduresGridHelpers.normalizeAdjustmentReason,
            setShortlistStatus: setShortlistStatus,
            setShortlistAdjustmentsStatus: setShortlistAdjustmentsStatus
        });

        selectionController.setTransitionController(transitionController);
        selectionController.setShortlistWorkspace(shortlistWorkspace);
        shortlistWorkspace.bindEvents();

        return {
            historyGridInstance: historyGridInstance,
            selectionController: selectionController,
            transitionController: transitionController,
            shortlistGridInstance: shortlistGridInstance,
            shortlistAdjustmentsGridInstance: shortlistAdjustmentsGridInstance,
            shortlistWorkspace: shortlistWorkspace
        };
    }

    const exportsObject = {
        createWorkspaceComposition: createWorkspaceComposition
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridRuntimeWorkspace = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
