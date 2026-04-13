"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const workflowModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-workflow.js"));

function createWorkflow() {
    return workflowModule.createWorkflow({
        statusOrder: [
            "Created",
            "DocumentsPreparation",
            "OnApproval",
            "Sent",
            "OffersReceived",
            "Retender",
            "DecisionMade",
            "Completed",
            "Canceled"
        ],
        localizeStatus: function (value) {
            return `loc:${value || "—"}`;
        }
    });
}

test("procedures workflow: validateTransitionRequest checks required inputs", () => {
    const workflow = createWorkflow();

    const noSelection = workflow.validateTransitionRequest(null, "Sent", "ok");
    assert.equal(noSelection.isValid, false);
    assert.equal(noSelection.errorMessage, "Сначала выберите процедуру.");

    const noTarget = workflow.validateTransitionRequest({ status: "Created" }, "", "ok");
    assert.equal(noTarget.isValid, false);
    assert.equal(noTarget.errorMessage, "Сначала выберите целевой статус.");
});

test("procedures workflow: validateTransitionRequest enforces reason for rollback and cancel", () => {
    const workflow = createWorkflow();

    const rollback = workflow.validateTransitionRequest(
        { status: "OffersReceived" },
        "Sent",
        "   ");
    assert.equal(rollback.isValid, false);
    assert.equal(rollback.errorMessage, "Для отката или отмены необходимо указать причину.");

    const cancel = workflow.validateTransitionRequest(
        { status: "Created" },
        "Canceled",
        "");
    assert.equal(cancel.isValid, false);
    assert.equal(cancel.errorMessage, "Для отката или отмены необходимо указать причину.");
});

test("procedures workflow: validateTransitionRequest builds payload for valid transition", () => {
    const workflow = createWorkflow();

    const request = workflow.validateTransitionRequest(
        { status: "DocumentsPreparation" },
        "OnApproval",
        "  нужно согласование  ");

    assert.equal(request.isValid, true);
    assert.deepEqual(request.payload, {
        targetStatus: "OnApproval",
        reason: "нужно согласование"
    });

    const withoutReason = workflow.validateTransitionRequest(
        { status: "OnApproval" },
        "Sent",
        "   ");
    assert.equal(withoutReason.isValid, true);
    assert.deepEqual(withoutReason.payload, {
        targetStatus: "Sent",
        reason: null
    });
});

test("procedures workflow: reasonRequired follows status-order rank and cancel rule", () => {
    const workflow = createWorkflow();

    assert.equal(workflow.reasonRequired("OnApproval", "Sent"), false);
    assert.equal(workflow.reasonRequired("Sent", "OnApproval"), true);
    assert.equal(workflow.reasonRequired("Created", "Canceled"), true);
});

test("procedures workflow: selection summaries are deterministic", () => {
    const workflow = createWorkflow();

    assert.equal(
        workflow.buildProcedureSelectionSummary(null),
        "Выберите процедуру в таблице, чтобы выполнить переход.");
    assert.equal(
        workflow.buildShortlistSelectionSummary(null),
        "Выберите процедуру в таблице, чтобы сформировать рекомендации по списку кандидатов.");

    const selected = {
        objectName: "Сценарий закупки A",
        status: "OnApproval",
        lotId: "LOT-77"
    };

    assert.equal(
        workflow.buildProcedureSelectionSummary(selected),
        "Выбрано: Сценарий закупки A · Статус: loc:OnApproval · Лот: LOT-77");
    assert.equal(
        workflow.buildShortlistSelectionSummary(selected),
        "Процедура: Сценарий закупки A · Статус: loc:OnApproval");
});

test("procedures workflow: recommendations and apply statuses are deterministic", () => {
    const workflow = createWorkflow();

    const status = workflow.buildRecommendationsStatus([
        { isRecommended: true },
        { isRecommended: false },
        { isRecommended: true }
    ]);
    assert.equal(status, "Кандидатов: 3. Рекомендовано: 2.");

    assert.equal(
        workflow.buildApplyResultStatus({ includedCandidates: 5, totalCandidates: 9 }),
        "Рекомендации применены. Включено: 5 из 9 кандидатов.");
    assert.equal(
        workflow.buildApplyResultStatus(null),
        "Рекомендации применены. Включено: 0 из 0 кандидатов.");
});

test("procedures workflow: buildTransitionSuccessMessage uses localizer", () => {
    const workflow = createWorkflow();
    assert.equal(
        workflow.buildTransitionSuccessMessage("OnApproval", "Sent"),
        "Переход выполнен: loc:OnApproval -> loc:Sent.");
});
