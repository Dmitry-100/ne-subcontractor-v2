"use strict";

(function () {
    const entrypointHelpers =
        typeof window !== "undefined" && window.ContractsMonitoringEntrypointHelpers
            ? window.ContractsMonitoringEntrypointHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./contracts-monitoring-entrypoint-helpers.js")
                : null;

    if (!entrypointHelpers ||
        typeof entrypointHelpers.resolveMonitoringModules !== "function" ||
        typeof entrypointHelpers.initializeMonitoringGrids !== "function" ||
        typeof entrypointHelpers.createMonitoringDataService !== "function" ||
        typeof entrypointHelpers.createMonitoringSelectionController !== "function" ||
        typeof entrypointHelpers.createMdrImportController !== "function") {
        throw new Error("Не удалось загрузить модуль contracts-monitoring: ContractsMonitoringEntrypointHelpers.");
    }

    const { bootstrapModule, wiringModule, runtimeModule } = entrypointHelpers.resolveMonitoringModules();

    function createController(options) {
        const compositionContext = bootstrapModule.createCompositionContext(options);
        const settings = compositionContext.settings;
        const elements = compositionContext.elements;

        const { monitoringRefreshButton, monitoringSaveButton, monitoringControlPointsGridElement, monitoringStagesGridElement, monitoringMdrCardsGridElement, monitoringMdrRowsGridElement,
            mdrImportFileInput, mdrImportModeSelect, mdrImportApplyButton, mdrImportResetButton } = elements;

        const {
            gridState,
            apiClient,
            monitoringKpModule,
            monitoringMdrModule,
            monitoringImportStatusModule,
            monitoringImportModule,
            monitoringDataModule,
            monitoringGridsModule,
            monitoringKpGridsModule,
            monitoringMdrGridsModule,
            monitoringControlsModule,
            monitoringSelectionModule,
            getSelectedContract,
            canEditMilestones,
            localizeStatus,
            setMonitoringStatus,
            setMdrImportStatus,
            parseMdrImportFile,
            parseMdrImportItemsFromRows,
            monitoringModel
        } = settings;

        const runtime = runtimeModule.createRuntime({
            monitoringModel: monitoringModel,
            setMonitoringStatus: setMonitoringStatus
        });

        const gridDataBinders = wiringModule.createGridDataBinders({
            getControlPointsGrid: runtime.getControlPointsGrid,
            getStagesGrid: runtime.getStagesGrid,
            getMdrCardsGrid: runtime.getMdrCardsGrid,
            getMdrRowsGrid: runtime.getMdrRowsGrid
        });

        let mdrImportController = null;

        function init() {
            const monitoringUiController = monitoringControlsModule.createController({
                elements: {
                    monitoringSelectedElement: elements.monitoringSelectedElement,
                    monitoringRefreshButton: monitoringRefreshButton,
                    monitoringSaveButton: monitoringSaveButton,
                    monitoringControlPointSelectedElement: elements.monitoringControlPointSelectedElement,
                    monitoringMdrCardSelectedElement: elements.monitoringMdrCardSelectedElement,
                    mdrImportFileInput: mdrImportFileInput,
                    mdrImportModeSelect: mdrImportModeSelect
                },
                monitoringKpModule: monitoringKpModule,
                monitoringMdrModule: monitoringMdrModule,
                getSelectedMonitoringControlPoint: runtime.getSelectedMonitoringControlPoint,
                getSelectedMonitoringMdrCard: runtime.getSelectedMonitoringMdrCard,
                getSelectedContract: getSelectedContract,
                canEditMilestones: canEditMilestones,
                localizeStatus: localizeStatus,
                setMonitoringStatus: setMonitoringStatus,
                setMdrImportStatus: setMdrImportStatus,
                getImportController: function () {
                    return mdrImportController;
                },
                getMonitoringGrids: gridDataBinders.getMonitoringGrids,
                resetMonitoringSelection: function () {
                    gridState.resetMonitoringSelection();
                },
                setControlPointsData: gridDataBinders.setControlPointsData,
                setMdrCardsData: gridDataBinders.setMdrCardsData,
                refreshMonitoringStagesGrid: runtime.refreshMonitoringStagesGrid,
                refreshMonitoringRowsGrid: runtime.refreshMonitoringRowsGrid
            });

            entrypointHelpers.initializeMonitoringGrids({
                runtime,
                monitoringGridsModule,
                monitoringKpGridsModule,
                monitoringMdrGridsModule,
                gridState,
                setMonitoringStatus,
                elements: {
                    monitoringControlPointsGridElement,
                    monitoringStagesGridElement,
                    monitoringMdrCardsGridElement,
                    monitoringMdrRowsGridElement
                }
            });

            const monitoringSelectionController = entrypointHelpers.createMonitoringSelectionController({
                monitoringSelectionModule,
                gridState,
                monitoringKpModule,
                monitoringMdrModule,
                runtime
            });

            const monitoringDataService = entrypointHelpers.createMonitoringDataService({
                monitoringDataModule,
                apiClient,
                gridState,
                getSelectedContract,
                canEditMilestones,
                runtime,
                gridDataBinders,
                setMonitoringStatus
            });

            runtime.attachControllers({
                uiController: monitoringUiController,
                selectionController: monitoringSelectionController,
                dataService: monitoringDataService
            });

            mdrImportController = entrypointHelpers.createMdrImportController({
                monitoringImportModule,
                mdrImportFileInput,
                mdrImportModeSelect,
                mdrImportApplyButton,
                mdrImportResetButton,
                getSelectedContract,
                canEditMilestones,
                monitoringImportStatusModule,
                parseMdrImportFile,
                parseMdrImportItemsFromRows,
                importMdrForecastFactApi: apiClient.importMonitoringMdrForecastFact,
                buildMdrCardSelectionKey: monitoringMdrModule.buildMdrCardSelectionKey,
                runtime,
                gridDataBinders,
                setSelectedMdrCardClientId: function (id) {
                    gridState.setSelectedMonitoringMdrCardClientId(id);
                },
                setMdrImportStatus,
                setMonitoringStatus
            });

            wiringModule.bindCoreEvents({
                refreshButton: monitoringRefreshButton,
                saveButton: monitoringSaveButton,
                loadData: runtime.loadData,
                saveData: runtime.saveData,
                setMonitoringStatus: setMonitoringStatus
            });

            mdrImportController.bindEventHandlers();
            runtime.updateControls();
            mdrImportController.updateButtons();
            runtime.refreshMonitoringSelectionStatus();
        }

        return {
            init: init,
            loadData: runtime.loadData,
            saveData: runtime.saveData,
            updateControls: runtime.updateControls
        };
    }

    const exportsObject = {
        createController: createController
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoring = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
