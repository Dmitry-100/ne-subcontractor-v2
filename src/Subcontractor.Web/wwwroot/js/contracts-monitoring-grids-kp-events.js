"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsMonitoringKpGridEvents requires ${name}.`);
        }
    }

    function createControlPointsEvents(options) {
        const settings = options || {};
        const gridState = settings.gridState;
        const setMonitoringStatus = settings.setMonitoringStatus;
        const refreshMonitoringStagesGrid = settings.refreshMonitoringStagesGrid;
        const ensureMonitoringSelection = settings.ensureMonitoringSelection;
        const markMonitoringDirty = settings.markMonitoringDirty;
        const createMonitoringClientId = settings.createMonitoringClientId;

        if (!(gridState && typeof gridState.setSelectedMonitoringControlPointClientId === "function")) {
            throw new Error("ContractsMonitoringKpGridEvents requires gridState.setSelectedMonitoringControlPointClientId.");
        }

        requireFunction(setMonitoringStatus, "setMonitoringStatus");
        requireFunction(refreshMonitoringStagesGrid, "refreshMonitoringStagesGrid");
        requireFunction(ensureMonitoringSelection, "ensureMonitoringSelection");
        requireFunction(markMonitoringDirty, "markMonitoringDirty");
        requireFunction(createMonitoringClientId, "createMonitoringClientId");

        return {
            onSelectionChanged: function (e) {
                gridState.setSelectedMonitoringControlPointClientId(
                    e.selectedRowKeys.length > 0
                        ? e.selectedRowKeys[0]
                        : null);
                refreshMonitoringStagesGrid();
            },
            onInitNewRow: function (e) {
                const items = e.component.option("dataSource");
                const source = Array.isArray(items) ? items : [];
                e.data.clientId = createMonitoringClientId("cp");
                e.data.sortOrder = source.length;
                e.data.progressPercent = 0;
                e.data.stages = [];
                e.data.isDelayed = false;
            },
            onRowInserting: function (e) {
                if (!Array.isArray(e.data.stages)) {
                    e.data.stages = [];
                }
            },
            onRowUpdating: function (e) {
                if (!e.newData.clientId) {
                    e.newData.clientId = e.oldData?.clientId || createMonitoringClientId("cp");
                }

                if (!Array.isArray(e.newData.stages)) {
                    e.newData.stages = Array.isArray(e.oldData?.stages) ? e.oldData.stages : [];
                }
            },
            onRowInserted: function () {
                ensureMonitoringSelection();
                markMonitoringDirty();
            },
            onRowUpdated: function () {
                ensureMonitoringSelection();
                markMonitoringDirty();
            },
            onRowRemoved: function () {
                ensureMonitoringSelection();
                markMonitoringDirty();
            },
            onDataErrorOccurred: function (e) {
                setMonitoringStatus(e.error?.message ?? "Ошибка операции с контрольными точками.", true);
            }
        };
    }

    function createStagesEvents(options) {
        const settings = options || {};
        const setMonitoringStatus = settings.setMonitoringStatus;
        const syncStagesWithSelectedControlPoint = settings.syncStagesWithSelectedControlPoint;
        const markMonitoringDirty = settings.markMonitoringDirty;
        const createMonitoringClientId = settings.createMonitoringClientId;
        const getSelectedMonitoringControlPoint = settings.getSelectedMonitoringControlPoint;

        requireFunction(setMonitoringStatus, "setMonitoringStatus");
        requireFunction(syncStagesWithSelectedControlPoint, "syncStagesWithSelectedControlPoint");
        requireFunction(markMonitoringDirty, "markMonitoringDirty");
        requireFunction(createMonitoringClientId, "createMonitoringClientId");
        requireFunction(getSelectedMonitoringControlPoint, "getSelectedMonitoringControlPoint");

        return {
            onInitNewRow: function (e) {
                const items = e.component.option("dataSource");
                const source = Array.isArray(items) ? items : [];
                e.data.clientId = createMonitoringClientId("cp-stage");
                e.data.sortOrder = source.length;
                e.data.progressPercent = 0;
                e.data.isDelayed = false;
            },
            onRowInserting: function (e) {
                if (!getSelectedMonitoringControlPoint()) {
                    e.cancel = true;
                    setMonitoringStatus("Сначала выберите контрольную точку.", true);
                }
            },
            onRowUpdating: function (e) {
                if (!e.newData.clientId) {
                    e.newData.clientId = e.oldData?.clientId || createMonitoringClientId("cp-stage");
                }
            },
            onRowInserted: function () {
                syncStagesWithSelectedControlPoint();
                markMonitoringDirty();
            },
            onRowUpdated: function () {
                syncStagesWithSelectedControlPoint();
                markMonitoringDirty();
            },
            onRowRemoved: function () {
                syncStagesWithSelectedControlPoint();
                markMonitoringDirty();
            },
            onDataErrorOccurred: function (e) {
                setMonitoringStatus(e.error?.message ?? "Ошибка операции с этапами контрольной точки.", true);
            }
        };
    }

    const exportsObject = {
        createControlPointsEvents: createControlPointsEvents,
        createStagesEvents: createStagesEvents
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringKpGridEvents = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
