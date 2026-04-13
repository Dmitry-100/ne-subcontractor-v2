"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotsHelpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/lots-helpers.js"));

test("lots helpers: parseErrorBody resolves detail/error/title/fallback", () => {
    assert.equal(
        lotsHelpersModule.parseErrorBody(JSON.stringify({ detail: "Детальная ошибка." }), 400),
        "Детальная ошибка.");

    assert.equal(
        lotsHelpersModule.parseErrorBody(JSON.stringify({ error: "Ошибка API." }), 400),
        "Ошибка API.");

    assert.equal(
        lotsHelpersModule.parseErrorBody(JSON.stringify({ title: "Некорректный запрос." }), 400),
        "Некорректный запрос.");

    assert.equal(
        lotsHelpersModule.parseErrorBody("", 503),
        "Ошибка запроса (503).");

    assert.equal(
        lotsHelpersModule.parseErrorBody("raw failure", 500),
        "raw failure");
});

test("lots helpers: status localization and transitions are deterministic", () => {
    const helpers = lotsHelpersModule.createHelpers({
        statusOrder: ["Draft", "InProcurement", "Closed"],
        statusCaptions: {
            Draft: "Черновик",
            InProcurement: "В закупке",
            Closed: "Закрыт"
        }
    });

    assert.equal(helpers.localizeStatus("Draft"), "Черновик");
    assert.equal(helpers.localizeStatus("Unknown"), "Unknown");
    assert.equal(helpers.nextStatus("Draft"), "InProcurement");
    assert.equal(helpers.nextStatus("Closed"), null);
    assert.equal(helpers.previousStatus("Closed"), "InProcurement");
    assert.equal(helpers.previousStatus("Draft"), null);
    assert.equal(helpers.parseTransitionError(new Error("Нет прав")), "Нет прав");
    assert.equal(helpers.parseTransitionError(null), "Ошибка выполнения перехода.");
});

test("lots helpers: GUID and man-hours normalization", () => {
    const helpers = lotsHelpersModule.createHelpers();
    assert.equal(helpers.normalizeGuid(null), null);
    assert.equal(helpers.normalizeGuid("   "), null);
    assert.equal(helpers.normalizeGuid("  7c3  "), "7c3");

    const total = helpers.calculateTotalManHours([
        { manHours: 10 },
        { manHours: "4.5" },
        { manHours: "x" }
    ]);
    assert.equal(total, 14.5);
});

test("lots helpers: toListItem and mapItemsForRequest keep stable shape", () => {
    const helpers = lotsHelpersModule.createHelpers();
    const fallback = {
        id: "lot-1",
        code: "LOT-001",
        name: "Fallback",
        status: "Draft"
    };

    const listItem = helpers.toListItem({
        id: "lot-2",
        code: "LOT-002",
        name: "Main",
        status: "InProcurement",
        responsibleCommercialUserId: "user-1",
        items: [
            { manHours: 2 },
            { manHours: 3.25 }
        ]
    }, fallback);

    assert.deepEqual(listItem, {
        id: "lot-2",
        code: "LOT-002",
        name: "Main",
        status: "InProcurement",
        responsibleCommercialUserId: "user-1",
        itemsCount: 2,
        totalManHours: 5.25
    });

    const itemsPayload = helpers.mapItemsForRequest([
        {
            projectId: "prj-1",
            objectWbs: "OBJ.001",
            disciplineCode: "PIPING",
            manHours: 16,
            plannedStartDate: "2026-04-01",
            plannedFinishDate: "2026-04-11",
            ignored: "x"
        }
    ]);

    assert.deepEqual(itemsPayload, [
        {
            projectId: "prj-1",
            objectWbs: "OBJ.001",
            disciplineCode: "PIPING",
            manHours: 16,
            plannedStartDate: "2026-04-01",
            plannedFinishDate: "2026-04-11"
        }
    ]);
});
