"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const workflowModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-workflow.js"));

function createWorkflow() {
    return workflowModule.createWorkflow({
        transitions: {
            Validated: ["ReadyForLotting", "Rejected"],
            Uploaded: [],
            Processing: [],
            Failed: []
        },
        localizeImportStatus: function (status) {
            const labels = {
                Validated: "Проверен",
                ReadyForLotting: "Готов к лотированию",
                Rejected: "Отклонён"
            };

            return labels[status] || String(status || "");
        }
    });
}

test("imports workflow: shouldAutoRefreshDetails works for async statuses", () => {
    const workflow = createWorkflow();
    assert.equal(workflow.shouldAutoRefreshDetails("Uploaded"), true);
    assert.equal(workflow.shouldAutoRefreshDetails("Processing"), true);
    assert.equal(workflow.shouldAutoRefreshDetails("Validated"), false);
});

test("imports workflow: transition status for no-target branches", () => {
    const workflow = createWorkflow();

    const queued = workflow.buildTransitionStatus("Uploaded");
    assert.equal(queued.targets.length, 0);
    assert.equal(queued.isError, false);
    assert.match(queued.message, /асинхронную валидацию/);

    const failed = workflow.buildTransitionStatus("Failed");
    assert.equal(failed.targets.length, 0);
    assert.equal(failed.isError, true);
    assert.match(failed.message, /завершилась ошибкой/);
});

test("imports workflow: transition status for selectable targets", () => {
    const workflow = createWorkflow();
    const selectable = workflow.buildTransitionStatus("Validated");
    assert.deepEqual(selectable.targets, ["ReadyForLotting", "Rejected"]);
    assert.equal(selectable.isError, false);
    assert.match(selectable.message, /примените переход из «Проверен»/);
});

test("imports workflow: validateTransitionRequest validates input and builds payload", () => {
    const workflow = createWorkflow();

    assert.throws(() => workflow.validateTransitionRequest({
        selectedBatchId: null,
        targetStatus: "Rejected",
        reason: "x"
    }), /Сначала выберите пакет/);

    assert.throws(() => workflow.validateTransitionRequest({
        selectedBatchId: "b-1",
        targetStatus: "",
        reason: "x"
    }), /Сначала выберите целевой статус/);

    assert.throws(() => workflow.validateTransitionRequest({
        selectedBatchId: "b-1",
        targetStatus: "Rejected",
        reason: ""
    }), /Для перехода в статус «Отклонён» требуется причина/);

    const accepted = workflow.validateTransitionRequest({
        selectedBatchId: "b-1",
        targetStatus: "ReadyForLotting",
        reason: "  "
    });

    assert.equal(accepted.targetStatus, "ReadyForLotting");
    assert.deepEqual(accepted.payload, {
        targetStatus: "ReadyForLotting",
        reason: null
    });
});

test("imports workflow: buildBatchDetailsSummary creates compact localized text", () => {
    const workflow = createWorkflow();
    const summary = workflow.buildBatchDetailsSummary({
        status: "Validated",
        totalRows: 12,
        validRows: 10,
        invalidRows: 2
    });

    assert.equal(summary, "Статус: Validated. Строк: 12. Валидных: 10. Невалидных: 2.");
});
