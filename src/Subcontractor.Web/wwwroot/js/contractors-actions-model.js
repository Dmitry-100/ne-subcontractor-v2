"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractorsActionsModel requires ${name}.`);
        }
    }

    function requireUiState(uiState) {
        if (!uiState) {
            throw new Error("ContractorsActionsModel requires uiState.");
        }

        requireFunction(uiState.setUiBusy, "uiState.setUiBusy");
        requireFunction(uiState.setRatingStatus, "uiState.setRatingStatus");
    }

    function createModelHandlers(options) {
        const settings = options || {};
        const operations = settings.operations || {};
        const uiState = settings.uiState;
        const apiClient = settings.apiClient;
        const getSelectedContractor = settings.getSelectedContractor;

        requireUiState(uiState);

        if (!apiClient) {
            throw new Error("ContractorsActionsModel requires apiClient.");
        }

        requireFunction(getSelectedContractor, "getSelectedContractor callback");
        requireFunction(operations.loadModel, "operations.loadModel");
        requireFunction(operations.buildModelPayload, "operations.buildModelPayload");
        requireFunction(operations.fillModelForm, "operations.fillModelForm");
        requireFunction(operations.loadAnalytics, "operations.loadAnalytics");
        requireFunction(operations.loadHistory, "operations.loadHistory");
        requireFunction(apiClient.updateRatingModel, "apiClient.updateRatingModel");

        async function handleReloadModelClick() {
            uiState.setUiBusy(true);
            try {
                await operations.loadModel();
            } catch (error) {
                uiState.setRatingStatus(`Не удалось загрузить модель рейтинга: ${error.message}`, true);
            } finally {
                uiState.setUiBusy(false);
            }
        }

        async function handleSaveModelClick() {
            const payload = operations.buildModelPayload();
            uiState.setUiBusy(true);
            uiState.setRatingStatus("Сохраняем новую версию модели рейтинга...", false);
            try {
                const model = await apiClient.updateRatingModel(payload);
                operations.fillModelForm(model);
                uiState.setRatingStatus(`Сохранена новая активная модель: ${model.versionCode}.`, false);

                const selected = getSelectedContractor();
                await Promise.all([
                    operations.loadAnalytics(),
                    selected ? operations.loadHistory(selected.id) : Promise.resolve()
                ]);
            } catch (error) {
                uiState.setRatingStatus(`Не удалось сохранить модель рейтинга: ${error.message}`, true);
            } finally {
                uiState.setUiBusy(false);
            }
        }

        return {
            handleReloadModelClick: handleReloadModelClick,
            handleSaveModelClick: handleSaveModelClick
        };
    }

    const exportsObject = {
        createModelHandlers: createModelHandlers
    };

    if (typeof window !== "undefined") {
        window.ContractorsActionsModel = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
