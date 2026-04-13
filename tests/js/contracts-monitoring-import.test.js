"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const importControllerModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-import.js"));
const importStatusModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-import-status.js"));

function createEventTarget(initial) {
    const state = Object.assign({
        handlers: {},
        disabled: false
    }, initial || {});

    state.addEventListener = function (eventName, handler) {
        state.handlers[eventName] = handler;
    };

    return state;
}

test("monitoring import controller updates buttons from selected contract and file state", () => {
    let selectedContract = null;
    const fileInput = createEventTarget({ files: [], value: "" });
    const modeSelect = createEventTarget({ value: "strict" });
    const applyButton = createEventTarget();
    const resetButton = createEventTarget();

    const controller = importControllerModule.createController({
        fileInput: fileInput,
        modeSelect: modeSelect,
        applyButton: applyButton,
        resetButton: resetButton,
        getSelectedContract: function () { return selectedContract; },
        canEditMilestones: function () { return true; },
        importStatusModule: importStatusModule,
        parseMdrImportFile: async function () { return []; },
        parseMdrImportItemsFromRows: function () { return []; },
        importMdrForecastFactApi: async function () { return { cards: [] }; },
        getSelectedMdrCard: function () { return null; },
        buildMdrCardSelectionKey: function () { return null; },
        normalizeMdrCard: function (item) { return item; },
        setMdrCardsData: function () { },
        setSelectedMdrCardClientId: function () { },
        ensureMonitoringSelection: function () { },
        setMdrImportStatus: function () { },
        setMonitoringStatus: function () { }
    });

    controller.updateButtons();
    assert.equal(applyButton.disabled, true);
    assert.equal(resetButton.disabled, true);

    selectedContract = { id: "contract-1", status: "Active" };
    fileInput.files = [{ name: "mdr.xlsx" }];
    controller.updateButtons();

    assert.equal(applyButton.disabled, false);
    assert.equal(resetButton.disabled, false);
});

test("monitoring import controller imports MDR data and restores selected card", async () => {
    const fileInput = createEventTarget({ files: [{ name: "mdr.xlsx" }], value: "" });
    const modeSelect = createEventTarget({ value: "strict" });
    const applyButton = createEventTarget();
    const resetButton = createEventTarget();

    const importedPayloads = [];
    const statusLog = [];
    const monitoringStatusLog = [];
    let selectedClientId = null;
    let ensured = 0;
    let cardsData = null;

    const controller = importControllerModule.createController({
        fileInput: fileInput,
        modeSelect: modeSelect,
        applyButton: applyButton,
        resetButton: resetButton,
        getSelectedContract: function () {
            return { id: "contract-1", status: "Active" };
        },
        canEditMilestones: function (status) {
            return status === "Active";
        },
        importStatusModule: importStatusModule,
        parseMdrImportFile: async function () {
            return [{ row: 1 }];
        },
        parseMdrImportItemsFromRows: function () {
            return [{ sourceRowNumber: 1, rowCode: "MDR-1" }];
        },
        importMdrForecastFactApi: async function (contractId, payload) {
            importedPayloads.push({ contractId: contractId, payload: payload });
            return {
                cards: [{ key: "same-card" }],
                totalRows: 1,
                updatedRows: 1,
                conflictRows: 0,
                applied: true
            };
        },
        getSelectedMdrCard: function () {
            return { key: "same-card" };
        },
        buildMdrCardSelectionKey: function (card) {
            return card ? card.key : null;
        },
        normalizeMdrCard: function (item, index) {
            return {
                clientId: `card-${index}`,
                key: item.key
            };
        },
        setMdrCardsData: function (cards) {
            cardsData = cards;
        },
        setSelectedMdrCardClientId: function (value) {
            selectedClientId = value;
        },
        ensureMonitoringSelection: function () {
            ensured += 1;
        },
        setMdrImportStatus: function (message, isError) {
            statusLog.push({ message: message, isError: isError });
        },
        setMonitoringStatus: function (message, isError) {
            monitoringStatusLog.push({ message: message, isError: isError });
        }
    });

    await controller.importData();

    assert.equal(importedPayloads.length, 1);
    assert.equal(importedPayloads[0].contractId, "contract-1");
    assert.equal(importedPayloads[0].payload.skipConflicts, false);
    assert.equal(importedPayloads[0].payload.items.length, 1);

    assert.ok(Array.isArray(cardsData));
    assert.equal(cardsData.length, 1);
    assert.equal(selectedClientId, "card-0");
    assert.equal(ensured, 1);

    assert.equal(statusLog.length >= 2, true);
    assert.equal(statusLog.at(-1).isError, false);
    assert.match(statusLog.at(-1).message, /Импорт MDR: строк 1, обновлено 1, конфликтов 0\./);

    assert.equal(monitoringStatusLog.at(-1).isError, false);
    assert.match(monitoringStatusLog.at(-1).message, /выполнен успешно/i);
});
