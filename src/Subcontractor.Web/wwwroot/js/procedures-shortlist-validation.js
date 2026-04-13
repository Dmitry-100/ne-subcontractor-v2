"use strict";

(function () {
    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function isEventTarget(value) {
        return isNodeLike(value) && typeof value.addEventListener === "function";
    }

    function supportsValue(value) {
        return isNodeLike(value) && typeof value.value !== "undefined";
    }

    function supportsDisabled(value) {
        return isNodeLike(value) && typeof value.disabled !== "undefined";
    }

    function hasGridApi(value) {
        return isNodeLike(value) && typeof value.option === "function";
    }

    function validateAndNormalizeOptions(options) {
        const settings = options || {};

        const maxIncludedInput = settings.maxIncludedInput || null;
        const adjustmentReasonInput = settings.adjustmentReasonInput || null;
        const buildButton = settings.buildButton || null;
        const applyButton = settings.applyButton || null;
        const adjustmentsRefreshButton = settings.adjustmentsRefreshButton || null;
        const shortlistGrid = settings.shortlistGrid || null;
        const shortlistAdjustmentsGrid = settings.shortlistAdjustmentsGrid || null;

        const endpoint = settings.endpoint || "";
        const apiClient = settings.apiClient || null;
        const workflow = settings.workflow || null;
        const getSelectedProcedure = settings.getSelectedProcedure || null;
        const supportsShortlistWorkspace = settings.supportsShortlistWorkspace || null;
        const normalizeMaxIncluded = settings.normalizeMaxIncluded || null;
        const normalizeAdjustmentReason = settings.normalizeAdjustmentReason || null;
        const setShortlistStatus = settings.setShortlistStatus || null;
        const setShortlistAdjustmentsStatus = settings.setShortlistAdjustmentsStatus || null;

        if (!supportsValue(maxIncludedInput) ||
            !supportsDisabled(maxIncludedInput) ||
            !supportsValue(adjustmentReasonInput) ||
            !supportsDisabled(adjustmentReasonInput) ||
            !isEventTarget(buildButton) ||
            !supportsDisabled(buildButton) ||
            !isEventTarget(applyButton) ||
            !supportsDisabled(applyButton) ||
            !isEventTarget(adjustmentsRefreshButton) ||
            !supportsDisabled(adjustmentsRefreshButton) ||
            !hasGridApi(shortlistGrid) ||
            !hasGridApi(shortlistAdjustmentsGrid)) {
            throw new Error("createShortlistWorkspace: required controls are missing.");
        }

        if (!endpoint ||
            !apiClient ||
            typeof apiClient.getShortlistRecommendations !== "function" ||
            typeof apiClient.getShortlistAdjustments !== "function" ||
            typeof apiClient.applyShortlistRecommendations !== "function") {
            throw new Error("createShortlistWorkspace: api dependencies are invalid.");
        }

        if (!workflow ||
            typeof workflow.buildRecommendationsStatus !== "function" ||
            typeof workflow.buildApplyResultStatus !== "function") {
            throw new Error("createShortlistWorkspace: workflow dependency is invalid.");
        }

        if (typeof getSelectedProcedure !== "function" ||
            typeof supportsShortlistWorkspace !== "function" ||
            typeof normalizeMaxIncluded !== "function" ||
            typeof normalizeAdjustmentReason !== "function" ||
            typeof setShortlistStatus !== "function" ||
            typeof setShortlistAdjustmentsStatus !== "function") {
            throw new Error("createShortlistWorkspace: callbacks are required.");
        }

        return {
            maxIncludedInput: maxIncludedInput,
            adjustmentReasonInput: adjustmentReasonInput,
            buildButton: buildButton,
            applyButton: applyButton,
            adjustmentsRefreshButton: adjustmentsRefreshButton,
            shortlistGrid: shortlistGrid,
            shortlistAdjustmentsGrid: shortlistAdjustmentsGrid,
            endpoint: endpoint,
            apiClient: apiClient,
            workflow: workflow,
            getSelectedProcedure: getSelectedProcedure,
            supportsShortlistWorkspace: supportsShortlistWorkspace,
            normalizeMaxIncluded: normalizeMaxIncluded,
            normalizeAdjustmentReason: normalizeAdjustmentReason,
            setShortlistStatus: setShortlistStatus,
            setShortlistAdjustmentsStatus: setShortlistAdjustmentsStatus
        };
    }

    const exportsObject = {
        validateAndNormalizeOptions: validateAndNormalizeOptions
    };

    if (typeof window !== "undefined") {
        window.ProceduresShortlistValidation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
