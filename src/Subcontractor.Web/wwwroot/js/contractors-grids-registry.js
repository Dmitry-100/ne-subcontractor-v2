"use strict";

(function () {
    function createGrid(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const helpers = settings.helpers;
        const element = settings.element;
        const onContractorSelectionChanged = settings.onContractorSelectionChanged;

        if (typeof jQueryImpl !== "function") {
            throw new Error("ContractorsGridsRegistry requires jQueryImpl.");
        }

        if (!helpers) {
            throw new Error("ContractorsGridsRegistry requires helpers.");
        }

        if (!element) {
            throw new Error("ContractorsGridsRegistry requires element.");
        }

        if (typeof onContractorSelectionChanged !== "function") {
            throw new Error("ContractorsGridsRegistry requires onContractorSelectionChanged callback.");
        }

        return jQueryImpl(element).dxDataGrid({
            dataSource: [],
            keyExpr: "id",
            height: 520,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            focusedRowEnabled: true,
            selection: {
                mode: "single"
            },
            columnAutoWidth: true,
            remoteOperations: {
                paging: true
            },
            sorting: {
                mode: "multiple"
            },
            searchPanel: {
                visible: true,
                width: 280,
                placeholder: "Поиск подрядчиков..."
            },
            filterRow: {
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
                mode: "row",
                allowAdding: false,
                allowUpdating: false,
                allowDeleting: false
            },
            columns: [
                {
                    dataField: "inn",
                    caption: "ИНН",
                    width: 130
                },
                {
                    dataField: "name",
                    caption: "Подрядчик",
                    minWidth: 220
                },
                {
                    dataField: "city",
                    caption: "Город",
                    width: 140
                },
                {
                    dataField: "status",
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
                    caption: "Текущий рейтинг",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 3
                    },
                    width: 140
                },
                {
                    dataField: "currentLoadPercent",
                    caption: "Загрузка, %",
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    },
                    width: 130
                }
            ],
            onSelectionChanged: function (event) {
                const selected = Array.isArray(event.selectedRowsData) && event.selectedRowsData.length > 0
                    ? event.selectedRowsData[0]
                    : null;
                onContractorSelectionChanged(selected);
            }
        }).dxDataGrid("instance");
    }

    const exportsObject = {
        createGrid: createGrid
    };

    if (typeof window !== "undefined") {
        window.ContractorsGridsRegistry = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
