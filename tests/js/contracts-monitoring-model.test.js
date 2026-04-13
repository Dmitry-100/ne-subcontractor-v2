"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const monitoringModel = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model.js"));

test("calculateDeviationPercent returns null when plan is zero", () => {
    const model = monitoringModel.createModel();
    assert.equal(model.calculateDeviationPercent(0, 100), null);
});

test("calculateDeviationPercent returns rounded percent for valid values", () => {
    const model = monitoringModel.createModel();
    assert.equal(model.calculateDeviationPercent(100, 110), 10);
    assert.equal(model.calculateDeviationPercent(100, 87.5), -12.5);
});

test("calculateMdrCardMetrics aggregates row totals and deviations", () => {
    const model = monitoringModel.createModel();

    const metrics = model.calculateMdrCardMetrics({
        rows: [
            { planValue: 100, forecastValue: 105, factValue: 95 },
            { planValue: 50, forecastValue: 45, factValue: 50 }
        ]
    });

    assert.deepEqual(metrics, {
        totalPlanValue: 150,
        totalForecastValue: 150,
        totalFactValue: 145,
        forecastDeviationPercent: 0,
        factDeviationPercent: -3.33
    });
});

test("buildControlPointsPayload validates required control-point fields", () => {
    const model = monitoringModel.createModel();

    assert.throws(() => {
        model.buildControlPointsPayload([
            {
                name: "КП-1",
                plannedDate: null,
                progressPercent: 50,
                stages: []
            }
        ]);
    }, /плановая дата обязательна/i);
});

test("buildMdrCardsPayload validates non-negative values in rows", () => {
    const model = monitoringModel.createModel();

    assert.throws(() => {
        model.buildMdrCardsPayload([
            {
                title: "MDR-1",
                reportingDate: "2026-04-08",
                rows: [
                    {
                        rowCode: "ROW-1",
                        description: "Описание",
                        unitCode: "ч",
                        planValue: 10,
                        forecastValue: -1,
                        factValue: 0
                    }
                ]
            }
        ]);
    }, /не могут быть отрицательными/i);
});

test("normalizeControlPoint creates deterministic shape for UI state", () => {
    const model = monitoringModel.createModel();
    const normalized = model.normalizeControlPoint(
        {
            name: " КП 1 ",
            plannedDate: "2026-04-08",
            progressPercent: "75",
            stages: [{ name: " Этап А ", plannedDate: "2026-04-09", progressPercent: 25 }]
        },
        0
    );

    assert.equal(normalized.name, "КП 1");
    assert.equal(normalized.progressPercent, 75);
    assert.equal(normalized.sortOrder, 0);
    assert.equal(normalized.stages.length, 1);
    assert.equal(normalized.stages[0].name, "Этап А");
});
