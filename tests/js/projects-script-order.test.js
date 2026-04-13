"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectsViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Projects.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("projects view: uses page bundle for runtime modules", () => {
    const content = fs.readFileSync(projectsViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/projects-page\.bundle\.js"[^>]*><\/script>/),
        "Missing projects page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/projects-runtime\.js"[^>]*><\/script>/),
        "Legacy projects runtime script reference should be removed.");
});
