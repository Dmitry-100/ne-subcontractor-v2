"use strict";

(function () {
    function hasFunctions(source, names) {
        return Boolean(source) && names.every(function (name) {
            return typeof source[name] === "function";
        });
    }

    function validateSettings(options) {
        const settings = options || {};
        const requiredLotStateMethods = [
            "getRecommendationGroups",
            "getSelectedRecommendationGroups",
            "resolveActionState",
            "buildSelectionMap",
            "validateBuildRecommendationsRequest",
            "buildRecommendationsStatus",
            "validateApplyRecommendationsRequest",
            "buildLotApplyPayload",
            "buildApplySummary",
            "setGroupSelected",
            "setGroupLotCode",
            "setGroupLotName",
            "buildSelectedGroupsStatus"
        ];

        if (!hasFunctions(settings.lotState, requiredLotStateMethods)) {
            throw new Error("createLotOrchestrationService: lotState is required.");
        }

        if (!hasFunctions(settings.apiClient, ["getLotRecommendations", "applyLotRecommendations"])) {
            throw new Error("createLotOrchestrationService: apiClient is required.");
        }

        if (!settings.lotRecommendationsEndpoint || typeof settings.lotRecommendationsEndpoint !== "string") {
            throw new Error("createLotOrchestrationService: lotRecommendationsEndpoint is required.");
        }

        if (!hasFunctions(settings, [
            "getSelectedBatchId",
            "getRecommendations",
            "setRecommendations",
            "getRecommendationsBatchId",
            "setRecommendationsBatchId",
            "getSelectionsByKey",
            "setSelectionsByKey"
        ])) {
            throw new Error("createLotOrchestrationService: state accessors are required.");
        }

        if (!hasFunctions(settings, [
            "renderLotGroupsTable",
            "renderLotSelectedTable",
            "setLotStatus",
            "setActionButtons"
        ])) {
            throw new Error("createLotOrchestrationService: callbacks are required.");
        }

        return settings;
    }

    const exportsObject = {
        validateSettings: validateSettings
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotOrchestrationValidation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
