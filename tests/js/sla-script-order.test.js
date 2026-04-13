"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const slaViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Sla.cshtml");

function hasScript(content, pattern) {
    return pattern.test(content);
}

test("sla view: uses page bundle for runtime modules", () => {
    const content = fs.readFileSync(slaViewPath, "utf8");

    assert.ok(
        hasScript(content, /<script\s+src="~\/js\/bundles\/sla-page\.bundle\.js"[^>]*><\/script>/),
        "Missing SLA page bundle reference.");
    assert.ok(
        !hasScript(content, /<script\s+src="~\/js\/sla-page-runtime\.js"[^>]*><\/script>/),
        "Legacy SLA runtime script reference should be removed.");
});
