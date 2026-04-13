"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleUnderTest = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime-workspace.js"));

function createCompositionContext(events) {
    return {
        proceduresGridsRoot: {
            createHistoryGrid: function (options) {
                events.historyGridOptions = options;
                return {
                    option: function () {}
                };
            },
            createShortlistGrid: function (options) {
                events.shortlistGridOptions = options;
                return {
                    option: function () {}
                };
            },
            createShortlistAdjustmentsGrid: function (options) {
                events.shortlistAdjustmentsGridOptions = options;
                return {
                    option: function () {}
                };
            }
        },
        proceduresSelectionRoot: {
            createSelectionController: function (options) {
                events.selectionOptions = options;
                return {
                    getSelectedProcedure: function () {
                        return { id: "procedure-1" };
                    },
                    setTransitionController: function (controller) {
                        events.transitionControllerLinked = controller;
                    },
                    setShortlistWorkspace: function (workspace) {
                        events.shortlistWorkspaceLinked = workspace;
                    }
                };
            }
        },
        proceduresTransitionRoot: {
            createTransitionController: function (options) {
                events.transitionOptions = options;
                return {
                    bindEvents: function () {
                        events.transitionBound = true;
                    }
                };
            }
        },
        proceduresShortlistRoot: {
            createShortlistWorkspace: function (options) {
                events.shortlistWorkspaceOptions = options;
                return {
                    bindEvents: function () {
                        events.shortlistBound = true;
                    }
                };
            }
        },
        historyGridElement: { id: "history-grid" },
        selectedElement: { id: "selected" },
        shortlistSelectedElement: { id: "shortlist-selected" },
        targetSelect: { id: "target" },
        reasonInput: { id: "reason" },
        applyButton: { id: "apply" },
        historyRefreshButton: { id: "history-refresh" },
        shortlistGridElement: { id: "shortlist-grid" },
        shortlistAdjustmentsGridElement: { id: "shortlist-adjustments-grid" },
        shortlistMaxIncludedInput: { id: "shortlist-max" },
        shortlistAdjustmentReasonInput: { id: "shortlist-reason" },
        shortlistBuildButton: { id: "shortlist-build" },
        shortlistApplyButton: { id: "shortlist-apply" },
        shortlistAdjustmentsRefreshButton: { id: "shortlist-refresh" },
        transitionMap: { Draft: ["Sent"] }
    };
}

test("procedures runtime workspace: validates required dependencies", () => {
    assert.throws(function () {
        moduleUnderTest.createWorkspaceComposition({
            hostWindow: {},
            compositionContext: {},
            proceduresColumns: {},
            proceduresWorkflow: {},
            proceduresGridHelpers: {},
            apiClient: {},
            setTransitionStatus: function () {},
            setShortlistStatus: function () {},
            setShortlistAdjustmentsStatus: function () {},
            refreshGridAndReselect: function () {}
        });
    }, /require/i);
});

test("procedures runtime workspace: composes history, transition and shortlist controllers", () => {
    const events = {
        transitionBound: false,
        shortlistBound: false,
        transitionControllerLinked: null,
        shortlistWorkspaceLinked: null
    };

    const composition = moduleUnderTest.createWorkspaceComposition({
        hostWindow: {
            jQuery: function () {}
        },
        endpoint: "/api/custom/procedures",
        compositionContext: createCompositionContext(events),
        proceduresColumns: {
            historyColumns: [{ id: "history-col" }],
            shortlistColumns: [{ id: "shortlist-col" }],
            shortlistAdjustmentsColumns: [{ id: "shortlist-adjustments-col" }]
        },
        proceduresWorkflow: {
            buildProcedureSelectionSummary: function () { return "selected"; },
            buildShortlistSelectionSummary: function () { return "shortlist"; },
            validateTransitionRequest: function () { return { targetStatus: "Sent" }; },
            buildTransitionSuccessMessage: function () { return "ok"; }
        },
        proceduresGridHelpers: {
            localizeStatus: function (value) { return value; },
            supportsShortlistWorkspace: function () { return true; },
            normalizeMaxIncluded: function (value) { return value; },
            normalizeAdjustmentReason: function (value) { return value; }
        },
        apiClient: { id: "api-client" },
        setTransitionStatus: function () {},
        setShortlistStatus: function () {},
        setShortlistAdjustmentsStatus: function () {},
        refreshGridAndReselect: async function () {}
    });

    assert.equal(events.historyGridOptions, undefined);
    assert.equal(events.shortlistGridOptions, undefined);
    assert.equal(events.shortlistAdjustmentsGridOptions, undefined);

    composition.historyGridInstance.option("dataSource", []);
    assert.equal(events.historyGridOptions, undefined);

    composition.historyGridInstance.ensureInitialized();
    composition.shortlistGridInstance.ensureInitialized();
    composition.shortlistAdjustmentsGridInstance.ensureInitialized();

    assert.equal(events.historyGridOptions.element.id, "history-grid");
    assert.equal(events.shortlistGridOptions.element.id, "shortlist-grid");
    assert.equal(events.shortlistAdjustmentsGridOptions.element.id, "shortlist-adjustments-grid");
    assert.equal(events.transitionOptions.endpoint, "/api/custom/procedures");
    assert.equal(events.transitionOptions.transitionMap.Draft[0], "Sent");
    assert.equal(events.shortlistWorkspaceOptions.endpoint, "/api/custom/procedures");
    assert.equal(typeof events.shortlistWorkspaceOptions.getSelectedProcedure, "function");
    assert.equal(events.transitionBound, true);
    assert.equal(events.shortlistBound, true);
    assert.ok(events.transitionControllerLinked);
    assert.ok(events.shortlistWorkspaceLinked);
    assert.ok(composition.historyGridInstance);
    assert.ok(composition.selectionController);
    assert.ok(composition.transitionController);
    assert.ok(composition.shortlistWorkspace);
});
