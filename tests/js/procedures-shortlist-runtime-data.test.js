"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dataModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-shortlist-runtime-data.js"));

function createGrid() {
    const calls = [];
    return {
        calls: calls,
        option: function (key, value) {
            calls.push({ key: key, value: value });
        }
    };
}

function createSettings(overrides) {
    const shortlistGrid = createGrid();
    const shortlistAdjustmentsGrid = createGrid();
    const statusCalls = [];
    const adjustmentsStatusCalls = [];
    const recommendationsCalls = [];
    const adjustmentsCalls = [];
    const state = {
        selected: null
    };

    const settings = {
        maxIncludedInput: { disabled: false, value: "5" },
        adjustmentReasonInput: { disabled: false, value: "" },
        buildButton: { disabled: false },
        applyButton: { disabled: false },
        adjustmentsRefreshButton: { disabled: false },
        shortlistGrid: shortlistGrid,
        shortlistAdjustmentsGrid: shortlistAdjustmentsGrid,
        endpoint: "/api/procedures",
        apiClient: {
            getShortlistRecommendations: async function (endpoint, procedureId) {
                recommendationsCalls.push({ endpoint: endpoint, procedureId: procedureId });
                return [{ contractorId: "c-1", isRecommended: true }];
            },
            getShortlistAdjustments: async function (endpoint, procedureId) {
                adjustmentsCalls.push({ endpoint: endpoint, procedureId: procedureId });
                return [{ id: "adj-1" }];
            }
        },
        workflow: {
            buildRecommendationsStatus: function (rows) {
                return `Рекомендаций: ${rows.length}.`;
            }
        },
        getSelectedProcedure: function () {
            return state.selected;
        },
        supportsShortlistWorkspace: function (procedure) {
            return Boolean(procedure) && procedure.status !== "Canceled" && procedure.status !== "Completed";
        },
        setShortlistStatus: function (message, isError) {
            statusCalls.push({ message: message, isError: isError });
        },
        setShortlistAdjustmentsStatus: function (message, isError) {
            adjustmentsStatusCalls.push({ message: message, isError: isError });
        }
    };

    return {
        state: state,
        controls: {
            maxIncludedInput: settings.maxIncludedInput,
            adjustmentReasonInput: settings.adjustmentReasonInput,
            buildButton: settings.buildButton,
            applyButton: settings.applyButton,
            adjustmentsRefreshButton: settings.adjustmentsRefreshButton
        },
        grids: {
            shortlistGrid: shortlistGrid,
            shortlistAdjustmentsGrid: shortlistAdjustmentsGrid
        },
        calls: {
            statusCalls: statusCalls,
            adjustmentsStatusCalls: adjustmentsStatusCalls,
            recommendationsCalls: recommendationsCalls,
            adjustmentsCalls: adjustmentsCalls
        },
        settings: Object.assign(settings, overrides || {})
    };
}

test("procedures shortlist runtime data: validates required dependencies", () => {
    assert.throws(function () {
        dataModule.createDataController({});
    }, /maxIncludedInput/i);
});

test("procedures shortlist runtime data: updateControls uses selection and busy flags", () => {
    const setup = createSettings();
    const dataController = dataModule.createDataController(setup.settings);

    dataController.updateControls();
    assert.equal(setup.controls.buildButton.disabled, true);
    assert.equal(setup.controls.adjustmentsRefreshButton.disabled, true);

    setup.state.selected = { id: "proc-1", status: "OnApproval" };
    dataController.updateControls();
    assert.equal(setup.controls.buildButton.disabled, false);
    assert.equal(setup.controls.adjustmentsRefreshButton.disabled, false);

    dataController.setShortlistBusy(true);
    dataController.updateControls();
    assert.equal(setup.controls.buildButton.disabled, true);
    assert.equal(setup.controls.applyButton.disabled, true);
    assert.equal(setup.controls.adjustmentsRefreshButton.disabled, true);

    dataController.setShortlistBusy(false);
    dataController.setShortlistAdjustmentsBusy(true);
    dataController.updateControls();
    assert.equal(setup.controls.buildButton.disabled, false);
    assert.equal(setup.controls.adjustmentsRefreshButton.disabled, true);
});

test("procedures shortlist runtime data: load methods update grids only for active selection", async () => {
    const setup = createSettings();
    const dataController = dataModule.createDataController(setup.settings);

    setup.state.selected = { id: "proc-7", status: "OnApproval" };
    await dataController.loadShortlistRecommendations("proc-7");
    await dataController.loadShortlistAdjustments("proc-7");

    assert.deepEqual(setup.calls.recommendationsCalls.at(-1), {
        endpoint: "/api/procedures",
        procedureId: "proc-7"
    });
    assert.deepEqual(setup.grids.shortlistGrid.calls.at(-1), {
        key: "dataSource",
        value: [{ contractorId: "c-1", isRecommended: true }]
    });
    assert.deepEqual(setup.calls.statusCalls.at(-1), {
        message: "Рекомендаций: 1.",
        isError: false
    });
    assert.deepEqual(setup.grids.shortlistAdjustmentsGrid.calls.at(-1), {
        key: "dataSource",
        value: [{ id: "adj-1" }]
    });
    assert.deepEqual(setup.calls.adjustmentsStatusCalls.at(-1), {
        message: "Записей в журнале: 1.",
        isError: false
    });

    const gridCallsBefore = setup.grids.shortlistGrid.calls.length;
    setup.state.selected = { id: "proc-8", status: "OnApproval" };
    await dataController.loadShortlistRecommendations("proc-7");
    assert.equal(setup.grids.shortlistGrid.calls.length, gridCallsBefore);
});
