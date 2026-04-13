"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const metricsModule = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-model-metrics.js"));

test("calculateDeviationPercent handles non-positive plan", () => {
    assert.equal(metricsModule.calculateDeviationPercent(0, 10), null);
    assert.equal(metricsModule.calculateDeviationPercent(-5, 10), null);
});

test("calculateMdrCardMetrics rounds totals and deviations", () => {
    const metrics = metricsModule.calculateMdrCardMetrics({
        rows: [
            { planValue: 100.123, forecastValue: 111.567, factValue: 90.444 },
            { planValue: 49.877, forecastValue: 44.433, factValue: 54.556 }
        ]
    });

    assert.deepEqual(metrics, {
        totalPlanValue: 150,
        totalForecastValue: 156,
        totalFactValue: 145,
        forecastDeviationPercent: 4,
        factDeviationPercent: -3.33
    });
});
