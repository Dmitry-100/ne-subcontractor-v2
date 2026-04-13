"use strict";

(function () {
    function createColumns(options) {
        const settings = options || {};
        const statusLookup = Array.isArray(settings.statusLookup) ? settings.statusLookup : [];
        const approvalModeLookup = Array.isArray(settings.approvalModeLookup) ? settings.approvalModeLookup : [];

        const proceduresColumns = [
            {
                dataField: "id",
                visible: false,
                allowEditing: false
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
                dataField: "status",
                caption: "Статус",
                lookup: {
                    dataSource: statusLookup,
                    valueExpr: "value",
                    displayExpr: "text"
                },
                allowEditing: false,
                width: 170
            },
            {
                dataField: "purchaseTypeCode",
                caption: "Тип закупки",
                width: 130,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "objectName",
                caption: "Объект закупки",
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "workScope",
                caption: "Состав работ",
                visible: false
            },
            {
                dataField: "approvalMode",
                caption: "Режим согласования",
                lookup: {
                    dataSource: approvalModeLookup,
                    valueExpr: "value",
                    displayExpr: "text"
                },
                width: 140
            },
            {
                dataField: "requiredSubcontractorDeadline",
                caption: "Требуемый срок",
                dataType: "date",
                width: 160
            },
            {
                dataField: "proposalDueDate",
                caption: "Срок предложений",
                dataType: "date",
                visible: false
            },
            {
                dataField: "plannedBudgetWithoutVat",
                caption: "Бюджет (без НДС)",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 170
            },
            {
                dataField: "responsibleCommercialUserId",
                caption: "ID ответственного",
                visible: false
            },
            {
                dataField: "customerName",
                caption: "Заказчик",
                visible: false
            },
            {
                dataField: "leadOfficeCode",
                caption: "Ведущий офис",
                visible: false
            },
            {
                dataField: "analyticsLevel1Code",
                caption: "Аналитика L1",
                visible: false
            },
            {
                dataField: "analyticsLevel2Code",
                caption: "Аналитика L2",
                visible: false
            },
            {
                dataField: "analyticsLevel3Code",
                caption: "Аналитика L3",
                visible: false
            },
            {
                dataField: "analyticsLevel4Code",
                caption: "Аналитика L4",
                visible: false
            },
            {
                dataField: "analyticsLevel5Code",
                caption: "Аналитика L5",
                visible: false
            },
            {
                dataField: "notes",
                caption: "Примечания",
                visible: false
            },
            {
                dataField: "containsConfidentialInfo",
                caption: "Конфиденциально",
                dataType: "boolean",
                visible: false
            },
            {
                dataField: "requiresTechnicalNegotiations",
                caption: "Тех. переговоры",
                dataType: "boolean",
                visible: false
            }
        ];

        return {
            proceduresColumns: proceduresColumns
        };
    }

    const exportsObject = {
        createColumns: createColumns
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridColumnsRegistry = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
