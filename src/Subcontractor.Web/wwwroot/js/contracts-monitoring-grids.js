"use strict";

(function () {
    function createGrids(options) {
        const settings = options || {};
        const elements = settings.elements || {};

        const kpGridsModule = settings.kpGridsModule;
        const mdrGridsModule = settings.mdrGridsModule;

        if (!(kpGridsModule && typeof kpGridsModule.createKpGrids === "function")) {
            throw new Error("Monitoring KP grids module is not configured.");
        }

        if (!(mdrGridsModule && typeof mdrGridsModule.createMdrGrids === "function")) {
            throw new Error("Monitoring MDR grids module is not configured.");
        }

        const kpGrids = kpGridsModule.createKpGrids({
            elements: {
                monitoringControlPointsGridElement: elements.monitoringControlPointsGridElement,
                monitoringStagesGridElement: elements.monitoringStagesGridElement
            },
            gridState: settings.gridState,
            setMonitoringStatus: settings.setMonitoringStatus,
            refreshMonitoringStagesGrid: settings.refreshMonitoringStagesGrid,
            ensureMonitoringSelection: settings.ensureMonitoringSelection,
            markMonitoringDirty: settings.markMonitoringDirty,
            syncStagesWithSelectedControlPoint: settings.syncStagesWithSelectedControlPoint,
            createMonitoringClientId: settings.createMonitoringClientId,
            getSelectedMonitoringControlPoint: settings.getSelectedMonitoringControlPoint
        });

        const mdrGrids = mdrGridsModule.createMdrGrids({
            elements: {
                monitoringMdrCardsGridElement: elements.monitoringMdrCardsGridElement,
                monitoringMdrRowsGridElement: elements.monitoringMdrRowsGridElement
            },
            gridState: settings.gridState,
            setMonitoringStatus: settings.setMonitoringStatus,
            refreshMonitoringRowsGrid: settings.refreshMonitoringRowsGrid,
            ensureMonitoringSelection: settings.ensureMonitoringSelection,
            markMonitoringDirty: settings.markMonitoringDirty,
            syncRowsWithSelectedMdrCard: settings.syncRowsWithSelectedMdrCard,
            createMonitoringClientId: settings.createMonitoringClientId,
            getSelectedMonitoringMdrCard: settings.getSelectedMonitoringMdrCard,
            calculateDeviationPercent: settings.calculateDeviationPercent,
            calculateMdrCardMetrics: settings.calculateMdrCardMetrics
        });

        return {
            monitoringControlPointsGridInstance: kpGrids.monitoringControlPointsGridInstance,
            monitoringStagesGridInstance: kpGrids.monitoringStagesGridInstance,
            monitoringMdrCardsGridInstance: mdrGrids.monitoringMdrCardsGridInstance,
            monitoringMdrRowsGridInstance: mdrGrids.monitoringMdrRowsGridInstance
        };
    }

    const exportsObject = {
        createGrids: createGrids
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
