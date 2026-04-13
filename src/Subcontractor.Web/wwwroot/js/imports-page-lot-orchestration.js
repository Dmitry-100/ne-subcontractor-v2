"use strict";

(function () {
    const validationRoot =
        typeof window !== "undefined" && window.ImportsPageLotOrchestrationValidation
            ? window.ImportsPageLotOrchestrationValidation
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-lot-orchestration-validation.js")
                : null;

    if (!validationRoot || typeof validationRoot.validateSettings !== "function") {
        throw new Error("ImportsPageLotOrchestration requires ImportsPageLotOrchestrationValidation.validateSettings.");
    }

    function createLotOrchestrationService(options) {
        const settings = validationRoot.validateSettings(options || {});
        const lotState = settings.lotState;
        const apiClient = settings.apiClient;
        const lotRecommendationsEndpoint = settings.lotRecommendationsEndpoint;
        const getSelectedBatchId = settings.getSelectedBatchId;
        const getRecommendations = settings.getRecommendations;
        const setRecommendations = settings.setRecommendations;
        const getRecommendationsBatchId = settings.getRecommendationsBatchId;
        const setRecommendationsBatchId = settings.setRecommendationsBatchId;
        const getSelectionsByKey = settings.getSelectionsByKey;
        const setSelectionsByKey = settings.setSelectionsByKey;
        const renderLotGroupsTable = settings.renderLotGroupsTable;
        const renderLotSelectedTable = settings.renderLotSelectedTable;
        const setLotStatus = settings.setLotStatus;
        const setActionButtons = settings.setActionButtons;

        function getRecommendationGroups() {
            return lotState.getRecommendationGroups(getRecommendations());
        }

        function getSelectedRecommendationGroups() {
            return lotState.getSelectedRecommendationGroups(getRecommendations(), getSelectionsByKey());
        }

        function updateActionButtons() {
            const state = lotState.resolveActionState({
                selectedBatchId: getSelectedBatchId(),
                recommendationsBatchId: getRecommendationsBatchId(),
                recommendations: getRecommendations(),
                selectedCount: getSelectedRecommendationGroups().length
            });

            setActionButtons(state);
            return state;
        }

        function initializeSelections() {
            setSelectionsByKey(lotState.buildSelectionMap(
                getRecommendationGroups(),
                getSelectionsByKey()));
        }

        function renderAll() {
            renderLotGroupsTable();
            renderLotSelectedTable();
        }

        function clearRecommendations(message) {
            setRecommendations(null);
            setRecommendationsBatchId(null);
            setSelectionsByKey(new Map());
            renderAll();
            updateActionButtons();
            setLotStatus(message, false);
        }

        async function buildRecommendations() {
            const selectedBatchId = getSelectedBatchId();
            lotState.validateBuildRecommendationsRequest(selectedBatchId);

            setLotStatus("Построение рекомендаций по лотам...", false);

            const recommendations = await apiClient.getLotRecommendations(lotRecommendationsEndpoint, selectedBatchId);
            setRecommendations(recommendations);
            setRecommendationsBatchId(selectedBatchId);

            initializeSelections();
            renderAll();
            updateActionButtons();

            const selectedCount = getSelectedRecommendationGroups().length;
            setLotStatus(lotState.buildRecommendationsStatus({
                recommendations: getRecommendations(),
                selectedCount: selectedCount
            }), false);
        }

        function buildLotApplyPayload() {
            return lotState.buildLotApplyPayload(getSelectedRecommendationGroups());
        }

        async function applyRecommendations() {
            const selectedBatchId = getSelectedBatchId();
            lotState.validateApplyRecommendationsRequest({
                selectedBatchId: selectedBatchId,
                recommendations: getRecommendations(),
                recommendationsBatchId: getRecommendationsBatchId()
            });

            const payload = buildLotApplyPayload();
            const result = await apiClient.applyLotRecommendations(
                lotRecommendationsEndpoint,
                selectedBatchId,
                payload);

            await buildRecommendations();
            const summary = lotState.buildApplySummary(result);
            setLotStatus(
                summary.statusMessage,
                summary.createdLotsCount === 0 && summary.skippedGroupsCount > 0);
        }

        function setGroupSelected(groupKey, selected) {
            const selectionUpdate = lotState.setGroupSelected(getSelectionsByKey(), groupKey, selected);
            if (!selectionUpdate.updated) {
                return false;
            }

            setSelectionsByKey(selectionUpdate.selectionsByKey);
            renderLotSelectedTable();
            updateActionButtons();
            setLotStatus(lotState.buildSelectedGroupsStatus(getSelectedRecommendationGroups().length), false);
            return true;
        }

        function setGroupLotCode(groupKey, lotCode) {
            const codeUpdate = lotState.setGroupLotCode(getSelectionsByKey(), groupKey, lotCode);
            if (!codeUpdate.updated) {
                return false;
            }

            setSelectionsByKey(codeUpdate.selectionsByKey);
            return true;
        }

        function setGroupLotName(groupKey, lotName) {
            const nameUpdate = lotState.setGroupLotName(getSelectionsByKey(), groupKey, lotName);
            if (!nameUpdate.updated) {
                return false;
            }

            setSelectionsByKey(nameUpdate.selectionsByKey);
            return true;
        }

        function onDetailsLoaded(options) {
            const context = options || {};
            if (context.shouldResetLotRecommendations) {
                clearRecommendations("Выбран пакет. Постройте рекомендации для подготовки черновых лотов.");
                return;
            }

            renderAll();
            updateActionButtons();
        }

        return {
            updateActionButtons: updateActionButtons,
            clearRecommendations: clearRecommendations,
            buildRecommendations: buildRecommendations,
            applyRecommendations: applyRecommendations,
            setGroupSelected: setGroupSelected,
            setGroupLotCode: setGroupLotCode,
            setGroupLotName: setGroupLotName,
            onDetailsLoaded: onDetailsLoaded,
            getRecommendations: getRecommendations,
            getRecommendationsBatchId: getRecommendationsBatchId
        };
    }

    const exportsObject = {
        createLotOrchestrationService: createLotOrchestrationService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotOrchestration = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
