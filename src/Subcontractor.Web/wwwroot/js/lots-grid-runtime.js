"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`LotsGridRuntime requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsGridRuntime requires ${name}.`);
        }
    }

    function initializeLotsGrid(options) {
        const settings = options || {};
        const hostWindow = settings.window || (typeof window !== "undefined" ? window : null);
        const context = settings.context;

        requireObject(hostWindow, "window");
        requireObject(context, "context");

        const endpoint = context.endpoint;
        const controls = context.controls;
        const moduleRoots = context.moduleRoots;

        requireObject(controls, "context.controls");
        requireObject(moduleRoots, "context.moduleRoots");

        const lotsGridElement = controls.lotsGridElement;
        const historyGridElement = controls.historyGridElement;
        const statusElement = controls.statusElement;
        const selectedElement = controls.selectedElement;
        const transitionStatusElement = controls.transitionStatusElement;
        const nextButton = controls.nextButton;
        const rollbackButton = controls.rollbackButton;
        const historyRefreshButton = controls.historyRefreshButton;

        const lotsHelpersRoot = moduleRoots.lotsHelpersRoot;
        const lotsApiRoot = moduleRoots.lotsApiRoot;
        const lotsGridsRoot = moduleRoots.lotsGridsRoot;
        const lotsDataRoot = moduleRoots.lotsDataRoot;
        const lotsActionsRoot = moduleRoots.lotsActionsRoot;
        const lotsUiStateRoot = moduleRoots.lotsUiStateRoot;

        requireFunction(lotsHelpersRoot?.createHelpers, "moduleRoots.lotsHelpersRoot.createHelpers");
        requireFunction(lotsApiRoot?.createApiClient, "moduleRoots.lotsApiRoot.createApiClient");
        requireFunction(lotsGridsRoot?.createGrids, "moduleRoots.lotsGridsRoot.createGrids");
        requireFunction(lotsDataRoot?.createDataRuntime, "moduleRoots.lotsDataRoot.createDataRuntime");
        requireFunction(lotsActionsRoot?.createActions, "moduleRoots.lotsActionsRoot.createActions");
        requireFunction(lotsUiStateRoot?.createUiState, "moduleRoots.lotsUiStateRoot.createUiState");
        requireFunction(hostWindow.jQuery, "window.jQuery");
        requireObject(hostWindow.DevExpress, "window.DevExpress");

        const statusOrder = ["Draft", "InProcurement", "ContractorSelected", "Contracted", "InExecution", "Closed"];
        const statusCaptions = {
            Draft: "Черновик",
            InProcurement: "В закупке",
            ContractorSelected: "Подрядчик выбран",
            Contracted: "Законтрактован",
            InExecution: "В исполнении",
            Closed: "Закрыт"
        };

        const helpers = lotsHelpersRoot.createHelpers({
            statusOrder: statusOrder,
            statusCaptions: statusCaptions
        });

        const apiClient = lotsApiRoot.createApiClient({
            endpoint: endpoint
        });

        const statusLookup = statusOrder.map(function (value) {
            return {
                value: value,
                text: helpers.localizeStatus(value)
            };
        });

        let dataRuntime = null;

        const uiState = lotsUiStateRoot.createUiState({
            controls: {
                statusElement: statusElement,
                selectedElement: selectedElement,
                transitionStatusElement: transitionStatusElement,
                nextButton: nextButton,
                rollbackButton: rollbackButton,
                historyRefreshButton: historyRefreshButton
            },
            helpers: {
                localizeStatus: helpers.localizeStatus,
                nextStatus: helpers.nextStatus,
                previousStatus: helpers.previousStatus
            }
        });

        const setStatus = uiState.setStatus;
        const setTransitionStatus = uiState.setTransitionStatus;

        function getSelectedLot() {
            return dataRuntime ? dataRuntime.getSelectedLot() : null;
        }

        dataRuntime = lotsDataRoot.createDataRuntime({
            apiClient: apiClient,
            helpers: helpers,
            setStatus: setStatus,
            onSelectionChanged: uiState.updateSelection,
            onHistoryLoadError: function (error) {
                setTransitionStatus(`Не удалось загрузить историю лота: ${error.message}`, true);
            }
        });

        const store = dataRuntime.createStore(hostWindow.DevExpress.data);

        const grids = lotsGridsRoot.createGrids({
            jQueryImpl: hostWindow.jQuery,
            elements: {
                lotsGridElement: lotsGridElement,
                historyGridElement: historyGridElement
            },
            store: store,
            statusLookup: statusLookup,
            localizeStatus: helpers.localizeStatus,
            callbacks: {
                onSelectionChanged: function (selected) {
                    dataRuntime.applySelection(selected);
                },
                onDataErrorOccurred: function (error) {
                    setStatus(error?.message ?? "Ошибка операции с данными.", true);
                }
            }
        });

        dataRuntime.attachGridInstances(grids);

        const actions = lotsActionsRoot.createActions({
            controls: {
                nextButton: nextButton,
                rollbackButton: rollbackButton,
                historyRefreshButton: historyRefreshButton
            },
            helpers: {
                localizeStatus: helpers.localizeStatus,
                nextStatus: helpers.nextStatus,
                previousStatus: helpers.previousStatus,
                parseTransitionError: helpers.parseTransitionError
            },
            operations: {
                getSelectedLot: getSelectedLot,
                transitionLot: function (lotId, payload) {
                    return apiClient.transitionLot(lotId, payload);
                },
                refreshLotsAndReselect: dataRuntime.refreshLotsAndReselect,
                loadHistory: dataRuntime.loadHistory
            },
            setTransitionStatus: setTransitionStatus
        });
        actions.bindEvents();

        dataRuntime.applySelection(null);

        return {
            helpers: helpers,
            apiClient: apiClient,
            uiState: uiState,
            dataRuntime: dataRuntime,
            grids: grids,
            actions: actions
        };
    }

    const exportsObject = {
        initializeLotsGrid: initializeLotsGrid
    };

    if (typeof window !== "undefined") {
        window.LotsGridRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
