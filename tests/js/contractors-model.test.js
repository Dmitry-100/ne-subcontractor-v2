"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractorsModelModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-model.js"));

function createControls() {
    return {
        versionCodeInput: { value: "R-20260409-0100" },
        modelNameInput: { value: "Модель smoke" },
        modelNotesInput: { value: "Обновление весов" },
        weightDeliveryInput: { value: "0.30" },
        weightCommercialInput: { value: "0.25" },
        weightClaimInput: { value: "0.15" },
        weightManualInput: { value: "0.20" },
        weightWorkloadInput: { value: "0.10" }
    };
}

test("contractors model: validates required dependencies", () => {
    assert.throws(function () {
        contractorsModelModule.createModelService({});
    }, /helpers/);

    assert.throws(function () {
        contractorsModelModule.createModelService({
            helpers: {
                fillModelForm: function () {},
                buildModelPayload: function () {
                    return {};
                }
            },
            apiClient: {
                getRatingModel: async function () {
                    return {};
                }
            },
            setRatingStatus: function () {},
            controls: {
                versionCodeInput: null
            }
        });
    }, /versionCodeInput/);
});

test("contractors model: buildModelPayload delegates to helpers with input values", () => {
    const payloadCalls = [];
    const controls = createControls();
    const service = contractorsModelModule.createModelService({
        controls: controls,
        helpers: {
            fillModelForm: function () {},
            buildModelPayload: function (input) {
                payloadCalls.push(input);
                return { ok: true };
            }
        },
        apiClient: {
            getRatingModel: async function () {
                return { versionCode: "R-0" };
            }
        },
        setRatingStatus: function () {}
    });

    const payload = service.buildModelPayload();

    assert.deepEqual(payload, { ok: true });
    assert.equal(payloadCalls.length, 1);
    assert.deepEqual(payloadCalls[0], {
        versionCode: "R-20260409-0100",
        modelName: "Модель smoke",
        modelNotes: "Обновление весов",
        weightDelivery: "0.30",
        weightCommercial: "0.25",
        weightClaim: "0.15",
        weightManual: "0.20",
        weightWorkload: "0.10"
    });
});

test("contractors model: loadModel loads API data, fills form and writes status", async () => {
    const fillCalls = [];
    const statusCalls = [];
    const controls = createControls();
    const model = {
        versionCode: "R-20260409-2000",
        name: "Реальная модель"
    };

    const service = contractorsModelModule.createModelService({
        controls: controls,
        helpers: {
            fillModelForm: function (sourceModel, targetControls) {
                fillCalls.push({ sourceModel: sourceModel, targetControls: targetControls });
            },
            buildModelPayload: function () {
                return {};
            }
        },
        apiClient: {
            getRatingModel: async function () {
                return model;
            }
        },
        setRatingStatus: function (message, isError) {
            statusCalls.push({ message: message, isError: isError });
        }
    });

    const loadedModel = await service.loadModel();

    assert.equal(loadedModel, model);
    assert.equal(fillCalls.length, 1);
    assert.equal(fillCalls[0].sourceModel, model);
    assert.equal(fillCalls[0].targetControls.versionCodeInput, controls.versionCodeInput);
    assert.equal(statusCalls.length, 1);
    assert.deepEqual(statusCalls[0], {
        message: "Активная модель: R-20260409-2000.",
        isError: false
    });
});
