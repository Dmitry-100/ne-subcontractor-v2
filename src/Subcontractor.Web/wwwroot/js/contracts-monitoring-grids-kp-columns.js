"use strict";

(function () {
    function createControlPointsColumns() {
        return [
            {
                dataField: "clientId",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "name",
                caption: "Контрольная точка",
                validationRules: [
                    { type: "required" }
                ],
                minWidth: 220
            },
            {
                dataField: "responsibleRole",
                caption: "Ответственный",
                width: 140
            },
            {
                dataField: "plannedDate",
                caption: "План",
                dataType: "date",
                width: 120,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "forecastDate",
                caption: "Прогноз",
                dataType: "date",
                width: 120
            },
            {
                dataField: "actualDate",
                caption: "Факт",
                dataType: "date",
                width: 120
            },
            {
                dataField: "progressPercent",
                caption: "Прогресс %",
                dataType: "number",
                width: 120,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                validationRules: [
                    {
                        type: "range",
                        min: 0,
                        max: 100
                    }
                ]
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                caption: "Этапов",
                dataType: "number",
                allowEditing: false,
                width: 90,
                calculateCellValue: function (rowData) {
                    return Array.isArray(rowData?.stages) ? rowData.stages.length : 0;
                }
            },
            {
                dataField: "isDelayed",
                caption: "Просрочена",
                dataType: "boolean",
                allowEditing: false,
                width: 110
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 180
            }
        ];
    }

    function createStagesColumns() {
        return [
            {
                dataField: "clientId",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "name",
                caption: "Этап",
                validationRules: [
                    { type: "required" }
                ],
                minWidth: 220
            },
            {
                dataField: "plannedDate",
                caption: "План",
                dataType: "date",
                width: 120,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "forecastDate",
                caption: "Прогноз",
                dataType: "date",
                width: 120
            },
            {
                dataField: "actualDate",
                caption: "Факт",
                dataType: "date",
                width: 120
            },
            {
                dataField: "progressPercent",
                caption: "Прогресс %",
                dataType: "number",
                width: 120,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                validationRules: [
                    {
                        type: "range",
                        min: 0,
                        max: 100
                    }
                ]
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                dataField: "isDelayed",
                caption: "Просрочен",
                dataType: "boolean",
                allowEditing: false,
                width: 110
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 180
            }
        ];
    }

    const exportsObject = {
        createControlPointsColumns: createControlPointsColumns,
        createStagesColumns: createStagesColumns
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringKpGridColumns = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
