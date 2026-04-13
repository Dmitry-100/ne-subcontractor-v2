"use strict";

(function () {
    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function supportsHiddenFlag(value) {
        return isNodeLike(value) && typeof value.hidden !== "undefined";
    }

    function supportsDisabledFlag(value) {
        return isNodeLike(value) && typeof value.disabled !== "undefined";
    }

    function supportsTextContent(value) {
        return isNodeLike(value) && typeof value.textContent !== "undefined";
    }

    function createMappingOrchestrationService(options) {
        const settings = options || {};
        const fileInput = settings.fileInput || null;
        const hasHeaderCheckbox = settings.hasHeaderCheckbox || null;
        const mappingSection = settings.mappingSection || null;
        const parseSummaryElement = settings.parseSummaryElement || null;
        const uploadButton = settings.uploadButton || null;
        const mappingUi = settings.mappingUi || null;
        const mappingService = settings.mappingService || null;
        const fileParser = settings.fileParser || null;

        const getRawRows = settings.getRawRows;
        const setRawRows = settings.setRawRows;
        const setSourceFileName = settings.setSourceFileName;
        const getDataStartRowIndex = settings.getDataStartRowIndex;
        const setDataStartRowIndex = settings.setDataStartRowIndex;
        const getMappingSelection = settings.getMappingSelection;
        const setMappingSelection = settings.setMappingSelection;
        const setSourceColumns = settings.setSourceColumns;
        const setParsedRows = settings.setParsedRows;

        const setMappingStatus = settings.setMappingStatus;
        const setUploadStatus = settings.setUploadStatus;

        if (!isNodeLike(fileInput)) {
            throw new Error("createMappingOrchestrationService: fileInput is required.");
        }

        if (!isNodeLike(hasHeaderCheckbox) || typeof hasHeaderCheckbox.checked === "undefined") {
            throw new Error("createMappingOrchestrationService: hasHeaderCheckbox is required.");
        }

        if (!supportsHiddenFlag(mappingSection)) {
            throw new Error("createMappingOrchestrationService: mappingSection with hidden flag is required.");
        }

        if (!supportsHiddenFlag(parseSummaryElement) || !supportsTextContent(parseSummaryElement)) {
            throw new Error("createMappingOrchestrationService: parseSummaryElement is required.");
        }

        if (!supportsDisabledFlag(uploadButton)) {
            throw new Error("createMappingOrchestrationService: uploadButton is required.");
        }

        if (!mappingUi ||
            typeof mappingUi.readMappingFromUi !== "function" ||
            typeof mappingUi.renderPreviewTable !== "function" ||
            typeof mappingUi.renderMappingGrid !== "function") {
            throw new Error("createMappingOrchestrationService: mappingUi service is required.");
        }

        if (!mappingService ||
            typeof mappingService.applyMapping !== "function" ||
            typeof mappingService.buildMappingFromRaw !== "function") {
            throw new Error("createMappingOrchestrationService: mappingService is required.");
        }

        if (!fileParser || typeof fileParser.parse !== "function") {
            throw new Error("createMappingOrchestrationService: fileParser.parse is required.");
        }

        if (typeof getRawRows !== "function" ||
            typeof setRawRows !== "function" ||
            typeof setSourceFileName !== "function" ||
            typeof getDataStartRowIndex !== "function" ||
            typeof setDataStartRowIndex !== "function" ||
            typeof getMappingSelection !== "function" ||
            typeof setMappingSelection !== "function" ||
            typeof setSourceColumns !== "function" ||
            typeof setParsedRows !== "function") {
            throw new Error("createMappingOrchestrationService: state getters/setters are required.");
        }

        if (typeof setMappingStatus !== "function" || typeof setUploadStatus !== "function") {
            throw new Error("createMappingOrchestrationService: status callbacks are required.");
        }

        function applyMappingToRows() {
            const mapping = mappingUi.readMappingFromUi();
            const result = mappingService.applyMapping(getRawRows(), getDataStartRowIndex(), mapping);

            setMappingSelection(mapping);
            setParsedRows(result.rows);
            mappingUi.renderPreviewTable(result.rows);

            parseSummaryElement.hidden = false;
            parseSummaryElement.textContent = result.parseSummaryText;
            uploadButton.disabled = result.rows.length === 0;

            setMappingStatus(result.mappingStatusMessage, false);
            setUploadStatus(result.uploadStatusMessage, false);

            return result;
        }

        function rebuildMappingFromRaw(keepPreviousSelection) {
            const result = mappingService.buildMappingFromRaw(
                getRawRows(),
                Boolean(hasHeaderCheckbox.checked),
                getMappingSelection(),
                keepPreviousSelection);

            setSourceColumns(result.sourceColumns);
            setDataStartRowIndex(result.dataStartRowIndex);
            setMappingSelection(result.mapping);
            mappingUi.renderMappingGrid(result.sourceColumns, result.mapping);

            setMappingStatus(result.mappingStatusMessage, false);
            return result;
        }

        async function parseSelectedFile() {
            const file = fileInput.files && fileInput.files[0];
            const parseResult = await fileParser.parse(file);

            setRawRows(parseResult.rawRows);
            setSourceFileName(parseResult.fileName);
            mappingSection.hidden = false;

            rebuildMappingFromRaw(false);
            applyMappingToRows();

            return parseResult;
        }

        return {
            applyMappingToRows: applyMappingToRows,
            rebuildMappingFromRaw: rebuildMappingFromRaw,
            parseSelectedFile: parseSelectedFile
        };
    }

    const exportsObject = {
        createMappingOrchestrationService: createMappingOrchestrationService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageMappingOrchestration = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
