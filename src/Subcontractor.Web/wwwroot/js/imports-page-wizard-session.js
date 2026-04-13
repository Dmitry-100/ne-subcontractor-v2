"use strict";

(function () {
    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function supportsValue(value) {
        return isNodeLike(value) && typeof value.value !== "undefined";
    }

    function supportsHidden(value) {
        return isNodeLike(value) && typeof value.hidden !== "undefined";
    }

    function supportsDisabled(value) {
        return isNodeLike(value) && typeof value.disabled !== "undefined";
    }

    function supportsTextContent(value) {
        return isNodeLike(value) && typeof value.textContent !== "undefined";
    }

    function createWizardSessionService(options) {
        const settings = options || {};
        const fileInput = settings.fileInput || null;
        const notesInput = settings.notesInput || null;
        const hasHeaderCheckbox = settings.hasHeaderCheckbox || null;
        const transitionReasonInput = settings.transitionReasonInput || null;
        const mappingGrid = settings.mappingGrid || null;
        const mappingSection = settings.mappingSection || null;
        const uploadButton = settings.uploadButton || null;
        const previewWrap = settings.previewWrap || null;
        const parseSummaryElement = settings.parseSummaryElement || null;
        const detailsElement = settings.detailsElement || null;
        const historyWrapElement = settings.historyWrapElement || null;
        const invalidWrapElement = settings.invalidWrapElement || null;

        const getParsedRows = settings.getParsedRows;
        const setParsedRows = settings.setParsedRows;
        const getSourceFileName = settings.getSourceFileName;
        const setSourceFileName = settings.setSourceFileName;
        const setRawRows = settings.setRawRows;
        const setSourceColumns = settings.setSourceColumns;
        const setDataStartRowIndex = settings.setDataStartRowIndex;
        const setMappingSelection = settings.setMappingSelection;
        const setSelectedBatch = settings.setSelectedBatch;
        const clearDetailsPoll = settings.clearDetailsPoll;

        const buildQueuedBatchRequest = settings.buildQueuedBatchRequest;
        const createQueuedBatch = settings.createQueuedBatch;
        const buildQueuedBatchSuccessStatus = settings.buildQueuedBatchSuccessStatus;
        const loadBatches = settings.loadBatches;
        const queuedEndpoint = settings.queuedEndpoint || "";

        const setMappingStatus = settings.setMappingStatus;
        const setWorkflowActionsEnabled = settings.setWorkflowActionsEnabled;
        const setTransitionStatus = settings.setTransitionStatus;
        const clearLotRecommendations = settings.clearLotRecommendations;
        const setUploadStatus = settings.setUploadStatus;

        if (!supportsValue(fileInput) ||
            !supportsValue(notesInput) ||
            !isNodeLike(hasHeaderCheckbox) ||
            typeof hasHeaderCheckbox.checked === "undefined" ||
            !supportsValue(transitionReasonInput) ||
            !supportsTextContent(mappingGrid) ||
            !supportsHidden(mappingSection) ||
            !supportsDisabled(uploadButton) ||
            !supportsHidden(previewWrap) ||
            !supportsHidden(parseSummaryElement) ||
            !supportsTextContent(parseSummaryElement) ||
            !supportsHidden(detailsElement) ||
            !supportsHidden(historyWrapElement) ||
            !supportsHidden(invalidWrapElement)) {
            throw new Error("createWizardSessionService: required controls are missing.");
        }

        if (typeof getParsedRows !== "function" ||
            typeof setParsedRows !== "function" ||
            typeof getSourceFileName !== "function" ||
            typeof setSourceFileName !== "function" ||
            typeof setRawRows !== "function" ||
            typeof setSourceColumns !== "function" ||
            typeof setDataStartRowIndex !== "function" ||
            typeof setMappingSelection !== "function" ||
            typeof setSelectedBatch !== "function" ||
            typeof clearDetailsPoll !== "function") {
            throw new Error("createWizardSessionService: state access callbacks are required.");
        }

        if (typeof buildQueuedBatchRequest !== "function" ||
            typeof createQueuedBatch !== "function" ||
            typeof buildQueuedBatchSuccessStatus !== "function" ||
            typeof loadBatches !== "function") {
            throw new Error("createWizardSessionService: upload callbacks are required.");
        }

        if (typeof setMappingStatus !== "function" ||
            typeof setWorkflowActionsEnabled !== "function" ||
            typeof setTransitionStatus !== "function" ||
            typeof clearLotRecommendations !== "function" ||
            typeof setUploadStatus !== "function") {
            throw new Error("createWizardSessionService: status/reset callbacks are required.");
        }

        async function uploadBatch() {
            const payload = buildQueuedBatchRequest({
                parsedRows: getParsedRows(),
                sourceFileName: getSourceFileName(),
                notes: notesInput.value
            });
            const created = await createQueuedBatch(queuedEndpoint, payload);

            setUploadStatus(buildQueuedBatchSuccessStatus(created), false);
            await loadBatches(created.id);
            return created;
        }

        function resetWizard() {
            setParsedRows([]);
            setSourceFileName("");
            setRawRows([]);
            setSourceColumns([]);
            setDataStartRowIndex(1);
            setMappingSelection({});
            setSelectedBatch(null);
            clearDetailsPoll();

            fileInput.value = "";
            notesInput.value = "";
            hasHeaderCheckbox.checked = true;
            transitionReasonInput.value = "";

            mappingGrid.innerHTML = "";
            mappingSection.hidden = true;
            setMappingStatus("", false);

            uploadButton.disabled = true;
            previewWrap.hidden = true;
            parseSummaryElement.hidden = true;
            parseSummaryElement.textContent = "";
            detailsElement.hidden = true;
            historyWrapElement.hidden = true;
            invalidWrapElement.hidden = true;
            setWorkflowActionsEnabled(false);
            setTransitionStatus("Выберите пакет для выполнения действия процесса.", false);
            clearLotRecommendations("Выберите пакет для построения рекомендаций.");

            setUploadStatus("Выберите исходный файл и нажмите «Разобрать файл».", false);
        }

        return {
            uploadBatch: uploadBatch,
            resetWizard: resetWizard
        };
    }

    const exportsObject = {
        createWizardSessionService: createWizardSessionService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageWizardSession = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
