"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleUnderTest = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-workflow.js"));

test("contracts runtime workflow controller module: validates required dependencies", () => {
    assert.throws(function () {
        moduleUnderTest.createWorkflowAndDraftControllers({
            foundation: {},
            elements: {},
            modules: {},
            onRefreshAndFocus: null
        });
    }, /requires/i);
});

test("contracts runtime workflow controller module: composes workflow and draft controllers", async () => {
    const events = {
        workflowOptions: null,
        draftOptions: null,
        refreshCalls: []
    };

    const workflowController = { id: "workflow-controller" };
    const draftController = { id: "draft-controller" };

    const foundation = {
        helpers: {
            isGuid: function () { return true; },
            toNullableDate: function (value) { return value || null; }
        },
        apiClient: { id: "api-client" },
        gridState: { id: "grid-state" },
        statusValues: ["Draft", "OnApproval", "Signed", "Active", "Closed"],
        localizeStatus: function (status) { return status; },
        getStatusRank: function (status) { return String(status || "").length; }
    };

    const elements = {
        selectedElement: {},
        transitionStatusElement: {},
        transitionTargetSelect: {},
        transitionReasonInput: {},
        transitionApplyButton: {},
        historyRefreshButton: {},
        historyGridElement: { id: "workflow-history-grid" },
        draftStatusElement: {},
        draftProcedureIdInput: {},
        draftNumberInput: {},
        draftSigningDateInput: {},
        draftStartDateInput: {},
        draftEndDateInput: {},
        draftCreateButton: {}
    };

    const modules = {
        workflowControllerModule: {
            createController: function (options) {
                events.workflowOptions = options;
                return workflowController;
            }
        },
        draftControllerModule: {
            createController: function (options) {
                events.draftOptions = options;
                return draftController;
            }
        },
        workflowHistoryGridModule: { id: "history-grid-module" },
        workflowEventsModule: { id: "workflow-events-module" },
        draftEventsModule: { id: "draft-events-module" }
    };

    const composed = moduleUnderTest.createWorkflowAndDraftControllers({
        foundation: foundation,
        elements: elements,
        modules: modules,
        onRefreshAndFocus: async function (contractId) {
            events.refreshCalls.push(contractId);
        }
    });

    assert.equal(composed.workflowController, workflowController);
    assert.equal(composed.draftController, draftController);
    assert.equal(events.workflowOptions.elements.historyGridElement.id, "workflow-history-grid");
    assert.equal(events.workflowOptions.historyGridModule.id, "history-grid-module");
    assert.equal(events.workflowOptions.eventsModule.id, "workflow-events-module");
    assert.equal(events.workflowOptions.statusValues.length, 5);
    assert.equal(events.draftOptions.eventsModule.id, "draft-events-module");

    await events.draftOptions.onDraftCreated({ id: "contract-88" });
    assert.deepEqual(events.refreshCalls, ["contract-88"]);
});
