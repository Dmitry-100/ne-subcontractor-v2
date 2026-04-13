"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsActions requires ${name}.`);
        }
    }

    function createActions(options) {
        const settings = options || {};
        const controls = settings.controls || {};
        const helpers = settings.helpers || {};
        const operations = settings.operations || {};
        const setTransitionStatus = settings.setTransitionStatus;
        const promptImpl = settings.promptImpl || (typeof window !== "undefined" ? window.prompt : null);

        const nextButton = controls.nextButton;
        const rollbackButton = controls.rollbackButton;
        const historyRefreshButton = controls.historyRefreshButton;
        const getSelectedLot = operations.getSelectedLot;
        const transitionLot = operations.transitionLot;
        const refreshLotsAndReselect = operations.refreshLotsAndReselect;
        const loadHistory = operations.loadHistory;
        const localizeStatus = helpers.localizeStatus;
        const nextStatus = helpers.nextStatus;
        const previousStatus = helpers.previousStatus;
        const parseTransitionError = helpers.parseTransitionError;

        if (!nextButton || !rollbackButton || !historyRefreshButton) {
            throw new Error("LotsActions requires transition controls.");
        }

        requireFunction(getSelectedLot, "operations.getSelectedLot");
        requireFunction(transitionLot, "operations.transitionLot");
        requireFunction(refreshLotsAndReselect, "operations.refreshLotsAndReselect");
        requireFunction(loadHistory, "operations.loadHistory");
        requireFunction(setTransitionStatus, "setTransitionStatus");
        requireFunction(localizeStatus, "helpers.localizeStatus");
        requireFunction(nextStatus, "helpers.nextStatus");
        requireFunction(previousStatus, "helpers.previousStatus");
        requireFunction(parseTransitionError, "helpers.parseTransitionError");
        requireFunction(promptImpl, "promptImpl");

        async function runTransition(targetStatus, reason) {
            const selectedLot = getSelectedLot();
            if (!selectedLot || !targetStatus) {
                return;
            }

            try {
                await transitionLot(selectedLot.id, {
                    targetStatus: targetStatus,
                    reason: reason
                });

                setTransitionStatus(
                    `Переход выполнен: ${localizeStatus(selectedLot.status)} -> ${localizeStatus(targetStatus)}.`,
                    false);
                await refreshLotsAndReselect(selectedLot.id);
                await loadHistory(selectedLot.id);
            } catch (error) {
                setTransitionStatus(parseTransitionError(error), true);
            }
        }

        function handleNextClick() {
            const selectedLot = getSelectedLot();
            if (!selectedLot) {
                return;
            }

            const targetStatus = nextStatus(selectedLot.status);
            if (!targetStatus) {
                setTransitionStatus("Для текущего статуса недоступен переход вперёд.", true);
                return;
            }

            runTransition(targetStatus, null);
        }

        function handleRollbackClick() {
            const selectedLot = getSelectedLot();
            if (!selectedLot) {
                return;
            }

            const targetStatus = previousStatus(selectedLot.status);
            if (!targetStatus) {
                setTransitionStatus("Для текущего статуса недоступен откат.", true);
                return;
            }

            const reason = promptImpl(
                `Откат ${localizeStatus(selectedLot.status)} -> ${localizeStatus(targetStatus)}. Укажите причину:`,
                "");
            if (reason === null) {
                return;
            }

            const normalizedReason = reason.trim();
            if (!normalizedReason) {
                setTransitionStatus("Для отката требуется причина.", true);
                return;
            }

            runTransition(targetStatus, normalizedReason);
        }

        function handleHistoryRefreshClick() {
            const selectedLot = getSelectedLot();
            if (!selectedLot) {
                return;
            }

            loadHistory(selectedLot.id).then(function () {
                setTransitionStatus("История обновлена.", false);
            }).catch(function (error) {
                setTransitionStatus(`Не удалось обновить историю: ${error.message}`, true);
            });
        }

        function bindEvents() {
            nextButton.addEventListener("click", handleNextClick);
            rollbackButton.addEventListener("click", handleRollbackClick);
            historyRefreshButton.addEventListener("click", handleHistoryRefreshClick);
        }

        return {
            runTransition: runTransition,
            handleNextClick: handleNextClick,
            handleRollbackClick: handleRollbackClick,
            handleHistoryRefreshClick: handleHistoryRefreshClick,
            bindEvents: bindEvents
        };
    }

    const exportsObject = {
        createActions: createActions
    };

    if (typeof window !== "undefined") {
        window.LotsActions = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
