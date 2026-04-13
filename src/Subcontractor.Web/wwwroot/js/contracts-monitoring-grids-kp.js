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
            throw new Error(`Не удалось загрузить модуль contracts-monitoring-grids-kp: ${globalName}.`);
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

    const columnsModule = resolveModule("ContractsMonitoringKpGridColumns", "./contracts-monitoring-grids-kp-columns.js", ["createControlPointsColumns", "createStagesColumns"]);
    const eventsModule = resolveModule("ContractsMonitoringKpGridEvents", "./contracts-monitoring-grids-kp-events.js", ["createControlPointsEvents", "createStagesEvents"]);

    function createNotesFormItem() {
        return {
            dataField: "notes",
            colSpan: 2,
            editorType: "dxTextArea",
            editorOptions: {
                minHeight: 90
            }
        };
    }

    function createControlPointsFormItems() {
        return [
            "name",
            "responsibleRole",
            "plannedDate",
            "forecastDate",
            "actualDate",
            "progressPercent",
            "sortOrder",
            createNotesFormItem()
        ];
    }

    function createStagesFormItems() {
        return [
            "name",
            "plannedDate",
            "forecastDate",
            "actualDate",
            "progressPercent",
            "sortOrder",
            createNotesFormItem()
        ];
    }

    function createKpGrids(options) {
        const settings = options || {};
        const elements = settings.elements || {};

        const monitoringControlPointsGridElement = elements.monitoringControlPointsGridElement;
        const monitoringStagesGridElement = elements.monitoringStagesGridElement;

        const controlPointsGridConfig = {
            dataSource: [],
            keyExpr: "clientId",
            height: 280,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            selection: {
                mode: "single"
            },
            columnAutoWidth: true,
            sorting: {
                mode: "multiple"
            },
            paging: {
                pageSize: 8
            },
            pager: {
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [8, 16, 30]
            },
            editing: {
                mode: "popup",
                allowAdding: false,
                allowUpdating: false,
                allowDeleting: false,
                useIcons: true,
                popup: {
                    title: "Контрольная точка",
                    showTitle: true,
                    width: 760
                },
                form: {
                    colCount: 2,
                    items: createControlPointsFormItems()
                }
            },
            columns: columnsModule.createControlPointsColumns()
        };

        const controlPointsEvents = eventsModule.createControlPointsEvents({
            gridState: settings.gridState,
            setMonitoringStatus: settings.setMonitoringStatus,
            refreshMonitoringStagesGrid: settings.refreshMonitoringStagesGrid,
            ensureMonitoringSelection: settings.ensureMonitoringSelection,
            markMonitoringDirty: settings.markMonitoringDirty,
            createMonitoringClientId: settings.createMonitoringClientId
        });
        Object.assign(controlPointsGridConfig, controlPointsEvents);

        const monitoringControlPointsGridInstance = window.jQuery(monitoringControlPointsGridElement)
            .dxDataGrid(controlPointsGridConfig)
            .dxDataGrid("instance");

        const stagesGridConfig = {
            dataSource: [],
            keyExpr: "clientId",
            height: 260,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            sorting: {
                mode: "multiple"
            },
            paging: {
                pageSize: 8
            },
            pager: {
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [8, 16, 30]
            },
            editing: {
                mode: "popup",
                allowAdding: false,
                allowUpdating: false,
                allowDeleting: false,
                useIcons: true,
                popup: {
                    title: "Этап контрольной точки",
                    showTitle: true,
                    width: 720
                },
                form: {
                    colCount: 2,
                    items: createStagesFormItems()
                }
            },
            columns: columnsModule.createStagesColumns()
        };

        const stagesEvents = eventsModule.createStagesEvents({
            setMonitoringStatus: settings.setMonitoringStatus,
            syncStagesWithSelectedControlPoint: settings.syncStagesWithSelectedControlPoint,
            markMonitoringDirty: settings.markMonitoringDirty,
            createMonitoringClientId: settings.createMonitoringClientId,
            getSelectedMonitoringControlPoint: settings.getSelectedMonitoringControlPoint
        });
        Object.assign(stagesGridConfig, stagesEvents);

        const monitoringStagesGridInstance = window.jQuery(monitoringStagesGridElement)
            .dxDataGrid(stagesGridConfig)
            .dxDataGrid("instance");

        return {
            monitoringControlPointsGridInstance: monitoringControlPointsGridInstance,
            monitoringStagesGridInstance: monitoringStagesGridInstance
        };
    }

    const exportsObject = {
        createKpGrids: createKpGrids
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringKpGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
