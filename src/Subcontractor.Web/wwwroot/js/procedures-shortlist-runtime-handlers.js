"use strict";

(function () {
    const dependenciesRoot =
        typeof window !== "undefined" && window.ProceduresShortlistRuntimeHandlerDependencies
            ? window.ProceduresShortlistRuntimeHandlerDependencies
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./procedures-shortlist-runtime-handler-dependencies.js")
                : null;

    if (!dependenciesRoot ||
        typeof dependenciesRoot.resolveDependencies !== "function") {
        throw new Error("ProceduresShortlistRuntimeHandlers requires ProceduresShortlistRuntimeHandlerDependencies.");
    }

    function createHandlers(options) {
        const resolved = dependenciesRoot.resolveDependencies(options);
        const maxIncludedInput = resolved.controls.maxIncludedInput;
        const adjustmentReasonInput = resolved.controls.adjustmentReasonInput;
        const endpoint = resolved.services.endpoint;
        const apiClient = resolved.services.apiClient;
        const workflow = resolved.services.workflow;
        const getSelectedProcedure = resolved.services.getSelectedProcedure;
        const supportsShortlistWorkspace = resolved.services.supportsShortlistWorkspace;
        const normalizeMaxIncluded = resolved.services.normalizeMaxIncluded;
        const normalizeAdjustmentReason = resolved.services.normalizeAdjustmentReason;
        const setShortlistStatus = resolved.services.setShortlistStatus;
        const setShortlistAdjustmentsStatus = resolved.services.setShortlistAdjustmentsStatus;
        const dataController = resolved.state.dataController;
        const updateControls = resolved.state.updateControls;
        const clearData = resolved.state.clearData;
        const loadShortlistRecommendations = resolved.state.loadShortlistRecommendations;
        const loadShortlistAdjustments = resolved.state.loadShortlistAdjustments;

        async function onSelectionChanged(procedure) {
            dataController.resetBusyState();

            if (!procedure) {
                clearData();
                setShortlistStatus("Рекомендации ещё не сформированы.", false);
                setShortlistAdjustmentsStatus("Журнал корректировок пока не загружен.", false);
                updateControls();
                return;
            }

            if (!supportsShortlistWorkspace(procedure)) {
                clearData();
                setShortlistStatus("Для завершённых и отменённых процедур автоподбор списка кандидатов недоступен.", false);
                setShortlistAdjustmentsStatus("Журнал корректировок недоступен для выбранного статуса процедуры.", false);
                updateControls();
                return;
            }

            clearData();
            setShortlistStatus("Нажмите «Сформировать рекомендации», чтобы построить список кандидатов.", false);
            setShortlistAdjustmentsStatus("Загружаем журнал корректировок...", false);

            dataController.setShortlistAdjustmentsBusy(true);
            updateControls();

            try {
                await loadShortlistAdjustments(procedure.id);
            } catch (error) {
                setShortlistAdjustmentsStatus(`Не удалось загрузить журнал корректировок: ${error.message}`, true);
            } finally {
                dataController.setShortlistAdjustmentsBusy(false);
                updateControls();
            }
        }

        function onMaxIncludedChanged() {
            const normalized = normalizeMaxIncluded(maxIncludedInput.value);
            maxIncludedInput.value = String(normalized);
        }

        async function onBuildClick() {
            const selectedProcedure = getSelectedProcedure();
            if (!selectedProcedure || !supportsShortlistWorkspace(selectedProcedure)) {
                return;
            }

            dataController.setShortlistBusy(true);
            updateControls();
            setShortlistStatus("Формируем рекомендации по списку кандидатов...", false);

            try {
                await loadShortlistRecommendations(selectedProcedure.id);
            } catch (error) {
                setShortlistStatus(`Не удалось сформировать рекомендации: ${error.message}`, true);
            } finally {
                dataController.setShortlistBusy(false);
                updateControls();
            }
        }

        async function onApplyClick() {
            const selectedProcedure = getSelectedProcedure();
            if (!selectedProcedure || !supportsShortlistWorkspace(selectedProcedure)) {
                return;
            }

            const requestPayload = {
                maxIncluded: normalizeMaxIncluded(maxIncludedInput.value),
                adjustmentReason: normalizeAdjustmentReason(adjustmentReasonInput.value)
            };

            maxIncludedInput.value = String(requestPayload.maxIncluded);

            dataController.setShortlistBusy(true);
            dataController.setShortlistAdjustmentsBusy(true);
            updateControls();
            setShortlistStatus("Применяем рекомендации в список кандидатов...", false);
            setShortlistAdjustmentsStatus("Обновляем журнал корректировок...", false);

            try {
                const applyResult = await apiClient.applyShortlistRecommendations(
                    endpoint,
                    selectedProcedure.id,
                    requestPayload);

                setShortlistStatus(workflow.buildApplyResultStatus(applyResult), false);
                await Promise.all([
                    loadShortlistRecommendations(selectedProcedure.id),
                    loadShortlistAdjustments(selectedProcedure.id)
                ]);
            } catch (error) {
                setShortlistStatus(`Не удалось применить рекомендации: ${error.message}`, true);
                setShortlistAdjustmentsStatus(`Не удалось обновить журнал корректировок: ${error.message}`, true);
            } finally {
                dataController.setShortlistBusy(false);
                dataController.setShortlistAdjustmentsBusy(false);
                updateControls();
            }
        }

        async function onAdjustmentsRefreshClick() {
            const selectedProcedure = getSelectedProcedure();
            if (!selectedProcedure || !supportsShortlistWorkspace(selectedProcedure)) {
                return;
            }

            dataController.setShortlistAdjustmentsBusy(true);
            updateControls();
            setShortlistAdjustmentsStatus("Обновляем журнал корректировок...", false);

            try {
                await loadShortlistAdjustments(selectedProcedure.id);
            } catch (error) {
                setShortlistAdjustmentsStatus(`Не удалось обновить журнал корректировок: ${error.message}`, true);
            } finally {
                dataController.setShortlistAdjustmentsBusy(false);
                updateControls();
            }
        }

        return {
            onSelectionChanged: onSelectionChanged,
            onMaxIncludedChanged: onMaxIncludedChanged,
            onBuildClick: onBuildClick,
            onApplyClick: onApplyClick,
            onAdjustmentsRefreshClick: onAdjustmentsRefreshClick
        };
    }

    const exportsObject = {
        createHandlers: createHandlers
    };

    if (typeof window !== "undefined") {
        window.ProceduresShortlistRuntimeHandlers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
