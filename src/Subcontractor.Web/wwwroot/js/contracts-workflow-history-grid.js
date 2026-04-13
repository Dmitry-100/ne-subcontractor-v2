"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsWorkflowHistoryGrid requires ${name}.`);
        }
    }

    function createColumns(localizeStatus) {
        requireFunction(localizeStatus, "localizeStatus");

        return [
            {
                dataField: "id",
                visible: false
            },
            {
                dataField: "fromStatus",
                caption: "Из статуса",
                width: 150,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "toStatus",
                caption: "В статус",
                width: 150,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "reason",
                caption: "Причина",
                minWidth: 260
            },
            {
                dataField: "changedBy",
                caption: "Кто изменил",
                width: 160
            },
            {
                dataField: "changedAtUtc",
                caption: "Дата изменения (UTC)",
                dataType: "datetime",
                width: 200
            }
        ];
    }

    function createGridConfig(localizeStatus) {
        return {
            dataSource: [],
            keyExpr: "id",
            height: 260,
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
            columns: createColumns(localizeStatus)
        };
    }

    const exportsObject = {
        createColumns: createColumns,
        createGridConfig: createGridConfig
    };

    if (typeof window !== "undefined") {
        window.ContractsWorkflowHistoryGrid = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
