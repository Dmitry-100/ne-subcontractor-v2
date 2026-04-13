"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractorsActionsRating requires ${name}.`);
        }
    }

    function requireUiState(uiState) {
        if (!uiState) {
            throw new Error("ContractorsActionsRating requires uiState.");
        }

        requireFunction(uiState.setUiBusy, "uiState.setUiBusy");
        requireFunction(uiState.setRatingStatus, "uiState.setRatingStatus");
    }

    function createRatingHandlers(options) {
        const settings = options || {};
        const operations = settings.operations || {};
        const uiState = settings.uiState;
        const apiClient = settings.apiClient;
        const getSelectedContractor = settings.getSelectedContractor;

        requireUiState(uiState);

        if (!apiClient) {
            throw new Error("ContractorsActionsRating requires apiClient.");
        }

        requireFunction(getSelectedContractor, "getSelectedContractor callback");
        requireFunction(operations.refreshContractorsAndReselect, "operations.refreshContractorsAndReselect");
        requireFunction(operations.loadAnalytics, "operations.loadAnalytics");
        requireFunction(operations.loadHistory, "operations.loadHistory");
        requireFunction(apiClient.recalculateRatings, "apiClient.recalculateRatings");

        async function handleRefreshClick() {
            const selected = getSelectedContractor();
            const selectedId = selected ? selected.id : null;
            uiState.setUiBusy(true);
            try {
                await Promise.all([
                    operations.refreshContractorsAndReselect(selectedId),
                    operations.loadAnalytics()
                ]);
                if (selectedId) {
                    await operations.loadHistory(selectedId);
                }
            } catch (error) {
                uiState.setRatingStatus(`Не удалось обновить данные: ${error.message}`, true);
            } finally {
                uiState.setUiBusy(false);
            }
        }

        async function handleRecalculateAllClick() {
            const selected = getSelectedContractor();
            const selectedId = selected ? selected.id : null;
            uiState.setUiBusy(true);
            uiState.setRatingStatus("Выполняется пересчёт рейтинга для активных подрядчиков...", false);
            try {
                const result = await apiClient.recalculateRatings({
                    includeInactiveContractors: false,
                    reason: "Ручной пересчёт из интерфейса: все активные подрядчики."
                });

                uiState.setRatingStatus(
                    `Пересчёт завершён. Обработано: ${result.processedContractors}; обновлено: ${result.updatedContractors}; модель: ${result.modelVersionCode}.`,
                    false);

                await Promise.all([
                    operations.refreshContractorsAndReselect(selectedId),
                    operations.loadAnalytics()
                ]);
                if (selectedId) {
                    await operations.loadHistory(selectedId);
                }
            } catch (error) {
                uiState.setRatingStatus(`Ошибка пересчёта рейтинга: ${error.message}`, true);
            } finally {
                uiState.setUiBusy(false);
            }
        }

        async function handleRecalculateSelectedClick() {
            const selected = getSelectedContractor();
            if (!selected) {
                return;
            }

            const selectedId = selected.id;
            uiState.setUiBusy(true);
            uiState.setRatingStatus("Выполняется пересчёт рейтинга выбранного подрядчика...", false);
            try {
                const result = await apiClient.recalculateRatings({
                    contractorId: selectedId,
                    includeInactiveContractors: true,
                    reason: "Ручной пересчёт из интерфейса: выбранный подрядчик."
                });

                uiState.setRatingStatus(
                    `Пересчёт выбранного подрядчика завершён. Обработано: ${result.processedContractors}; обновлено: ${result.updatedContractors}.`,
                    false);

                await Promise.all([
                    operations.refreshContractorsAndReselect(selectedId),
                    operations.loadAnalytics(),
                    operations.loadHistory(selectedId)
                ]);
            } catch (error) {
                uiState.setRatingStatus(`Ошибка пересчёта выбранного подрядчика: ${error.message}`, true);
            } finally {
                uiState.setUiBusy(false);
            }
        }

        return {
            handleRefreshClick: handleRefreshClick,
            handleRecalculateAllClick: handleRecalculateAllClick,
            handleRecalculateSelectedClick: handleRecalculateSelectedClick
        };
    }

    const exportsObject = {
        createRatingHandlers: createRatingHandlers
    };

    if (typeof window !== "undefined") {
        window.ContractorsActionsRating = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
