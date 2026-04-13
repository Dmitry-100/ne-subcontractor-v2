"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const validationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-validation.js"));

function createModuleRoot(controlsMap) {
    const controls = controlsMap || {};
    return {
        querySelector: function (selector) {
            return Object.prototype.hasOwnProperty.call(controls, selector) ? controls[selector] : null;
        }
    };
}

test("imports bootstrap validation: resolves controls by selector dictionary", () => {
    const selectors = {
        first: "[data-first]",
        second: "[data-second]"
    };
    const moduleRoot = createModuleRoot({
        "[data-first]": { id: 1 },
        "[data-second]": { id: 2 }
    });

    const controls = validationModule.resolveControls(moduleRoot, selectors);

    assert.deepEqual(controls, {
        first: { id: 1 },
        second: { id: 2 }
    });
});

test("imports bootstrap validation: returns null when any control is missing", () => {
    const selectors = {
        first: "[data-first]",
        second: "[data-second]"
    };
    const moduleRoot = createModuleRoot({
        "[data-first]": { id: 1 }
    });

    const controls = validationModule.resolveControls(moduleRoot, selectors);
    assert.equal(controls, null);
});

test("imports bootstrap validation: resolves module roots with and without factory methods", () => {
    const requirements = [
        {
            key: "one",
            globalName: "One",
            methodName: "build",
            errorMessage: "one-missing"
        },
        {
            key: "two",
            globalName: "Two",
            errorMessage: "two-missing"
        }
    ];
    const hostWindow = {
        One: { build: function () {} },
        Two: { arbitrary: true }
    };

    const moduleRoots = validationModule.resolveModuleRoots(hostWindow, requirements, function () {});

    assert.deepEqual(moduleRoots, {
        one: hostWindow.One,
        two: hostWindow.Two
    });
});

test("imports bootstrap validation: logs and returns null when module contract is invalid", () => {
    const loggedMessages = [];
    const requirements = [
        {
            key: "one",
            globalName: "One",
            methodName: "build",
            errorMessage: "one-missing"
        }
    ];
    const hostWindow = {
        One: {}
    };

    const moduleRoots = validationModule.resolveModuleRoots(hostWindow, requirements, function (message) {
        loggedMessages.push(message);
    });

    assert.equal(moduleRoots, null);
    assert.deepEqual(loggedMessages, ["one-missing"]);
});
