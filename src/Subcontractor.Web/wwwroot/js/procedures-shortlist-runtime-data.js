"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ProceduresShortlistRuntimeData requires '${name}' callback.`);
        }
    }

    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`ProceduresShortlistRuntimeData requires '${name}'.`);
        }
    }

    function createDataController(options) {
        const settings = options || {};

        const maxIncludedInput = settings.maxIncludedInput;
        const adjustmentReasonInput = settings.adjustmentReasonInput;
        const buildButton = settings.buildButton;
        const applyButton = settings.applyButton;
        const adjustmentsRefreshButton = settings.adjustmentsRefreshButton;
        const shortlistGrid = settings.shortlistGrid;
        const shortlistAdjustmentsGrid = settings.shortlistAdjustmentsGrid;

        const endpoint = settings.endpoint;
        const apiClient = settings.apiClient;
        const workflow = settings.workflow;
        const getSelectedProcedure = settings.getSelectedProcedure;
        const supportsShortlistWorkspace = settings.supportsShortlistWorkspace;
        const setShortlistStatus = settings.setShortlistStatus;
        const setShortlistAdjustmentsStatus = settings.setShortlistAdjustmentsStatus;

        requireObject(maxIncludedInput, "maxIncludedInput");
        requireObject(adjustmentReasonInput, "adjustmentReasonInput");
        requireObject(buildButton, "buildButton");
        requireObject(applyButton, "applyButton");
        requireObject(adjustmentsRefreshButton, "adjustmentsRefreshButton");
        requireObject(shortlistGrid, "shortlistGrid");
        requireObject(shortlistAdjustmentsGrid, "shortlistAdjustmentsGrid");
        requireObject(apiClient, "apiClient");
        requireObject(workflow, "workflow");
        requireFunction(getSelectedProcedure, "getSelectedProcedure");
        requireFunction(supportsShortlistWorkspace, "supportsShortlistWorkspace");
        requireFunction(setShortlistStatus, "setShortlistStatus");
        requireFunction(setShortlistAdjustmentsStatus, "setShortlistAdjustmentsStatus");

        if (!endpoint) {
            throw new Error("ProceduresShortlistRuntimeData requires 'endpoint'.");
        }

        let shortlistRecommendationsCache = [];
        let shortlistBusy = false;
        let shortlistAdjustmentsBusy = false;

        function setShortlistBusy(value) {
            shortlistBusy = Boolean(value);
        }

        function setShortlistAdjustmentsBusy(value) {
            shortlistAdjustmentsBusy = Boolean(value);
        }

        function resetBusyState() {
            shortlistBusy = false;
            shortlistAdjustmentsBusy = false;
        }

        function updateControls() {
            const selectedProcedure = getSelectedProcedure();
            const canUse = supportsShortlistWorkspace(selectedProcedure);

            maxIncludedInput.disabled = !canUse || shortlistBusy;
            adjustmentReasonInput.disabled = !canUse || shortlistBusy;
            buildButton.disabled = !canUse || shortlistBusy;
            applyButton.disabled = !canUse || shortlistBusy;
            adjustmentsRefreshButton.disabled = !canUse || shortlistBusy || shortlistAdjustmentsBusy;
        }

        function clearData() {
            shortlistRecommendationsCache = [];
            shortlistGrid.option("dataSource", []);
            shortlistAdjustmentsGrid.option("dataSource", []);
        }

        async function loadShortlistRecommendations(procedureId) {
            const currentProcedureId = String(procedureId || "");
            const compareProcedureId = currentProcedureId.toLowerCase();
            if (typeof shortlistGrid.ensureInitialized === "function") {
                shortlistGrid.ensureInitialized();
            }

            const recommendations = await apiClient.getShortlistRecommendations(endpoint, currentProcedureId);
            const selectedProcedure = getSelectedProcedure();

            if (!selectedProcedure || String(selectedProcedure.id || "").toLowerCase() !== compareProcedureId) {
                return;
            }

            shortlistRecommendationsCache = Array.isArray(recommendations) ? recommendations : [];
            shortlistGrid.option("dataSource", shortlistRecommendationsCache);
            setShortlistStatus(workflow.buildRecommendationsStatus(shortlistRecommendationsCache), false);
        }

        async function loadShortlistAdjustments(procedureId) {
            const currentProcedureId = String(procedureId || "");
            const compareProcedureId = currentProcedureId.toLowerCase();
            if (typeof shortlistAdjustmentsGrid.ensureInitialized === "function") {
                shortlistAdjustmentsGrid.ensureInitialized();
            }

            const adjustments = await apiClient.getShortlistAdjustments(endpoint, currentProcedureId);
            const selectedProcedure = getSelectedProcedure();

            if (!selectedProcedure || String(selectedProcedure.id || "").toLowerCase() !== compareProcedureId) {
                return;
            }

            const rows = Array.isArray(adjustments) ? adjustments : [];
            shortlistAdjustmentsGrid.option("dataSource", rows);
            setShortlistAdjustmentsStatus(`Записей в журнале: ${rows.length}.`, false);
        }

        return {
            setShortlistBusy: setShortlistBusy,
            setShortlistAdjustmentsBusy: setShortlistAdjustmentsBusy,
            resetBusyState: resetBusyState,
            updateControls: updateControls,
            clearData: clearData,
            loadShortlistRecommendations: loadShortlistRecommendations,
            loadShortlistAdjustments: loadShortlistAdjustments
        };
    }

    const exportsObject = {
        createDataController: createDataController
    };

    if (typeof window !== "undefined") {
        window.ProceduresShortlistRuntimeData = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
