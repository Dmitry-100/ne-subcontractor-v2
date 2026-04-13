"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const stateModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-state.js"));

test("imports state: createStateStore exposes default values", () => {
    const state = stateModule.createStateStore();

    assert.deepEqual(state.getParsedRows(), []);
    assert.equal(state.getSourceFileName(), "");
    assert.deepEqual(state.getRawRows(), []);
    assert.equal(state.getDataStartRowIndex(), 1);
    assert.deepEqual(state.getMappingSelection(), {});
    assert.equal(state.getSelectedBatch(), null);
    assert.equal(state.getSelectedBatchId(), null);
    assert.equal(state.getLotRecommendations(), null);
    assert.equal(state.getLotRecommendationsBatchId(), null);
    assert.ok(state.getLotSelectionsByKey() instanceof Map);
});

test("imports state: setters update values and selected batch id is resolved", () => {
    const state = stateModule.createStateStore();

    state.setParsedRows([{ rowNumber: 1 }]);
    state.setSourceFileName("source.csv");
    state.setRawRows([["a", "b"]]);
    state.setSourceColumns(["ColA", "ColB"]);
    state.setDataStartRowIndex(2);
    state.setMappingSelection({ projectCode: 0 });
    state.setSelectedBatch({ id: "batch-42", status: "Validated" });
    state.setLotRecommendations({ groups: [{ key: "g-1" }] });
    state.setLotRecommendationsBatchId("batch-42");
    state.setLotSelectionsByKey(new Map([["g-1", { isSelected: true }]]));

    assert.deepEqual(state.getParsedRows(), [{ rowNumber: 1 }]);
    assert.equal(state.getSourceFileName(), "source.csv");
    assert.deepEqual(state.getRawRows(), [["a", "b"]]);
    assert.deepEqual(state.getSourceColumns(), ["ColA", "ColB"]);
    assert.equal(state.getDataStartRowIndex(), 2);
    assert.deepEqual(state.getMappingSelection(), { projectCode: 0 });
    assert.equal(state.getSelectedBatchId(), "batch-42");
    assert.deepEqual(state.getLotRecommendations(), { groups: [{ key: "g-1" }] });
    assert.equal(state.getLotRecommendationsBatchId(), "batch-42");
    assert.deepEqual(Array.from(state.getLotSelectionsByKey().keys()), ["g-1"]);
});

test("imports state: clearDetailsPoll clears stored handle and calls clearTimeout", () => {
    const cleared = [];
    const state = stateModule.createStateStore({
        clearTimeout: function (handle) {
            cleared.push(handle);
        }
    });

    state.setDetailsPollHandle("timer-1");
    state.clearDetailsPoll();
    state.clearDetailsPoll();

    assert.deepEqual(cleared, ["timer-1"]);
    assert.equal(state.getDetailsPollHandle(), null);
});
