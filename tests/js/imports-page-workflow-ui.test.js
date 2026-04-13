"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const workflowUiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-workflow-ui.js"));

function createSelectControl() {
    let html = "";
    const select = {
        disabled: false,
        options: [],
        appendChild: function (option) {
            this.options.push(option);
        }
    };

    Object.defineProperty(select, "innerHTML", {
        get: function () {
            return html;
        },
        set: function (value) {
            html = String(value || "");
            if (html === "") {
                this.options = [];
            }
        }
    });

    return select;
}

function createWorkflowStub(targets, message, isError) {
    return {
        buildTransitionStatus: function () {
            return {
                targets: Array.isArray(targets) ? targets : [],
                message: message || "ok",
                isError: Boolean(isError)
            };
        }
    };
}

function createNodeWithDisabled() {
    return { disabled: false };
}

test("imports workflow ui: createWorkflowUiService validates required dependencies", () => {
    assert.throws(
        function () {
            workflowUiModule.createWorkflowUiService({});
        },
        /workflow\.buildTransitionStatus/);
});

test("imports workflow ui: renderTransitionTargets builds localized model via custom renderer", () => {
    const rendered = [];
    const statuses = [];
    const service = workflowUiModule.createWorkflowUiService({
        workflow: createWorkflowStub(["Validated", "Rejected"], "msg", false),
        localizeImportStatus: function (status) {
            return `loc:${status}`;
        },
        setTransitionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        applyControlsState: function () {},
        renderTransitionTargetsView: function (model) {
            rendered.push(model);
        }
    });

    const model = service.renderTransitionTargets("Validated");

    assert.equal(model.targets.length, 2);
    assert.deepEqual(model.targets[0], { value: "Validated", label: "loc:Validated" });
    assert.deepEqual(statuses, [{ message: "msg", isError: false }]);
    assert.equal(rendered.length, 1);
    assert.equal(rendered[0].targets[1].label, "loc:Rejected");
});

test("imports workflow ui: setWorkflowActionsEnabled delegates to custom apply callback", () => {
    const calls = [];
    let refreshCalls = 0;
    const selectControl = createSelectControl();
    selectControl.options = [{ value: "one" }, { value: "two" }];

    const service = workflowUiModule.createWorkflowUiService({
        workflow: createWorkflowStub([], "", false),
        localizeImportStatus: function (status) {
            return status;
        },
        setTransitionStatus: function () {},
        transitionTargetSelect: selectControl,
        applyControlsState: function (enabled, targetCount) {
            calls.push({ enabled: enabled, targetCount: targetCount });
        },
        renderTransitionTargetsView: function () {},
        refreshLotActions: function () {
            refreshCalls += 1;
        }
    });

    service.setWorkflowActionsEnabled(false);
    service.setWorkflowActionsEnabled(true);

    assert.deepEqual(calls, [
        { enabled: false, targetCount: 2 },
        { enabled: true, targetCount: 2 }
    ]);
    assert.equal(refreshCalls, 1);
});

test("imports workflow ui: default controls branch toggles disabled flags and clears transition fields", () => {
    const statuses = [];
    const selectControl = createSelectControl();
    selectControl.options = [{ value: "x" }];
    const reasonInput = { value: "reason", disabled: false };

    const service = workflowUiModule.createWorkflowUiService({
        workflow: createWorkflowStub([], "state", false),
        localizeImportStatus: function (status) {
            return status;
        },
        setTransitionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        transitionTargetSelect: selectControl,
        transitionReasonInput: reasonInput,
        transitionApplyButton: createNodeWithDisabled(),
        historyRefreshButton: createNodeWithDisabled(),
        downloadInvalidReportButton: createNodeWithDisabled(),
        downloadFullReportButton: createNodeWithDisabled(),
        downloadLotReconciliationReportButton: createNodeWithDisabled(),
        lotBuildButton: createNodeWithDisabled(),
        lotApplyButton: createNodeWithDisabled(),
        createOptionElement: function () {
            return { value: "", textContent: "" };
        }
    });

    service.setWorkflowActionsEnabled(false);
    assert.equal(reasonInput.value, "");
    assert.equal(selectControl.options.length, 0);

    selectControl.options = [{ value: "restored" }];
    service.setWorkflowActionsEnabled(true);
    assert.equal(service.renderTransitionTargets("any").targets.length, 0);
    assert.deepEqual(statuses[0], { message: "state", isError: false });
});

test("imports workflow ui: default renderer appends options and updates transition button state", () => {
    const statuses = [];
    const selectControl = createSelectControl();
    const transitionApplyButton = createNodeWithDisabled();

    const service = workflowUiModule.createWorkflowUiService({
        workflow: createWorkflowStub(["ReadyForLotting"], "ready", false),
        localizeImportStatus: function (status) {
            return `ru:${status}`;
        },
        setTransitionStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        },
        transitionTargetSelect: selectControl,
        transitionReasonInput: { value: "", disabled: false },
        transitionApplyButton: transitionApplyButton,
        historyRefreshButton: createNodeWithDisabled(),
        downloadInvalidReportButton: createNodeWithDisabled(),
        downloadFullReportButton: createNodeWithDisabled(),
        downloadLotReconciliationReportButton: createNodeWithDisabled(),
        lotBuildButton: createNodeWithDisabled(),
        lotApplyButton: createNodeWithDisabled(),
        createOptionElement: function () {
            return { value: "", textContent: "" };
        }
    });

    const model = service.renderTransitionTargets("Validated");

    assert.equal(model.targets.length, 1);
    assert.equal(selectControl.options.length, 1);
    assert.equal(selectControl.options[0].value, "ReadyForLotting");
    assert.equal(selectControl.options[0].textContent, "ru:ReadyForLotting");
    assert.equal(transitionApplyButton.disabled, false);
    assert.deepEqual(statuses, [{ message: "ready", isError: false }]);
});
