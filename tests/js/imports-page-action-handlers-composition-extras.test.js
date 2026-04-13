"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const extrasModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-action-handlers-composition-extras.js"));

function createControl() {
    return {
        disabled: false,
        value: "",
        hidden: false,
        options: []
    };
}

function createSettings(overrides) {
    const calls = {
        loadBatches: 0,
        updateLotActionButtons: 0,
        setLotStatus: [],
        downloadValidationReport: [],
        downloadLotReconciliationReport: []
    };

    const settings = {
        refreshBatchesButton: createControl(),
        xmlQueueButton: createControl(),
        xmlRefreshButton: createControl(),
        lotBuildButton: createControl(),
        lotApplyButton: createControl(),
        historyRefreshButton: createControl(),
        xmlSourceInput: createControl(),
        xmlExternalIdInput: createControl(),
        xmlFileNameInput: createControl(),
        xmlContentInput: createControl(),
        loadBatches: async function () { calls.loadBatches += 1; },
        queueXmlInboxItem: async function () { return null; },
        loadXmlInbox: async function () {},
        buildLotRecommendations: async function () {},
        applyLotRecommendations: async function () {},
        updateLotActionButtons: function () { calls.updateLotActionButtons += 1; },
        setLotStatus: function (message, isError) {
            calls.setLotStatus.push({ message: message, isError: isError });
        },
        loadBatchHistory: async function () {},
        setTransitionStatus: function () {},
        downloadValidationReport: function (batchId, includeValidRows) {
            calls.downloadValidationReport.push({ batchId: batchId, includeValidRows: includeValidRows });
        },
        downloadLotReconciliationReport: function (batchId) {
            calls.downloadLotReconciliationReport.push(batchId);
        },
        setXmlStatus: function () {}
    };

    return {
        calls: calls,
        settings: Object.assign(settings, overrides || {})
    };
}

test("imports composition extras: refresh batches toggles button disabled", async () => {
    const setup = createSettings();
    const extras = extrasModule.createExtrasHandlers(setup.settings, function () {
        return null;
    });

    assert.equal(setup.settings.refreshBatchesButton.disabled, false);
    const promise = extras.onRefreshBatchesClick();
    assert.equal(setup.settings.refreshBatchesButton.disabled, true);
    await promise;

    assert.equal(setup.settings.refreshBatchesButton.disabled, false);
    assert.equal(setup.calls.loadBatches, 1);
});

test("imports composition extras: lot action reports errors and refreshes buttons", async () => {
    const setup = createSettings({
        buildLotRecommendations: async function () {
            throw new Error("lot-failed");
        }
    });
    const extras = extrasModule.createExtrasHandlers(setup.settings, function () {
        return null;
    });

    await extras.onLotBuildClick();

    assert.equal(setup.calls.updateLotActionButtons, 1);
    assert.deepEqual(setup.calls.setLotStatus, [{
        message: "Ошибка построения рекомендаций: lot-failed",
        isError: true
    }]);
});

test("imports composition extras: selected batch drives report downloads", () => {
    const setup = createSettings();
    const extras = extrasModule.createExtrasHandlers(setup.settings, function () {
        return { id: "batch-77" };
    });

    extras.onDownloadInvalidReportClick();
    extras.onDownloadFullReportClick();
    extras.onDownloadLotReconciliationReportClick();

    assert.deepEqual(setup.calls.downloadValidationReport, [
        { batchId: "batch-77", includeValidRows: false },
        { batchId: "batch-77", includeValidRows: true }
    ]);
    assert.deepEqual(setup.calls.downloadLotReconciliationReport, ["batch-77"]);
});
