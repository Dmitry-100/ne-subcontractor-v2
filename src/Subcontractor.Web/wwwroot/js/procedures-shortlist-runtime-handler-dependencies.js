"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ProceduresShortlistRuntimeHandlers requires ${name}.`);
        }
    }

    function resolveDependencies(options) {
        const settings = options || {};
        const controls = settings.controls || {};
        const services = settings.services || {};
        const state = settings.state || {};

        const maxIncludedInput = controls.maxIncludedInput;
        const adjustmentReasonInput = controls.adjustmentReasonInput;

        const endpoint = services.endpoint;
        const apiClient = services.apiClient;
        const workflow = services.workflow;
        const getSelectedProcedure = services.getSelectedProcedure;
        const supportsShortlistWorkspace = services.supportsShortlistWorkspace;
        const normalizeMaxIncluded = services.normalizeMaxIncluded;
        const normalizeAdjustmentReason = services.normalizeAdjustmentReason;
        const setShortlistStatus = services.setShortlistStatus;
        const setShortlistAdjustmentsStatus = services.setShortlistAdjustmentsStatus;

        const dataController = state.dataController;
        const updateControls = state.updateControls;
        const clearData = state.clearData;
        const loadShortlistRecommendations = state.loadShortlistRecommendations;
        const loadShortlistAdjustments = state.loadShortlistAdjustments;

        requireFunction(getSelectedProcedure, "services.getSelectedProcedure");
        requireFunction(supportsShortlistWorkspace, "services.supportsShortlistWorkspace");
        requireFunction(normalizeMaxIncluded, "services.normalizeMaxIncluded");
        requireFunction(normalizeAdjustmentReason, "services.normalizeAdjustmentReason");
        requireFunction(setShortlistStatus, "services.setShortlistStatus");
        requireFunction(setShortlistAdjustmentsStatus, "services.setShortlistAdjustmentsStatus");
        requireFunction(updateControls, "state.updateControls");
        requireFunction(clearData, "state.clearData");
        requireFunction(loadShortlistRecommendations, "state.loadShortlistRecommendations");
        requireFunction(loadShortlistAdjustments, "state.loadShortlistAdjustments");

        if (!endpoint || typeof endpoint !== "string") {
            throw new Error("ProceduresShortlistRuntimeHandlers requires services.endpoint.");
        }

        if (!apiClient || typeof apiClient.applyShortlistRecommendations !== "function") {
            throw new Error("ProceduresShortlistRuntimeHandlers requires services.apiClient.applyShortlistRecommendations.");
        }

        if (!workflow || typeof workflow.buildApplyResultStatus !== "function") {
            throw new Error("ProceduresShortlistRuntimeHandlers requires services.workflow.buildApplyResultStatus.");
        }

        if (!dataController ||
            typeof dataController.setShortlistBusy !== "function" ||
            typeof dataController.setShortlistAdjustmentsBusy !== "function" ||
            typeof dataController.resetBusyState !== "function") {
            throw new Error("ProceduresShortlistRuntimeHandlers requires state.dataController busy controls.");
        }

        if (!maxIncludedInput || typeof maxIncludedInput.value === "undefined") {
            throw new Error("ProceduresShortlistRuntimeHandlers requires controls.maxIncludedInput.");
        }

        if (!adjustmentReasonInput || typeof adjustmentReasonInput.value === "undefined") {
            throw new Error("ProceduresShortlistRuntimeHandlers requires controls.adjustmentReasonInput.");
        }

        return {
            controls: {
                maxIncludedInput: maxIncludedInput,
                adjustmentReasonInput: adjustmentReasonInput
            },
            services: {
                endpoint: endpoint,
                apiClient: apiClient,
                workflow: workflow,
                getSelectedProcedure: getSelectedProcedure,
                supportsShortlistWorkspace: supportsShortlistWorkspace,
                normalizeMaxIncluded: normalizeMaxIncluded,
                normalizeAdjustmentReason: normalizeAdjustmentReason,
                setShortlistStatus: setShortlistStatus,
                setShortlistAdjustmentsStatus: setShortlistAdjustmentsStatus
            },
            state: {
                dataController: dataController,
                updateControls: updateControls,
                clearData: clearData,
                loadShortlistRecommendations: loadShortlistRecommendations,
                loadShortlistAdjustments: loadShortlistAdjustments
            }
        };
    }

    const exportsObject = {
        requireFunction: requireFunction,
        resolveDependencies: resolveDependencies
    };

    if (typeof window !== "undefined") {
        window.ProceduresShortlistRuntimeHandlerDependencies = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
