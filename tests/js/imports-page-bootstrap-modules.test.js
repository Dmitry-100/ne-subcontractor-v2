"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-bootstrap-modules.js"));

test("imports bootstrap modules: exposes canonical module requirements", () => {
    assert.equal(Array.isArray(modulesModule.MODULE_REQUIREMENTS), true);
    assert.equal(modulesModule.MODULE_REQUIREMENTS.length > 0, true);
    assert.equal(modulesModule.MODULE_REQUIREMENTS[0].key, "importsPageHelpersRoot");
});

test("imports bootstrap modules: resolves roots with and without factory methods", () => {
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

    const moduleRoots = modulesModule.resolveModuleRoots(hostWindow, requirements, function () {});

    assert.deepEqual(moduleRoots, {
        one: hostWindow.One,
        two: hostWindow.Two
    });
});

test("imports bootstrap modules: logs and returns null when module contract is invalid", () => {
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

    const moduleRoots = modulesModule.resolveModuleRoots(hostWindow, requirements, function (message) {
        loggedMessages.push(message);
    });

    assert.equal(moduleRoots, null);
    assert.deepEqual(loggedMessages, ["one-missing"]);
});
