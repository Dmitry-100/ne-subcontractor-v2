"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grids-config-helpers.js"));

test("procedures grids config helpers: exports form items and validators", () => {
    assert.equal(Array.isArray(helpersModule.PROCEDURE_FORM_ITEMS), true);
    assert.equal(helpersModule.PROCEDURE_FORM_ITEMS.includes("purchaseTypeCode"), true);
    assert.equal(helpersModule.requireArray([1, 2], "arr").length, 2);
    assert.throws(function () {
        helpersModule.requireArray(null, "arr");
    }, /'arr' array/);
    assert.throws(function () {
        helpersModule.requireFunction(null, "fn");
    }, /'fn' callback/);
});
