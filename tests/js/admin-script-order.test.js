"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const adminViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Admin.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("admin view: uses page bundle for runtime modules", () => {
    const content = fs.readFileSync(adminViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/admin-page\.bundle\.js"[^>]*><\/script>/),
        "Missing admin page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/admin-runtime\.js"[^>]*><\/script>/),
        "Legacy admin runtime script reference should be removed.");
});
