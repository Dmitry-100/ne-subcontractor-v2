"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const registryViewPath = path.resolve(__dirname, "../../src/Subcontractor.Web/Views/Home/Registry.cshtml");

test("registry view: keeps helpers/bootstrap/runtime/entrypoint script order", () => {
    const content = fs.readFileSync(registryViewPath, "utf8");

    const helpersIndex = content.indexOf('src="~/js/registry-page-helpers.js"');
    const bootstrapIndex = content.indexOf('src="~/js/registry-page-bootstrap.js"');
    const runtimeIndex = content.indexOf('src="~/js/registry-page-runtime.js"');
    const entrypointIndex = content.indexOf('src="~/js/registry-page.js"');

    assert.ok(helpersIndex >= 0, "Missing registry-page-helpers.js reference.");
    assert.ok(bootstrapIndex >= 0, "Missing registry-page-bootstrap.js reference.");
    assert.ok(runtimeIndex >= 0, "Missing registry-page-runtime.js reference.");
    assert.ok(entrypointIndex >= 0, "Missing registry-page.js reference.");

    assert.ok(helpersIndex < bootstrapIndex, "Helpers script must be connected before bootstrap.");
    assert.ok(bootstrapIndex < runtimeIndex, "Bootstrap script must be connected before runtime.");
    assert.ok(runtimeIndex < entrypointIndex, "Runtime script must be connected before entrypoint.");
});
