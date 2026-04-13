"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-data-helpers.js"));

test("procedures data helpers: toFiniteInteger normalizes valid values", () => {
    assert.equal(helpersModule.toFiniteInteger(10), 10);
    assert.equal(helpersModule.toFiniteInteger("15"), 15);
    assert.equal(helpersModule.toFiniteInteger(8.7), 8);
});

test("procedures data helpers: toFiniteInteger returns null for invalid values", () => {
    assert.equal(helpersModule.toFiniteInteger(undefined), null);
    assert.equal(helpersModule.toFiniteInteger("abc"), null);
    assert.equal(helpersModule.toFiniteInteger(Number.NaN), null);
});

test("procedures data helpers: buildProceduresLoadQuery builds paging query", () => {
    const query = helpersModule.buildProceduresLoadQuery({
        skip: 20,
        take: 10,
        searchValue: "  on approval  "
    }, 15);

    assert.deepEqual(query, {
        skip: 20,
        take: 10,
        requireTotalCount: true,
        search: "on approval"
    });
});

test("procedures data helpers: buildProceduresLoadQuery falls back to defaults", () => {
    const query = helpersModule.buildProceduresLoadQuery({
        skip: -1,
        take: 0,
        searchValue: ""
    }, 15);

    assert.equal(query, null);
});

test("procedures data helpers: toPagedResult normalizes response", () => {
    const paged = helpersModule.toPagedResult({
        items: [{ id: "proc-1" }],
        totalCount: "7",
        take: "5"
    }, 15);

    assert.deepEqual(paged, {
        items: [{ id: "proc-1" }],
        totalCount: 7,
        take: 5
    });
});

test("procedures data helpers: toListItem maps details with fallback", () => {
    const mapped = helpersModule.toListItem({
        id: "proc-1",
        objectName: "Обновлённая процедура",
        status: "OnApproval"
    }, {
        id: "proc-1",
        objectName: "Старая процедура",
        status: "Created",
        lotId: "LOT-1"
    });

    assert.equal(mapped.id, "proc-1");
    assert.equal(mapped.objectName, "Обновлённая процедура");
    assert.equal(mapped.status, "OnApproval");
    assert.equal(mapped.lotId, "LOT-1");
});
