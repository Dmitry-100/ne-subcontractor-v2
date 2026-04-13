"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpers = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-transition-helpers.js"));

function createButtonControl() {
    return {
        disabled: false,
        addEventListener: function () {
        }
    };
}

function createValueControl(initialValue) {
    return {
        value: initialValue || ""
    };
}

function createSelectControl() {
    const options = [];
    return {
        innerHTML: "",
        disabled: false,
        value: "",
        options: options,
        appendChild: function (option) {
            options.push(option);
        }
    };
}

function createHistoryGrid() {
    return {
        option: function () {
        }
    };
}

test("procedures transition helpers: validateControls accepts complete controls set", () => {
    assert.doesNotThrow(() => helpers.validateControls({
        targetSelect: createSelectControl(),
        reasonInput: createValueControl(),
        applyButton: createButtonControl(),
        historyRefreshButton: createButtonControl(),
        historyGrid: createHistoryGrid()
    }));
});

test("procedures transition helpers: validateControls rejects incomplete controls set", () => {
    assert.throws(
        () => helpers.validateControls({
            targetSelect: createSelectControl(),
            reasonInput: createValueControl()
        }),
        /required controls are missing/);
});

test("procedures transition helpers: validateDependencies rejects invalid api dependencies", () => {
    assert.throws(
        () => helpers.validateDependencies({
            endpoint: "/api/procedures",
            apiClient: {},
            transitionMap: {},
            localizeStatus: function () {
            },
            validateTransitionRequest: function () {
            },
            buildTransitionSuccessMessage: function () {
            },
            getSelectedProcedure: function () {
            },
            setTransitionStatus: function () {
            },
            refreshGridAndReselect: function () {
            },
            createOption: function () {
            }
        }),
        /api dependencies are invalid/);
});

test("procedures transition helpers: renderTargets clears and disables controls for null procedure", () => {
    const targetSelect = createSelectControl();
    targetSelect.options.push({ value: "Old", textContent: "old" });
    targetSelect.innerHTML = "<option>old</option>";

    const applyButton = createButtonControl();
    const historyRefreshButton = createButtonControl();

    helpers.renderTargets({
        targetSelect: targetSelect,
        applyButton: applyButton,
        historyRefreshButton: historyRefreshButton,
        transitionMap: {
            Created: ["DocumentsPreparation"]
        },
        localizeStatus: function (status) {
            return status;
        },
        createOption: function (value, text) {
            return {
                value: value,
                textContent: text
            };
        }
    }, null);

    assert.equal(targetSelect.options.length, 0);
    assert.equal(targetSelect.innerHTML, "");
    assert.equal(targetSelect.disabled, true);
    assert.equal(applyButton.disabled, true);
    assert.equal(historyRefreshButton.disabled, true);
});

test("procedures transition helpers: renderTargets appends localized targets", () => {
    const targetSelect = createSelectControl();
    const applyButton = createButtonControl();
    const historyRefreshButton = createButtonControl();

    helpers.renderTargets({
        targetSelect: targetSelect,
        applyButton: applyButton,
        historyRefreshButton: historyRefreshButton,
        transitionMap: {
            Created: ["DocumentsPreparation", "Canceled"]
        },
        localizeStatus: function (status) {
            return `Локализовано:${status}`;
        },
        createOption: function (value, text) {
            return {
                value: value,
                textContent: text
            };
        }
    }, {
        id: "p-1",
        status: "Created"
    });

    assert.equal(targetSelect.disabled, false);
    assert.equal(applyButton.disabled, false);
    assert.equal(historyRefreshButton.disabled, false);
    assert.equal(targetSelect.value, "DocumentsPreparation");
    assert.deepEqual(targetSelect.options, [
        {
            value: "DocumentsPreparation",
            textContent: "Локализовано:DocumentsPreparation"
        },
        {
            value: "Canceled",
            textContent: "Локализовано:Canceled"
        }
    ]);
});
