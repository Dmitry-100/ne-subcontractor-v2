"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dependenciesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-data-dependencies.js"));

function createGridStub() {
    return {
        option: function () {},
        clearSelection: function () {},
        selectRows: async function () {}
    };
}

function createUiStateStub() {
    return {
        setStatus: function () {},
        setHistoryStatus: function () {},
        setAnalyticsStatus: function () {},
        updateSelectionUi: function () {}
    };
}

function createApiClientStub() {
    return {
        getContractors: async function () {
            return [];
        },
        getRatingHistory: async function () {
            return [];
        },
        getRatingAnalytics: async function () {
            return [];
        }
    };
}

test("contractors data dependencies: validates required functions and grids", () => {
    assert.throws(function () {
        dependenciesModule.validateDataRuntimeDependencies({});
    }, /apiClient/);

    assert.throws(function () {
        dependenciesModule.validateDataRuntimeDependencies({
            apiClient: {
                getContractors: async function () {
                    return [];
                }
            },
            grids: {
                contractorsGridInstance: createGridStub(),
                historyGridInstance: createGridStub(),
                analyticsGridInstance: createGridStub()
            },
            uiState: createUiStateStub()
        });
    }, /getRatingHistory/);
});

test("contractors data dependencies: returns normalized dependency graph", () => {
    const apiClient = createApiClientStub();
    const contractorsGridInstance = createGridStub();
    const historyGridInstance = createGridStub();
    const analyticsGridInstance = createGridStub();
    const uiState = createUiStateStub();

    const result = dependenciesModule.validateDataRuntimeDependencies({
        apiClient: apiClient,
        grids: {
            contractorsGridInstance: contractorsGridInstance,
            historyGridInstance: historyGridInstance,
            analyticsGridInstance: analyticsGridInstance
        },
        uiState: uiState
    });

    assert.equal(result.apiClient, apiClient);
    assert.equal(result.grids.contractorsGridInstance, contractorsGridInstance);
    assert.equal(result.grids.historyGridInstance, historyGridInstance);
    assert.equal(result.grids.analyticsGridInstance, analyticsGridInstance);
    assert.equal(result.uiState, uiState);
});
