"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const selectionHelpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-lot-state-selection-helpers.js"));

test("imports lot state selection helpers: recommendation groups and selected entries", () => {
    const recommendations = {
        groups: [
            { groupKey: "g-1", suggestedLotCode: "LOT-001", suggestedLotName: "Лот 1" },
            { groupKey: "g-2", suggestedLotCode: "LOT-002", suggestedLotName: "Лот 2" }
        ]
    };
    const selections = new Map([
        ["g-1", { selected: true, lotCode: "A", lotName: "A1" }],
        ["g-2", { selected: false, lotCode: "B", lotName: "B1" }]
    ]);

    assert.equal(selectionHelpersModule.getRecommendationGroups(recommendations).length, 2);

    const selected = selectionHelpersModule.getSelectedRecommendationGroups(recommendations, selections);
    assert.equal(selected.length, 1);
    assert.equal(selected[0].group.groupKey, "g-1");
});

test("imports lot state selection helpers: buildSelectionMap keeps existing values", () => {
    const groups = [
        { groupKey: "g-1", suggestedLotCode: "LOT-001", suggestedLotName: "Лот 1" },
        { groupKey: "g-2", suggestedLotCode: "LOT-002", suggestedLotName: "Лот 2" }
    ];
    const previous = new Map([
        ["g-1", { selected: false, lotCode: "CUSTOM-001", lotName: "Кастом 1" }]
    ]);

    const map = selectionHelpersModule.buildSelectionMap(groups, previous);
    assert.equal(map.get("g-1").selected, false);
    assert.equal(map.get("g-1").lotCode, "CUSTOM-001");
    assert.equal(map.get("g-2").selected, true);
    assert.equal(map.get("g-2").lotName, "Лот 2");
});

test("imports lot state selection helpers: buildLotApplyPayload validates groups and falls back to suggested values", () => {
    assert.throws(function () {
        selectionHelpersModule.buildLotApplyPayload([]);
    }, /Выберите хотя бы одну рекомендационную группу/);

    const payload = selectionHelpersModule.buildLotApplyPayload([{
        group: {
            groupKey: "g-1",
            suggestedLotCode: "LOT-001",
            suggestedLotName: "Лот 1"
        },
        selection: {
            selected: true,
            lotCode: " ",
            lotName: "Обновлённое имя"
        }
    }]);

    assert.deepEqual(payload, {
        groups: [{
            groupKey: "g-1",
            lotCode: "LOT-001",
            lotName: "Обновлённое имя"
        }]
    });
});

test("imports lot state selection helpers: mutators update existing entries only", () => {
    const selections = new Map([
        ["g-1", { selected: true, lotCode: "L1", lotName: "N1" }]
    ]);

    assert.equal(selectionHelpersModule.setGroupSelected(selections, "g-1", false).updated, true);
    assert.equal(selectionHelpersModule.setGroupLotCode(selections, "g-1", "NEW").updated, true);
    assert.equal(selectionHelpersModule.setGroupLotName(selections, "g-1", "Новое").updated, true);
    assert.equal(selectionHelpersModule.setGroupSelected(selections, "unknown", true).updated, false);

    assert.deepEqual(selections.get("g-1"), {
        selected: false,
        lotCode: "NEW",
        lotName: "Новое"
    });
});
