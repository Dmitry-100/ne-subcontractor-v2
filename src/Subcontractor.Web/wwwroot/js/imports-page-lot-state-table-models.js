"use strict";

(function () {
    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль imports lot state table models: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    const coreModule = resolveModule(
        "ImportsPageLotStateCore",
        "./imports-page-lot-state-core.js",
        ["getRecommendationGroups", "getSelectedRecommendationGroups"]);

    function asFormatter(formatter) {
        return typeof formatter === "function"
            ? formatter
            : function (value) { return String(value ?? ""); };
    }

    function buildLotGroupsTableModel(args) {
        const options = args || {};
        const formatNumber = asFormatter(options.formatNumber);
        const formatDateRange = asFormatter(options.formatDateRange);
        const groups = coreModule.getRecommendationGroups(options.recommendations);
        const selections = options.selectionsByKey instanceof Map ? options.selectionsByKey : new Map();

        if (groups.length === 0) {
            return {
                headers: [],
                rows: [],
                emptyMessage: "Постройте рекомендации, чтобы увидеть сгруппированные кандидаты.",
                emptyColSpan: 8
            };
        }

        return {
            headers: [
                "Выбрать",
                "Проект",
                "Дисциплина",
                "Строк",
                "Трудозатраты",
                "Период",
                "Рекоменд. код",
                "Рекоменд. наименование"
            ],
            rows: groups.map(function (group) {
                const selection = selections.get(group.groupKey);
                return {
                    groupKey: group.groupKey,
                    checked: !selection || selection.selected,
                    cells: [
                        group.projectCode,
                        group.disciplineCode,
                        group.rowsCount,
                        formatNumber(group.totalManHours),
                        formatDateRange(group.plannedStartDate, group.plannedFinishDate),
                        group.suggestedLotCode,
                        group.suggestedLotName
                    ]
                };
            })
        };
    }

    function buildLotSelectedTableModel(args) {
        const options = args || {};
        const formatNumber = asFormatter(options.formatNumber);
        const selectedEntries = coreModule.getSelectedRecommendationGroups(
            options.recommendations,
            options.selectionsByKey);

        if (selectedEntries.length === 0) {
            return {
                headers: [],
                rows: [],
                emptyMessage: "Выберите группы в левой таблице, чтобы подготовить черновые лоты.",
                emptyColSpan: 5
            };
        }

        return {
            headers: ["Группа", "Строк", "Трудозатраты", "Код лота", "Наименование лота"],
            rows: selectedEntries
                .filter(function (entry) {
                    return Boolean(entry.selection);
                })
                .map(function (entry) {
                    const group = entry.group;
                    const selection = entry.selection;
                    return {
                        groupKey: group.groupKey,
                        groupLabel: `${group.projectCode} / ${group.disciplineCode}`,
                        rowsCount: group.rowsCount,
                        totalManHours: formatNumber(group.totalManHours),
                        lotCode: selection.lotCode,
                        lotName: selection.lotName
                    };
                })
        };
    }

    const exportsObject = {
        buildLotGroupsTableModel: buildLotGroupsTableModel,
        buildLotSelectedTableModel: buildLotSelectedTableModel
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotStateTableModels = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
