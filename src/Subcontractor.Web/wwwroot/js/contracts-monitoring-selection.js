"use strict";

(function () {
    function createController(options) {
        const settings = options || {};

        const gridState = settings.gridState;
        const monitoringKpModule = settings.monitoringKpModule;
        const monitoringMdrModule = settings.monitoringMdrModule;
        const getControlPointsGrid = settings.getControlPointsGrid;
        const getStagesGrid = settings.getStagesGrid;
        const getMdrCardsGrid = settings.getMdrCardsGrid;
        const getMdrRowsGrid = settings.getMdrRowsGrid;
        const onSelectionStatusChanged = settings.onSelectionStatusChanged;

        function notifySelectionStatusChanged() {
            if (typeof onSelectionStatusChanged === "function") {
                onSelectionStatusChanged();
            }
        }

        function getControlPointsData() {
            return monitoringKpModule.getControlPointsData(getControlPointsGrid());
        }

        function getMdrCardsData() {
            return monitoringMdrModule.getMdrCardsData(getMdrCardsGrid());
        }

        function getSelectedControlPoint() {
            return monitoringKpModule.findSelectedControlPoint(
                getControlPointsData(),
                gridState.getSelectedMonitoringControlPointClientId());
        }

        function getSelectedMdrCard() {
            return monitoringMdrModule.findSelectedMdrCard(
                getMdrCardsData(),
                gridState.getSelectedMonitoringMdrCardClientId());
        }

        function refreshStagesGrid() {
            const stagesGrid = getStagesGrid();
            if (!stagesGrid) {
                return;
            }

            const selectedControlPoint = getSelectedControlPoint();
            const source = monitoringKpModule.getStagesDataSource(selectedControlPoint);
            stagesGrid.option("dataSource", source);
            notifySelectionStatusChanged();
        }

        function refreshRowsGrid() {
            const mdrRowsGrid = getMdrRowsGrid();
            if (!mdrRowsGrid) {
                return;
            }

            const selectedMdrCard = getSelectedMdrCard();
            const source = monitoringMdrModule.getRowsDataSource(selectedMdrCard);
            mdrRowsGrid.option("dataSource", source);
            notifySelectionStatusChanged();
        }

        function syncStagesWithSelectedControlPoint() {
            const selectedControlPoint = getSelectedControlPoint();
            const stagesGrid = getStagesGrid();
            if (!selectedControlPoint || !stagesGrid) {
                return;
            }

            const source = stagesGrid.option("dataSource");
            monitoringKpModule.syncStagesToControlPoint(selectedControlPoint, source);
            const controlPointsGrid = getControlPointsGrid();
            if (controlPointsGrid) {
                controlPointsGrid.refresh();
            }

            notifySelectionStatusChanged();
        }

        function syncRowsWithSelectedMdrCard() {
            const selectedMdrCard = getSelectedMdrCard();
            const mdrRowsGrid = getMdrRowsGrid();
            if (!selectedMdrCard || !mdrRowsGrid) {
                return;
            }

            const source = mdrRowsGrid.option("dataSource");
            monitoringMdrModule.syncRowsToMdrCard(selectedMdrCard, source);
            const mdrCardsGrid = getMdrCardsGrid();
            if (mdrCardsGrid) {
                mdrCardsGrid.refresh();
            }

            notifySelectionStatusChanged();
        }

        function ensureSelection() {
            const controlPoints = getControlPointsData();
            const selectedMonitoringControlPointClientId = monitoringKpModule.ensureSelectedControlPointId(
                controlPoints,
                gridState.getSelectedMonitoringControlPointClientId());
            gridState.setSelectedMonitoringControlPointClientId(selectedMonitoringControlPointClientId);

            const controlPointsGrid = getControlPointsGrid();
            if (controlPointsGrid) {
                if (selectedMonitoringControlPointClientId) {
                    controlPointsGrid.selectRows([selectedMonitoringControlPointClientId], false);
                } else {
                    controlPointsGrid.clearSelection();
                }
            }

            const mdrCards = getMdrCardsData();
            const selectedMonitoringMdrCardClientId = monitoringMdrModule.ensureSelectedMdrCardId(
                mdrCards,
                gridState.getSelectedMonitoringMdrCardClientId());
            gridState.setSelectedMonitoringMdrCardClientId(selectedMonitoringMdrCardClientId);

            const mdrCardsGrid = getMdrCardsGrid();
            if (mdrCardsGrid) {
                if (selectedMonitoringMdrCardClientId) {
                    mdrCardsGrid.selectRows([selectedMonitoringMdrCardClientId], false);
                } else {
                    mdrCardsGrid.clearSelection();
                }
            }

            refreshStagesGrid();
            refreshRowsGrid();
        }

        return {
            getControlPointsData: getControlPointsData,
            getMdrCardsData: getMdrCardsData,
            getSelectedControlPoint: getSelectedControlPoint,
            getSelectedMdrCard: getSelectedMdrCard,
            refreshStagesGrid: refreshStagesGrid,
            refreshRowsGrid: refreshRowsGrid,
            syncStagesWithSelectedControlPoint: syncStagesWithSelectedControlPoint,
            syncRowsWithSelectedMdrCard: syncRowsWithSelectedMdrCard,
            ensureSelection: ensureSelection
        };
    }

    const exportsObject = {
        createController: createController
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringSelection = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
