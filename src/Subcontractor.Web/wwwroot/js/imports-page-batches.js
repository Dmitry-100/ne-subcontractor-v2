"use strict";

(function () {
    function toErrorMessage(error) {
        if (error && typeof error.message === "string" && error.message.trim().length > 0) {
            return error.message;
        }

        return "Неизвестная ошибка.";
    }

    function createBatchesService(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const endpoint = settings.endpoint;
        const workflow = settings.workflow;
        const lotState = settings.lotState;
        const getSelectedBatch = settings.getSelectedBatch;
        const setSelectedBatch = settings.setSelectedBatch;
        const getLotRecommendations = settings.getLotRecommendations;
        const getLotRecommendationsBatchId = settings.getLotRecommendationsBatchId;
        const clearDetailsPoll = settings.clearDetailsPoll;
        const setDetailsPollHandle = settings.setDetailsPollHandle;
        const scheduleTimeout = settings.scheduleTimeout || function (handler, delay) {
            return setTimeout(handler, delay);
        };
        const localizeImportStatus = settings.localizeImportStatus || function (value) { return value || ""; };
        const setBatchesStatus = settings.setBatchesStatus;
        const setTransitionStatus = settings.setTransitionStatus;
        const onBatchesLoaded = settings.onBatchesLoaded;
        const onDetailsLoaded = settings.onDetailsLoaded;
        const onDetailsError = settings.onDetailsError;
        const onAfterDetailsLoaded = settings.onAfterDetailsLoaded;
        const onLoadBatchHistory = settings.onLoadBatchHistory;
        const onAutoRefreshError = settings.onAutoRefreshError;

        if (!apiClient || typeof apiClient.getBatches !== "function" || typeof apiClient.getBatchDetails !== "function") {
            throw new Error("createBatchesService: apiClient with getBatches/getBatchDetails is required.");
        }

        if (!endpoint || typeof endpoint !== "string") {
            throw new Error("createBatchesService: endpoint is required.");
        }

        if (!workflow || typeof workflow.validateTransitionRequest !== "function" || typeof workflow.shouldAutoRefreshDetails !== "function") {
            throw new Error("createBatchesService: workflow is required.");
        }

        if (!lotState || typeof lotState.shouldResetRecommendations !== "function") {
            throw new Error("createBatchesService: lotState is required.");
        }

        if (typeof getSelectedBatch !== "function" || typeof setSelectedBatch !== "function") {
            throw new Error("createBatchesService: getSelectedBatch/setSelectedBatch are required.");
        }

        if (typeof getLotRecommendations !== "function" || typeof getLotRecommendationsBatchId !== "function") {
            throw new Error("createBatchesService: lot recommendations getters are required.");
        }

        if (typeof clearDetailsPoll !== "function" || typeof setDetailsPollHandle !== "function") {
            throw new Error("createBatchesService: poll handlers are required.");
        }

        if (typeof setBatchesStatus !== "function" || typeof setTransitionStatus !== "function") {
            throw new Error("createBatchesService: status callbacks are required.");
        }

        if (typeof onBatchesLoaded !== "function" ||
            typeof onDetailsLoaded !== "function" ||
            typeof onDetailsError !== "function" ||
            typeof onAfterDetailsLoaded !== "function" ||
            typeof onLoadBatchHistory !== "function" ||
            typeof onAutoRefreshError !== "function") {
            throw new Error("createBatchesService: lifecycle callbacks are required.");
        }

        async function loadBatchDetails(batchId) {
            clearDetailsPoll();
            try {
                const details = await apiClient.getBatchDetails(endpoint, batchId);
                const previousBatch = getSelectedBatch();
                const previousBatchId = previousBatch && previousBatch.id ? previousBatch.id : null;

                setSelectedBatch(details);
                onDetailsLoaded(details);

                const shouldResetLotRecommendations = lotState.shouldResetRecommendations({
                    recommendations: getLotRecommendations(),
                    recommendationsBatchId: getLotRecommendationsBatchId(),
                    currentBatchId: details.id,
                    previousBatchId: previousBatchId,
                    currentBatchStatus: details.status
                });

                onAfterDetailsLoaded({
                    details: details,
                    previousBatchId: previousBatchId,
                    shouldResetLotRecommendations: shouldResetLotRecommendations
                });

                await onLoadBatchHistory(batchId);

                if (workflow.shouldAutoRefreshDetails(details.status)) {
                    const handle = scheduleTimeout(function () {
                        loadBatchDetails(batchId).catch(function (error) {
                            onAutoRefreshError(error);
                        });
                    }, 3000);

                    setDetailsPollHandle(handle);
                }
            } catch (error) {
                setSelectedBatch(null);
                onDetailsError(error);
            }
        }

        async function loadBatches(selectedBatchId) {
            try {
                setBatchesStatus("Загрузка пакетов...", false);
                const payload = await apiClient.getBatches(endpoint);
                const rows = Array.isArray(payload) ? payload : [];
                onBatchesLoaded(rows);
                setBatchesStatus(`Загружено пакетов: ${rows.length}.`, false);

                const selectedBatch = getSelectedBatch();
                const currentSelectedBatchId = selectedBatch && selectedBatch.id ? selectedBatch.id : null;
                const targetBatchId = selectedBatchId || currentSelectedBatchId;
                if (targetBatchId) {
                    await loadBatchDetails(targetBatchId);
                }
            } catch (error) {
                setBatchesStatus(`Не удалось загрузить пакеты: ${toErrorMessage(error)}`, true);
            }
        }

        async function applyBatchTransition(targetStatus, reason) {
            const selectedBatch = getSelectedBatch();
            const transition = workflow.validateTransitionRequest({
                selectedBatchId: selectedBatch && selectedBatch.id ? selectedBatch.id : null,
                targetStatus: targetStatus,
                reason: reason
            });

            await apiClient.transitionBatch(endpoint, selectedBatch.id, transition.payload);
            await loadBatches(selectedBatch.id);
            setTransitionStatus(`Переход применён: ${localizeImportStatus(transition.targetStatus)}.`, false);

            return transition;
        }

        return {
            loadBatchDetails: loadBatchDetails,
            loadBatches: loadBatches,
            applyBatchTransition: applyBatchTransition
        };
    }

    const exportsObject = {
        createBatchesService: createBatchesService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBatches = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
