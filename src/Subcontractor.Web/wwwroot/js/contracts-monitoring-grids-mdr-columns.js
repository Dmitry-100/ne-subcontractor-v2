"use strict";

(function () {
    const fixedPointFormat = { type: "fixedPoint", precision: 2 };
    const requiredValidationRules = [{ type: "required" }];
    const nonNegativeValidationRules = [{ type: "range", min: 0 }];

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsMonitoringMdrGridColumns requires ${name}.`);
        }
    }

    function createHiddenClientIdColumn() {
        return {
            dataField: "clientId",
            visible: false,
            allowEditing: false
        };
    }

    function createRequiredTextColumn(field, caption, width, minWidth) {
        const column = {
            dataField: field,
            caption: caption,
            validationRules: requiredValidationRules
        };

        if (typeof width === "number") {
            column.width = width;
        }

        if (typeof minWidth === "number") {
            column.minWidth = minWidth;
        }

        return column;
    }

    function createEditableNumberColumn(field, caption, width, rules) {
        return {
            dataField: field,
            caption: caption,
            dataType: "number",
            width: width,
            format: fixedPointFormat,
            validationRules: rules
        };
    }

    function createReadOnlyMetricColumn(caption, width, calculateCellValue) {
        return {
            caption: caption,
            dataType: "number",
            allowEditing: false,
            width: width,
            format: fixedPointFormat,
            calculateCellValue: calculateCellValue
        };
    }

    function createMdrCardsColumns(options) {
        const settings = options || {};
        const calculateMdrCardMetrics = settings.calculateMdrCardMetrics;
        requireFunction(calculateMdrCardMetrics, "calculateMdrCardMetrics");

        return [
            createHiddenClientIdColumn(),
            createRequiredTextColumn("title", "Карточка", null, 200),
            {
                dataField: "reportingDate",
                caption: "Отчётная дата",
                dataType: "date",
                width: 140,
                validationRules: requiredValidationRules
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                caption: "Строк",
                dataType: "number",
                allowEditing: false,
                width: 80,
                calculateCellValue: function (rowData) {
                    return Array.isArray(rowData?.rows) ? rowData.rows.length : 0;
                }
            },
            createReadOnlyMetricColumn("План", 110, function (rowData) {
                return calculateMdrCardMetrics(rowData).totalPlanValue;
            }),
            createReadOnlyMetricColumn("Прогноз", 120, function (rowData) {
                return calculateMdrCardMetrics(rowData).totalForecastValue;
            }),
            createReadOnlyMetricColumn("Факт", 110, function (rowData) {
                return calculateMdrCardMetrics(rowData).totalFactValue;
            }),
            createReadOnlyMetricColumn("Откл. прогноза, %", 150, function (rowData) {
                return calculateMdrCardMetrics(rowData).forecastDeviationPercent;
            }),
            createReadOnlyMetricColumn("Откл. факта, %", 130, function (rowData) {
                return calculateMdrCardMetrics(rowData).factDeviationPercent;
            }),
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 180
            }
        ];
    }

    function createMdrRowsColumns(options) {
        const settings = options || {};
        const calculateDeviationPercent = settings.calculateDeviationPercent;
        requireFunction(calculateDeviationPercent, "calculateDeviationPercent");

        return [
            createHiddenClientIdColumn(),
            createRequiredTextColumn("rowCode", "Код", 110),
            createRequiredTextColumn("description", "Описание", null, 220),
            createRequiredTextColumn("unitCode", "Ед.", 90),
            createEditableNumberColumn("planValue", "План", 110, nonNegativeValidationRules),
            createEditableNumberColumn("forecastValue", "Прогноз", 120, nonNegativeValidationRules),
            createEditableNumberColumn("factValue", "Факт", 110, nonNegativeValidationRules),
            createReadOnlyMetricColumn("Откл. прогноза, %", 150, function (rowData) {
                return calculateDeviationPercent(rowData?.planValue, rowData?.forecastValue);
            }),
            createReadOnlyMetricColumn("Откл. факта, %", 130, function (rowData) {
                return calculateDeviationPercent(rowData?.planValue, rowData?.factValue);
            }),
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 180
            }
        ];
    }

    const exportsObject = {
        createMdrCardsColumns: createMdrCardsColumns,
        createMdrRowsColumns: createMdrRowsColumns
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringMdrGridColumns = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
