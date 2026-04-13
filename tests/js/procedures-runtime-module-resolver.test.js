"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const resolverModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-runtime-module-resolver.js"));

test("procedures runtime module resolver: validates module object and required members", () => {
    assert.throws(function () {
        resolverModule.resolveModule("UnknownModule", "./unknown.js", []);
    }, /Не удалось загрузить модуль/);

    const fakeModulePath = path.resolve(__dirname, "fixtures/procedures-runtime-resolver-fixture.js");
    assert.throws(function () {
        resolverModule.resolveModule("UnknownModule", fakeModulePath, ["missingMethod"]);
    }, /не содержит обязательные методы/);
});
