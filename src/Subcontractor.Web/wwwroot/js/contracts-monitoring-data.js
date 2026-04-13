"use strict";

(function () {
    function createService(options) {
        const settings = options || {};

        const apiClient = settings.apiClient;
        const gridState = settings.gridState;
        const getSelectedContract = settings.getSelectedContract;
        const canEditMilestones = settings.canEditMilestones;
        const normalizeMonitoringControlPoint = settings.normalizeMonitoringControlPoint;
        const normalizeMonitoringMdrCard = settings.normalizeMonitoringMdrCard;
        const getMonitoringControlPointsData = settings.getMonitoringControlPointsData;
        const getMonitoringMdrCardsData = settings.getMonitoringMdrCardsData;
        const buildMonitoringControlPointsPayload = settings.buildMonitoringControlPointsPayload;
        const buildMonitoringMdrCardsPayload = settings.buildMonitoringMdrCardsPayload;
        const setControlPointsData = settings.setControlPointsData;
        const setMdrCardsData = settings.setMdrCardsData;
        const ensureMonitoringSelection = settings.ensureMonitoringSelection;
        const refreshMonitoringStagesGrid = settings.refreshMonitoringStagesGrid;
        const refreshMonitoringRowsGrid = settings.refreshMonitoringRowsGrid;
        const setMonitoringStatus = settings.setMonitoringStatus;

        function resetMonitoringViewState() {
            gridState.resetMonitoringSelection();
            setControlPointsData([]);
            setMdrCardsData([]);
            refreshMonitoringStagesGrid();
            refreshMonitoringRowsGrid();
        }

        async function loadData(showStatusMessage) {
            const selectedContract = getSelectedContract();
            if (!selectedContract) {
                resetMonitoringViewState();
                return;
            }

            try {
                const controlPointsPayload = await apiClient.getMonitoringControlPoints(selectedContract.id);
                const controlPoints = Array.isArray(controlPointsPayload) ? controlPointsPayload : [];
                const normalizedControlPoints = controlPoints.map(function (item, index) {
                    return normalizeMonitoringControlPoint(item, index);
                });
                setControlPointsData(normalizedControlPoints);

                const mdrCardsPayload = await apiClient.getMonitoringMdrCards(selectedContract.id);
                const mdrCards = Array.isArray(mdrCardsPayload) ? mdrCardsPayload : [];
                const normalizedMdrCards = mdrCards.map(function (item, index) {
                    return normalizeMonitoringMdrCard(item, index);
                });
                setMdrCardsData(normalizedMdrCards);

                gridState.setSelectedMonitoringControlPointClientId(
                    normalizedControlPoints.length > 0
                        ? normalizedControlPoints[0].clientId
                        : null);
                gridState.setSelectedMonitoringMdrCardClientId(
                    normalizedMdrCards.length > 0
                        ? normalizedMdrCards[0].clientId
                        : null);
                ensureMonitoringSelection();

                if (showStatusMessage) {
                    setMonitoringStatus(
                        `Загружено: КП ${controlPoints.length}, MDR карточек ${mdrCards.length}.`,
                        false);
                }
            } catch (error) {
                resetMonitoringViewState();
                setMonitoringStatus(`Не удалось загрузить мониторинг: ${error.message}`, true);
            }
        }

        async function saveData() {
            const selectedContract = getSelectedContract();
            if (!selectedContract) {
                return;
            }

            if (!canEditMilestones(selectedContract.status)) {
                setMonitoringStatus("Для текущего статуса договора мониторинг доступен только для чтения.", true);
                return;
            }

            const controlPointItems = buildMonitoringControlPointsPayload(getMonitoringControlPointsData());
            const mdrCardItems = buildMonitoringMdrCardsPayload(getMonitoringMdrCardsData());

            const savedControlPoints = await apiClient.saveMonitoringControlPoints(selectedContract.id, {
                items: controlPointItems
            });

            const savedMdrCards = await apiClient.saveMonitoringMdrCards(selectedContract.id, {
                items: mdrCardItems
            });

            const normalizedControlPoints = (Array.isArray(savedControlPoints) ? savedControlPoints : [])
                .map(function (item, index) {
                    return normalizeMonitoringControlPoint(item, index);
                });
            const normalizedMdrCards = (Array.isArray(savedMdrCards) ? savedMdrCards : [])
                .map(function (item, index) {
                    return normalizeMonitoringMdrCard(item, index);
                });

            setControlPointsData(normalizedControlPoints);
            setMdrCardsData(normalizedMdrCards);

            if (!normalizedControlPoints.some(function (item) {
                return item.clientId === gridState.getSelectedMonitoringControlPointClientId();
            })) {
                gridState.setSelectedMonitoringControlPointClientId(
                    normalizedControlPoints.length > 0
                        ? normalizedControlPoints[0].clientId
                        : null);
            }

            if (!normalizedMdrCards.some(function (item) {
                return item.clientId === gridState.getSelectedMonitoringMdrCardClientId();
            })) {
                gridState.setSelectedMonitoringMdrCardClientId(
                    normalizedMdrCards.length > 0
                        ? normalizedMdrCards[0].clientId
                        : null);
            }

            ensureMonitoringSelection();
            setMonitoringStatus(
                `Мониторинг сохранён: КП ${normalizedControlPoints.length}, MDR карточек ${normalizedMdrCards.length}.`,
                false);
        }

        return {
            loadData: loadData,
            saveData: saveData
        };
    }

    const exportsObject = {
        createService: createService
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringData = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
