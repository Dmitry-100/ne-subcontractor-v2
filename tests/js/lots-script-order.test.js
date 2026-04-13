"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lotsViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Lots.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("lots view: uses page bundle for runtime modules", () => {
    const content = fs.readFileSync(lotsViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/lots-page\.bundle\.js"[^>]*><\/script>/),
        "Missing lots page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/lots-grid-runtime\.js"[^>]*><\/script>/),
        "Legacy lots runtime script reference should be removed.");
});
