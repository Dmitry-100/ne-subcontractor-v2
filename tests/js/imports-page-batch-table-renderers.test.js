"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleRoot = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-batch-table-renderers.js"));

test("imports batch table renderers: exports expected contract", () => {
    assert.equal(typeof moduleRoot.isHtmlElement, "function");
    assert.equal(typeof moduleRoot.createDefaultTableRenderer, "function");
});

test("imports batch table renderers: isHtmlElement is false in node runtime for plain objects", () => {
    assert.equal(moduleRoot.isHtmlElement(null), false);
    assert.equal(moduleRoot.isHtmlElement({}), false);
});

test("imports batch table renderers: default renderer is safe for non-html placeholders", () => {
    const render = moduleRoot.createDefaultTableRenderer({
        batchesTable: {},
        invalidTable: {},
        invalidWrapElement: {},
        historyTable: {},
        historyWrapElement: {}
    });

    assert.doesNotThrow(() => render({ variant: "batches", model: {} }));
    assert.doesNotThrow(() => render({ variant: "invalid", model: { visible: false } }));
    assert.doesNotThrow(() => render({ variant: "history", model: { visible: false } }));
});
