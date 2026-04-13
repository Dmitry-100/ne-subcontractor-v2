"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const validationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-lot-orchestration-validation.js"));

function createValidOptions() {
    const noop = function () { };
    return {
        lotState: {
            getRecommendationGroups: noop,
            getSelectedRecommendationGroups: noop,
            resolveActionState: noop,
            buildSelectionMap: noop,
            validateBuildRecommendationsRequest: noop,
            buildRecommendationsStatus: noop,
            validateApplyRecommendationsRequest: noop,
            buildLotApplyPayload: noop,
            buildApplySummary: noop,
            setGroupSelected: noop,
            setGroupLotCode: noop,
            setGroupLotName: noop,
            buildSelectedGroupsStatus: noop
        },
        apiClient: {
            getLotRecommendations: noop,
            applyLotRecommendations: noop
        },
        lotRecommendationsEndpoint: "/api/lots/recommendations/import-batches",
        getSelectedBatchId: noop,
        getRecommendations: noop,
        setRecommendations: noop,
        getRecommendationsBatchId: noop,
        setRecommendationsBatchId: noop,
        getSelectionsByKey: noop,
        setSelectionsByKey: noop,
        renderLotGroupsTable: noop,
        renderLotSelectedTable: noop,
        setLotStatus: noop,
        setActionButtons: noop
    };
}

test("imports lot orchestration validation: validates required contracts", () => {
    const valid = createValidOptions();
    assert.equal(validationModule.validateSettings(valid), valid);

    const invalid = createValidOptions();
    delete invalid.lotState.buildLotApplyPayload;
    assert.throws(function () {
        validationModule.validateSettings(invalid);
    }, /lotState is required/);
});

test("imports lot orchestration validation: validates state accessors and callbacks", () => {
    const missingAccessors = createValidOptions();
    delete missingAccessors.getRecommendationsBatchId;
    assert.throws(function () {
        validationModule.validateSettings(missingAccessors);
    }, /state accessors are required/);

    const missingCallbacks = createValidOptions();
    delete missingCallbacks.renderLotSelectedTable;
    assert.throws(function () {
        validationModule.validateSettings(missingCallbacks);
    }, /callbacks are required/);
});
