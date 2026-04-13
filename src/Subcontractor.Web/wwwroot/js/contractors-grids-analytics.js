"use strict";

(function () {
    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const helpers = settings.helpers;
        const element = settings.element;

        if (typeof jQueryImpl !== "function") {
            throw new Error("ContractorsGridsAnalytics requires jQueryImpl.");
        }

        if (!helpers) {
            throw new Error("ContractorsGridsAnalytics requires helpers.");
        }

        if (!element) {
            throw new Error("ContractorsGridsAnalytics requires element.");
        }

        return jQueryImpl(element).dxDataGrid({
            dataSource: [],
            keyExpr: "contractorId",
            height: 330,
            showBorders: true,
            rowAlternationEnabled: true,
            columnAutoWidth: true,
            sorting: {
                mode: "multiple"
            },
            searchPanel: {
                visible: true,
                width: 260,
                placeholder: "Поиск в аналитике..."
            },
            paging: {
                pageSize: 10
            },
            pager: {
                showInfo: true
            },
            columns: [
                {
                    dataField: "contractorName",
                    caption: "Подрядчик",
                    minWidth: 240
                },
                {
                    dataField: "contractorStatus",
                    caption: "Статус",
                    width: 120,
                    customizeText: function (cellInfo) {
                        return helpers.localizeContractorStatus(cellInfo.value);
                    }
                },
                {
                    dataField: "reliabilityClass",
                    caption: "Надёжность",
                    width: 130,
                    customizeText: function (cellInfo) {
                        return helpers.localizeReliability(cellInfo.value);
                    }
                },
                {
                    dataField: "currentRating",
                    caption: "Рейтинг",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 3
                    },
                    width: 110
                },
                {
                    dataField: "ratingDelta",
                    caption: "Дельта",
                    width: 100,
                    customizeText: function (cellInfo) {
                        return helpers.parseRatingDelta(cellInfo.value);
                    }
                },
                {
                    dataField: "currentLoadPercent",
                    caption: "Загрузка, %",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    width: 120
                },
                {
                    dataField: "modelVersionCode",
                    caption: "Модель",
                    width: 110
                },
                {
                    dataField: "lastCalculatedAtUtc",
                    caption: "Последний расчёт",
                    width: 170,
                    calculateCellValue: function (rowData) {
                        return helpers.formatDateTime(rowData.lastCalculatedAtUtc);
                    }
                }
            ]
        }).dxDataGrid("instance");
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.ContractorsGridsAnalytics = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
