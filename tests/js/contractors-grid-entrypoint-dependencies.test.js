"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dependenciesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-grid-entrypoint-dependencies.js"));

test("contractors grid entrypoint dependencies: requireModuleRoot validates factory presence", () => {
    assert.throws(
        function () {
            dependenciesModule.requireModuleRoot({}, "missing", "missingRoot", "createSomething");
        },
        /missingRoot\.createSomething/);
});

test("contractors grid entrypoint dependencies: createHelpersAndApi composes module factories", () => {
    let helpersOptions = null;
    let apiOptions = null;

    const result = dependenciesModule.createHelpersAndApi({
        contractorsGridHelpersRoot: {
            createHelpers: function (options) {
                helpersOptions = options;
                return { id: "helpers" };
            }
        },
        contractorsApiRoot: {
            createApiClient: function (options) {
                apiOptions = options;
                return { id: "api-client" };
            }
        }
    }, {
        endpoint: "/api/custom/contractors",
        ratingModelEndpoint: "/api/custom/model",
        ratingRecalculateEndpoint: "/api/custom/recalculate",
        ratingAnalyticsEndpoint: "/api/custom/analytics"
    });

    assert.equal(helpersOptions.factorCodes.workload, "WorkloadPenalty");
    assert.equal(helpersOptions.contractorStatusCaptions.Active, "Активен");
    assert.equal(apiOptions.endpoint, "/api/custom/contractors");
    assert.deepEqual(result, {
        apiClient: { id: "api-client" },
        helpers: { id: "helpers" }
    });
});

test("contractors grid entrypoint dependencies: createActions maps controls and operations", () => {
    const controls = {
        refreshButton: {},
        recalcAllButton: {},
        recalcSelectedButton: {},
        reloadModelButton: {},
        saveModelButton: {},
        manualSaveButton: {},
        manualScoreInput: {},
        manualCommentInput: {}
    };

    const operations = {
        refreshContractorsAndReselect: async function () {},
        loadAnalytics: async function () {},
        loadHistory: async function () {},
        loadModel: async function () {},
        buildModelPayload: function () {
            return {};
        },
        fillModelForm: function () {}
    };

    const captured = {
        options: null
    };

    const actions = dependenciesModule.createActions({
        contractorsActionsRoot: {
            createActions: function (options) {
                captured.options = options;
                return {
                    bindEvents: function () {}
                };
            }
        }
    }, controls, operations, { id: "api-client" }, { id: "helpers" }, { id: "ui-state" }, function () {
        return null;
    });

    assert.equal(captured.options.controls.refreshButton, controls.refreshButton);
    assert.equal(captured.options.operations.loadModel, operations.loadModel);
    assert.equal(typeof actions.bindEvents, "function");
});
