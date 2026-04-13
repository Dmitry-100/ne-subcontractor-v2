"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const contractsViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Contracts.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("contracts view: uses page bundle for runtime modules", () => {
    const content = fs.readFileSync(contractsViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/contracts-page\.bundle\.js"[^>]*><\/script>/),
        "Missing contracts page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/contracts-grid-runtime\.js"[^>]*><\/script>/),
        "Legacy contracts runtime script reference should be removed.");
});
