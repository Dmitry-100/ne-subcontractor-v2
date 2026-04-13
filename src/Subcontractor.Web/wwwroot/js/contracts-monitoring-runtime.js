"use strict";

(function () {
    function createRuntime(options) {
        const settings = options || {};
        const monitoringModel = settings.monitoringModel;
        const setMonitoringStatus = settings.setMonitoringStatus;

        if (!monitoringModel || typeof monitoringModel.normalizeControlPoint !== "function") {
            throw new Error("ContractsMonitoringRuntime requires monitoringModel.");
        }

        if (typeof setMonitoringStatus !== "function") {
            throw new Error("ContractsMonitoringRuntime requires setMonitoringStatus.");
        }

        let monitoringControlPointsGridInstance = null;
        let monitoringStagesGridInstance = null;
        let monitoringMdrCardsGridInstance = null;
        let monitoringMdrRowsGridInstance = null;
        let monitoringDataService = null;
        let monitoringUiController = null;
        let monitoringSelectionController = null;

        function setGridInstances(grids) {
            const safeGrids = grids || {};
            monitoringControlPointsGridInstance = safeGrids.monitoringControlPointsGridInstance || null;
            monitoringStagesGridInstance = safeGrids.monitoringStagesGridInstance || null;
            monitoringMdrCardsGridInstance = safeGrids.monitoringMdrCardsGridInstance || null;
            monitoringMdrRowsGridInstance = safeGrids.monitoringMdrRowsGridInstance || null;
        }

        function attachControllers(controllers) {
            const safeControllers = controllers || {};
            monitoringUiController = safeControllers.uiController || monitoringUiController;
            monitoringSelectionController = safeControllers.selectionController || monitoringSelectionController;
            monitoringDataService = safeControllers.dataService || monitoringDataService;
        }

        const getControlPointsGrid = function () { return monitoringControlPointsGridInstance; };
        const getStagesGrid = function () { return monitoringStagesGridInstance; };
        const getMdrCardsGrid = function () { return monitoringMdrCardsGridInstance; };
        const getMdrRowsGrid = function () { return monitoringMdrRowsGridInstance; };

        function invokeSelection(methodName, fallbackValue) {
            if (!monitoringSelectionController || typeof monitoringSelectionController[methodName] !== "function") {
                return fallbackValue;
            }

            return monitoringSelectionController[methodName]();
        }

        function invokeUi(methodName) {
            if (!monitoringUiController || typeof monitoringUiController[methodName] !== "function") {
                return;
            }

            monitoringUiController[methodName]();
        }

        function invokeData(methodName, args) {
            if (!monitoringDataService || typeof monitoringDataService[methodName] !== "function") {
                return undefined;
            }

            return monitoringDataService[methodName].apply(monitoringDataService, args || []);
        }

        const getMonitoringControlPointsData = function () { return invokeSelection("getControlPointsData", []); };
        const getMonitoringMdrCardsData = function () { return invokeSelection("getMdrCardsData", []); };
        const getSelectedMonitoringControlPoint = function () { return invokeSelection("getSelectedControlPoint", null); };
        const getSelectedMonitoringMdrCard = function () { return invokeSelection("getSelectedMdrCard", null); };
        const refreshMonitoringSelectionStatus = function () { invokeUi("refreshSelectionStatus"); };
        const refreshMonitoringStagesGrid = function () { invokeSelection("refreshStagesGrid"); };
        const refreshMonitoringRowsGrid = function () { invokeSelection("refreshRowsGrid"); };
        const syncStagesWithSelectedControlPoint = function () { invokeSelection("syncStagesWithSelectedControlPoint"); };
        const syncRowsWithSelectedMdrCard = function () { invokeSelection("syncRowsWithSelectedMdrCard"); };
        const ensureMonitoringSelection = function () { invokeSelection("ensureSelection"); };

        function markMonitoringDirty() {
            setMonitoringStatus("Есть несохранённые изменения. Нажмите «Сохранить мониторинг».", false);
        }

        const normalizeMonitoringControlPoint = function (point, index) { return monitoringModel.normalizeControlPoint(point, index); };
        const normalizeMonitoringMdrCard = function (card, index) { return monitoringModel.normalizeMdrCard(card, index); };
        const calculateDeviationPercent = function (planValue, actualValue) { return monitoringModel.calculateDeviationPercent(planValue, actualValue); };
        const calculateMdrCardMetrics = function (card) { return monitoringModel.calculateMdrCardMetrics(card); };
        const createMonitoringClientId = function (prefix) { return monitoringModel.createClientId(prefix); };
        const buildMonitoringControlPointsPayload = function (items) { return monitoringModel.buildControlPointsPayload(items); };
        const buildMonitoringMdrCardsPayload = function (items) { return monitoringModel.buildMdrCardsPayload(items); };
        const updateControls = function () { invokeUi("updateControls"); };
        async function loadData(showStatusMessage) { return invokeData("loadData", [showStatusMessage]); }
        async function saveData() { return invokeData("saveData"); }

        return {
            setGridInstances,
            attachControllers,
            getControlPointsGrid,
            getStagesGrid,
            getMdrCardsGrid,
            getMdrRowsGrid,
            getMonitoringControlPointsData,
            getMonitoringMdrCardsData,
            getSelectedMonitoringControlPoint,
            getSelectedMonitoringMdrCard,
            refreshMonitoringSelectionStatus,
            refreshMonitoringStagesGrid,
            refreshMonitoringRowsGrid,
            syncStagesWithSelectedControlPoint,
            syncRowsWithSelectedMdrCard,
            ensureMonitoringSelection,
            markMonitoringDirty,
            normalizeMonitoringControlPoint,
            normalizeMonitoringMdrCard,
            calculateDeviationPercent,
            calculateMdrCardMetrics,
            createMonitoringClientId,
            buildMonitoringControlPointsPayload,
            buildMonitoringMdrCardsPayload,
            updateControls,
            loadData,
            saveData
        };
    }

    const exportsObject = {
        createRuntime: createRuntime
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
