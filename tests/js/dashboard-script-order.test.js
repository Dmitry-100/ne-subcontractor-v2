"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dashboardViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Index.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("dashboard view: uses page bundle", () => {
    const content = fs.readFileSync(dashboardViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/dashboard-page\.bundle\.js"[^>]*><\/script>/),
        "Missing dashboard page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/dashboard-page-runtime\.js"[^>]*><\/script>/),
        "Legacy dashboard runtime script reference should be removed.");
});
