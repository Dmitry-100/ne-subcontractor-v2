"use strict";

(function () {
    function createController(options) {
        const settings = options || {};
        const elements = settings.elements || {};

        const monitoringSelectedElement = elements.monitoringSelectedElement;
        const monitoringRefreshButton = elements.monitoringRefreshButton;
        const monitoringSaveButton = elements.monitoringSaveButton;
        const monitoringControlPointSelectedElement = elements.monitoringControlPointSelectedElement;
        const monitoringMdrCardSelectedElement = elements.monitoringMdrCardSelectedElement;
        const mdrImportFileInput = elements.mdrImportFileInput;
        const mdrImportModeSelect = elements.mdrImportModeSelect;

        const monitoringKpModule = settings.monitoringKpModule;
        const monitoringMdrModule = settings.monitoringMdrModule;
        const getSelectedMonitoringControlPoint = settings.getSelectedMonitoringControlPoint;
        const getSelectedMonitoringMdrCard = settings.getSelectedMonitoringMdrCard;
        const getSelectedContract = settings.getSelectedContract;
        const canEditMilestones = settings.canEditMilestones;
        const localizeStatus = settings.localizeStatus;
        const setMonitoringStatus = settings.setMonitoringStatus;
        const setMdrImportStatus = settings.setMdrImportStatus;
        const getImportController = settings.getImportController;
        const getMonitoringGrids = settings.getMonitoringGrids;
        const resetMonitoringSelection = settings.resetMonitoringSelection;
        const setControlPointsData = settings.setControlPointsData;
        const setMdrCardsData = settings.setMdrCardsData;
        const refreshMonitoringStagesGrid = settings.refreshMonitoringStagesGrid;
        const refreshMonitoringRowsGrid = settings.refreshMonitoringRowsGrid;

        function setMonitoringGridEditing(editable) {
            const grids = typeof getMonitoringGrids === "function"
                ? getMonitoringGrids()
                : [];
            const source = Array.isArray(grids) ? grids : [];

            source.forEach(function (grid) {
                if (!grid) {
                    return;
                }

                grid.option("editing.allowAdding", editable);
                grid.option("editing.allowUpdating", editable);
                grid.option("editing.allowDeleting", editable);
            });
        }

        function refreshSelectionStatus() {
            const selectedControlPoint = typeof getSelectedMonitoringControlPoint === "function"
                ? getSelectedMonitoringControlPoint()
                : null;
            const selectedMdrCard = typeof getSelectedMonitoringMdrCard === "function"
                ? getSelectedMonitoringMdrCard()
                : null;

            monitoringControlPointSelectedElement.textContent = monitoringKpModule.formatSelectionStatus(selectedControlPoint);
            monitoringMdrCardSelectedElement.textContent = monitoringMdrModule.formatSelectionStatus(selectedMdrCard);
        }

        function updateControls() {
            const selectedContract = getSelectedContract();
            const importController = typeof getImportController === "function"
                ? getImportController()
                : null;

            if (!selectedContract) {
                monitoringSelectedElement.textContent = "Выберите договор в таблице, чтобы работать с данными мониторинга.";
                monitoringRefreshButton.disabled = true;
                monitoringSaveButton.disabled = true;
                mdrImportFileInput.value = "";
                mdrImportFileInput.disabled = true;
                mdrImportModeSelect.disabled = true;
                if (importController && typeof importController.updateButtons === "function") {
                    importController.updateButtons();
                }
                resetMonitoringSelection();
                setControlPointsData([]);
                setMdrCardsData([]);
                refreshMonitoringStagesGrid();
                refreshMonitoringRowsGrid();
                setMonitoringGridEditing(false);
                setMonitoringStatus("Мониторинг ещё не загружен.", false);
                setMdrImportStatus("Выберите договор, чтобы выполнить импорт MDR.", false);
                return;
            }

            const editable = canEditMilestones(selectedContract.status);
            monitoringSelectedElement.textContent =
                `Мониторинг: ${selectedContract.contractNumber} (${localizeStatus(selectedContract.status)})`;
            monitoringRefreshButton.disabled = false;
            monitoringSaveButton.disabled = !editable;
            mdrImportFileInput.disabled = !editable;
            mdrImportModeSelect.disabled = !editable;
            if (importController && typeof importController.updateButtons === "function") {
                importController.updateButtons();
            }
            setMonitoringGridEditing(editable);
            refreshSelectionStatus();

            if (editable) {
                setMonitoringStatus("Мониторинг доступен для редактирования в табличном режиме.", false);
                if (!mdrImportFileInput.files || mdrImportFileInput.files.length === 0) {
                    setMdrImportStatus("Выберите файл Excel или CSV и нажмите «Импортировать в MDR».", false);
                }
            } else {
                setMonitoringStatus("Для текущего статуса мониторинг доступен только для чтения.", false);
                setMdrImportStatus("Импорт MDR доступен только для договоров в статусах «Подписан» и «Действует».", false);
            }
        }

        return {
            setMonitoringGridEditing: setMonitoringGridEditing,
            refreshSelectionStatus: refreshSelectionStatus,
            updateControls: updateControls
        };
    }

    const exportsObject = {
        createController: createController
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringControls = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
