"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const controlsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-controls.js"));

function createModuleRoot(controlsMap) {
    const controls = controlsMap || {};
    return {
        querySelector: function (selector) {
            return Object.prototype.hasOwnProperty.call(controls, selector) ? controls[selector] : null;
        }
    };
}

test("imports bootstrap controls: exposes canonical selectors", () => {
    assert.equal(controlsModule.CONTROL_SELECTORS.fileInput, "[data-imports-file]");
    assert.equal(controlsModule.CONTROL_SELECTORS.lotSelectedTable, "[data-imports-lot-selected-table]");
});

test("imports bootstrap controls: resolves controls by selector dictionary", () => {
    const selectors = {
        first: "[data-first]",
        second: "[data-second]"
    };
    const moduleRoot = createModuleRoot({
        "[data-first]": { id: 1 },
        "[data-second]": { id: 2 }
    });

    const controls = controlsModule.resolveControls(moduleRoot, selectors);

    assert.deepEqual(controls, {
        first: { id: 1 },
        second: { id: 2 }
    });
});

test("imports bootstrap controls: returns null when any control is missing", () => {
    const selectors = {
        first: "[data-first]",
        second: "[data-second]"
    };
    const moduleRoot = createModuleRoot({
        "[data-first]": { id: 1 }
    });

    const controls = controlsModule.resolveControls(moduleRoot, selectors);
    assert.equal(controls, null);
});
