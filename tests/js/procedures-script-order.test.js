"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const proceduresViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Procedures.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("procedures view: uses page bundle for runtime modules", () => {
    const content = fs.readFileSync(proceduresViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/procedures-page\.bundle\.js"[^>]*><\/script>/),
        "Missing procedures page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/procedures-grid-runtime\.js"[^>]*><\/script>/),
        "Legacy procedures runtime script reference should be removed.");
});
