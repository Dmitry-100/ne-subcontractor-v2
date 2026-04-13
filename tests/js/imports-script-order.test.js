"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const importsViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Imports.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("imports view: uses page bundle for runtime modules", () => {
    const content = fs.readFileSync(importsViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/imports-page\.bundle\.js"[^>]*><\/script>/),
        "Missing imports page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/imports-page-runtime\.js"[^>]*><\/script>/),
        "Legacy imports runtime script reference should be removed.");
});
