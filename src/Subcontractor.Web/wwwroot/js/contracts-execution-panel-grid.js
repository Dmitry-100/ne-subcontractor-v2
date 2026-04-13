"use strict";

(function () {
    function createFormItems() {
        return [
            "title",
            "sortOrder",
            "plannedDate",
            "actualDate",
            "progressPercent",
            {
                dataField: "notes",
                colSpan: 2,
                editorType: "dxTextArea",
                editorOptions: {
                    minHeight: 100
                }
            }
        ];
    }

    function createColumns() {
        return [
            {
                dataField: "id",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "title",
                caption: "Этап",
                validationRules: [
                    { type: "required" }
                ],
                minWidth: 260
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                dataField: "plannedDate",
                caption: "Плановая дата",
                dataType: "date",
                width: 140,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "actualDate",
                caption: "Фактическая дата",
                dataType: "date",
                width: 140
            },
            {
                dataField: "progressPercent",
                caption: "Прогресс %",
                dataType: "number",
                width: 120,
                format: {
                    type: "fixedPoint",
                    precision: 2
                }
            },
            {
                dataField: "isOverdue",
                caption: "Просрочен",
                dataType: "boolean",
                allowEditing: false,
                width: 110
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 220
            }
        ];
    }

    function createGridConfig() {
        return {
            dataSource: [],
            keyExpr: "id",
            height: 320,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            sorting: {
                mode: "multiple"
            },
            paging: {
                pageSize: 10
            },
            pager: {
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [10, 20, 40]
            },
            editing: {
                mode: "popup",
                allowAdding: false,
                allowUpdating: false,
                allowDeleting: false,
                useIcons: true,
                popup: {
                    title: "Этап исполнения",
                    showTitle: true,
                    width: 720
                },
                form: {
                    colCount: 2,
                    items: createFormItems()
                }
            },
            columns: createColumns()
        };
    }

    const exportsObject = {
        createFormItems: createFormItems,
        createColumns: createColumns,
        createGridConfig: createGridConfig
    };

    if (typeof window !== "undefined") {
        window.ContractsExecutionPanelGrid = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
