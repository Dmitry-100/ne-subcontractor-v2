"use strict";

(function () {
    function defaultLocalizer(value) {
        return value ?? "";
    }

    function createColumns(options) {
        const settings = options || {};
        const localizeStatus = typeof settings.localizeStatus === "function"
            ? settings.localizeStatus
            : defaultLocalizer;

        const historyColumns = [
            {
                dataField: "fromStatus",
                caption: "Из статуса",
                width: 190,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "toStatus",
                caption: "В статус",
                width: 190,
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
                caption: "Кто изменил",
                width: 200
            },
            {
                dataField: "changedAtUtc",
                caption: "Дата изменения (UTC)",
                dataType: "datetime",
                format: "yyyy-MM-dd HH:mm",
                sortOrder: "desc",
                width: 180
            }
        ];

        return {
            historyColumns: historyColumns
        };
    }

    const exportsObject = {
        createColumns: createColumns
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridColumnsHistory = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
