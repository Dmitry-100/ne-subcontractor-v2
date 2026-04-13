"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const elementsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-bootstrap-elements.js"));

test("contracts bootstrap elements: collectElements maps known selectors", () => {
    const map = {};
    elementsModule.requiredElementKeys.forEach(function (key) {
        map[key] = { id: key };
    });

    const selectorByKey = {
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

    const moduleRoot = {
        querySelector: function (selector) {
            const key = Object.keys(selectorByKey).find(function (candidate) {
                return selectorByKey[candidate] === selector;
            });
            return key ? map[key] : null;
        }
    };

    const elements = elementsModule.collectElements(moduleRoot);

    assert.equal(Object.keys(elements).length, elementsModule.requiredElementKeys.length);
    assert.equal(elements.gridElement.id, "gridElement");
    assert.equal(elements.executionGridElement.id, "executionGridElement");
    assert.equal(elements.mdrImportStatusElement.id, "mdrImportStatusElement");
});

test("contracts bootstrap elements: hasRequiredElements validates element presence", () => {
    const complete = {};
    elementsModule.requiredElementKeys.forEach(function (key) {
        complete[key] = {};
    });

    assert.equal(elementsModule.hasRequiredElements(complete), true);

    const missing = Object.assign({}, complete);
    missing.monitoringMdrRowsGridElement = null;
    assert.equal(elementsModule.hasRequiredElements(missing), false);
});
