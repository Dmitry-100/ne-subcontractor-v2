"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleUnderTest = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime-bindings.js"));

function createControls() {
    return {
        gridElement: { id: "grid" },
        historyGridElement: { id: "history-grid" },
        selectedElement: { id: "selected" },
        targetSelect: { id: "target" },
        reasonInput: { id: "reason" },
        applyButton: { id: "apply" },
        historyRefreshButton: { id: "history-refresh" },
        shortlistSelectedElement: { id: "shortlist-selected" },
        shortlistMaxIncludedInput: { id: "shortlist-max" },
        shortlistAdjustmentReasonInput: { id: "shortlist-reason" },
        shortlistBuildButton: { id: "shortlist-build" },
        shortlistApplyButton: { id: "shortlist-apply" },
        shortlistAdjustmentsRefreshButton: { id: "shortlist-refresh" },
        shortlistGridElement: { id: "shortlist-grid" },
        shortlistAdjustmentsGridElement: { id: "shortlist-adjustments-grid" }
    };
}

function createModuleRoots() {
    return {
        proceduresServicesRoot: { id: "services-root" },
        proceduresGridsRoot: { id: "grids-root" },
        proceduresStoreRoot: { id: "store-root" },
        proceduresRegistryEventsRoot: { id: "registry-events-root" },
        proceduresShortlistRoot: { id: "shortlist-root" },
        proceduresSelectionRoot: { id: "selection-root" },
        proceduresTransitionRoot: { id: "transition-root" }
    };
}

test("procedures runtime bindings: validates required dependencies", () => {
    assert.throws(function () {
        moduleUnderTest.createCompositionContext({
            controls: null,
            moduleRoots: createModuleRoots(),
            proceduresConfig: { transitionMap: {} }
        });
    }, /require/i);
});

test("procedures runtime bindings: maps module roots, controls and transition map", () => {
    const controls = createControls();
    const moduleRoots = createModuleRoots();
    const transitionMap = { Draft: ["Sent"] };

    const context = moduleUnderTest.createCompositionContext({
        controls: controls,
        moduleRoots: moduleRoots,
        proceduresConfig: {
            transitionMap: transitionMap
        }
    });

    assert.equal(context.proceduresServicesRoot.id, "services-root");
    assert.equal(context.proceduresGridsRoot.id, "grids-root");
    assert.equal(context.proceduresStoreRoot.id, "store-root");
    assert.equal(context.proceduresRegistryEventsRoot.id, "registry-events-root");
    assert.equal(context.proceduresShortlistRoot.id, "shortlist-root");
    assert.equal(context.proceduresSelectionRoot.id, "selection-root");
    assert.equal(context.proceduresTransitionRoot.id, "transition-root");
    assert.equal(context.gridElement.id, "grid");
    assert.equal(context.historyGridElement.id, "history-grid");
    assert.equal(context.shortlistGridElement.id, "shortlist-grid");
    assert.equal(context.shortlistAdjustmentsGridElement.id, "shortlist-adjustments-grid");
    assert.equal(context.transitionMap, transitionMap);
});
