"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`AdminGridsReference requires ${name}.`);
        }
    }

    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        requireFunction(jQueryImpl, "jQueryImpl");

        const element = settings.element;
        if (!element) {
            throw new Error("AdminGridsReference requires element.");
        }

        const referenceStore = settings.referenceStore;
        if (!referenceStore) {
            throw new Error("AdminGridsReference requires referenceStore.");
        }

        const onReferenceDataError = settings.onReferenceDataError;
        requireFunction(onReferenceDataError, "onReferenceDataError");

        let referenceGridInstance = null;
        referenceGridInstance = jQueryImpl(element).dxDataGrid({
            dataSource: referenceStore,
            keyExpr: "itemCode",
            height: 480,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            repaintChangesOnly: true,
            remoteOperations: false,
            sorting: { mode: "multiple" },
            searchPanel: {
                visible: true,
                width: 280,
                placeholder: "Поиск по коду или названию..."
            },
            filterRow: { visible: true },
            headerFilter: { visible: true },
            paging: { pageSize: 15 },
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
                    title: "Элемент справочника",
                    showTitle: true,
                    width: 680
                },
                form: {
                    colCount: 2,
                    items: [
                        "itemCode",
                        "displayName",
                        "sortOrder",
                        "isActive"
                    ]
                }
            },
            columns: [
                {
                    dataField: "typeCode",
                    caption: "Код типа",
                    allowEditing: false,
                    width: 160
                },
                {
                    dataField: "itemCode",
                    caption: "Код элемента",
                    width: 170,
                    validationRules: [
                        { type: "required" }
                    ]
                },
                {
                    dataField: "displayName",
                    caption: "Наименование",
                    minWidth: 280,
                    validationRules: [
                        { type: "required" }
                    ]
                },
                {
                    dataField: "sortOrder",
                    caption: "Порядок сортировки",
                    dataType: "number",
                    width: 140
                },
                {
                    dataField: "isActive",
                    caption: "Активен",
                    dataType: "boolean",
                    width: 110
                }
            ],
            onEditorPreparing: function (e) {
                if (e.parentType !== "dataRow") {
                    return;
                }

                if (e.dataField === "itemCode" && e.row && !e.row.isNewRow) {
                    e.editorOptions.readOnly = true;
                }
            },
            onToolbarPreparing: function (e) {
                e.toolbarOptions.items.push({
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "refresh",
                        text: "Обновить",
                        onClick: function () {
                            if (referenceGridInstance && typeof referenceGridInstance.refresh === "function") {
                                referenceGridInstance.refresh();
                            }
                        }
                    }
                });
            },
            onDataErrorOccurred: function (e) {
                onReferenceDataError(e ? e.error : null);
            }
        }).dxDataGrid("instance");

        return referenceGridInstance;
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.AdminGridsReference = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
