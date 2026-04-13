"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsUiState requires ${name}.`);
        }
    }

    function requireControl(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`LotsUiState requires ${name}.`);
        }
    }

    function toggleErrorClass(element, className, isError) {
        if (element.classList && typeof element.classList.toggle === "function") {
            element.classList.toggle(className, Boolean(isError));
        }
    }

    function createUiState(options) {
        const settings = options || {};
        const controls = settings.controls || {};
        const helpers = settings.helpers || {};

        const statusElement = controls.statusElement;
        const selectedElement = controls.selectedElement;
        const transitionStatusElement = controls.transitionStatusElement;
        const nextButton = controls.nextButton;
        const rollbackButton = controls.rollbackButton;
        const historyRefreshButton = controls.historyRefreshButton;
        const localizeStatus = helpers.localizeStatus;
        const nextStatus = helpers.nextStatus;
        const previousStatus = helpers.previousStatus;

        requireControl(statusElement, "controls.statusElement");
        requireControl(selectedElement, "controls.selectedElement");
        requireControl(transitionStatusElement, "controls.transitionStatusElement");
        requireControl(nextButton, "controls.nextButton");
        requireControl(rollbackButton, "controls.rollbackButton");
        requireControl(historyRefreshButton, "controls.historyRefreshButton");
        requireFunction(localizeStatus, "helpers.localizeStatus");
        requireFunction(nextStatus, "helpers.nextStatus");
        requireFunction(previousStatus, "helpers.previousStatus");

        function setStatus(message, isError) {
            statusElement.textContent = message;
            toggleErrorClass(statusElement, "lots-status--error", isError);
        }

        function setTransitionStatus(message, isError) {
            transitionStatusElement.textContent = message;
            toggleErrorClass(transitionStatusElement, "lots-transition-status--error", isError);
        }

        function updateActionButtons(selectedLot) {
            if (!selectedLot) {
                nextButton.disabled = true;
                rollbackButton.disabled = true;
                historyRefreshButton.disabled = true;
                return;
            }

            nextButton.disabled = !nextStatus(selectedLot.status);
            rollbackButton.disabled = !previousStatus(selectedLot.status);
            historyRefreshButton.disabled = false;
        }

        function updateSelection(selectedLot) {
            if (!selectedLot) {
                selectedElement.textContent = "Выберите лот в таблице, чтобы управлять статусом.";
                updateActionButtons(null);
                return;
            }

            selectedElement.textContent =
                `Выбрано: ${selectedLot.code} · ${selectedLot.name} · Статус: ${localizeStatus(selectedLot.status)}`;
            updateActionButtons(selectedLot);
        }

        return {
            setStatus: setStatus,
            setTransitionStatus: setTransitionStatus,
            updateSelection: updateSelection
        };
    }

    const exportsObject = {
        createUiState: createUiState
    };

    if (typeof window !== "undefined") {
        window.LotsUiState = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
