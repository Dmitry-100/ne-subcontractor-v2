"use strict";

(function () {
    function getControlPointsData(gridInstance) {
        const source = gridInstance
            ? gridInstance.option("dataSource")
            : [];
        return Array.isArray(source) ? source : [];
    }

    function findSelectedControlPoint(controlPoints, selectedClientId) {
        if (!selectedClientId) {
            return null;
        }

        return (Array.isArray(controlPoints) ? controlPoints : []).find(function (item) {
            return item.clientId === selectedClientId;
        }) || null;
    }

    function ensureSelectedControlPointId(controlPoints, selectedClientId) {
        const source = Array.isArray(controlPoints) ? controlPoints : [];
        const hasSelected = source.some(function (item) {
            return item.clientId === selectedClientId;
        });

        if (hasSelected) {
            return selectedClientId;
        }

        return source.length > 0
            ? source[0].clientId
            : null;
    }

    function getStagesDataSource(selectedControlPoint) {
        return selectedControlPoint && Array.isArray(selectedControlPoint.stages)
            ? selectedControlPoint.stages
            : [];
    }

    function syncStagesToControlPoint(selectedControlPoint, stageSource) {
        if (!selectedControlPoint) {
            return;
        }

        selectedControlPoint.stages = Array.isArray(stageSource) ? stageSource : [];
    }

    function formatSelectionStatus(selectedControlPoint) {
        if (!selectedControlPoint) {
            return "Выберите контрольную точку для просмотра этапов.";
        }

        return `Выбрана КП: ${selectedControlPoint.name || "без наименования"} | Этапов: ${(selectedControlPoint.stages || []).length}`;
    }

    window.ContractsMonitoringKp = {
        ensureSelectedControlPointId: ensureSelectedControlPointId,
        findSelectedControlPoint: findSelectedControlPoint,
        formatSelectionStatus: formatSelectionStatus,
        getControlPointsData: getControlPointsData,
        getStagesDataSource: getStagesDataSource,
        syncStagesToControlPoint: syncStagesToControlPoint
    };
})();
