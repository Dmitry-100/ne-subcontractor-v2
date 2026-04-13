"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const contractorsViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Contractors.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("contractors view: uses page bundle for runtime modules", () => {
    const content = fs.readFileSync(contractorsViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/contractors-page\.bundle\.js"[^>]*><\/script>/),
        "Missing contractors page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/contractors-data\.js"[^>]*><\/script>/),
        "Legacy contractors runtime script reference should be removed.");
});
