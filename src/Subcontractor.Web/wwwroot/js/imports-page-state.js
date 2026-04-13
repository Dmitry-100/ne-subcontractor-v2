"use strict";

(function () {
    function createStateStore(options) {
        const settings = options || {};
        const clearTimeoutHandle = typeof settings.clearTimeout === "function"
            ? settings.clearTimeout
            : function (handle) {
                if (typeof clearTimeout === "function") {
                    clearTimeout(handle);
                }
            };

        let parsedRows = [];
        let sourceFileName = "";
        let rawRows = [];
        let sourceColumns = [];
        let dataStartRowIndex = 1;
        let mappingSelection = {};
        let selectedBatch = null;
        let detailsPollHandle = null;
        let lotRecommendations = null;
        let lotRecommendationsBatchId = null;
        let lotSelectionsByKey = new Map();

        function getParsedRows() {
            return parsedRows;
        }

        function setParsedRows(value) {
            parsedRows = value;
        }

        function getSourceFileName() {
            return sourceFileName;
        }

        function setSourceFileName(value) {
            sourceFileName = value;
        }

        function getRawRows() {
            return rawRows;
        }

        function setRawRows(value) {
            rawRows = value;
        }

        function getSourceColumns() {
            return sourceColumns;
        }

        function setSourceColumns(value) {
            sourceColumns = value;
        }

        function getDataStartRowIndex() {
            return dataStartRowIndex;
        }

        function setDataStartRowIndex(value) {
            dataStartRowIndex = value;
        }

        function getMappingSelection() {
            return mappingSelection;
        }

        function setMappingSelection(value) {
            mappingSelection = value;
        }

        function getSelectedBatch() {
            return selectedBatch;
        }

        function setSelectedBatch(value) {
            selectedBatch = value;
        }

        function getSelectedBatchId() {
            return selectedBatch && selectedBatch.id ? selectedBatch.id : null;
        }

        function getDetailsPollHandle() {
            return detailsPollHandle;
        }

        function setDetailsPollHandle(value) {
            detailsPollHandle = value;
        }

        function clearDetailsPoll() {
            if (detailsPollHandle) {
                clearTimeoutHandle(detailsPollHandle);
                detailsPollHandle = null;
            }
        }

        function getLotRecommendations() {
            return lotRecommendations;
        }

        function setLotRecommendations(value) {
            lotRecommendations = value;
        }

        function getLotRecommendationsBatchId() {
            return lotRecommendationsBatchId;
        }

        function setLotRecommendationsBatchId(value) {
            lotRecommendationsBatchId = value;
        }

        function getLotSelectionsByKey() {
            return lotSelectionsByKey;
        }

        function setLotSelectionsByKey(value) {
            lotSelectionsByKey = value;
        }

        return {
            getParsedRows: getParsedRows,
            setParsedRows: setParsedRows,
            getSourceFileName: getSourceFileName,
            setSourceFileName: setSourceFileName,
            getRawRows: getRawRows,
            setRawRows: setRawRows,
            getSourceColumns: getSourceColumns,
            setSourceColumns: setSourceColumns,
            getDataStartRowIndex: getDataStartRowIndex,
            setDataStartRowIndex: setDataStartRowIndex,
            getMappingSelection: getMappingSelection,
            setMappingSelection: setMappingSelection,
            getSelectedBatch: getSelectedBatch,
            setSelectedBatch: setSelectedBatch,
            getSelectedBatchId: getSelectedBatchId,
            getDetailsPollHandle: getDetailsPollHandle,
            setDetailsPollHandle: setDetailsPollHandle,
            clearDetailsPoll: clearDetailsPoll,
            getLotRecommendations: getLotRecommendations,
            setLotRecommendations: setLotRecommendations,
            getLotRecommendationsBatchId: getLotRecommendationsBatchId,
            setLotRecommendationsBatchId: setLotRecommendationsBatchId,
            getLotSelectionsByKey: getLotSelectionsByKey,
            setLotSelectionsByKey: setLotSelectionsByKey
        };
    }

    const exportsObject = {
        createStateStore: createStateStore
    };

    if (typeof window !== "undefined") {
        window.ImportsPageState = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
