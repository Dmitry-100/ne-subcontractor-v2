"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpers = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/registry-page-helpers.js"));

test("registry helpers: normalizeArray handles array, object and scalar payloads", () => {
    const sourceArray = [{ id: 1 }];
    assert.equal(helpers.normalizeArray(sourceArray), sourceArray);
    assert.deepEqual(helpers.normalizeArray({ id: 2 }), [{ id: 2 }]);
    assert.deepEqual(helpers.normalizeArray(null), []);
    assert.deepEqual(helpers.normalizeArray("value"), []);
});

test("registry helpers: buildColumns uses first object and limits to 8 columns", () => {
    const columns = helpers.buildColumns([
        null,
        {
            a: 1,
            b: 2,
            c: 3,
            d: 4,
            e: 5,
            f: 6,
            g: 7,
            h: 8,
            i: 9
        }
    ]);

    assert.deepEqual(columns, ["a", "b", "c", "d", "e", "f", "g", "h"]);
});

test("registry helpers: formatValue handles nulls, objects and long text", () => {
    assert.equal(helpers.formatValue(null), "—");
    assert.equal(helpers.formatValue({ id: 42 }), "{\"id\":42}");

    const longText = "x".repeat(130);
    const formatted = helpers.formatValue(longText);
    assert.equal(formatted.length, 120);
    assert.ok(formatted.endsWith("..."));
});

test("registry helpers: filterItems matches by projected columns", () => {
    const items = [
        { code: "A-001", name: "Насос" },
        { code: "B-002", name: "Компрессор" }
    ];

    assert.deepEqual(helpers.filterItems(items, ["code", "name"], ""), items);
    assert.deepEqual(helpers.filterItems(items, ["code", "name"], "нас"), [{ code: "A-001", name: "Насос" }]);
    assert.deepEqual(helpers.filterItems(items, ["code", "name"], "zzz"), []);
});
