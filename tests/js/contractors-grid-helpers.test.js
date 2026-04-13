"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractorsGridHelpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-grid-helpers.js"));

function createHelpers() {
    return contractorsGridHelpersModule.createHelpers({
        contractorStatusCaptions: {
            Active: "Активен"
        },
        reliabilityCaptions: {
            A: "A (высокая)"
        },
        ratingSourceCaptions: {
            ManualAssessment: "Ручная оценка"
        },
        factorCodes: {
            delivery: "DeliveryDiscipline",
            commercial: "CommercialDiscipline",
            claim: "ClaimDiscipline",
            manual: "ManualExpertEvaluation",
            workload: "WorkloadPenalty"
        }
    });
}

test("contractors helpers: localization and formatting helpers are deterministic", () => {
    const helpers = createHelpers();
    assert.equal(helpers.localizeContractorStatus("Active"), "Активен");
    assert.equal(helpers.localizeContractorStatus("Blocked"), "Blocked");
    assert.equal(helpers.localizeReliability("A"), "A (высокая)");
    assert.equal(helpers.localizeSource("ManualAssessment"), "Ручная оценка");
    assert.equal(helpers.normalizeOptionalText("   "), null);
    assert.equal(helpers.normalizeOptionalText(" test "), "test");
    assert.equal(helpers.parseNumber("1.25", 0), 1.25);
    assert.equal(helpers.parseNumber("invalid", 42), 42);
    assert.equal(helpers.formatDateTime(null), "—");
    assert.equal(helpers.formatDateTime("invalid"), "—");
    assert.equal(helpers.parseRatingDelta(null), "—");
    assert.equal(helpers.parseRatingDelta(0.1234), "+0.123");
    assert.equal(helpers.parseRatingDelta(-0.12), "-0.120");
});

test("contractors helpers: resolveWeightValue handles missing and valid weights", () => {
    const helpers = createHelpers();
    const weights = [
        { factorCode: "DeliveryDiscipline", weight: 0.45 }
    ];

    assert.equal(helpers.resolveWeightValue(weights, "DeliveryDiscipline", 0.3), 0.45);
    assert.equal(helpers.resolveWeightValue(weights, "ClaimDiscipline", 0.15), 0.15);
    assert.equal(helpers.resolveWeightValue(null, "ClaimDiscipline", 0.15), 0.15);
});

test("contractors helpers: fillModelForm applies model values and defaults", () => {
    const helpers = createHelpers();
    const controls = {
        versionCodeInput: { value: "" },
        modelNameInput: { value: "" },
        modelNotesInput: { value: "" },
        weightDeliveryInput: { value: "" },
        weightCommercialInput: { value: "" },
        weightClaimInput: { value: "" },
        weightManualInput: { value: "" },
        weightWorkloadInput: { value: "" }
    };

    helpers.fillModelForm({
        versionCode: "R-001",
        name: "Model v1",
        notes: "Notes",
        weights: [
            { factorCode: "DeliveryDiscipline", weight: 0.35 },
            { factorCode: "ManualExpertEvaluation", weight: 0.2 }
        ]
    }, controls);

    assert.equal(controls.versionCodeInput.value, "R-001");
    assert.equal(controls.modelNameInput.value, "Model v1");
    assert.equal(controls.modelNotesInput.value, "Notes");
    assert.equal(controls.weightDeliveryInput.value, "0.35");
    assert.equal(controls.weightCommercialInput.value, "0.2");
    assert.equal(controls.weightClaimInput.value, "0.15");
    assert.equal(controls.weightManualInput.value, "0.2");
    assert.equal(controls.weightWorkloadInput.value, "0.1");
});

test("contractors helpers: fillModelForm validates required controls", () => {
    const helpers = createHelpers();
    assert.throws(function () {
        helpers.fillModelForm({}, {});
    }, /versionCodeInput/i);
});

test("contractors helpers: buildModelPayload normalizes strings and weights", () => {
    const helpers = createHelpers();
    const payload = helpers.buildModelPayload({
        versionCode: " R-002 ",
        modelName: " Model v2 ",
        modelNotes: "  ",
        weightDelivery: "0.4",
        weightCommercial: "invalid",
        weightClaim: "0.11",
        weightManual: "",
        weightWorkload: "0.09"
    });

    assert.equal(payload.versionCode, "R-002");
    assert.equal(payload.name, "Model v2");
    assert.equal(payload.notes, null);
    assert.deepEqual(payload.weights, [
        { factorCode: "DeliveryDiscipline", weight: 0.4 },
        { factorCode: "CommercialDiscipline", weight: 0.2 },
        { factorCode: "ClaimDiscipline", weight: 0.11 },
        { factorCode: "ManualExpertEvaluation", weight: 0 },
        { factorCode: "WorkloadPenalty", weight: 0.09 }
    ]);
});
