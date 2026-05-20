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
                    synonyms: ["rownumber", "row", "linenumber", "line", "строка", "номерстроки"]
                },
                {
                    key: "projectCode",
                    label: "Код проекта",
                    required: true,
                    synonyms: ["проектномер", "кодпроекта", "номерпроекта", "projectcode", "projectid"]
                },
                {
                    key: "complexProjectName",
                    label: "Комплекс/проект",
                    required: false,
                    synonyms: ["комплекспроект", "complexproject", "complexprojectname"]
                },
                {
                    key: "projectName",
                    label: "Проект",
                    required: false,
                    synonyms: ["проект", "projectname", "project"]
                },
                {
                    key: "objectWbs",
                    label: "Объект WBS",
                    required: true,
                    synonyms: ["объект", "objectwbs", "wbs", "object"]
                },
                {
                    key: "disciplineCode",
                    label: "Проектная дисциплина",
                    required: false,
                    synonyms: ["проектнаядисциплина", "столбец1", "disciplinecode", "discipline", "disciplineid"]
                },
                {
                    key: "resourceDisciplineName",
                    label: "Дисциплина-ресурс",
                    required: false,
                    synonyms: ["дисциплинаресурс", "ресурснаядисциплина", "resourcediscipline", "resourcedisciplinename"]
                },
                {
                    key: "branchOfficeName",
                    label: "Филиал-исполнитель",
                    required: false,
                    synonyms: ["филиалисп", "филиалисполнитель", "branch", "branchoffice"]
                },
                {
                    key: "gipName",
                    label: "ГИП",
                    required: false,
                    synonyms: ["гип", "gip", "chiefprojectengineer"]
                },
                {
                    key: "manHours",
                    label: "Трудозатраты (чел.-ч)",
                    required: true,
                    synonyms: ["загрничелчас", "загрузкачелчас", "челчас", "manhours", "hours", "laborhours"]
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
