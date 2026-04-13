"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotTablesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-lot-tables.js"));

test("imports lot tables: createLotTablesService validates dependencies", () => {
    assert.throws(
        function () {
            lotTablesModule.createLotTablesService({});
        },
        /lotState/);
});

test("imports lot tables: build model methods use current state and formatters", () => {
    let recommendations = { id: "rec-1" };
    let selectionsByKey = new Map([["g1", { selected: true }]]);
    const calls = {
        groups: [],
        selected: []
    };

    const service = lotTablesModule.createLotTablesService({
        lotState: {
            buildLotGroupsTableModel: function (args) {
                calls.groups.push(args);
                return { headers: ["h1"], rows: [] };
            },
            buildLotSelectedTableModel: function (args) {
                calls.selected.push(args);
                return { headers: ["h2"], rows: [] };
            }
        },
        getRecommendations: function () {
            return recommendations;
        },
        getSelectionsByKey: function () {
            return selectionsByKey;
        },
        formatNumber: function (value) {
            return `n:${value}`;
        },
        formatDateRange: function (from, to) {
            return `d:${from}-${to}`;
        },
        renderTable: function () {}
    });

    const groupsModel = service.buildGroupsModel();
    const selectedModel = service.buildSelectedModel();

    assert.deepEqual(groupsModel, { headers: ["h1"], rows: [] });
    assert.deepEqual(selectedModel, { headers: ["h2"], rows: [] });
    assert.equal(calls.groups.length, 1);
    assert.equal(calls.selected.length, 1);
    assert.equal(calls.groups[0].recommendations.id, "rec-1");
    assert.equal(calls.groups[0].selectionsByKey.get("g1").selected, true);
    assert.equal(typeof calls.groups[0].formatNumber, "function");
    assert.equal(typeof calls.groups[0].formatDateRange, "function");
    assert.equal(typeof calls.selected[0].formatNumber, "function");
});

test("imports lot tables: render methods call renderTable callback with variant and model", () => {
    const rendered = [];
    const service = lotTablesModule.createLotTablesService({
        lotState: {
            buildLotGroupsTableModel: function () {
                return { headers: ["g"], rows: [] };
            },
            buildLotSelectedTableModel: function () {
                return { headers: ["s"], rows: [] };
            }
        },
        getRecommendations: function () {
            return null;
        },
        getSelectionsByKey: function () {
            return new Map();
        },
        formatNumber: function (value) {
            return String(value);
        },
        formatDateRange: function (from, to) {
            return `${from}-${to}`;
        },
        renderTable: function (context) {
            rendered.push(context);
        }
    });

    service.renderLotGroupsTable();
    service.renderLotSelectedTable();

    assert.equal(rendered.length, 2);
    assert.equal(rendered[0].variant, "groups");
    assert.deepEqual(rendered[0].model, { headers: ["g"], rows: [] });
    assert.equal(rendered[1].variant, "selected");
    assert.deepEqual(rendered[1].model, { headers: ["s"], rows: [] });
});
