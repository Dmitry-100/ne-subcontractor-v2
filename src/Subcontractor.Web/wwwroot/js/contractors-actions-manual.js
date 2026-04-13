"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractorsActionsManual requires ${name}.`);
        }
    }

    function requireControl(controls, key) {
        const control = controls ? controls[key] : null;
        if (!control) {
            throw new Error(`ContractorsActionsManual requires control '${key}'.`);
        }

        return control;
    }

    function requireUiState(uiState) {
        if (!uiState) {
            throw new Error("ContractorsActionsManual requires uiState.");
        }

        requireFunction(uiState.setUiBusy, "uiState.setUiBusy");
        requireFunction(uiState.setRatingStatus, "uiState.setRatingStatus");
    }

    function createManualHandlers(options) {
        const settings = options || {};
        const controls = settings.controls || {};
        const operations = settings.operations || {};
        const uiState = settings.uiState;
        const apiClient = settings.apiClient;
        const contractorsHelpers = settings.contractorsHelpers;
        const getSelectedContractor = settings.getSelectedContractor;

        const manualScoreInput = requireControl(controls, "manualScoreInput");
        const manualCommentInput = requireControl(controls, "manualCommentInput");

        requireUiState(uiState);

        if (!apiClient) {
            throw new Error("ContractorsActionsManual requires apiClient.");
        }

        if (!contractorsHelpers) {
            throw new Error("ContractorsActionsManual requires contractorsHelpers.");
        }

        requireFunction(getSelectedContractor, "getSelectedContractor callback");
        requireFunction(operations.refreshContractorsAndReselect, "operations.refreshContractorsAndReselect");
        requireFunction(operations.loadAnalytics, "operations.loadAnalytics");
        requireFunction(operations.loadHistory, "operations.loadHistory");
        requireFunction(contractorsHelpers.parseNumber, "contractorsHelpers.parseNumber");
        requireFunction(contractorsHelpers.normalizeOptionalText, "contractorsHelpers.normalizeOptionalText");
        requireFunction(apiClient.saveManualAssessment, "apiClient.saveManualAssessment");

        async function handleManualSaveClick() {
            const selected = getSelectedContractor();
            if (!selected) {
                return;
            }

            const score = contractorsHelpers.parseNumber(manualScoreInput.value, Number.NaN);
            if (!Number.isFinite(score) || score < 0 || score > 5) {
                uiState.setRatingStatus("Оценка ГИПа должна быть в диапазоне от 0 до 5.", true);
                return;
            }

            const selectedId = selected.id;
            uiState.setUiBusy(true);
            uiState.setRatingStatus("Сохраняем ручную оценку и пересчитываем рейтинг...", false);
            try {
                await apiClient.saveManualAssessment(selectedId, {
                    score: score,
                    comment: contractorsHelpers.normalizeOptionalText(manualCommentInput.value)
                });

                uiState.setRatingStatus("Ручная оценка применена.", false);
                await Promise.all([
                    operations.refreshContractorsAndReselect(selectedId),
                    operations.loadAnalytics(),
                    operations.loadHistory(selectedId)
                ]);
            } catch (error) {
                uiState.setRatingStatus(`Не удалось применить ручную оценку: ${error.message}`, true);
            } finally {
                uiState.setUiBusy(false);
            }
        }

        return {
            handleManualSaveClick: handleManualSaveClick
        };
    }

    const exportsObject = {
        createManualHandlers: createManualHandlers
    };

    if (typeof window !== "undefined") {
        window.ContractorsActionsManual = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
