"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const batchTablesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-batch-tables.js"));

test("imports batch tables: createBatchTablesService validates dependencies", () => {
    assert.throws(
        function () {
            batchTablesModule.createBatchTablesService({});
        },
        /tableModels/);
});

test("imports batch tables: render methods build models and call render callback", () => {
    const rendered = [];
    const service = batchTablesModule.createBatchTablesService({
        tableModels: {
            buildBatchesModel: function (items) {
                return { headers: ["b"], rows: items };
            },
            buildInvalidRowsModel: function (details) {
                return { visible: true, headers: ["i"], rows: details };
            },
            buildHistoryModel: function (items) {
                return { visible: true, headers: ["h"], rows: items };
            }
        },
        renderTable: function (context) {
            rendered.push(context);
        }
    });

    const batchRows = [{ id: "b-1" }];
    const invalidRows = [{ id: "i-1" }];
    const historyRows = [{ id: "h-1" }];

    const batchesModel = service.renderBatchesTable(batchRows);
    const invalidModel = service.renderInvalidRows(invalidRows);
    const historyModel = service.renderHistoryTable(historyRows);

    assert.deepEqual(batchesModel, { headers: ["b"], rows: batchRows });
    assert.deepEqual(invalidModel, { visible: true, headers: ["i"], rows: invalidRows });
    assert.deepEqual(historyModel, { visible: true, headers: ["h"], rows: historyRows });

    assert.equal(rendered.length, 3);
    assert.equal(rendered[0].variant, "batches");
    assert.equal(rendered[1].variant, "invalid");
    assert.equal(rendered[2].variant, "history");
});
