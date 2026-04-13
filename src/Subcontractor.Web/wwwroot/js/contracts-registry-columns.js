"use strict";

(function () {
    function createFormItems() {
        return [
            "contractNumber",
            "lotId",
            "procedureId",
            "contractorId",
            "signingDate",
            "amountWithoutVat",
            "vatAmount",
            "totalAmount",
            "startDate",
            "endDate"
        ];
    }

    function createColumns(statusLookup) {
        const lookup = Array.isArray(statusLookup) ? statusLookup : [];

        return [
            {
                dataField: "id",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "contractNumber",
                caption: "Номер договора",
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "status",
                caption: "Статус",
                lookup: {
                    dataSource: lookup,
                    valueExpr: "value",
                    displayExpr: "text"
                },
                allowEditing: false,
                width: 150
            },
            {
                dataField: "lotId",
                caption: "Идентификатор лота",
                width: 230,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "procedureId",
                caption: "Идентификатор процедуры",
                width: 230,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "contractorId",
                caption: "Идентификатор подрядчика",
                width: 230,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "contractorName",
                caption: "Наименование подрядчика",
                allowEditing: false,
                width: 220
            },
            {
                dataField: "signingDate",
                caption: "Дата подписания",
                dataType: "date",
                width: 140
            },
            {
                dataField: "amountWithoutVat",
                caption: "Сумма без НДС",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 150
            },
            {
                dataField: "vatAmount",
                caption: "НДС",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 120
            },
            {
                dataField: "totalAmount",
                caption: "Итого",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 140
            },
            {
                dataField: "startDate",
                caption: "Дата начала",
                dataType: "date",
                width: 130
            },
            {
                dataField: "endDate",
                caption: "Дата окончания",
                dataType: "date",
                width: 130
            }
        ];
    }

    const exportsObject = {
        createFormItems: createFormItems,
        createColumns: createColumns
    };

    if (typeof window !== "undefined") {
        window.ContractsRegistryColumns = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
