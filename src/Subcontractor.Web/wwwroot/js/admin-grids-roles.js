"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`AdminGridsRoles requires ${name}.`);
        }
    }

    function requireArray(value, name) {
        if (!Array.isArray(value)) {
            throw new Error(`AdminGridsRoles requires ${name} array.`);
        }

        return value;
    }

    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        requireFunction(jQueryImpl, "jQueryImpl");

        const element = settings.element;
        if (!element) {
            throw new Error("AdminGridsRoles requires element.");
        }

        const rolesDataSource = requireArray(settings.rolesDataSource, "rolesDataSource");

        return jQueryImpl(element).dxDataGrid({
            dataSource: rolesDataSource,
            keyExpr: "id",
            height: 260,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            sorting: { mode: "multiple" },
            filterRow: { visible: true },
            paging: { pageSize: 10 },
            pager: {
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [10, 20, 40]
            },
            columns: [
                {
                    dataField: "id",
                    caption: "Идентификатор",
                    visible: false
                },
                {
                    dataField: "name",
                    caption: "Наименование роли",
                    width: 220
                },
                {
                    dataField: "description",
                    caption: "Описание",
                    minWidth: 380
                }
            ]
        }).dxDataGrid("instance");
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.AdminGridsRoles = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
