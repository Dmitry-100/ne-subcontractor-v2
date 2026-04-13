"use strict";

(function () {
    const selectorsByElementKey = {
        gridElement: "[data-contracts-grid]",
        statusElement: "[data-contracts-status]",
        selectedElement: "[data-contracts-selected]",
        transitionStatusElement: "[data-contracts-transition-status]",
        transitionTargetSelect: "[data-contracts-target]",
        transitionReasonInput: "[data-contracts-reason]",
        transitionApplyButton: "[data-contracts-apply]",
        historyRefreshButton: "[data-contracts-history-refresh]",
        historyGridElement: "[data-contracts-history-grid]",
        draftStatusElement: "[data-contracts-draft-status]",
        draftProcedureIdInput: "[data-contracts-draft-procedure-id]",
        draftNumberInput: "[data-contracts-draft-number]",
        draftSigningDateInput: "[data-contracts-draft-signing-date]",
        draftStartDateInput: "[data-contracts-draft-start-date]",
        draftEndDateInput: "[data-contracts-draft-end-date]",
        draftCreateButton: "[data-contracts-draft-create]",
        executionSelectedElement: "[data-contracts-execution-selected]",
        executionSummaryElement: "[data-contracts-execution-summary]",
        executionStatusElement: "[data-contracts-execution-status]",
        executionRefreshButton: "[data-contracts-execution-refresh]",
        executionGridElement: "[data-contracts-execution-grid]",
        monitoringSelectedElement: "[data-contracts-monitoring-selected]",
        monitoringStatusElement: "[data-contracts-monitoring-status]",
        monitoringRefreshButton: "[data-contracts-monitoring-refresh]",
        monitoringSaveButton: "[data-contracts-monitoring-save]",
        monitoringControlPointsGridElement: "[data-contracts-monitoring-control-points-grid]",
        monitoringStagesGridElement: "[data-contracts-monitoring-stages-grid]",
        monitoringMdrCardsGridElement: "[data-contracts-monitoring-mdr-cards-grid]",
        monitoringMdrRowsGridElement: "[data-contracts-monitoring-mdr-rows-grid]",
        monitoringControlPointSelectedElement: "[data-contracts-monitoring-control-point-selected]",
        monitoringMdrCardSelectedElement: "[data-contracts-monitoring-mdr-card-selected]",
        mdrImportFileInput: "[data-contracts-mdr-import-file]",
        mdrImportModeSelect: "[data-contracts-mdr-import-mode]",
        mdrImportApplyButton: "[data-contracts-mdr-import-apply]",
        mdrImportResetButton: "[data-contracts-mdr-import-reset]",
        mdrImportStatusElement: "[data-contracts-mdr-import-status]"
    };

    const requiredElementKeys = Object.keys(selectorsByElementKey);

    function collectElements(moduleRoot) {
        const elements = {};
        requiredElementKeys.forEach(function (key) {
            elements[key] = moduleRoot.querySelector(selectorsByElementKey[key]);
        });

        return elements;
    }

    function hasRequiredElements(elements) {
        return requiredElementKeys.every(function (key) {
            return Boolean(elements[key]);
        });
    }

    const exportsObject = {
        requiredElementKeys: requiredElementKeys,
        collectElements: collectElements,
        hasRequiredElements: hasRequiredElements
    };

    if (typeof window !== "undefined") {
        window.ContractsBootstrapElements = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
