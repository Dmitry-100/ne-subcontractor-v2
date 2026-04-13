"use strict";

(function () {
    function toDateTimeRu(value) {
        if (!value) {
            return "";
        }

        return new Date(value).toLocaleString("ru-RU");
    }

    function toArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function buildPreviewModel(rows, previewRowLimit) {
        const items = toArray(rows);
        const limit = Number.isInteger(previewRowLimit) && previewRowLimit > 0
            ? previewRowLimit
            : items.length;

        return {
            headers: [
                "Строка",
                "Код проекта",
                "Объект WBS",
                "Код дисциплины",
                "Трудозатраты",
                "План. начало",
                "План. окончание",
                "Локальная валидация"
            ],
            rows: items.slice(0, limit).map(function (row) {
                return {
                    rowClassName: row.isLocallyValid ? "" : "imports-row--invalid",
                    cells: [
                        row.rowNumber,
                        row.projectCode,
                        row.objectWbs,
                        row.disciplineCode,
                        row.manHours,
                        row.plannedStartDate || "",
                        row.plannedFinishDate || "",
                        row.localValidationMessage || "ОК"
                    ]
                };
            })
        };
    }

    function buildBatchesModel(items, localizeImportStatus) {
        const source = toArray(items);
        const model = {
            headers: ["Создан", "Файл", "Статус", "Строк", "Валидных", "Невалидных", "Кем", "Действия"],
            rows: []
        };

        if (source.length === 0) {
            return {
                ...model,
                emptyMessage: "Пакеты импорта не найдены.",
                emptyColSpan: 8
            };
        }

        model.rows = source.map(function (item) {
            return {
                cells: [
                    toDateTimeRu(item.createdAtUtc),
                    item.fileName,
                    localizeImportStatus(item.status),
                    item.totalRows,
                    item.validRows,
                    item.invalidRows,
                    item.createdBy || ""
                ],
                batchId: item.id
            };
        });

        return model;
    }

    function buildInvalidRowsModel(details) {
        const invalidRows = toArray(details?.rows).filter(function (row) {
            return !row.isValid;
        });

        if (invalidRows.length === 0) {
            return {
                visible: false,
                headers: [],
                rows: []
            };
        }

        return {
            visible: true,
            headers: [
                "Строка",
                "Код проекта",
                "Объект WBS",
                "Код дисциплины",
                "Трудозатраты",
                "Сообщение валидации"
            ],
            rows: invalidRows.map(function (row) {
                return {
                    cells: [
                        row.rowNumber,
                        row.projectCode,
                        row.objectWbs,
                        row.disciplineCode,
                        row.manHours,
                        row.validationMessage || ""
                    ]
                };
            })
        };
    }

    function buildHistoryModel(items, localizeImportStatus) {
        const rows = toArray(items);
        if (rows.length === 0) {
            return {
                visible: false,
                headers: [],
                rows: []
            };
        }

        return {
            visible: true,
            headers: ["Изменено", "Из", "В", "Причина", "Кем"],
            rows: rows.map(function (item) {
                return {
                    cells: [
                        toDateTimeRu(item.changedAtUtc),
                        item.fromStatus ? localizeImportStatus(item.fromStatus) : "",
                        localizeImportStatus(item.toStatus),
                        item.reason || "",
                        item.changedBy || ""
                    ]
                };
            })
        };
    }

    function buildXmlInboxModel(items, localizeImportStatus) {
        const rows = toArray(items);
        const model = {
            headers: ["Создан", "Источник", "Файл", "Статус", "Пакет", "Ошибка", "Действия"],
            rows: []
        };

        if (rows.length === 0) {
            return {
                ...model,
                emptyMessage: "Элементы XML-очереди не найдены.",
                emptyColSpan: 7
            };
        }

        model.rows = rows.map(function (item) {
            return {
                cells: [
                    toDateTimeRu(item.createdAtUtc),
                    item.sourceSystem || "",
                    item.fileName || "",
                    localizeImportStatus(item.status),
                    item.sourceDataImportBatchId || "",
                    item.errorMessage || ""
                ],
                viewBatchId: item.sourceDataImportBatchId || null,
                retryId: item.status === "Failed" ? item.id : null
            };
        });

        return model;
    }

    const exportsObject = {
        buildPreviewModel: buildPreviewModel,
        buildBatchesModel: buildBatchesModel,
        buildInvalidRowsModel: buildInvalidRowsModel,
        buildHistoryModel: buildHistoryModel,
        buildXmlInboxModel: buildXmlInboxModel
    };

    if (typeof window !== "undefined") {
        window.ImportsPageTableModelsBuilders = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
