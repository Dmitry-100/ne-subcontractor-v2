"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const viewDefaultsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-mapping-ui-view-defaults.js"));

test("imports mapping ui defaults: exports required helper functions", () => {
    assert.equal(typeof viewDefaultsModule.isHtmlElement, "function");
    assert.equal(typeof viewDefaultsModule.renderMappingGridDefault, "function");
    assert.equal(typeof viewDefaultsModule.readMappingFromUiDefault, "function");
    assert.equal(typeof viewDefaultsModule.renderPreviewDefault, "function");
});

test("imports mapping ui defaults: isHtmlElement returns false in node runtime for plain values", () => {
    assert.equal(viewDefaultsModule.isHtmlElement(null), false);
    assert.equal(viewDefaultsModule.isHtmlElement({}), false);
});

test("imports mapping ui defaults: readMappingFromUiDefault returns empty mapping without DOM element", () => {
    const mapping = viewDefaultsModule.readMappingFromUiDefault(null, [
        { key: "projectCode" },
        { key: "manHours" }
    ]);

    assert.deepEqual(mapping, {});
});

test("imports mapping ui defaults: render helpers are no-op without DOM elements", () => {
    assert.doesNotThrow(() => {
        viewDefaultsModule.renderMappingGridDefault(null, { fields: [] });
        viewDefaultsModule.renderPreviewDefault(null, null, { headers: [], rows: [] });
    });
});
