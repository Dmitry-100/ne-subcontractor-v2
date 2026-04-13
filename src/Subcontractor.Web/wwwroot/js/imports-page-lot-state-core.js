"use strict";

(function () {
    const statusHelpersRoot =
        typeof window !== "undefined" && window.ImportsPageLotStateStatuses
            ? window.ImportsPageLotStateStatuses
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-lot-state-statuses.js")
                : null;
    const selectionHelpersRoot =
        typeof window !== "undefined" && window.ImportsPageLotStateSelectionHelpers
            ? window.ImportsPageLotStateSelectionHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-lot-state-selection-helpers.js")
                : null;

    if (!statusHelpersRoot ||
        typeof statusHelpersRoot.buildRecommendationsStatus !== "function" ||
        typeof statusHelpersRoot.buildApplySummary !== "function" ||
        typeof statusHelpersRoot.buildSelectedGroupsStatus !== "function") {
        throw new Error("ImportsPageLotStateCore requires ImportsPageLotStateStatuses helpers.");
    }

    if (!selectionHelpersRoot ||
        typeof selectionHelpersRoot.getRecommendationGroups !== "function" ||
        typeof selectionHelpersRoot.getSelectedRecommendationGroups !== "function" ||
        typeof selectionHelpersRoot.buildSelectionMap !== "function" ||
        typeof selectionHelpersRoot.buildLotApplyPayload !== "function" ||
        typeof selectionHelpersRoot.setGroupSelected !== "function" ||
        typeof selectionHelpersRoot.setGroupLotCode !== "function" ||
        typeof selectionHelpersRoot.setGroupLotName !== "function") {
        throw new Error("ImportsPageLotStateCore requires ImportsPageLotStateSelectionHelpers.");
    }

    function resolveActionState(args) {
        const options = args || {};
        const hasSelectedBatch = Boolean(options.selectedBatchId);
        const selectedCount = Number(options.selectedCount || 0);
        const canApply =
            hasSelectedBatch &&
            options.recommendationsBatchId === options.selectedBatchId &&
            Boolean(options.recommendations?.canApply) &&
            selectedCount > 0;

        return {
            canBuild: hasSelectedBatch,
            canApply: canApply
        };
    }

    function validateBuildRecommendationsRequest(selectedBatchId) {
        if (!selectedBatchId) {
            throw new Error("Сначала выберите пакет импорта.");
        }
    }

    function shouldResetRecommendations(args) {
        const options = args || {};
        const recommendations = options.recommendations;
        return !recommendations ||
            options.recommendationsBatchId !== options.currentBatchId ||
            options.previousBatchId !== options.currentBatchId ||
            String(recommendations.batchStatus || "") !== String(options.currentBatchStatus || "");
    }

    function validateApplyRecommendationsRequest(args) {
        const options = args || {};
        const selectedBatchId = options.selectedBatchId || null;
        const recommendationsBatchId = options.recommendationsBatchId || null;
        const recommendations = options.recommendations || null;

        if (!selectedBatchId) {
            throw new Error("Сначала выберите пакет импорта.");
        }

        if (!recommendations || recommendationsBatchId !== selectedBatchId) {
            throw new Error("Перед созданием лотов сначала постройте рекомендации.");
        }

        if (!recommendations.canApply) {
            throw new Error(String(recommendations.note || "Пакет не готов к созданию лотов."));
        }
    }

    const exportsObject = {
        getRecommendationGroups: selectionHelpersRoot.getRecommendationGroups,
        getSelectedRecommendationGroups: selectionHelpersRoot.getSelectedRecommendationGroups,
        buildSelectionMap: selectionHelpersRoot.buildSelectionMap,
        resolveActionState: resolveActionState,
        validateBuildRecommendationsRequest: validateBuildRecommendationsRequest,
        shouldResetRecommendations: shouldResetRecommendations,
        buildRecommendationsStatus: statusHelpersRoot.buildRecommendationsStatus,
        validateApplyRecommendationsRequest: validateApplyRecommendationsRequest,
        buildLotApplyPayload: selectionHelpersRoot.buildLotApplyPayload,
        buildApplySummary: statusHelpersRoot.buildApplySummary,
        setGroupSelected: selectionHelpersRoot.setGroupSelected,
        setGroupLotCode: selectionHelpersRoot.setGroupLotCode,
        setGroupLotName: selectionHelpersRoot.setGroupLotName,
        buildSelectedGroupsStatus: statusHelpersRoot.buildSelectedGroupsStatus
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotStateCore = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
