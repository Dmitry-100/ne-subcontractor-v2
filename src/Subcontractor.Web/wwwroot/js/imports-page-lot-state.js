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
            throw new Error(`Не удалось загрузить модуль imports lot state: ${globalName}.`);
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
        [
            "getRecommendationGroups",
            "getSelectedRecommendationGroups",
            "buildSelectionMap",
            "resolveActionState",
            "validateBuildRecommendationsRequest",
            "shouldResetRecommendations",
            "buildRecommendationsStatus",
            "validateApplyRecommendationsRequest",
            "buildLotApplyPayload",
            "buildApplySummary",
            "setGroupSelected",
            "setGroupLotCode",
            "setGroupLotName",
            "buildSelectedGroupsStatus"
        ]);

    const tableModelsModule = resolveModule(
        "ImportsPageLotStateTableModels",
        "./imports-page-lot-state-table-models.js",
        ["buildLotGroupsTableModel", "buildLotSelectedTableModel"]);

    const exportsObject = {
        getRecommendationGroups: coreModule.getRecommendationGroups,
        getSelectedRecommendationGroups: coreModule.getSelectedRecommendationGroups,
        buildSelectionMap: coreModule.buildSelectionMap,
        resolveActionState: coreModule.resolveActionState,
        validateBuildRecommendationsRequest: coreModule.validateBuildRecommendationsRequest,
        shouldResetRecommendations: coreModule.shouldResetRecommendations,
        buildRecommendationsStatus: coreModule.buildRecommendationsStatus,
        validateApplyRecommendationsRequest: coreModule.validateApplyRecommendationsRequest,
        buildLotApplyPayload: coreModule.buildLotApplyPayload,
        buildApplySummary: coreModule.buildApplySummary,
        setGroupSelected: coreModule.setGroupSelected,
        setGroupLotCode: coreModule.setGroupLotCode,
        setGroupLotName: coreModule.setGroupLotName,
        buildSelectedGroupsStatus: coreModule.buildSelectedGroupsStatus,
        buildLotGroupsTableModel: tableModelsModule.buildLotGroupsTableModel,
        buildLotSelectedTableModel: tableModelsModule.buildLotSelectedTableModel
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotState = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
