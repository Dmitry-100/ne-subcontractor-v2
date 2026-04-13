"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const coreModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-lot-state-core.js"));

function buildRecommendations() {
    return {
        canApply: true,
        batchStatus: "ReadyForLotting",
        groups: [
            {
                groupKey: "g-1",
                projectCode: "P1",
                disciplineCode: "D1",
                suggestedLotCode: "LOT-001",
                suggestedLotName: "Лот 1"
            },
            {
                groupKey: "g-2",
                projectCode: "P2",
                disciplineCode: "D2",
                suggestedLotCode: "LOT-002",
                suggestedLotName: "Лот 2"
            }
        ]
    };
}

test("imports lot state core: derives recommendation and selected groups", () => {
    const recommendations = buildRecommendations();
    const selections = new Map([
        ["g-1", { selected: true, lotCode: "C1", lotName: "N1" }],
        ["g-2", { selected: false, lotCode: "C2", lotName: "N2" }]
    ]);

    assert.equal(coreModule.getRecommendationGroups(recommendations).length, 2);

    const selected = coreModule.getSelectedRecommendationGroups(recommendations, selections);
    assert.equal(selected.length, 1);
    assert.equal(selected[0].group.groupKey, "g-1");
});

test("imports lot state core: builds selection map and action state", () => {
    const recommendations = buildRecommendations();
    const previous = new Map([
        ["g-1", { selected: false, lotCode: "CUSTOM-001", lotName: "Кастомный 1" }]
    ]);

    const selectionMap = coreModule.buildSelectionMap(recommendations.groups, previous);
    assert.equal(selectionMap.get("g-1").selected, false);
    assert.equal(selectionMap.get("g-2").lotCode, "LOT-002");

    const actionState = coreModule.resolveActionState({
        selectedBatchId: "batch-1",
        recommendationsBatchId: "batch-1",
        recommendations: recommendations,
        selectedCount: 1
    });
    assert.equal(actionState.canBuild, true);
    assert.equal(actionState.canApply, true);
});

test("imports lot state core: validates build/apply requests and payloads", () => {
    assert.throws(function () {
        coreModule.validateBuildRecommendationsRequest(null);
    }, /Сначала выберите пакет импорта/);

    assert.doesNotThrow(function () {
        coreModule.validateApplyRecommendationsRequest({
            selectedBatchId: "batch-1",
            recommendationsBatchId: "batch-1",
            recommendations: { canApply: true }
        });
    });

    const payload = coreModule.buildLotApplyPayload([
        {
            group: {
                groupKey: "g-1",
                suggestedLotCode: "LOT-001",
                suggestedLotName: "Лот 1"
            },
            selection: {
                selected: true,
                lotCode: " ",
                lotName: "Переименованный лот"
            }
        }
    ]);
    assert.equal(payload.groups.length, 1);
    assert.equal(payload.groups[0].lotCode, "LOT-001");
});

test("imports lot state core: mutators update existing groups and keep deterministic status", () => {
    const selections = new Map([
        ["g-1", { selected: true, lotCode: "C1", lotName: "N1" }]
    ]);

    assert.equal(coreModule.setGroupSelected(selections, "g-1", false).updated, true);
    assert.equal(coreModule.setGroupLotCode(selections, "g-1", "NEW-CODE").updated, true);
    assert.equal(coreModule.setGroupLotName(selections, "g-1", "Новое имя").updated, true);
    assert.equal(coreModule.setGroupSelected(selections, "missing", true).updated, false);
    assert.equal(coreModule.buildSelectedGroupsStatus(3), "Выбрано к применению: 3 групп(ы).");
});

test("imports lot state core: status helpers cover reset and apply summary branches", () => {
    const recommendations = buildRecommendations();
    assert.equal(coreModule.shouldResetRecommendations({
        recommendations: null,
        recommendationsBatchId: null,
        currentBatchId: "b1",
        previousBatchId: null,
        currentBatchStatus: "ReadyForLotting"
    }), true);

    const status = coreModule.buildRecommendationsStatus({
        recommendations: recommendations,
        selectedCount: 2
    });
    assert.match(status, /Сформировано рекомендационных групп: 2/);

    const summary = coreModule.buildApplySummary({
        createdLots: [{ lotCode: "L-01" }, { lotCode: "L-02" }],
        skippedGroups: [{ reason: "Дубликат кода" }]
    });
    assert.match(summary.statusMessage, /Создано: 2/);
    assert.match(summary.statusMessage, /Дубликат кода/);
});
