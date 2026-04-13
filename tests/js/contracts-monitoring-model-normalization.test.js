"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const normalizationModule = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model-normalization.js"));

test("createClientIdFactory returns incrementing identifiers", () => {
    const createClientId = normalizationModule.createClientIdFactory();
    assert.equal(createClientId("cp"), "cp-1");
    assert.equal(createClientId("cp-stage"), "cp-stage-2");
    assert.equal(createClientId("mdr-card"), "mdr-card-3");
});

test("normalizeControlPoint trims fields and preserves deterministic ids", () => {
    const createClientId = normalizationModule.createClientIdFactory();
    const controlPoint = normalizationModule.normalizeControlPoint(
        {
            name: " КП-1 ",
            responsibleRole: " Куратор ",
            plannedDate: "2026-04-11",
            progressPercent: "75",
            notes: "  Примечание  ",
            stages: [
                {
                    name: " Этап-1 ",
                    plannedDate: "2026-04-12",
                    progressPercent: "35",
                    notes: "  Stage note "
                }
            ]
        },
        4,
        { createClientId: createClientId });

    assert.equal(controlPoint.clientId, "cp-2");
    assert.equal(controlPoint.name, "КП-1");
    assert.equal(controlPoint.responsibleRole, "Куратор");
    assert.equal(controlPoint.progressPercent, 75);
    assert.equal(controlPoint.sortOrder, 4);
    assert.equal(controlPoint.notes, "Примечание");
    assert.equal(controlPoint.stages.length, 1);
    assert.equal(controlPoint.stages[0].clientId, "cp-stage-1");
    assert.equal(controlPoint.stages[0].name, "Этап-1");
    assert.equal(controlPoint.stages[0].notes, "Stage note");
});

test("normalizeMdrCard normalizes row values and fallback sort orders", () => {
    const createClientId = normalizationModule.createClientIdFactory();
    const card = normalizationModule.normalizeMdrCard(
        {
            title: " MDR ",
            reportingDate: "2026-04-12",
            rows: [
                {
                    rowCode: " ROW-1 ",
                    description: " Описание ",
                    unitCode: " ч ",
                    planValue: "100",
                    forecastValue: "110",
                    factValue: "95",
                    forecastDeviationPercent: "10",
                    factDeviationPercent: "-5"
                }
            ]
        },
        2,
        { createClientId: createClientId });

    assert.equal(card.clientId, "mdr-card-2");
    assert.equal(card.title, "MDR");
    assert.equal(card.sortOrder, 2);
    assert.equal(card.rows.length, 1);
    assert.equal(card.rows[0].clientId, "mdr-row-1");
    assert.equal(card.rows[0].rowCode, "ROW-1");
    assert.equal(card.rows[0].planValue, 100);
    assert.equal(card.rows[0].forecastDeviationPercent, 10);
    assert.equal(card.rows[0].factDeviationPercent, -5);
});

test("request-item converters normalize dates and notes", () => {
    const stageItem = normalizationModule.toControlPointStageRequestItem(
        {
            name: " Этап ",
            plannedDate: "2026-04-12",
            forecastDate: "",
            progressPercent: "65",
            notes: "  Примечание  "
        },
        1);
    const rowItem = normalizationModule.toMdrRowRequestItem(
        {
            rowCode: " ROW-2 ",
            description: " Детализация ",
            unitCode: " шт ",
            planValue: "10",
            forecastValue: "9",
            factValue: "8",
            notes: "   "
        },
        3);

    assert.equal(stageItem.name, "Этап");
    assert.ok(typeof stageItem.plannedDate === "string" && stageItem.plannedDate.includes("T"));
    assert.equal(stageItem.forecastDate, null);
    assert.equal(stageItem.progressPercent, 65);
    assert.equal(stageItem.sortOrder, 1);
    assert.equal(stageItem.notes, "Примечание");

    assert.equal(rowItem.rowCode, "ROW-2");
    assert.equal(rowItem.description, "Детализация");
    assert.equal(rowItem.unitCode, "шт");
    assert.equal(rowItem.planValue, 10);
    assert.equal(rowItem.sortOrder, 3);
    assert.equal(rowItem.notes, null);
});
