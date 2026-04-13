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
            throw new Error(`Не удалось загрузить модуль contracts-monitoring: ${globalName}.`);
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

    function resolveMonitoringModules() {
        return {
            bootstrapModule: resolveModule(
                "ContractsMonitoringBootstrap",
                "./contracts-monitoring-bootstrap.js",
                ["createCompositionContext"]),
            wiringModule: resolveModule(
                "ContractsMonitoringWiring",
                "./contracts-monitoring-wiring.js",
                ["bindCoreEvents", "createGridDataBinders"]),
            runtimeModule: resolveModule(
                "ContractsMonitoringRuntime",
                "./contracts-monitoring-runtime.js",
                ["createRuntime"])
        };
    }

    function initializeMonitoringGrids(options) {
        if (!options || typeof options !== "object") {
            throw new Error("initializeMonitoringGrids требует объект параметров.");
        }

        const runtime = options.runtime;
        const monitoringGridsModule = options.monitoringGridsModule;
        const gridState = options.gridState;
        const setMonitoringStatus = options.setMonitoringStatus;
        const monitoringKpGridsModule = options.monitoringKpGridsModule;
        const monitoringMdrGridsModule = options.monitoringMdrGridsModule;
        const elements = options.elements || {};

        const grids = monitoringGridsModule.createGrids({
            elements: elements,
            gridState: gridState,
            setMonitoringStatus: setMonitoringStatus,
            refreshMonitoringStagesGrid: runtime.refreshMonitoringStagesGrid,
            refreshMonitoringRowsGrid: runtime.refreshMonitoringRowsGrid,
            ensureMonitoringSelection: runtime.ensureMonitoringSelection,
            markMonitoringDirty: runtime.markMonitoringDirty,
            syncStagesWithSelectedControlPoint: runtime.syncStagesWithSelectedControlPoint,
            syncRowsWithSelectedMdrCard: runtime.syncRowsWithSelectedMdrCard,
            createMonitoringClientId: runtime.createMonitoringClientId,
            getSelectedMonitoringControlPoint: runtime.getSelectedMonitoringControlPoint,
            getSelectedMonitoringMdrCard: runtime.getSelectedMonitoringMdrCard,
            calculateDeviationPercent: runtime.calculateDeviationPercent,
            calculateMdrCardMetrics: runtime.calculateMdrCardMetrics,
            kpGridsModule: monitoringKpGridsModule,
            mdrGridsModule: monitoringMdrGridsModule
        });

        runtime.setGridInstances(grids);
        return grids;
    }

    function createMonitoringDataService(options) {
        const runtime = options.runtime;
        const gridDataBinders = options.gridDataBinders;
        const monitoringDataModule = options.monitoringDataModule;

        return monitoringDataModule.createService({
            apiClient: options.apiClient,
            gridState: options.gridState,
            getSelectedContract: options.getSelectedContract,
            canEditMilestones: options.canEditMilestones,
            normalizeMonitoringControlPoint: runtime.normalizeMonitoringControlPoint,
            normalizeMonitoringMdrCard: runtime.normalizeMonitoringMdrCard,
            getMonitoringControlPointsData: runtime.getMonitoringControlPointsData,
            getMonitoringMdrCardsData: runtime.getMonitoringMdrCardsData,
            buildMonitoringControlPointsPayload: runtime.buildMonitoringControlPointsPayload,
            buildMonitoringMdrCardsPayload: runtime.buildMonitoringMdrCardsPayload,
            setControlPointsData: gridDataBinders.setControlPointsData,
            setMdrCardsData: gridDataBinders.setMdrCardsData,
            ensureMonitoringSelection: runtime.ensureMonitoringSelection,
            refreshMonitoringStagesGrid: runtime.refreshMonitoringStagesGrid,
            refreshMonitoringRowsGrid: runtime.refreshMonitoringRowsGrid,
            setMonitoringStatus: options.setMonitoringStatus
        });
    }

    function createMonitoringSelectionController(options) {
        const runtime = options.runtime;

        return options.monitoringSelectionModule.createController({
            gridState: options.gridState,
            monitoringKpModule: options.monitoringKpModule,
            monitoringMdrModule: options.monitoringMdrModule,
            getControlPointsGrid: runtime.getControlPointsGrid,
            getStagesGrid: runtime.getStagesGrid,
            getMdrCardsGrid: runtime.getMdrCardsGrid,
            getMdrRowsGrid: runtime.getMdrRowsGrid,
            onSelectionStatusChanged: runtime.refreshMonitoringSelectionStatus
        });
    }

    function createMdrImportController(options) {
        const runtime = options.runtime;
        const gridDataBinders = options.gridDataBinders;

        return options.monitoringImportModule.createController({
            fileInput: options.mdrImportFileInput,
            modeSelect: options.mdrImportModeSelect,
            applyButton: options.mdrImportApplyButton,
            resetButton: options.mdrImportResetButton,
            getSelectedContract: options.getSelectedContract,
            canEditMilestones: options.canEditMilestones,
            importStatusModule: options.monitoringImportStatusModule,
            parseMdrImportFile: options.parseMdrImportFile,
            parseMdrImportItemsFromRows: options.parseMdrImportItemsFromRows,
            importMdrForecastFactApi: options.importMdrForecastFactApi,
            getSelectedMdrCard: runtime.getSelectedMonitoringMdrCard,
            buildMdrCardSelectionKey: options.buildMdrCardSelectionKey,
            normalizeMdrCard: runtime.normalizeMonitoringMdrCard,
            setMdrCardsData: gridDataBinders.setMdrCardsData,
            setSelectedMdrCardClientId: options.setSelectedMdrCardClientId,
            ensureMonitoringSelection: runtime.ensureMonitoringSelection,
            setMdrImportStatus: options.setMdrImportStatus,
            setMonitoringStatus: options.setMonitoringStatus
        });
    }

    const exportsObject = {
        resolveMonitoringModules: resolveMonitoringModules,
        initializeMonitoringGrids: initializeMonitoringGrids,
        createMonitoringDataService: createMonitoringDataService,
        createMonitoringSelectionController: createMonitoringSelectionController,
        createMdrImportController: createMdrImportController
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringEntrypointHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
