"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const pagingHelpers = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-data-paging-helpers.js"));

test("contractors data paging helpers: buildRegistryLoadQuery builds paging + search query", () => {
    assert.deepEqual(
        pagingHelpers.buildRegistryLoadQuery({
            skip: 30,
            take: 15,
            searchValue: " ctr-31 "
        }),
        {
            skip: 30,
            take: 15,
            requireTotalCount: true,
            search: "ctr-31"
        });
});

test("contractors data paging helpers: buildRegistryLoadQuery returns null for empty input", () => {
    assert.equal(pagingHelpers.buildRegistryLoadQuery(null), null);
    assert.equal(pagingHelpers.buildRegistryLoadQuery({ searchValue: " " }), null);
});

test("contractors data paging helpers: tryReadPagedPayload normalizes total count", () => {
    assert.deepEqual(
        pagingHelpers.tryReadPagedPayload({
            items: [{ id: "c-1" }],
            totalCount: "7"
        }),
        {
            items: [{ id: "c-1" }],
            totalCount: 7
        });
});

test("contractors data paging helpers: buildRegistryStatusMessage is deterministic", () => {
    assert.equal(pagingHelpers.buildRegistryStatusMessage(10, 10), "Загружено подрядчиков: 10.");
    assert.equal(pagingHelpers.buildRegistryStatusMessage(10, 125), "Загружено подрядчиков: 10 (всего: 125).");
});
