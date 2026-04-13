"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const requirementsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-module-requirements.js"));

test("imports bootstrap module requirements: exports canonical requirements list", () => {
    assert.equal(Array.isArray(requirementsModule.MODULE_REQUIREMENTS), true);
    assert.equal(requirementsModule.MODULE_REQUIREMENTS.length > 20, true);
    assert.equal(requirementsModule.MODULE_REQUIREMENTS[0].key, "importsPageHelpersRoot");
});
