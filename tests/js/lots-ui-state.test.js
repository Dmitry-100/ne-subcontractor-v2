"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotsUiStateModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-ui-state.js"));

function createElementStub() {
    const classState = {};
    return {
        textContent: "",
        classState: classState,
        classList: {
            toggle: function (name, value) {
                classState[name] = Boolean(value);
            }
        }
    };
}

function createButtonStub() {
    return {
        disabled: false
    };
}

function createBaseOptions(overrides) {
    return Object.assign({
        controls: {
            statusElement: createElementStub(),
            selectedElement: createElementStub(),
            transitionStatusElement: createElementStub(),
            nextButton: createButtonStub(),
            rollbackButton: createButtonStub(),
            historyRefreshButton: createButtonStub()
        },
        helpers: {
            localizeStatus: function (status) {
                return `status:${status}`;
            },
            nextStatus: function (status) {
                return status === "Draft" ? "InProcurement" : null;
            },
            previousStatus: function (status) {
                return status === "Draft" ? null : "Draft";
            }
        }
    }, overrides || {});
}

test("lots ui-state: validates required dependencies", () => {
    assert.throws(function () {
        lotsUiStateModule.createUiState({});
    }, /controls\.statusElement/i);

    assert.throws(function () {
        lotsUiStateModule.createUiState(createBaseOptions({
            helpers: {
                localizeStatus: function () {},
                nextStatus: function () {},
                previousStatus: null
            }
        }));
    }, /helpers\.previousStatus/i);
});

test("lots ui-state: status setters update text and error classes", () => {
    const options = createBaseOptions();
    const uiState = lotsUiStateModule.createUiState(options);

    uiState.setStatus("ok", false);
    uiState.setTransitionStatus("transition error", true);

    assert.equal(options.controls.statusElement.textContent, "ok");
    assert.equal(options.controls.statusElement.classState["lots-status--error"], false);
    assert.equal(options.controls.transitionStatusElement.textContent, "transition error");
    assert.equal(options.controls.transitionStatusElement.classState["lots-transition-status--error"], true);
});

test("lots ui-state: updateSelection resets buttons and text for null lot", () => {
    const options = createBaseOptions();
    const uiState = lotsUiStateModule.createUiState(options);

    uiState.updateSelection(null);

    assert.equal(options.controls.selectedElement.textContent, "Выберите лот в таблице, чтобы управлять статусом.");
    assert.equal(options.controls.nextButton.disabled, true);
    assert.equal(options.controls.rollbackButton.disabled, true);
    assert.equal(options.controls.historyRefreshButton.disabled, true);
});

test("lots ui-state: updateSelection renders selected lot and action availability", () => {
    const options = createBaseOptions();
    const uiState = lotsUiStateModule.createUiState(options);

    uiState.updateSelection({
        id: "lot-1",
        code: "LOT-1",
        name: "Тестовый лот",
        status: "Draft"
    });

    assert.equal(
        options.controls.selectedElement.textContent,
        "Выбрано: LOT-1 · Тестовый лот · Статус: status:Draft");
    assert.equal(options.controls.nextButton.disabled, false);
    assert.equal(options.controls.rollbackButton.disabled, true);
    assert.equal(options.controls.historyRefreshButton.disabled, false);
});
