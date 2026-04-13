"use strict";

(function () {
    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const helpers = settings.helpers;
        const element = settings.element;

        if (typeof jQueryImpl !== "function") {
            throw new Error("ContractorsGridsHistory requires jQueryImpl.");
        }

        if (!helpers) {
            throw new Error("ContractorsGridsHistory requires helpers.");
        }

        if (!element) {
            throw new Error("ContractorsGridsHistory requires element.");
        }

        return jQueryImpl(element).dxDataGrid({
            dataSource: [],
            height: 320,
            showBorders: true,
            rowAlternationEnabled: true,
            columnAutoWidth: true,
            paging: {
                pageSize: 8
            },
            pager: {
                showInfo: true
            },
            columns: [
                {
                    dataField: "calculatedAtUtc",
                    caption: "Дата расчёта (UTC)",
                    dataType: "datetime",
                    format: "yyyy-MM-dd HH:mm",
                    sortOrder: "desc",
                    width: 170
                },
                {
                    dataField: "modelVersionCode",
                    caption: "Версия модели",
                    width: 130
                },
                {
                    dataField: "sourceType",
                    caption: "Источник",
                    width: 150,
                    customizeText: function (cellInfo) {
                        return helpers.localizeSource(cellInfo.value);
                    }
                },
                {
                    dataField: "deliveryDisciplineScore",
                    caption: "Исполнение",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    width: 100
                },
                {
                    dataField: "commercialDisciplineScore",
                    caption: "Коммерция",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    width: 100
                },
                {
                    dataField: "claimDisciplineScore",
                    caption: "Претензии",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    width: 100
                },
                {
                    dataField: "manualExpertScore",
                    caption: "Эксперт",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    width: 90
                },
                {
                    dataField: "workloadPenaltyScore",
                    caption: "Загрузка",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    width: 90
                },
                {
                    dataField: "finalScore",
                    caption: "Итог (0..100)",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 3
                    },
                    width: 120
                },
                {
                    dataField: "createdBy",
                    caption: "Кто запустил",
                    width: 140
                },
                {
                    dataField: "notes",
                    caption: "Комментарий",
                    minWidth: 220
                }
            ]
        }).dxDataGrid("instance");
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.ContractorsGridsHistory = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
