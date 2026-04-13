"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const compositionModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-composition.js"));

function createModuleRoot(attributes) {
    const attributeMap = attributes || {};
    return {
        getAttribute: function (name) {
            return Object.prototype.hasOwnProperty.call(attributeMap, name)
                ? attributeMap[name]
                : null;
        }
    };
}

function createHostDocument(moduleRoot) {
    return {
        querySelector: function (selector) {
            if (selector === "[data-imports-module]") {
                return moduleRoot;
            }

            return null;
        }
    };
}

test("imports bootstrap composition: requires resolver functions", () => {
    assert.throws(
        function () {
            compositionModule.createBootstrapContextCore({
                hostDocument: createHostDocument(createModuleRoot({}))
            });
        },
        /resolveControls\/resolveModuleRoots/i);
});

test("imports bootstrap composition: returns null when module root is missing", () => {
    const result = compositionModule.createBootstrapContextCore({
        hostDocument: createHostDocument(null),
        resolveControls: function () {
            return {};
        },
        resolveModuleRoots: function () {
            return {};
        }
    });

    assert.equal(result, null);
});

test("imports bootstrap composition: returns null when controls or module roots cannot be resolved", () => {
    const moduleRoot = createModuleRoot({});
    const hostDocument = createHostDocument(moduleRoot);

    const withoutControls = compositionModule.createBootstrapContextCore({
        hostDocument: hostDocument,
        resolveControls: function () {
            return null;
        },
        resolveModuleRoots: function () {
            return {};
        }
    });
    assert.equal(withoutControls, null);

    const withoutModules = compositionModule.createBootstrapContextCore({
        hostDocument: hostDocument,
        resolveControls: function () {
            return { parseButton: {} };
        },
        resolveModuleRoots: function () {
            return null;
        }
    });
    assert.equal(withoutModules, null);
});

test("imports bootstrap composition: returns composed bootstrap context", () => {
    const moduleRoot = createModuleRoot({
        "data-batches-api-endpoint": "/api/custom/batches",
        "data-xml-inbox-api-endpoint": "/api/custom/xml/inbox",
        "data-lot-recommendations-api-endpoint": "/api/custom/lot-recommendations"
    });
    const hostDocument = createHostDocument(moduleRoot);
    const controls = { parseButton: {} };
    const modules = { importsPageRuntimeRoot: {} };

    const result = compositionModule.createBootstrapContextCore({
        hostDocument: hostDocument,
        hostWindow: {},
        controlSelectors: { parseButton: "[data-imports-parse]" },
        moduleRequirements: [{ key: "importsPageRuntimeRoot", globalName: "ImportsPageRuntime" }],
        resolveControls: function (targetModuleRoot, selectors) {
            assert.equal(targetModuleRoot, moduleRoot);
            assert.deepEqual(selectors, { parseButton: "[data-imports-parse]" });
            return controls;
        },
        resolveModuleRoots: function (targetWindow, requirements, logError) {
            assert.ok(typeof logError === "function");
            assert.deepEqual(requirements, [{ key: "importsPageRuntimeRoot", globalName: "ImportsPageRuntime" }]);
            assert.deepEqual(targetWindow, {});
            return modules;
        }
    });

    assert.equal(result.endpoint, "/api/custom/batches");
    assert.equal(result.queuedEndpoint, "/api/custom/batches/queued");
    assert.equal(result.xmlInboxEndpoint, "/api/custom/xml/inbox");
    assert.equal(result.lotRecommendationsEndpoint, "/api/custom/lot-recommendations");
    assert.equal(result.controls, controls);
    assert.equal(result.moduleRoots, modules);
});
