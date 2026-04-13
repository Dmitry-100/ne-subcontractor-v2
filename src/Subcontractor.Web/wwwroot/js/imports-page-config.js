"use strict";

(function () {
    function createConfig() {
        return {
            previewRowLimit: 200,
            maxImportRows: 10000,
            importStatusTransitions: {
                Validated: ["ReadyForLotting", "Rejected"],
                ValidatedWithErrors: ["Rejected"],
                ReadyForLotting: ["Rejected"],
                Rejected: [],
                Uploaded: [],
                Processing: [],
                Failed: []
            },
            importStatusLabels: {
                Uploaded: "Загружен",
                Processing: "Обрабатывается",
                Validated: "Проверен",
                ValidatedWithErrors: "Проверен с ошибками",
                ReadyForLotting: "Готов к лотированию",
                Rejected: "Отклонён",
                Failed: "Ошибка обработки"
            },
            fieldDefinitions: [
                {
                    key: "rowNumber",
                    label: "Номер строки",
                    required: false,
                    synonyms: ["rownumber", "row", "linenumber", "line"]
                },
                {
                    key: "projectCode",
                    label: "Код проекта",
                    required: true,
                    synonyms: ["projectcode", "project", "projectid"]
                },
                {
                    key: "objectWbs",
                    label: "Объект WBS",
                    required: true,
                    synonyms: ["objectwbs", "wbs", "object"]
                },
                {
                    key: "disciplineCode",
                    label: "Код дисциплины",
                    required: true,
                    synonyms: ["disciplinecode", "discipline", "disciplineid"]
                },
                {
                    key: "manHours",
                    label: "Трудозатраты (чел.-ч)",
                    required: true,
                    synonyms: ["manhours", "hours", "laborhours"]
                },
                {
                    key: "plannedStartDate",
                    label: "Плановая дата начала",
                    required: false,
                    synonyms: ["plannedstartdate", "startdate", "plannedstart", "start"]
                },
                {
                    key: "plannedFinishDate",
                    label: "Плановая дата окончания",
                    required: false,
                    synonyms: ["plannedfinishdate", "finishdate", "plannedfinish", "finish"]
                }
            ]
        };
    }

    const exportsObject = {
        createConfig: createConfig
    };

    if (typeof window !== "undefined") {
        window.ImportsPageConfig = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
