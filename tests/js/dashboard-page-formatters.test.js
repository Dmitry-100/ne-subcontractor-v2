"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const formattersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-formatters.js"));

function createFormatters() {
    return formattersModule.createFormatters();
}

test("dashboard-page formatters: toFiniteNumber normalizes numeric values", () => {
    const formatters = createFormatters();

    assert.equal(formatters.toFiniteNumber(12.5), 12.5);
    assert.equal(formatters.toFiniteNumber("42"), 42);
    assert.equal(formatters.toFiniteNumber(" 3.25 "), 3.25);
    assert.equal(formatters.toFiniteNumber(""), null);
    assert.equal(formatters.toFiniteNumber("abc"), null);
    assert.equal(formatters.toFiniteNumber(Number.NaN), null);
    assert.equal(formatters.toFiniteNumber(Infinity), null);
});

test("dashboard-page formatters: clampPercent keeps value in [0..100]", () => {
    const formatters = createFormatters();

    assert.equal(formatters.clampPercent(-10), 0);
    assert.equal(formatters.clampPercent(0), 0);
    assert.equal(formatters.clampPercent(55.5), 55.5);
    assert.equal(formatters.clampPercent(120), 100);
    assert.equal(formatters.clampPercent(Number.NaN), 0);
});

test("dashboard-page formatters: formatCompactPercent uses compact precision", () => {
    const formatters = createFormatters();

    assert.equal(formatters.formatCompactPercent(0), "0%");
    assert.equal(formatters.formatCompactPercent(9.94), "9.9%");
    assert.equal(formatters.formatCompactPercent(10.1), "10%");
    assert.equal(formatters.formatCompactPercent(33.3), "33%");
    assert.equal(formatters.formatCompactPercent(120), "100%");
    assert.equal(formatters.formatCompactPercent(-7), "0%");
});

test("dashboard-page formatters: formatCompactMoney localizes compact notation", () => {
    const formatters = createFormatters();

    assert.equal(formatters.formatCompactMoney(undefined), "0");
    assert.equal(formatters.formatCompactMoney(500), "500");
    assert.equal(formatters.formatCompactMoney(1_200), "1,2 тыс");
    assert.equal(formatters.formatCompactMoney(2_412_000), "2,41 млн");
    assert.equal(formatters.formatCompactMoney(1_044_000), "1,04 млн");
    assert.equal(formatters.formatCompactMoney(1_234_567_890), "1,23 млрд");
    assert.equal(formatters.formatCompactMoney(-2_500), "-2,5 тыс");
});
