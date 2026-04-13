"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dependenciesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-shortlist-runtime-handler-dependencies.js"));

function createValidOptions() {
    return {
        controls: {
            maxIncludedInput: { value: "5" },
            adjustmentReasonInput: { value: "Автоподбор" }
        },
        services: {
            endpoint: "/api/procedures",
            apiClient: {
                applyShortlistRecommendations: async function () {
                    return {};
                }
            },
            workflow: {
                buildApplyResultStatus: function () {
                    return "ok";
                }
            },
            getSelectedProcedure: function () {
                return null;
            },
            supportsShortlistWorkspace: function () {
                return true;
            },
            normalizeMaxIncluded: function () {
                return 1;
            },
            normalizeAdjustmentReason: function () {
                return "ok";
            },
            setShortlistStatus: function () {},
            setShortlistAdjustmentsStatus: function () {}
        },
        state: {
            dataController: {
                setShortlistBusy: function () {},
                setShortlistAdjustmentsBusy: function () {},
                resetBusyState: function () {}
            },
            updateControls: function () {},
            clearData: function () {},
            loadShortlistRecommendations: async function () {
                return [];
            },
            loadShortlistAdjustments: async function () {
                return [];
            }
        }
    };
}

test("procedures shortlist runtime dependencies: validates required contract", () => {
    assert.throws(function () {
        dependenciesModule.resolveDependencies({});
    }, /getSelectedProcedure/);
});

test("procedures shortlist runtime dependencies: returns normalized dependency object", () => {
    const options = createValidOptions();
    const resolved = dependenciesModule.resolveDependencies(options);

    assert.equal(resolved.controls.maxIncludedInput, options.controls.maxIncludedInput);
    assert.equal(resolved.controls.adjustmentReasonInput, options.controls.adjustmentReasonInput);
    assert.equal(resolved.services.endpoint, "/api/procedures");
    assert.equal(resolved.services.apiClient, options.services.apiClient);
    assert.equal(resolved.state.dataController, options.state.dataController);
});
