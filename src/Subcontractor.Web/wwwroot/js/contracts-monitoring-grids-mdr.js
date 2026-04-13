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
            throw new Error(`Не удалось загрузить модуль contracts-monitoring-grids-mdr: ${globalName}.`);
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

    const columnsModule = resolveModule(
        "ContractsMonitoringMdrGridColumns",
        "./contracts-monitoring-grids-mdr-columns.js",
        ["createMdrCardsColumns", "createMdrRowsColumns"]);
    const eventsModule = resolveModule(
        "ContractsMonitoringMdrGridEvents",
        "./contracts-monitoring-grids-mdr-events.js",
        ["createMdrCardsEvents", "createMdrRowsEvents"]);

    function createMdrCardsFormItems() {
        return [
            "title",
            "reportingDate",
            "sortOrder",
            {
                dataField: "notes",
                colSpan: 2,
                editorType: "dxTextArea",
                editorOptions: {
                    minHeight: 90
                }
            }
        ];
    }

    function createMdrRowsFormItems() {
        return [
            "rowCode",
            "unitCode",
            {
                dataField: "description",
                colSpan: 2
            },
            "planValue",
            "forecastValue",
            "factValue",
            "sortOrder",
            {
                dataField: "notes",
                colSpan: 2,
                editorType: "dxTextArea",
                editorOptions: {
                    minHeight: 90
                }
            }
        ];
    }

    function createBaseGridConfig(options) {
        const settings = options || {};
        return {
            dataSource: [],
            keyExpr: "clientId",
            height: settings.height,
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
                    title: settings.popupTitle,
                    showTitle: true,
                    width: settings.popupWidth
                },
                form: {
                    colCount: 2,
                    items: settings.formItems
                }
            }
        };
    }

    function createMdrGrids(options) {
        const settings = options || {};
        const elements = settings.elements || {};

        const monitoringMdrCardsGridElement = elements.monitoringMdrCardsGridElement;
        const monitoringMdrRowsGridElement = elements.monitoringMdrRowsGridElement;

        const cardsGridConfig = Object.assign(createBaseGridConfig({
            height: 280,
            popupTitle: "Карточка MDR",
            popupWidth: 760,
            formItems: createMdrCardsFormItems()
        }), {
            selection: {
                mode: "single"
            },
            columns: columnsModule.createMdrCardsColumns({
                calculateMdrCardMetrics: settings.calculateMdrCardMetrics
            })
        });

        Object.assign(cardsGridConfig, eventsModule.createMdrCardsEvents({
            gridState: settings.gridState,
            setMonitoringStatus: settings.setMonitoringStatus,
            refreshMonitoringRowsGrid: settings.refreshMonitoringRowsGrid,
            ensureMonitoringSelection: settings.ensureMonitoringSelection,
            markMonitoringDirty: settings.markMonitoringDirty,
            createMonitoringClientId: settings.createMonitoringClientId
        }));

        const monitoringMdrCardsGridInstance = window.jQuery(monitoringMdrCardsGridElement)
            .dxDataGrid(cardsGridConfig)
            .dxDataGrid("instance");

        const rowsGridConfig = Object.assign(createBaseGridConfig({
            height: 260,
            popupTitle: "Строка MDR",
            popupWidth: 860,
            formItems: createMdrRowsFormItems()
        }), {
            columns: columnsModule.createMdrRowsColumns({
                calculateDeviationPercent: settings.calculateDeviationPercent
            })
        });

        Object.assign(rowsGridConfig, eventsModule.createMdrRowsEvents({
            setMonitoringStatus: settings.setMonitoringStatus,
            syncRowsWithSelectedMdrCard: settings.syncRowsWithSelectedMdrCard,
            markMonitoringDirty: settings.markMonitoringDirty,
            createMonitoringClientId: settings.createMonitoringClientId,
            getSelectedMonitoringMdrCard: settings.getSelectedMonitoringMdrCard
        }));

        const monitoringMdrRowsGridInstance = window.jQuery(monitoringMdrRowsGridElement)
            .dxDataGrid(rowsGridConfig)
            .dxDataGrid("instance");

        return {
            monitoringMdrCardsGridInstance: monitoringMdrCardsGridInstance,
            monitoringMdrRowsGridInstance: monitoringMdrRowsGridInstance
        };
    }

    const exportsObject = {
        createMdrGrids: createMdrGrids
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringMdrGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
