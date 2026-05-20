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

    function createSourceDataGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const gridElement = settings.gridElement;
        const store = settings.store;
        const setStatus = settings.setStatus;
        const onCreateProcurementRequest = typeof settings.onCreateProcurementRequest === "function"
            ? settings.onCreateProcurementRequest
            : null;

        requireFunction(jQueryImpl, "jQueryImpl");
        requireFunction(setStatus, "setStatus callback");

        if (!gridElement) {
            throw new Error("ProjectsGrids requires source data gridElement.");
        }

        if (!store) {
            throw new Error("ProjectsGrids requires source data store.");
        }

        let gridInstance = null;
        gridInstance = jQueryImpl(gridElement).dxDataGrid({
            dataSource: store,
            keyExpr: "id",
            height: 620,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            renderAsync: true,
            columnAutoWidth: true,
            columnHidingEnabled: false,
            wordWrapEnabled: true,
            repaintChangesOnly: true,
            remoteOperations: {
                paging: true
            },
            selection: {
                mode: "multiple",
                showCheckBoxesMode: "always",
                selectAllMode: "page"
            },
            sorting: {
                mode: "multiple"
            },
            searchPanel: {
                visible: true,
                width: 320,
                placeholder: "Поиск по данным Express..."
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
                allowedPageSizes: [15, 30, 50, 100]
            },
            editing: {
                allowAdding: false,
                allowUpdating: false,
                allowDeleting: false
            },
            columns: [
                {
                    dataField: "projectCode",
                    caption: "проект номер",
                    width: 120
                },
                {
                    dataField: "complexProjectName",
                    caption: "Комплекс/проект",
                    width: 150
                },
                {
                    dataField: "projectName",
                    caption: "Проект",
                    width: 180
                },
                {
                    dataField: "objectWbs",
                    caption: "Объект",
                    width: 100
                },
                {
                    dataField: "disciplineCode",
                    caption: "Проектная дисциплина",
                    minWidth: 220
                },
                {
                    dataField: "resourceDisciplineName",
                    caption: "Дисциплина-ресурс",
                    minWidth: 280
                },
                {
                    dataField: "branchOfficeName",
                    caption: "Филиал_исп",
                    width: 150
                },
                {
                    dataField: "gipName",
                    caption: "ГИП",
                    width: 220
                },
                {
                    dataField: "manHours",
                    caption: "Загр НИ, чел-час",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    width: 160
                },
                {
                    dataField: "plannedStartDate",
                    caption: "Start",
                    dataType: "date",
                    format: "dd.MM.yyyy",
                    width: 130
                },
                {
                    dataField: "plannedFinishDate",
                    caption: "Finish",
                    dataType: "date",
                    format: "dd.MM.yyyy",
                    width: 130
                },
                {
                    dataField: "isValid",
                    caption: "Статус валидации",
                    width: 160,
                    calculateCellValue: function (row) {
                        return row && row.isValid ? "Валидна" : "Требует проверки";
                    }
                }
            ],
            onToolbarPreparing: function (e) {
                e.toolbarOptions.items.push({
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "plus",
                        text: "Сформировать заявку на закупку",
                        onClick: function () {
                            const selectedRows = gridInstance && typeof gridInstance.getSelectedRowsData === "function"
                                ? gridInstance.getSelectedRowsData()
                                : [];
                            if (onCreateProcurementRequest) {
                                onCreateProcurementRequest(selectedRows);
                            }
                        }
                    }
                });
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
                setStatus(e.error?.message ?? "Ошибка загрузки данных Express.", true);
            }
        }).dxDataGrid("instance");

        return gridInstance;
    }

    const exportsObject = {
        createGrid: createGrid,
        createSourceDataGrid: createSourceDataGrid
    };

    if (typeof window !== "undefined") {
        window.ProjectsGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
