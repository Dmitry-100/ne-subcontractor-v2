"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const validationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-shortlist-validation.js"));

function createControl() {
    return {
        disabled: false,
        value: "",
        addEventListener: function () {}
    };
}

function createGrid() {
    return {
        option: function () {}
    };
}

function createValidOptions() {
    return {
        maxIncludedInput: createControl(),
        adjustmentReasonInput: createControl(),
        buildButton: createControl(),
        applyButton: createControl(),
        adjustmentsRefreshButton: createControl(),
        shortlistGrid: createGrid(),
        shortlistAdjustmentsGrid: createGrid(),
        endpoint: "/api/procedures",
        apiClient: {
            getShortlistRecommendations: async function () { return []; },
            getShortlistAdjustments: async function () { return []; },
            applyShortlistRecommendations: async function () { return { appliedCount: 0, skippedCount: 0 }; }
        },
        workflow: {
            buildRecommendationsStatus: function () { return ""; },
            buildApplyResultStatus: function () { return ""; }
        },
        getSelectedProcedure: function () { return null; },
        supportsShortlistWorkspace: function () { return false; },
        normalizeMaxIncluded: function () { return 1; },
        normalizeAdjustmentReason: function () { return ""; },
        setShortlistStatus: function () {},
        setShortlistAdjustmentsStatus: function () {}
    };
}

test("procedures shortlist validation: rejects missing controls", () => {
    assert.throws(() => {
        validationModule.validateAndNormalizeOptions({});
    }, /required controls are missing/i);
});

test("procedures shortlist validation: rejects invalid api dependency", () => {
    const options = createValidOptions();
    options.apiClient = {};

    assert.throws(() => {
        validationModule.validateAndNormalizeOptions(options);
    }, /api dependencies are invalid/i);
});

test("procedures shortlist validation: returns normalized settings for valid options", () => {
    const options = createValidOptions();
    const normalized = validationModule.validateAndNormalizeOptions(options);

    assert.equal(normalized.endpoint, "/api/procedures");
    assert.equal(typeof normalized.apiClient.getShortlistRecommendations, "function");
    assert.equal(typeof normalized.workflow.buildApplyResultStatus, "function");
    assert.equal(typeof normalized.getSelectedProcedure, "function");
    assert.equal(normalized.maxIncludedInput, options.maxIncludedInput);
});
