"use strict";

(function () {
    function createController(options) {
        const settings = options || {};

        const fileInput = settings.fileInput;
        const modeSelect = settings.modeSelect;
        const applyButton = settings.applyButton;
        const resetButton = settings.resetButton;

        const getSelectedContract = settings.getSelectedContract;
        const canEditMilestones = settings.canEditMilestones;
        const importStatusModule = settings.importStatusModule;
        const parseMdrImportFile = settings.parseMdrImportFile;
        const parseMdrImportItemsFromRows = settings.parseMdrImportItemsFromRows;
        const importMdrForecastFactApi = settings.importMdrForecastFactApi;
        const getSelectedMdrCard = settings.getSelectedMdrCard;
        const buildMdrCardSelectionKey = settings.buildMdrCardSelectionKey;
        const normalizeMdrCard = settings.normalizeMdrCard;
        const setMdrCardsData = settings.setMdrCardsData;
        const setSelectedMdrCardClientId = settings.setSelectedMdrCardClientId;
        const ensureMonitoringSelection = settings.ensureMonitoringSelection;
        const setMdrImportStatus = settings.setMdrImportStatus;
        const setMonitoringStatus = settings.setMonitoringStatus;

        function getSelectedFile() {
            return fileInput.files && fileInput.files.length > 0
                ? fileInput.files[0]
                : null;
        }

        function updateButtons() {
            const selectedContract = getSelectedContract();
            const editable = selectedContract ? canEditMilestones(selectedContract.status) : false;
            const hasFile = Boolean(getSelectedFile());
            applyButton.disabled = !(editable && hasFile);
            resetButton.disabled = !(editable && hasFile);
        }

        function resetInput(message) {
            fileInput.value = "";
            setMdrImportStatus(message || "Импорт MDR ещё не выполнялся.", false);
        }

        async function importData() {
            const selectedContract = getSelectedContract();
            const file = getSelectedFile();
            const isEditableStatus = selectedContract ? canEditMilestones(selectedContract.status) : false;

            importStatusModule.validateImportPrerequisites({
                selectedContract: selectedContract,
                isEditableStatus: isEditableStatus,
                file: file
            });

            setMdrImportStatus("Разбор файла импорта...", false);
            const parsedRows = await parseMdrImportFile(file);
            const importItems = parseMdrImportItemsFromRows(parsedRows);
            const skipConflicts = importStatusModule.resolveImportMode(modeSelect.value) === "skip";
            const previousCardKey = buildMdrCardSelectionKey(getSelectedMdrCard());

            const result = await importMdrForecastFactApi(selectedContract.id, {
                skipConflicts: skipConflicts,
                items: importItems
            });

            const cardsPayload = Array.isArray(result?.cards) ? result.cards : [];
            const normalizedMdrCards = cardsPayload.map(function (item, index) {
                return normalizeMdrCard(item, index);
            });
            setMdrCardsData(normalizedMdrCards);

            const restoredCard = normalizedMdrCards.find(function (card) {
                return buildMdrCardSelectionKey(card) === previousCardKey;
            });
            setSelectedMdrCardClientId(restoredCard
                ? restoredCard.clientId
                : (normalizedMdrCards.length > 0 ? normalizedMdrCards[0].clientId : null));
            ensureMonitoringSelection();

            const statusResult = importStatusModule.buildImportStatuses(result, importItems.length);
            setMdrImportStatus(statusResult.mdrStatusMessage, statusResult.isError);
            setMonitoringStatus(statusResult.monitoringStatusMessage, statusResult.isError);
        }

        function bindEventHandlers() {
            fileInput.addEventListener("change", function () {
                updateButtons();
                const file = getSelectedFile();
                if (!file) {
                    setMdrImportStatus("Файл импорта не выбран.", false);
                    return;
                }

                setMdrImportStatus(`Файл выбран: ${file.name}`, false);
            });

            resetButton.addEventListener("click", function () {
                resetInput("Файл импорта очищен.");
                updateButtons();
            });

            applyButton.addEventListener("click", function () {
                applyButton.disabled = true;
                importData().catch(function (error) {
                    setMdrImportStatus(error.message || "Не удалось выполнить импорт MDR.", true);
                }).finally(function () {
                    updateButtons();
                });
            });
        }

        return {
            updateButtons: updateButtons,
            resetInput: resetInput,
            importData: importData,
            bindEventHandlers: bindEventHandlers
        };
    }

    const exportsObject = {
        createController: createController
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringImport = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
