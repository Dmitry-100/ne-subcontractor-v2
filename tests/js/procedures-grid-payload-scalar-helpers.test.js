"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const scalarHelpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-payload-scalar-helpers.js"));

test("procedures payload scalar helpers: deterministic normalization and fallback behavior", () => {
    const helpers = scalarHelpersModule.createScalarHelpers({
        approvalModes: ["InSystem", "External"]
    });

    assert.equal(helpers.normalizeGuid("  "), null);
    assert.equal(helpers.normalizeGuid("  id  "), "id");
    assert.equal(helpers.isGuid("11111111-1111-4111-8111-111111111111"), true);
    assert.equal(helpers.toIsoDate(""), null);
    assert.equal(helpers.toNullableNumber("42.25"), 42.25);
    assert.equal(helpers.normalizeRequiredString(" ", "fallback"), "fallback");
    assert.equal(helpers.normalizeNullableString(" "), null);
    assert.equal(helpers.normalizeApprovalMode("External"), "External");
    assert.equal(helpers.normalizeApprovalMode("Unknown"), "InSystem");
    assert.equal(helpers.pickValue({ a: 1 }, "a", 0), 1);
    assert.equal(helpers.pickValue({ a: 1 }, "b", 0), 0);
});
