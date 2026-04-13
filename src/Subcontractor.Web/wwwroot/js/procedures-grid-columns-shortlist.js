"use strict";

(function () {
    function defaultLocalizer(value) {
        return value ?? "";
    }

    function resolveLocalizer(value, fallback) {
        return typeof value === "function" ? value : fallback;
    }

    function formatNullableValue(value) {
        return value === null || value === undefined ? "—" : String(value);
    }

    function joinValues(rowData, fieldName, separator) {
        const values = Array.isArray(rowData?.[fieldName]) ? rowData[fieldName] : [];
        return values.join(separator);
    }

    function createColumns(options) {
        const settings = options || {};
        const localizeContractorStatus = resolveLocalizer(settings.localizeContractorStatus, defaultLocalizer);
        const localizeReliabilityClass = resolveLocalizer(settings.localizeReliabilityClass, defaultLocalizer);
        const localizeBoolean = resolveLocalizer(settings.localizeBoolean, function (value) { return value ? "Да" : "Нет"; });

        const shortlistColumns = [
            {
                dataField: "contractorName",
                caption: "Субподрядчик",
                minWidth: 220
            },
            {
                dataField: "isRecommended",
                caption: "Рекомендован",
                dataType: "boolean",
                width: 130
            },
            {
                dataField: "suggestedSortOrder",
                caption: "Позиция",
                width: 95,
                customizeText: function (cellInfo) {
                    return formatNullableValue(cellInfo.value);
                }
            },
            {
                dataField: "score",
                caption: "Баллы",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 90
            },
            {
                dataField: "currentLoadPercent",
                caption: "Загрузка, %",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 1
                },
                width: 120
            },
            {
                dataField: "currentRating",
                caption: "Рейтинг",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 95
            },
            {
                dataField: "contractorStatus",
                caption: "Статус",
                width: 130,
                customizeText: function (cellInfo) {
                    return localizeContractorStatus(cellInfo.value);
                }
            },
            {
                dataField: "reliabilityClass",
                caption: "Надёжность",
                width: 140,
                customizeText: function (cellInfo) {
                    return localizeReliabilityClass(cellInfo.value);
                }
            },
            {
                dataField: "hasRequiredQualifications",
                caption: "Квалификация OK",
                dataType: "boolean",
                width: 145
            },
            {
                dataField: "missingDisciplineCodes",
                caption: "Отсутствуют дисциплины",
                minWidth: 180,
                calculateCellValue: function (rowData) {
                    return joinValues(rowData, "missingDisciplineCodes", ", ");
                }
            },
            {
                dataField: "decisionFactors",
                caption: "Факторы решения",
                minWidth: 320,
                calculateCellValue: function (rowData) {
                    return joinValues(rowData, "decisionFactors", " | ");
                }
            }
        ];

        const shortlistAdjustmentsColumns = [
            {
                dataField: "changedAtUtc",
                caption: "Дата изменения (UTC)",
                dataType: "datetime",
                format: "yyyy-MM-dd HH:mm",
                sortOrder: "desc",
                width: 175
            },
            {
                dataField: "contractorName",
                caption: "Субподрядчик",
                minWidth: 220
            },
            {
                dataField: "previousIsIncluded",
                caption: "Было включено",
                width: 120,
                customizeText: function (cellInfo) {
                    return cellInfo.value === null || cellInfo.value === undefined
                        ? formatNullableValue(cellInfo.value)
                        : localizeBoolean(Boolean(cellInfo.value));
                }
            },
            {
                dataField: "newIsIncluded",
                caption: "Стало включено",
                width: 130,
                customizeText: function (cellInfo) {
                    return localizeBoolean(Boolean(cellInfo.value));
                }
            },
            {
                dataField: "previousSortOrder",
                caption: "Старая позиция",
                width: 115,
                customizeText: function (cellInfo) {
                    return formatNullableValue(cellInfo.value);
                }
            },
            {
                dataField: "newSortOrder",
                caption: "Новая позиция",
                width: 115
            },
            {
                dataField: "previousExclusionReason",
                caption: "Старая причина исключения",
                minWidth: 200
            },
            {
                dataField: "newExclusionReason",
                caption: "Новая причина исключения",
                minWidth: 200
            },
            {
                dataField: "reason",
                caption: "Причина корректировки",
                minWidth: 230
            },
            {
                dataField: "changedBy",
                caption: "Кто изменил",
                width: 165
            }
        ];

        return { shortlistAdjustmentsColumns: shortlistAdjustmentsColumns, shortlistColumns: shortlistColumns };
    }

    const exportsObject = {
        createColumns: createColumns
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridColumnsShortlist = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
