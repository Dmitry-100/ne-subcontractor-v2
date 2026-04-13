"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ProjectsGrids requires ${name}.`);
        }
    }

    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const gridElement = settings.gridElement;
        const store = settings.store;
        const setStatus = settings.setStatus;

        requireFunction(jQueryImpl, "jQueryImpl");
        requireFunction(setStatus, "setStatus callback");

        if (!gridElement) {
            throw new Error("ProjectsGrids requires gridElement.");
        }

        if (!store) {
            throw new Error("ProjectsGrids requires store.");
        }

        let gridInstance = null;
        gridInstance = jQueryImpl(gridElement).dxDataGrid({
            dataSource: store,
            keyExpr: "id",
            height: 560,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            renderAsync: true,
            columnAutoWidth: true,
            repaintChangesOnly: true,
            remoteOperations: {
                paging: true
            },
            sorting: {
                mode: "multiple"
            },
            searchPanel: {
                visible: true,
                width: 280,
                placeholder: "Поиск проектов..."
            },
            filterRow: {
                visible: true
            },
            headerFilter: {
                visible: true
            },
            paging: {
                pageSize: 15
            },
            pager: {
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [15, 30, 50]
            },
            editing: {
                mode: "popup",
                allowAdding: true,
                allowUpdating: true,
                allowDeleting: true,
                useIcons: true,
                popup: {
                    title: "Проект",
                    showTitle: true,
                    width: 640
                },
                form: {
                    colCount: 1,
                    items: ["code", "name", "gipUserId"]
                }
            },
            columns: [
                {
                    dataField: "id",
                    visible: false,
                    allowEditing: false
                },
                {
                    dataField: "code",
                    caption: "Код",
                    validationRules: [
                        { type: "required" },
                        { type: "stringLength", max: 64 }
                    ]
                },
                {
                    dataField: "name",
                    caption: "Наименование",
                    validationRules: [
                        { type: "required" },
                        { type: "stringLength", max: 256 }
                    ]
                },
                {
                    dataField: "gipUserId",
                    caption: "ID ГИПа",
                    validationRules: [
                        { type: "stringLength", max: 64 }
                    ]
                }
            ],
            onEditorPreparing: function (e) {
                if (e.parentType === "dataRow" && e.dataField === "code" && e.row && !e.row.isNewRow) {
                    e.editorOptions.readOnly = true;
                }
            },
            onInitNewRow: function () {
                setStatus("Создание нового проекта...", false);
            },
            onToolbarPreparing: function (e) {
                e.toolbarOptions.items.push({
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "refresh",
                        text: "Обновить",
                        onClick: function () {
                            if (gridInstance) {
                                gridInstance.refresh();
                            }
                        }
                    }
                });
            },
            onDataErrorOccurred: function (e) {
                setStatus(e.error?.message ?? "Ошибка операции с данными.", true);
            }
        }).dxDataGrid("instance");

        return gridInstance;
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.ProjectsGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
