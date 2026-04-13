"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsGridsHistory requires ${name}.`);
        }
    }

    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const element = settings.element;
        const localizeStatus = settings.localizeStatus;

        requireFunction(jQueryImpl, "jQueryImpl");
        requireFunction(localizeStatus, "localizeStatus");

        if (!element) {
            throw new Error("LotsGridsHistory requires element.");
        }

        return jQueryImpl(element).dxDataGrid({
            dataSource: [],
            height: 320,
            showBorders: true,
            rowAlternationEnabled: true,
            paging: {
                pageSize: 10
            },
            pager: {
                showInfo: true
            },
            columns: [
                {
                    dataField: "fromStatus",
                    caption: "Из",
                    width: 180,
                    customizeText: function (cellInfo) {
                        return localizeStatus(cellInfo.value);
                    }
                },
                {
                    dataField: "toStatus",
                    caption: "В",
                    width: 180,
                    customizeText: function (cellInfo) {
                        return localizeStatus(cellInfo.value);
                    }
                },
                {
                    dataField: "reason",
                    caption: "Причина"
                },
                {
                    dataField: "changedBy",
                    caption: "Кем изменено",
                    width: 190
                },
                {
                    dataField: "changedAtUtc",
                    caption: "Изменено (UTC)",
                    dataType: "datetime",
                    format: "yyyy-MM-dd HH:mm",
                    sortOrder: "desc",
                    width: 180
                }
            ]
        }).dxDataGrid("instance");
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.LotsGridsHistory = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
