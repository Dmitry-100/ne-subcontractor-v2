"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const payloadModule = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model-payload.js"));

test("buildControlPointsPayload builds request payload with normalized fields", () => {
    const payload = payloadModule.buildControlPointsPayload([
        {
            name: " КП-1 ",
            responsibleRole: " Руководитель ",
            plannedDate: "2026-04-12",
            forecastDate: "2026-04-13",
            progressPercent: "45",
            notes: "   ",
            stages: [
                {
                    name: " Этап-1 ",
                    plannedDate: "2026-04-14",
                    progressPercent: "55",
                    notes: " Stage note "
                }
            ]
        }
    ]);

    assert.equal(payload.length, 1);
    assert.equal(payload[0].name, "КП-1");
    assert.equal(payload[0].responsibleRole, "Руководитель");
    assert.equal(payload[0].progressPercent, 45);
    assert.equal(payload[0].notes, null);
    assert.equal(payload[0].stages.length, 1);
    assert.equal(payload[0].stages[0].name, "Этап-1");
    assert.ok(typeof payload[0].stages[0].plannedDate === "string" && payload[0].stages[0].plannedDate.includes("T"));
});

test("buildControlPointsPayload validates stage progress range", () => {
    assert.throws(() => {
        payloadModule.buildControlPointsPayload([
            {
                name: "КП",
                plannedDate: "2026-04-12",
                stages: [
                    {
                        name: "Этап",
                        plannedDate: "2026-04-13",
                        progressPercent: 150
                    }
                ]
            }
        ]);
    }, /диапазоне 0\.\.100/i);
});

test("buildMdrCardsPayload validates required fields and non-negative values", () => {
    assert.throws(() => {
        payloadModule.buildMdrCardsPayload([
            {
                title: "MDR",
                reportingDate: "2026-04-12",
                rows: [
                    {
                        rowCode: "ROW-1",
                        description: "",
                        unitCode: "ч",
                        planValue: 10,
                        forecastValue: 9,
                        factValue: 8
                    }
                ]
            }
        ]);
    }, /описание обязательно/i);

    assert.throws(() => {
        payloadModule.buildMdrCardsPayload([
            {
                title: "MDR",
                reportingDate: "2026-04-12",
                rows: [
                    {
                        rowCode: "ROW-1",
                        description: "ok",
                        unitCode: "ч",
                        planValue: -1,
                        forecastValue: 1,
                        factValue: 1
                    }
                ]
            }
        ]);
    }, /не могут быть отрицательными/i);
});
