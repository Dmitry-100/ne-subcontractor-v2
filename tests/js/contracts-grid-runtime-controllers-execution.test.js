"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleUnderTest = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-execution.js"));

test("contracts runtime execution controller module: validates required dependencies", () => {
    assert.throws(function () {
        moduleUnderTest.createExecutionController({
            foundation: {},
            elements: {},
            modules: {}
        });
    }, /requires/i);
});

test("contracts runtime execution controller module: composes execution controller options", () => {
    const events = {
        createControllerOptions: null
    };

    const executionController = { id: "execution-controller" };

    const foundation = {
        helpers: {
            buildMilestonesPayload: function () { return []; }
        },
        executionModule: { id: "execution-module" },
        apiClient: { id: "api-client" },
        localizeStatus: function (status) { return status; },
        getSelectedContract: function () { return { id: "contract-1" }; }
    };

    const elements = {
        executionSelectedElement: {},
        executionSummaryElement: {},
        executionStatusElement: {},
        executionRefreshButton: {},
        executionGridElement: { id: "execution-grid" }
    };

    const modules = {
        executionPanelControllerModule: {
            createController: function (options) {
                events.createControllerOptions = options;
                return executionController;
            }
        },
        executionPanelGridModule: { id: "execution-grid-module" },
        executionPanelEventsModule: { id: "execution-events-module" }
    };

    const controller = moduleUnderTest.createExecutionController({
        foundation: foundation,
        elements: elements,
        modules: modules
    });

    assert.equal(controller, executionController);
    assert.equal(events.createControllerOptions.elements.executionGridElement.id, "execution-grid");
    assert.equal(events.createControllerOptions.gridModule.id, "execution-grid-module");
    assert.equal(events.createControllerOptions.eventsModule.id, "execution-events-module");
    assert.equal(events.createControllerOptions.executionModule.id, "execution-module");
    assert.equal(
        events.createControllerOptions.buildMilestonesPayload,
        foundation.helpers.buildMilestonesPayload);
});
