"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const mdrColumnsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-grids-mdr-columns.js"));

test("monitoring MDR columns: validates required dependencies", () => {
    assert.throws(function () {
        mdrColumnsModule.createMdrCardsColumns({});
    }, /calculateMdrCardMetrics/i);

    assert.throws(function () {
        mdrColumnsModule.createMdrRowsColumns({});
    }, /calculateDeviationPercent/i);
});

test("monitoring MDR columns: cards columns use metrics projector", () => {
    const columns = mdrColumnsModule.createMdrCardsColumns({
        calculateMdrCardMetrics: function () {
            return {
                totalPlanValue: 10,
                totalForecastValue: 20,
                totalFactValue: 30,
                forecastDeviationPercent: 5,
                factDeviationPercent: -3
            };
        }
    });

    assert.equal(columns.length, 11);
    const rowCountColumn = columns.find(function (column) {
        return column.caption === "Строк";
    });
    const planColumn = columns.find(function (column) {
        return column.caption === "План";
    });
    const factDeviationColumn = columns.find(function (column) {
        return column.caption === "Откл. факта, %";
    });

    assert.equal(rowCountColumn.calculateCellValue({ rows: [1, 2, 3] }), 3);
    assert.equal(planColumn.calculateCellValue({}), 10);
    assert.equal(factDeviationColumn.calculateCellValue({}), -3);
});

test("monitoring MDR columns: rows columns use deviation calculator", () => {
    const calls = [];
    const columns = mdrColumnsModule.createMdrRowsColumns({
        calculateDeviationPercent: function (plan, actual) {
            calls.push({ plan: plan, actual: actual });
            return plan === 0 ? 0 : ((actual - plan) / plan) * 100;
        }
    });

    assert.equal(columns.length, 11);
    const forecastDeviationColumn = columns.find(function (column) {
        return column.caption === "Откл. прогноза, %";
    });
    const factDeviationColumn = columns.find(function (column) {
        return column.caption === "Откл. факта, %";
    });

    const forecastValue = forecastDeviationColumn.calculateCellValue({
        planValue: 100,
        forecastValue: 120
    });
    const factValue = factDeviationColumn.calculateCellValue({
        planValue: 100,
        factValue: 110
    });

    assert.equal(Math.round(forecastValue), 20);
    assert.equal(Math.round(factValue), 10);
    assert.deepEqual(calls, [
        { plan: 100, actual: 120 },
        { plan: 100, actual: 110 }
    ]);
});
