"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const statusesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-lot-state-statuses.js"));

test("imports lot state statuses: no-groups branch includes candidate rows", () => {
    const status = statusesModule.buildRecommendationsStatus({
        recommendations: {
            candidateRows: 7,
            groups: []
        }
    });

    assert.equal(
        status,
        "Рекомендательные группы не сформированы. Валидных строк-кандидатов: 7.");
});

test("imports lot state statuses: no-apply branch includes note", () => {
    const status = statusesModule.buildRecommendationsStatus({
        recommendations: {
            canApply: false,
            note: "Ожидается завершение проверки.",
            groups: [{ groupKey: "g1" }, { groupKey: "g2" }]
        }
    });

    assert.equal(
        status,
        "Сформировано рекомендационных групп: 2. Ожидается завершение проверки.");
});

test("imports lot state statuses: apply summary contains created count and first skip reason", () => {
    const summary = statusesModule.buildApplySummary({
        createdLots: [{ lotCode: "LOT-001" }, { lotCode: "LOT-002" }],
        skippedGroups: [{ reason: "Дубликат кода" }]
    });

    assert.equal(summary.createdLotsCount, 2);
    assert.equal(summary.skippedGroupsCount, 1);
    assert.match(summary.statusMessage, /Создано: 2/);
    assert.match(summary.statusMessage, /Первая причина пропуска: Дубликат кода/);
});

test("imports lot state statuses: selected groups status is deterministic", () => {
    assert.equal(statusesModule.buildSelectedGroupsStatus(0), "Выбрано к применению: 0 групп(ы).");
    assert.equal(statusesModule.buildSelectedGroupsStatus(3), "Выбрано к применению: 3 групп(ы).");
});
