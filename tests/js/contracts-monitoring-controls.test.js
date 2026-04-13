"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const controlsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-controls.js"));

function createGridStub() {
    const state = {};

    return {
        option: function (name, value) {
            if (arguments.length === 1) {
                return state[name];
            }

            state[name] = value;
        },
        __state: state
    };
}

function createElements() {
    return {
        monitoringSelectedElement: { textContent: "" },
        monitoringRefreshButton: { disabled: false },
        monitoringSaveButton: { disabled: false },
        monitoringControlPointSelectedElement: { textContent: "" },
        monitoringMdrCardSelectedElement: { textContent: "" },
        mdrImportFileInput: { value: "selected.csv", disabled: false, files: [{ name: "selected.csv" }] },
        mdrImportModeSelect: { disabled: false }
    };
}

test("monitoring controls resets panel when no contract is selected", () => {
    const elements = createElements();
    const gridA = createGridStub();
    const gridB = createGridStub();
    const statusLog = [];
    const importStatusLog = [];
    const controlPointsDataLog = [];
    const mdrCardsDataLog = [];
    let resetCalls = 0;
    let refreshStagesCalls = 0;
    let refreshRowsCalls = 0;
    let importButtonsCalls = 0;

    const controller = controlsModule.createController({
        elements: elements,
        monitoringKpModule: {
            formatSelectionStatus: function () { return "КП: не выбрана"; }
        },
        monitoringMdrModule: {
            formatSelectionStatus: function () { return "MDR: не выбрана"; }
        },
        getSelectedMonitoringControlPoint: function () { return null; },
        getSelectedMonitoringMdrCard: function () { return null; },
        getSelectedContract: function () { return null; },
        canEditMilestones: function () { return false; },
        localizeStatus: function (status) { return status; },
        setMonitoringStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        },
        setMdrImportStatus: function (message, isError) {
            importStatusLog.push({ message: message, isError: isError });
        },
        getImportController: function () {
            return {
                updateButtons: function () {
                    importButtonsCalls += 1;
                }
            };
        },
        getMonitoringGrids: function () {
            return [gridA, gridB];
        },
        resetMonitoringSelection: function () {
            resetCalls += 1;
        },
        setControlPointsData: function (items) {
            controlPointsDataLog.push(items);
        },
        setMdrCardsData: function (items) {
            mdrCardsDataLog.push(items);
        },
        refreshMonitoringStagesGrid: function () {
            refreshStagesCalls += 1;
        },
        refreshMonitoringRowsGrid: function () {
            refreshRowsCalls += 1;
        }
    });

    controller.updateControls();

    assert.equal(elements.monitoringSelectedElement.textContent, "Выберите договор в таблице, чтобы работать с данными мониторинга.");
    assert.equal(elements.monitoringRefreshButton.disabled, true);
    assert.equal(elements.monitoringSaveButton.disabled, true);
    assert.equal(elements.mdrImportFileInput.value, "");
    assert.equal(elements.mdrImportFileInput.disabled, true);
    assert.equal(elements.mdrImportModeSelect.disabled, true);
    assert.equal(resetCalls, 1);
    assert.deepEqual(controlPointsDataLog.at(-1), []);
    assert.deepEqual(mdrCardsDataLog.at(-1), []);
    assert.equal(refreshStagesCalls, 1);
    assert.equal(refreshRowsCalls, 1);
    assert.equal(importButtonsCalls, 1);
    assert.equal(gridA.__state["editing.allowAdding"], false);
    assert.equal(gridA.__state["editing.allowUpdating"], false);
    assert.equal(gridA.__state["editing.allowDeleting"], false);
    assert.equal(gridB.__state["editing.allowAdding"], false);
    assert.equal(statusLog.at(-1).isError, false);
    assert.match(statusLog.at(-1).message, /Мониторинг ещё не загружен/);
    assert.equal(importStatusLog.at(-1).isError, false);
    assert.match(importStatusLog.at(-1).message, /Выберите договор, чтобы выполнить импорт MDR/);
});

test("monitoring controls enables editing mode and updates selection labels", () => {
    const elements = createElements();
    const grid = createGridStub();
    const statusLog = [];
    const importStatusLog = [];
    let importButtonsCalls = 0;

    elements.mdrImportFileInput.files = [];

    const controller = controlsModule.createController({
        elements: elements,
        monitoringKpModule: {
            formatSelectionStatus: function (point) {
                return point ? `КП: ${point.name}` : "КП: не выбрана";
            }
        },
        monitoringMdrModule: {
            formatSelectionStatus: function (card) {
                return card ? `MDR: ${card.title}` : "MDR: не выбрана";
            }
        },
        getSelectedMonitoringControlPoint: function () {
            return { name: "Точка 1" };
        },
        getSelectedMonitoringMdrCard: function () {
            return { title: "Карточка 1" };
        },
        getSelectedContract: function () {
            return { contractNumber: "CNT-001", status: "Active" };
        },
        canEditMilestones: function () {
            return true;
        },
        localizeStatus: function () {
            return "Действует";
        },
        setMonitoringStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        },
        setMdrImportStatus: function (message, isError) {
            importStatusLog.push({ message: message, isError: isError });
        },
        getImportController: function () {
            return {
                updateButtons: function () {
                    importButtonsCalls += 1;
                }
            };
        },
        getMonitoringGrids: function () {
            return [grid];
        },
        resetMonitoringSelection: function () { },
        setControlPointsData: function () { },
        setMdrCardsData: function () { },
        refreshMonitoringStagesGrid: function () { },
        refreshMonitoringRowsGrid: function () { }
    });

    controller.updateControls();

    assert.equal(elements.monitoringSelectedElement.textContent, "Мониторинг: CNT-001 (Действует)");
    assert.equal(elements.monitoringRefreshButton.disabled, false);
    assert.equal(elements.monitoringSaveButton.disabled, false);
    assert.equal(elements.mdrImportFileInput.disabled, false);
    assert.equal(elements.mdrImportModeSelect.disabled, false);
    assert.equal(grid.__state["editing.allowAdding"], true);
    assert.equal(grid.__state["editing.allowUpdating"], true);
    assert.equal(grid.__state["editing.allowDeleting"], true);
    assert.equal(elements.monitoringControlPointSelectedElement.textContent, "КП: Точка 1");
    assert.equal(elements.monitoringMdrCardSelectedElement.textContent, "MDR: Карточка 1");
    assert.equal(importButtonsCalls, 1);
    assert.equal(statusLog.at(-1).isError, false);
    assert.match(statusLog.at(-1).message, /доступен для редактирования/);
    assert.equal(importStatusLog.at(-1).isError, false);
    assert.match(importStatusLog.at(-1).message, /Выберите файл Excel или CSV/);
});

test("monitoring controls switches to read-only mode for non-editable contract", () => {
    const elements = createElements();
    const grid = createGridStub();
    const statusLog = [];
    const importStatusLog = [];

    const controller = controlsModule.createController({
        elements: elements,
        monitoringKpModule: {
            formatSelectionStatus: function () { return "КП: не выбрана"; }
        },
        monitoringMdrModule: {
            formatSelectionStatus: function () { return "MDR: не выбрана"; }
        },
        getSelectedMonitoringControlPoint: function () { return null; },
        getSelectedMonitoringMdrCard: function () { return null; },
        getSelectedContract: function () {
            return { contractNumber: "CNT-002", status: "Draft" };
        },
        canEditMilestones: function () {
            return false;
        },
        localizeStatus: function () {
            return "Черновик";
        },
        setMonitoringStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        },
        setMdrImportStatus: function (message, isError) {
            importStatusLog.push({ message: message, isError: isError });
        },
        getImportController: function () { return null; },
        getMonitoringGrids: function () {
            return [grid];
        },
        resetMonitoringSelection: function () { },
        setControlPointsData: function () { },
        setMdrCardsData: function () { },
        refreshMonitoringStagesGrid: function () { },
        refreshMonitoringRowsGrid: function () { }
    });

    controller.updateControls();

    assert.equal(elements.monitoringSaveButton.disabled, true);
    assert.equal(elements.mdrImportFileInput.disabled, true);
    assert.equal(elements.mdrImportModeSelect.disabled, true);
    assert.equal(grid.__state["editing.allowAdding"], false);
    assert.equal(grid.__state["editing.allowUpdating"], false);
    assert.equal(grid.__state["editing.allowDeleting"], false);
    assert.equal(statusLog.at(-1).isError, false);
    assert.match(statusLog.at(-1).message, /только для чтения/);
    assert.equal(importStatusLog.at(-1).isError, false);
    assert.match(importStatusLog.at(-1).message, /Импорт MDR доступен только/);
});
