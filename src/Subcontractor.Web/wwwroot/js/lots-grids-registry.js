"use strict";

(function () {
    const LOTS_FORM_ITEMS = ["code", "name", "responsibleCommercialUserId"];

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsGridsRegistry requires ${name}.`);
        }
    }

    function requireArray(value, name) {
        if (!Array.isArray(value)) {
            throw new Error(`LotsGridsRegistry requires ${name} array.`);
        }

        return value;
    }

    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const element = settings.element;
        const store = settings.store;
        const statusLookup = settings.statusLookup;
        const onSelectionChanged = settings.onSelectionChanged;
        const onDataErrorOccurred = settings.onDataErrorOccurred;

        requireFunction(jQueryImpl, "jQueryImpl");
        requireFunction(onSelectionChanged, "onSelectionChanged");
        requireFunction(onDataErrorOccurred, "onDataErrorOccurred");

        if (!element) {
            throw new Error("LotsGridsRegistry requires element.");
        }

        if (!store) {
            throw new Error("LotsGridsRegistry requires store.");
        }

        const normalizedStatusLookup = requireArray(statusLookup, "statusLookup");

        let lotsGridInstance = null;
        lotsGridInstance = jQueryImpl(element).dxDataGrid({
            dataSource: store,
            keyExpr: "id",
            height: 560,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            renderAsync: true,
            focusedRowEnabled: true,
            selection: {
                mode: "single"
            },
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
                placeholder: "Поиск лотов..."
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
                    title: "Лот",
                    showTitle: true,
                    width: 640
                },
                form: {
                    colCount: 1,
                    items: LOTS_FORM_ITEMS
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
                        { type: "stringLength", max: 512 }
                    ]
                },
                {
                    dataField: "status",
                    caption: "Статус",
                    lookup: {
                        dataSource: normalizedStatusLookup,
                        valueExpr: "value",
                        displayExpr: "text"
                    },
                    allowEditing: false,
                    width: 180
                },
                {
                    dataField: "responsibleCommercialUserId",
                    caption: "ID ответственного пользователя"
                },
                {
                    dataField: "itemsCount",
                    caption: "Позиций",
                    allowEditing: false,
                    width: 90
                },
                {
                    dataField: "totalManHours",
                    caption: "Сумма чел.-ч",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    allowEditing: false,
                    width: 160
                }
            ],
            onEditorPreparing: function (e) {
                if (e.parentType === "dataRow" && e.dataField === "code" && e.row && !e.row.isNewRow) {
                    e.editorOptions.readOnly = true;
                }
            },
            onSelectionChanged: function (e) {
                const selected = Array.isArray(e.selectedRowsData) && e.selectedRowsData.length > 0
                    ? e.selectedRowsData[0]
                    : null;
                onSelectionChanged(selected);
            },
            onToolbarPreparing: function (e) {
                e.toolbarOptions.items.push({
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "refresh",
                        text: "Обновить",
                        onClick: function () {
                            if (lotsGridInstance && typeof lotsGridInstance.refresh === "function") {
                                lotsGridInstance.refresh();
                            }
                        }
                    }
                });
            },
            onDataErrorOccurred: function (e) {
                onDataErrorOccurred(e ? e.error : null);
            }
        }).dxDataGrid("instance");

        return lotsGridInstance;
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.LotsGridsRegistry = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
