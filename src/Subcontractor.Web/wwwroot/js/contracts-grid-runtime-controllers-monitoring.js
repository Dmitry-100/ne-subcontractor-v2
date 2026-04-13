"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`ContractsGridRuntimeControllersMonitoring requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsGridRuntimeControllersMonitoring requires ${name}.`);
        }
    }

    function createMonitoringController(options) {
        const settings = options || {};
        const foundation = settings.foundation;
        const elements = settings.elements;
        const modules = settings.modules;

        requireObject(foundation, "foundation");
        requireObject(elements, "elements");
        requireObject(modules, "modules");

        const hostWindow = foundation.hostWindow;
        const helpers = foundation.helpers;
        const apiClient = foundation.apiClient;
        const monitoringModel = foundation.monitoringModel;
        const gridState = foundation.gridState;
        const setMonitoringStatus = foundation.setMonitoringStatus;
        const setMdrImportStatus = foundation.setMdrImportStatus;
        const localizeStatus = foundation.localizeStatus;
        const getSelectedContract = foundation.getSelectedContract;
        const canEditMilestones = foundation.canEditMilestones;

        requireObject(hostWindow, "foundation.hostWindow");
        requireObject(helpers, "foundation.helpers");
        requireFunction(helpers.parseMdrImportFile, "foundation.helpers.parseMdrImportFile");
        requireFunction(helpers.parseMdrImportItemsFromRows, "foundation.helpers.parseMdrImportItemsFromRows");

        const monitoringControllerModule = modules.monitoringControllerModule;
        requireFunction(monitoringControllerModule?.createController, "modules.monitoringControllerModule.createController");

        return monitoringControllerModule.createController({
            elements: {
                monitoringSelectedElement: elements.monitoringSelectedElement,
                monitoringStatusElement: elements.monitoringStatusElement,
                monitoringRefreshButton: elements.monitoringRefreshButton,
                monitoringSaveButton: elements.monitoringSaveButton,
                monitoringControlPointsGridElement: elements.monitoringControlPointsGridElement,
                monitoringStagesGridElement: elements.monitoringStagesGridElement,
                monitoringMdrCardsGridElement: elements.monitoringMdrCardsGridElement,
                monitoringMdrRowsGridElement: elements.monitoringMdrRowsGridElement,
                monitoringControlPointSelectedElement: elements.monitoringControlPointSelectedElement,
                monitoringMdrCardSelectedElement: elements.monitoringMdrCardSelectedElement,
                mdrImportFileInput: elements.mdrImportFileInput,
                mdrImportModeSelect: elements.mdrImportModeSelect,
                mdrImportApplyButton: elements.mdrImportApplyButton,
                mdrImportResetButton: elements.mdrImportResetButton
            },
            gridState: gridState,
            apiClient: apiClient,
            monitoringModel: monitoringModel,
            monitoringKpModule: modules.monitoringKpModule,
            monitoringMdrModule: modules.monitoringMdrModule,
            monitoringKpGridsModule: modules.monitoringKpGridsModule,
            monitoringMdrGridsModule: modules.monitoringMdrGridsModule,
            monitoringGridsModule: modules.monitoringGridsModule,
            monitoringControlsModule: modules.monitoringControlsModule,
            monitoringSelectionModule: modules.monitoringSelectionModule,
            monitoringImportStatusModule: modules.monitoringImportStatusModule,
            monitoringImportModule: modules.monitoringImportModule,
            monitoringDataModule: modules.monitoringDataModule,
            getSelectedContract: getSelectedContract,
            canEditMilestones: canEditMilestones,
            localizeStatus: localizeStatus,
            setMonitoringStatus: setMonitoringStatus,
            setMdrImportStatus: setMdrImportStatus,
            parseMdrImportFile: function (file) {
                return helpers.parseMdrImportFile(file, hostWindow.XLSX);
            },
            parseMdrImportItemsFromRows: helpers.parseMdrImportItemsFromRows
        });
    }

    const exportsObject = {
        createMonitoringController: createMonitoringController
    };

    if (typeof window !== "undefined") {
        window.ContractsGridRuntimeControllersMonitoring = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
