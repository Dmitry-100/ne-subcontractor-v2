"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/sla-page-helpers.js"));

function createHelpers(options) {
    return helpersModule.createHelpers(options || {});
}

test("sla-page helpers: localizeSeverity and formatDate return expected values", () => {
    const helpers = createHelpers();

    assert.equal(helpers.localizeSeverity("Overdue"), "Просрочка");
    assert.equal(helpers.localizeSeverity("warning"), "Предупреждение");
    assert.equal(helpers.localizeSeverity("Custom"), "Custom");
    assert.equal(helpers.localizeSeverity(""), "");

    assert.equal(helpers.formatDate("2026-04-12T10:00:00Z"), "12.04.2026");
    assert.equal(helpers.formatDate("bad-date"), "bad-date");
    assert.equal(helpers.formatDate(""), "");
});

test("sla-page helpers: parseApiError prefers detail/error/title and falls back to status", () => {
    const helpers = createHelpers();

    assert.equal(
        helpers.parseApiError(JSON.stringify({ detail: "Подробно", error: "Ошибка", title: "Заголовок" }), 400, "Bad Request"),
        "Подробно");
    assert.equal(
        helpers.parseApiError(JSON.stringify({ error: "Ошибка", title: "Заголовок" }), 500, "Server Error"),
        "Ошибка");
    assert.equal(
        helpers.parseApiError(JSON.stringify({ title: "Заголовок" }), 404, "Not Found"),
        "Заголовок");
    assert.equal(helpers.parseApiError("Raw text", 409, "Conflict"), "Raw text");
    assert.equal(helpers.parseApiError("", 401, "Unauthorized"), "401 Unauthorized");
});

test("sla-page helpers: escape helpers and error formatter are deterministic", () => {
    const helpers = createHelpers({
        cssGlobal: {
            escape: function (value) {
                return "escaped(" + value + ")";
            }
        }
    });

    assert.equal(helpers.escapeHtml(`<tag attr="1">&'</tag>`), "&lt;tag attr=&quot;1&quot;&gt;&amp;&#39;&lt;/tag&gt;");
    assert.equal(helpers.cssEscape("a\"b"), "escaped(a\"b)");
    assert.equal(helpers.getErrorMessage(new Error("Ошибка")), "Ошибка");
    assert.equal(helpers.getErrorMessage("raw"), "raw");

    const fallbackHelpers = createHelpers({ cssGlobal: null });
    assert.equal(fallbackHelpers.cssEscape("a\"b"), "a\\\"b");
});
