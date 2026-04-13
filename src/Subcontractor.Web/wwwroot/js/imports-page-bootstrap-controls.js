"use strict";

(function () {
    const CONTROL_SELECTORS = {
        fileInput: "[data-imports-file]",
        notesInput: "[data-imports-notes]",
        parseButton: "[data-imports-parse]",
        resetButton: "[data-imports-reset]",
        uploadButton: "[data-imports-upload]",
        uploadStatusElement: "[data-imports-upload-status]",
        mappingSection: "[data-imports-mapping]",
        hasHeaderCheckbox: "[data-imports-has-header]",
        mappingGrid: "[data-imports-mapping-grid]",
        applyMappingButton: "[data-imports-apply-mapping]",
        mappingStatusElement: "[data-imports-mapping-status]",
        parseSummaryElement: "[data-imports-parse-summary]",
        previewWrap: "[data-imports-preview-wrap]",
        previewTable: "[data-imports-preview-table]",
        refreshBatchesButton: "[data-imports-refresh]",
        batchesStatusElement: "[data-imports-batches-status]",
        batchesTable: "[data-imports-batches-table]",
        detailsElement: "[data-imports-details]",
        detailsTitleElement: "[data-imports-details-title]",
        detailsSummaryElement: "[data-imports-details-summary]",
        downloadInvalidReportButton: "[data-imports-download-invalid-report]",
        downloadFullReportButton: "[data-imports-download-full-report]",
        downloadLotReconciliationReportButton: "[data-imports-download-lot-reconciliation-report]",
        transitionTargetSelect: "[data-imports-target-status]",
        transitionReasonInput: "[data-imports-transition-reason]",
        transitionApplyButton: "[data-imports-apply-transition]",
        transitionStatusElement: "[data-imports-transition-status]",
        historyRefreshButton: "[data-imports-history-refresh]",
        invalidWrapElement: "[data-imports-invalid-wrap]",
        invalidTable: "[data-imports-invalid-table]",
        historyWrapElement: "[data-imports-history-wrap]",
        historyTable: "[data-imports-history-table]",
        xmlSourceInput: "[data-imports-xml-source]",
        xmlExternalIdInput: "[data-imports-xml-external-id]",
        xmlFileNameInput: "[data-imports-xml-file-name]",
        xmlContentInput: "[data-imports-xml-content]",
        xmlQueueButton: "[data-imports-xml-queue]",
        xmlRefreshButton: "[data-imports-xml-refresh]",
        xmlStatusElement: "[data-imports-xml-status]",
        xmlTable: "[data-imports-xml-table]",
        lotBuildButton: "[data-imports-lot-build]",
        lotApplyButton: "[data-imports-lot-apply]",
        lotStatusElement: "[data-imports-lot-status]",
        lotGroupsTable: "[data-imports-lot-groups-table]",
        lotSelectedTable: "[data-imports-lot-selected-table]"
    };

    function resolveControls(moduleRoot, controlSelectors) {
        if (!moduleRoot || typeof moduleRoot.querySelector !== "function") {
            return null;
        }

        const selectors = controlSelectors || CONTROL_SELECTORS;
        const controls = {};
        const controlNames = Object.keys(selectors);

        for (let index = 0; index < controlNames.length; index += 1) {
            const controlName = controlNames[index];
            controls[controlName] = moduleRoot.querySelector(selectors[controlName]);
            if (!controls[controlName]) {
                return null;
            }
        }

        return controls;
    }

    const exportsObject = {
        CONTROL_SELECTORS: CONTROL_SELECTORS,
        resolveControls: resolveControls
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBootstrapControls = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
