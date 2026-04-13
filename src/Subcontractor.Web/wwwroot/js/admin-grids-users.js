"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`AdminGridsUsers requires ${name}.`);
        }
    }

    function requireArray(value, name) {
        if (!Array.isArray(value)) {
            throw new Error(`AdminGridsUsers requires ${name} array.`);
        }

        return value;
    }

    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        requireFunction(jQueryImpl, "jQueryImpl");

        const element = settings.element;
        if (!element) {
            throw new Error("AdminGridsUsers requires element.");
        }

        const usersStore = settings.usersStore;
        if (!usersStore) {
            throw new Error("AdminGridsUsers requires usersStore.");
        }

        const rolesDataSource = requireArray(settings.rolesDataSource, "rolesDataSource");
        const toStringList = settings.toStringList;
        const onUsersDataError = settings.onUsersDataError;
        requireFunction(toStringList, "toStringList");
        requireFunction(onUsersDataError, "onUsersDataError");

        let usersGridInstance = null;
        usersGridInstance = jQueryImpl(element).dxDataGrid({
            dataSource: usersStore,
            keyExpr: "id",
            height: 480,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            renderAsync: true,
            columnAutoWidth: true,
            repaintChangesOnly: true,
            remoteOperations: false,
            sorting: { mode: "multiple" },
            searchPanel: {
                visible: true,
                width: 280,
                placeholder: "Поиск среди загруженных пользователей..."
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
                allowAdding: false,
                allowUpdating: true,
                allowDeleting: false,
                useIcons: true,
                popup: {
                    title: "Роли пользователя",
                    showTitle: true,
                    width: 760
                },
                form: {
                    colCount: 2,
                    items: [
                        {
                            dataField: "login",
                            editorOptions: { readOnly: true }
                        },
                        {
                            dataField: "displayName",
                            editorOptions: { readOnly: true }
                        },
                        {
                            dataField: "email",
                            editorOptions: { readOnly: true }
                        },
                        {
                            dataField: "isActive",
                            editorType: "dxCheckBox"
                        },
                        {
                            dataField: "roles",
                            colSpan: 2,
                            editorType: "dxTagBox",
                            editorOptions: {
                                dataSource: rolesDataSource,
                                valueExpr: "name",
                                displayExpr: "name",
                                searchEnabled: true,
                                showSelectionControls: true,
                                showDropDownButton: true,
                                hideSelectedItems: false,
                                multiline: true,
                                applyValueMode: "useButtons",
                                placeholder: "Выберите роли..."
                            }
                        }
                    ]
                }
            },
            columns: [
                {
                    dataField: "id",
                    visible: false,
                    allowEditing: false
                },
                {
                    dataField: "login",
                    caption: "Логин",
                    width: 200
                },
                {
                    dataField: "displayName",
                    caption: "ФИО",
                    width: 220
                },
                {
                    dataField: "email",
                    caption: "Эл. почта",
                    width: 240
                },
                {
                    dataField: "isActive",
                    caption: "Активен",
                    dataType: "boolean",
                    width: 110
                },
                {
                    dataField: "roles",
                    caption: "Роли",
                    minWidth: 260,
                    customizeText: function (cellInfo) {
                        return toStringList(cellInfo.value).join(", ");
                    }
                }
            ],
            onEditorPreparing: function (e) {
                if (e.parentType !== "dataRow") {
                    return;
                }

                if (e.dataField === "login" || e.dataField === "displayName" || e.dataField === "email") {
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
                            if (usersGridInstance && typeof usersGridInstance.refresh === "function") {
                                usersGridInstance.refresh();
                            }
                        }
                    }
                });
            },
            onDataErrorOccurred: function (e) {
                onUsersDataError(e ? e.error : null);
            }
        }).dxDataGrid("instance");

        return usersGridInstance;
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.AdminGridsUsers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
