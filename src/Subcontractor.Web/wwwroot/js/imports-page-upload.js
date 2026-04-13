"use strict";

(function () {
    function createUploadHelpers() {
        function buildQueuedBatchRequest(args) {
            const options = args || {};
            const parsedRows = Array.isArray(options.parsedRows) ? options.parsedRows : [];
            if (parsedRows.length === 0) {
                throw new Error("Нет разобранных строк для загрузки.");
            }

            const sourceFileName = String(options.sourceFileName || "").trim() || "source-data.csv";
            const notes = String(options.notes || "").trim() || null;

            return {
                fileName: sourceFileName,
                notes: notes,
                rows: parsedRows.map(function (row) {
                    return {
                        rowNumber: row.rowNumber,
                        projectCode: row.projectCode,
                        objectWbs: row.objectWbs,
                        disciplineCode: row.disciplineCode,
                        manHours: row.manHours,
                        plannedStartDate: row.plannedStartDate,
                        plannedFinishDate: row.plannedFinishDate
                    };
                })
            };
        }

        function buildQueuedBatchSuccessStatus(created) {
            const source = created || {};
            return `Пакет поставлен в очередь: ${source.id}. Статус: ${source.status}. Валидация будет выполнена асинхронно.`;
        }

        return {
            buildQueuedBatchRequest: buildQueuedBatchRequest,
            buildQueuedBatchSuccessStatus: buildQueuedBatchSuccessStatus
        };
    }

    const exportsObject = {
        createUploadHelpers: createUploadHelpers
    };

    if (typeof window !== "undefined") {
        window.ImportsPageUpload = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
