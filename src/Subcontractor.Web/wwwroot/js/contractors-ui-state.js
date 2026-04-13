"use strict";

(function () {
    function requireControl(controls, key) {
        const control = controls ? controls[key] : null;
        if (!control) {
            throw new Error(`ContractorsUiState requires control '${key}'.`);
        }

        return control;
    }

    function toggleErrorClass(element, className, isError) {
        if (element.classList && typeof element.classList.toggle === "function") {
            element.classList.toggle(className, Boolean(isError));
        }
    }

    function createUiState(options) {
        const settings = options || {};
        const controls = settings.controls || {};
        const getSelectedContractor = settings.getSelectedContractor;

        if (typeof getSelectedContractor !== "function") {
            throw new Error("ContractorsUiState requires getSelectedContractor callback.");
        }

        const statusElement = requireControl(controls, "statusElement");
        const ratingStatusElement = requireControl(controls, "ratingStatusElement");
        const selectedElement = requireControl(controls, "selectedElement");
        const historyStatusElement = requireControl(controls, "historyStatusElement");
        const analyticsStatusElement = requireControl(controls, "analyticsStatusElement");
        const refreshButton = requireControl(controls, "refreshButton");
        const recalcAllButton = requireControl(controls, "recalcAllButton");
        const recalcSelectedButton = requireControl(controls, "recalcSelectedButton");
        const reloadModelButton = requireControl(controls, "reloadModelButton");
        const saveModelButton = requireControl(controls, "saveModelButton");
        const manualSaveButton = requireControl(controls, "manualSaveButton");
        const versionCodeInput = requireControl(controls, "versionCodeInput");
        const modelNameInput = requireControl(controls, "modelNameInput");
        const modelNotesInput = requireControl(controls, "modelNotesInput");
        const weightDeliveryInput = requireControl(controls, "weightDeliveryInput");
        const weightCommercialInput = requireControl(controls, "weightCommercialInput");
        const weightClaimInput = requireControl(controls, "weightClaimInput");
        const weightManualInput = requireControl(controls, "weightManualInput");
        const weightWorkloadInput = requireControl(controls, "weightWorkloadInput");
        const manualScoreInput = requireControl(controls, "manualScoreInput");
        const manualCommentInput = requireControl(controls, "manualCommentInput");

        let uiBusy = false;

        function setStatus(message, isError) {
            statusElement.textContent = message;
            toggleErrorClass(statusElement, "contractors-status--error", isError);
        }

        function setRatingStatus(message, isError) {
            ratingStatusElement.textContent = message;
            toggleErrorClass(ratingStatusElement, "contractors-rating-status--error", isError);
        }

        function setHistoryStatus(message, isError) {
            historyStatusElement.textContent = message;
            toggleErrorClass(historyStatusElement, "contractors-rating-status--error", isError);
        }

        function setAnalyticsStatus(message, isError) {
            analyticsStatusElement.textContent = message;
            toggleErrorClass(analyticsStatusElement, "contractors-rating-status--error", isError);
        }

        function updateSelectionUi() {
            const selectedContractor = getSelectedContractor();
            if (!selectedContractor) {
                selectedElement.textContent = "Выберите подрядчика в таблице для просмотра истории и ручной оценки.";
                recalcSelectedButton.disabled = true;
                manualSaveButton.disabled = true;
                return;
            }

            selectedElement.textContent = `Выбран: ${selectedContractor.name} · Рейтинг: ${Number(selectedContractor.currentRating).toFixed(3)} · Загрузка: ${Number(selectedContractor.currentLoadPercent).toFixed(2)}%`;
            recalcSelectedButton.disabled = uiBusy;
            manualSaveButton.disabled = uiBusy;
        }

        function setUiBusy(isBusy) {
            uiBusy = Boolean(isBusy);
            refreshButton.disabled = uiBusy;
            recalcAllButton.disabled = uiBusy;
            reloadModelButton.disabled = uiBusy;
            saveModelButton.disabled = uiBusy;
            versionCodeInput.disabled = uiBusy;
            modelNameInput.disabled = uiBusy;
            modelNotesInput.disabled = uiBusy;
            weightDeliveryInput.disabled = uiBusy;
            weightCommercialInput.disabled = uiBusy;
            weightClaimInput.disabled = uiBusy;
            weightManualInput.disabled = uiBusy;
            weightWorkloadInput.disabled = uiBusy;
            manualScoreInput.disabled = uiBusy;
            manualCommentInput.disabled = uiBusy;
            updateSelectionUi();
        }

        function isUiBusy() {
            return uiBusy;
        }

        return {
            setStatus: setStatus,
            setRatingStatus: setRatingStatus,
            setHistoryStatus: setHistoryStatus,
            setAnalyticsStatus: setAnalyticsStatus,
            updateSelectionUi: updateSelectionUi,
            setUiBusy: setUiBusy,
            isUiBusy: isUiBusy
        };
    }

    const exportsObject = {
        createUiState: createUiState
    };

    if (typeof window !== "undefined") {
        window.ContractorsUiState = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
