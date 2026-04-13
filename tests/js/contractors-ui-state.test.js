"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractorsUiStateModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-ui-state.js"));

function createElement() {
    return {
        textContent: "",
        disabled: false,
        classState: {},
        classList: {
            toggle: function (name, enabled) {
                this._owner.classState[name] = Boolean(enabled);
            },
            _owner: null
        }
    };
}

function createControls() {
    function withClassOwner(element) {
        element.classList._owner = element;
        return element;
    }

    return {
        statusElement: withClassOwner(createElement()),
        ratingStatusElement: withClassOwner(createElement()),
        selectedElement: withClassOwner(createElement()),
        historyStatusElement: withClassOwner(createElement()),
        analyticsStatusElement: withClassOwner(createElement()),
        refreshButton: createElement(),
        recalcAllButton: createElement(),
        recalcSelectedButton: createElement(),
        reloadModelButton: createElement(),
        saveModelButton: createElement(),
        manualSaveButton: createElement(),
        versionCodeInput: createElement(),
        modelNameInput: createElement(),
        modelNotesInput: createElement(),
        weightDeliveryInput: createElement(),
        weightCommercialInput: createElement(),
        weightClaimInput: createElement(),
        weightManualInput: createElement(),
        weightWorkloadInput: createElement(),
        manualScoreInput: createElement(),
        manualCommentInput: createElement()
    };
}

test("contractors ui-state: validates required dependencies", () => {
    assert.throws(function () {
        contractorsUiStateModule.createUiState({});
    }, /getSelectedContractor/i);

    assert.throws(function () {
        contractorsUiStateModule.createUiState({
            controls: {},
            getSelectedContractor: function () { return null; }
        });
    }, /statusElement/i);
});

test("contractors ui-state: status setters update text and error classes", () => {
    const controls = createControls();
    const uiState = contractorsUiStateModule.createUiState({
        controls: controls,
        getSelectedContractor: function () { return null; }
    });

    uiState.setStatus("ok", false);
    uiState.setRatingStatus("rating error", true);
    uiState.setHistoryStatus("history ok", false);
    uiState.setAnalyticsStatus("analytics error", true);

    assert.equal(controls.statusElement.textContent, "ok");
    assert.equal(controls.statusElement.classState["contractors-status--error"], false);
    assert.equal(controls.ratingStatusElement.textContent, "rating error");
    assert.equal(controls.ratingStatusElement.classState["contractors-rating-status--error"], true);
    assert.equal(controls.historyStatusElement.classState["contractors-rating-status--error"], false);
    assert.equal(controls.analyticsStatusElement.classState["contractors-rating-status--error"], true);
});

test("contractors ui-state: setUiBusy toggles controls and selection state", () => {
    const controls = createControls();
    let selectedContractor = null;
    const uiState = contractorsUiStateModule.createUiState({
        controls: controls,
        getSelectedContractor: function () {
            return selectedContractor;
        }
    });

    uiState.setUiBusy(true);
    assert.equal(uiState.isUiBusy(), true);
    assert.equal(controls.refreshButton.disabled, true);
    assert.equal(controls.selectedElement.textContent, "Выберите подрядчика в таблице для просмотра истории и ручной оценки.");
    assert.equal(controls.recalcSelectedButton.disabled, true);
    assert.equal(controls.manualSaveButton.disabled, true);

    selectedContractor = {
        name: "ООО Тест",
        currentRating: 3.4567,
        currentLoadPercent: 78.125
    };
    uiState.updateSelectionUi();
    assert.equal(
        controls.selectedElement.textContent,
        "Выбран: ООО Тест · Рейтинг: 3.457 · Загрузка: 78.13%");
    assert.equal(controls.recalcSelectedButton.disabled, true);
    assert.equal(controls.manualSaveButton.disabled, true);

    uiState.setUiBusy(false);
    assert.equal(uiState.isUiBusy(), false);
    assert.equal(controls.refreshButton.disabled, false);
    assert.equal(controls.recalcSelectedButton.disabled, false);
    assert.equal(controls.manualSaveButton.disabled, false);
});
