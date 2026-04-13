"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const bootstrapModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/registry-page-bootstrap.js"));

function createRegistryRoot(attributes, controls) {
    const attributeMap = attributes || {};
    const controlsMap = controls || {};
    return {
        getAttribute: function (name) {
            return Object.prototype.hasOwnProperty.call(attributeMap, name)
                ? attributeMap[name]
                : null;
        },
        querySelector: function (selector) {
            return Object.prototype.hasOwnProperty.call(controlsMap, selector)
                ? controlsMap[selector]
                : null;
        }
    };
}

function createDocument(root) {
    return {
        querySelector: function (selector) {
            if (selector === "[data-registry]") {
                return root;
            }

            return null;
        }
    };
}

function createControls() {
    return {
        "[data-registry-search]": { id: "search-input" },
        "[data-registry-refresh]": { id: "refresh-button" },
        "[data-registry-status]": { id: "status" },
        "[data-registry-table-wrap]": { id: "table-wrap" },
        "[data-registry-table]": { id: "table" },
        "[data-registry-raw-wrap]": { id: "raw-wrap" },
        "[data-registry-raw]": { id: "raw-element" }
    };
}

test("registry bootstrap: validates required document", () => {
    assert.throws(function () {
        bootstrapModule.createBootstrapContext({});
    }, /document with querySelector/);
});

test("registry bootstrap: returns null when root is missing", () => {
    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(null)
    });

    assert.equal(context, null);
});

test("registry bootstrap: returns null when endpoint is missing", () => {
    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(createRegistryRoot({}, createControls()))
    });

    assert.equal(context, null);
});

test("registry bootstrap: resolves endpoint and controls", () => {
    const controls = createControls();
    const root = createRegistryRoot(
        {
            "data-api-endpoint": "/api/registry/contracts"
        },
        controls);

    const context = bootstrapModule.createBootstrapContext({
        document: createDocument(root)
    });

    assert.equal(context.endpoint, "/api/registry/contracts");
    assert.equal(context.controls.searchInput, controls["[data-registry-search]"]);
    assert.equal(context.controls.refreshButton, controls["[data-registry-refresh]"]);
    assert.equal(context.controls.statusElement, controls["[data-registry-status]"]);
    assert.equal(context.controls.tableWrap, controls["[data-registry-table-wrap]"]);
    assert.equal(context.controls.table, controls["[data-registry-table]"]);
    assert.equal(context.controls.rawWrap, controls["[data-registry-raw-wrap]"]);
    assert.equal(context.controls.rawElement, controls["[data-registry-raw]"]);
});
