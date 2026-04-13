"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-module-resolver.js");

const resolverModule = require(modulePath);

test("contracts runtime module resolver: requireObject validates object contract", () => {
    assert.throws(function () {
        resolverModule.requireObject(null, "foundation");
    }, /requires foundation/i);

    assert.doesNotThrow(function () {
        resolverModule.requireObject({ id: "ok" }, "foundation");
    });
});

test("contracts runtime module resolver: resolves module from browser global", () => {
    const previousWindow = global.window;
    const fakeModule = {
        createController: function () {}
    };

    global.window = {
        ContractsGridRuntimeControllersMonitoring: fakeModule
    };

    try {
        const resolved = resolverModule.resolveModule(
            "ContractsGridRuntimeControllersMonitoring",
            "./unused.js",
            ["createController"]);

        assert.equal(resolved, fakeModule);
    } finally {
        if (typeof previousWindow === "undefined") {
            delete global.window;
        } else {
            global.window = previousWindow;
        }
    }
});

test("contracts runtime module resolver: validates required module members", () => {
    const previousWindow = global.window;
    global.window = {
        ContractsGridRuntimeControllersMonitoring: {}
    };

    try {
        assert.throws(function () {
            resolverModule.resolveModule(
                "ContractsGridRuntimeControllersMonitoring",
                "./unused.js",
                ["createController"]);
        }, /не содержит обязательные методы/i);
    } finally {
        if (typeof previousWindow === "undefined") {
            delete global.window;
        } else {
            global.window = previousWindow;
        }
    }
});
