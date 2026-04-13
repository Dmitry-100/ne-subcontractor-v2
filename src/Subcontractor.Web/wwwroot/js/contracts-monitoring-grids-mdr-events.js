"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsMonitoringMdrGridEvents requires ${name}.`);
        }
    }

    function createMdrCardsEvents(options) {
        const settings = options || {};
        const gridState = settings.gridState;
        const setMonitoringStatus = settings.setMonitoringStatus;
        const refreshMonitoringRowsGrid = settings.refreshMonitoringRowsGrid;
        const ensureMonitoringSelection = settings.ensureMonitoringSelection;
        const markMonitoringDirty = settings.markMonitoringDirty;
        const createMonitoringClientId = settings.createMonitoringClientId;

        if (!(gridState && typeof gridState.setSelectedMonitoringMdrCardClientId === "function")) {
            throw new Error("ContractsMonitoringMdrGridEvents requires gridState.setSelectedMonitoringMdrCardClientId.");
        }

        requireFunction(setMonitoringStatus, "setMonitoringStatus");
        requireFunction(refreshMonitoringRowsGrid, "refreshMonitoringRowsGrid");
        requireFunction(ensureMonitoringSelection, "ensureMonitoringSelection");
        requireFunction(markMonitoringDirty, "markMonitoringDirty");
        requireFunction(createMonitoringClientId, "createMonitoringClientId");

        return {
            onSelectionChanged: function (e) {
                gridState.setSelectedMonitoringMdrCardClientId(
                    e.selectedRowKeys.length > 0
                        ? e.selectedRowKeys[0]
                        : null);
                refreshMonitoringRowsGrid();
            },
            onInitNewRow: function (e) {
                const items = e.component.option("dataSource");
                const source = Array.isArray(items) ? items : [];
                e.data.clientId = createMonitoringClientId("mdr-card");
                e.data.sortOrder = source.length;
                e.data.rows = [];
            },
            onRowInserting: function (e) {
                if (!Array.isArray(e.data.rows)) {
                    e.data.rows = [];
                }
            },
            onRowUpdating: function (e) {
                if (!e.newData.clientId) {
                    e.newData.clientId = e.oldData?.clientId || createMonitoringClientId("mdr-card");
                }

                if (!Array.isArray(e.newData.rows)) {
                    e.newData.rows = Array.isArray(e.oldData?.rows) ? e.oldData.rows : [];
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
                setMonitoringStatus(e.error?.message ?? "Ошибка операции с карточками MDR.", true);
            }
        };
    }

    function createMdrRowsEvents(options) {
        const settings = options || {};
        const setMonitoringStatus = settings.setMonitoringStatus;
        const syncRowsWithSelectedMdrCard = settings.syncRowsWithSelectedMdrCard;
        const markMonitoringDirty = settings.markMonitoringDirty;
        const createMonitoringClientId = settings.createMonitoringClientId;
        const getSelectedMonitoringMdrCard = settings.getSelectedMonitoringMdrCard;

        requireFunction(setMonitoringStatus, "setMonitoringStatus");
        requireFunction(syncRowsWithSelectedMdrCard, "syncRowsWithSelectedMdrCard");
        requireFunction(markMonitoringDirty, "markMonitoringDirty");
        requireFunction(createMonitoringClientId, "createMonitoringClientId");
        requireFunction(getSelectedMonitoringMdrCard, "getSelectedMonitoringMdrCard");

        return {
            onInitNewRow: function (e) {
                const items = e.component.option("dataSource");
                const source = Array.isArray(items) ? items : [];
                e.data.clientId = createMonitoringClientId("mdr-row");
                e.data.sortOrder = source.length;
                e.data.planValue = 0;
                e.data.forecastValue = 0;
                e.data.factValue = 0;
            },
            onRowInserting: function (e) {
                if (!getSelectedMonitoringMdrCard()) {
                    e.cancel = true;
                    setMonitoringStatus("Сначала выберите карточку MDR.", true);
                }
            },
            onRowUpdating: function (e) {
                if (!e.newData.clientId) {
                    e.newData.clientId = e.oldData?.clientId || createMonitoringClientId("mdr-row");
                }
            },
            onRowInserted: function () {
                syncRowsWithSelectedMdrCard();
                markMonitoringDirty();
            },
            onRowUpdated: function () {
                syncRowsWithSelectedMdrCard();
                markMonitoringDirty();
            },
            onRowRemoved: function () {
                syncRowsWithSelectedMdrCard();
                markMonitoringDirty();
            },
            onDataErrorOccurred: function (e) {
                setMonitoringStatus(e.error?.message ?? "Ошибка операции со строками MDR.", true);
            }
        };
    }

    const exportsObject = {
        createMdrCardsEvents: createMdrCardsEvents,
        createMdrRowsEvents: createMdrRowsEvents
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringMdrGridEvents = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
