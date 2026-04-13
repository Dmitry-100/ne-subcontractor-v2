"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const projectsHelpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/projects-helpers.js"));

test("projects helpers: normalizeGuid and toTrimmedString are deterministic", () => {
    const helpers = projectsHelpersModule.createHelpers();

    assert.equal(helpers.normalizeGuid(null), null);
    assert.equal(helpers.normalizeGuid(undefined), null);
    assert.equal(helpers.normalizeGuid("   "), null);
    assert.equal(helpers.normalizeGuid("  id-1  "), "id-1");

    assert.equal(helpers.toTrimmedString(null), "");
    assert.equal(helpers.toTrimmedString("  Проект  "), "Проект");
});

test("projects helpers: parseErrorBody resolves detail/error/title/fallback", () => {
    const helpers = projectsHelpersModule.createHelpers();

    assert.equal(
        helpers.parseErrorBody("{\"detail\":\"Ошибка детализации\"}", 400),
        "Ошибка детализации");

    assert.equal(
        helpers.parseErrorBody("{\"error\":\"Ошибка\"}", 400),
        "Ошибка");

    assert.equal(
        helpers.parseErrorBody("{\"title\":\"Заголовок\"}", 400),
        "Заголовок");

    assert.equal(
        helpers.parseErrorBody("raw text", 400),
        "raw text");

    assert.equal(
        helpers.parseErrorBody("", 500),
        "Ошибка запроса (500).");
});
