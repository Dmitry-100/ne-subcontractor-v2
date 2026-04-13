"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotStateModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-lot-state.js"));

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

test("imports lot state: recommendation groups and selected groups are derived safely", () => {
    const recommendations = buildRecommendations();
    const selections = new Map([
        ["g-1", { selected: true, lotCode: "C1", lotName: "N1" }],
        ["g-2", { selected: false, lotCode: "C2", lotName: "N2" }]
    ]);

    const groups = lotStateModule.getRecommendationGroups(recommendations);
    assert.equal(groups.length, 2);

    const selected = lotStateModule.getSelectedRecommendationGroups(recommendations, selections);
    assert.equal(selected.length, 1);
    assert.equal(selected[0].group.groupKey, "g-1");
    assert.equal(selected[0].selection.lotCode, "C1");
});

test("imports lot state: buildSelectionMap reuses previous values and fills defaults", () => {
    const recommendations = buildRecommendations();
    const previous = new Map([
        ["g-1", { selected: false, lotCode: "CUSTOM-001", lotName: "Кастомный 1" }]
    ]);

    const result = lotStateModule.buildSelectionMap(recommendations.groups, previous);
    assert.equal(result.size, 2);
    assert.equal(result.get("g-1").selected, false);
    assert.equal(result.get("g-1").lotCode, "CUSTOM-001");
    assert.equal(result.get("g-2").selected, true);
    assert.equal(result.get("g-2").lotCode, "LOT-002");
});

test("imports lot state: action state computes build/apply availability", () => {
    const recommendations = buildRecommendations();
    const positive = lotStateModule.resolveActionState({
        selectedBatchId: "batch-1",
        recommendationsBatchId: "batch-1",
        recommendations: recommendations,
        selectedCount: 1
    });

    assert.equal(positive.canBuild, true);
    assert.equal(positive.canApply, true);

    const negative = lotStateModule.resolveActionState({
        selectedBatchId: "batch-1",
        recommendationsBatchId: "batch-2",
        recommendations: recommendations,
        selectedCount: 1
    });

    assert.equal(negative.canBuild, true);
    assert.equal(negative.canApply, false);
});

test("imports lot state: build recommendations request is validated", () => {
    assert.throws(() => lotStateModule.validateBuildRecommendationsRequest(null), /Сначала выберите пакет импорта/);
    assert.doesNotThrow(() => lotStateModule.validateBuildRecommendationsRequest("batch-1"));
});

test("imports lot state: shouldResetRecommendations follows batch and status guards", () => {
    const recommendations = buildRecommendations();
    assert.equal(lotStateModule.shouldResetRecommendations({
        recommendations: null,
        recommendationsBatchId: null,
        currentBatchId: "b1",
        previousBatchId: null,
        currentBatchStatus: "ReadyForLotting"
    }), true);

    assert.equal(lotStateModule.shouldResetRecommendations({
        recommendations: recommendations,
        recommendationsBatchId: "b1",
        currentBatchId: "b1",
        previousBatchId: "b1",
        currentBatchStatus: "ReadyForLotting"
    }), false);

    assert.equal(lotStateModule.shouldResetRecommendations({
        recommendations: recommendations,
        recommendationsBatchId: "b1",
        currentBatchId: "b1",
        previousBatchId: "b1",
        currentBatchStatus: "Validated"
    }), true);
});

test("imports lot state: buildRecommendationsStatus covers no-groups and no-apply branches", () => {
    const emptyStatus = lotStateModule.buildRecommendationsStatus({
        recommendations: {
            candidateRows: 12,
            groups: []
        },
        selectedCount: 0
    });

    assert.match(emptyStatus, /Рекомендательные группы не сформированы/);
    assert.match(emptyStatus, /12/);

    const blockedStatus = lotStateModule.buildRecommendationsStatus({
        recommendations: {
            canApply: false,
            note: "Пакет ещё в статусе Validated.",
            groups: [{ groupKey: "g-1" }]
        },
        selectedCount: 1
    });

    assert.match(blockedStatus, /Сформировано рекомендационных групп: 1/);
    assert.match(blockedStatus, /Validated/);

    const readyStatus = lotStateModule.buildRecommendationsStatus({
        recommendations: {
            canApply: true,
            groups: [{ groupKey: "g-1" }, { groupKey: "g-2" }]
        },
        selectedCount: 2
    });

    assert.match(readyStatus, /Сформировано рекомендационных групп: 2/);
    assert.match(readyStatus, /Выбрано к применению: 2/);
});

test("imports lot state: apply recommendations request is validated", () => {
    assert.throws(() => lotStateModule.validateApplyRecommendationsRequest({
        selectedBatchId: null,
        recommendations: null,
        recommendationsBatchId: null
    }), /Сначала выберите пакет импорта/);

    assert.throws(() => lotStateModule.validateApplyRecommendationsRequest({
        selectedBatchId: "batch-1",
        recommendations: null,
        recommendationsBatchId: "batch-1"
    }), /сначала постройте рекомендации/i);

    assert.throws(() => lotStateModule.validateApplyRecommendationsRequest({
        selectedBatchId: "batch-1",
        recommendations: { canApply: false, note: "Не готов." },
        recommendationsBatchId: "batch-1"
    }), /Не готов\./);

    assert.doesNotThrow(() => lotStateModule.validateApplyRecommendationsRequest({
        selectedBatchId: "batch-1",
        recommendations: { canApply: true },
        recommendationsBatchId: "batch-1"
    }));
});

test("imports lot state: buildLotApplyPayload validates selection and maps values", () => {
    assert.throws(() => lotStateModule.buildLotApplyPayload([]), /Выберите хотя бы одну рекомендационную группу/);

    const payload = lotStateModule.buildLotApplyPayload([
        {
            group: {
                groupKey: "g-1",
                suggestedLotCode: "LOT-001",
                suggestedLotName: "Лот 1"
            },
            selection: {
                selected: true,
                lotCode: "  ",
                lotName: "Переименованный лот"
            }
        }
    ]);

    assert.equal(payload.groups.length, 1);
    assert.equal(payload.groups[0].groupKey, "g-1");
    assert.equal(payload.groups[0].lotCode, "LOT-001");
    assert.equal(payload.groups[0].lotName, "Переименованный лот");
});

test("imports lot state: buildApplySummary returns deterministic message and counts", () => {
    const summary = lotStateModule.buildApplySummary({
        createdLots: [
            { lotCode: "L-01" },
            { lotCode: "L-02" }
        ],
        skippedGroups: [
            { reason: "Дубликат кода" }
        ]
    });

    assert.equal(summary.createdLotsCount, 2);
    assert.equal(summary.skippedGroupsCount, 1);
    assert.match(summary.statusMessage, /Создано: 2/);
    assert.match(summary.statusMessage, /Пропущено: 1/);
    assert.match(summary.statusMessage, /L-01, L-02/);
    assert.match(summary.statusMessage, /Первая причина пропуска: Дубликат кода/);
});

test("imports lot state: selection mutators update existing groups only", () => {
    const selections = new Map([
        ["g-1", { selected: true, lotCode: "C1", lotName: "N1" }]
    ]);

    const selectedUpdate = lotStateModule.setGroupSelected(selections, "g-1", false);
    assert.equal(selectedUpdate.updated, true);
    assert.equal(selectedUpdate.selectionsByKey.get("g-1").selected, false);

    const codeUpdate = lotStateModule.setGroupLotCode(selections, "g-1", "NEW-CODE");
    assert.equal(codeUpdate.updated, true);
    assert.equal(codeUpdate.selectionsByKey.get("g-1").lotCode, "NEW-CODE");

    const nameUpdate = lotStateModule.setGroupLotName(selections, "g-1", "Новое имя");
    assert.equal(nameUpdate.updated, true);
    assert.equal(nameUpdate.selectionsByKey.get("g-1").lotName, "Новое имя");

    const missingUpdate = lotStateModule.setGroupSelected(selections, "missing", true);
    assert.equal(missingUpdate.updated, false);
});

test("imports lot state: lot groups table model builds empty and filled states", () => {
    const emptyModel = lotStateModule.buildLotGroupsTableModel({
        recommendations: { groups: [] },
        selectionsByKey: new Map(),
        formatNumber: function (value) { return `MH:${value}`; },
        formatDateRange: function (start, finish) { return `${start || ""}|${finish || ""}`; }
    });

    assert.equal(emptyModel.emptyMessage, "Постройте рекомендации, чтобы увидеть сгруппированные кандидаты.");
    assert.equal(emptyModel.emptyColSpan, 8);

    const filledModel = lotStateModule.buildLotGroupsTableModel({
        recommendations: buildRecommendations(),
        selectionsByKey: new Map([
            ["g-1", { selected: false, lotCode: "C1", lotName: "N1" }]
        ]),
        formatNumber: function (value) { return `MH:${value}`; },
        formatDateRange: function (start, finish) { return `${start || ""}|${finish || ""}`; }
    });

    assert.equal(filledModel.headers.length, 8);
    assert.equal(filledModel.rows.length, 2);
    assert.equal(filledModel.rows[0].groupKey, "g-1");
    assert.equal(filledModel.rows[0].checked, false);
    assert.equal(filledModel.rows[0].cells.length, 7);
});

test("imports lot state: lot selected table model keeps selected entries only", () => {
    const recommendations = buildRecommendations();
    recommendations.groups[0].rowsCount = 2;
    recommendations.groups[0].totalManHours = 16;

    const emptyModel = lotStateModule.buildLotSelectedTableModel({
        recommendations: recommendations,
        selectionsByKey: new Map(),
        formatNumber: function (value) { return `MH:${value}`; }
    });
    assert.equal(emptyModel.emptyMessage, "Выберите группы в левой таблице, чтобы подготовить черновые лоты.");

    const filledModel = lotStateModule.buildLotSelectedTableModel({
        recommendations: recommendations,
        selectionsByKey: new Map([
            ["g-1", { selected: true, lotCode: "LOT-A", lotName: "Лот А" }],
            ["g-2", { selected: false, lotCode: "LOT-B", lotName: "Лот Б" }]
        ]),
        formatNumber: function (value) { return `MH:${value}`; }
    });

    assert.equal(filledModel.headers.length, 5);
    assert.equal(filledModel.rows.length, 1);
    assert.equal(filledModel.rows[0].groupKey, "g-1");
    assert.equal(filledModel.rows[0].groupLabel, "P1 / D1");
    assert.equal(filledModel.rows[0].totalManHours, "MH:16");
});

test("imports lot state: selected groups status message is stable", () => {
    assert.equal(lotStateModule.buildSelectedGroupsStatus(0), "Выбрано к применению: 0 групп(ы).");
    assert.equal(lotStateModule.buildSelectedGroupsStatus(3), "Выбрано к применению: 3 групп(ы).");
});
