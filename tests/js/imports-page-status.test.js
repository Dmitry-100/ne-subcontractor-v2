"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const statusModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-status.js"));

function createStatusElement() {
    const toggles = [];
    return {
        textContent: "",
        classList: {
            toggle: function (className, value) {
                toggles.push({
                    className: className,
                    value: Boolean(value)
                });
            }
        },
        getToggles: function () {
            return toggles.slice();
        }
    };
}

function createElementsMap() {
    return {
        upload: createStatusElement(),
        batches: createStatusElement(),
        mapping: createStatusElement(),
        transition: createStatusElement(),
        xml: createStatusElement(),
        lot: createStatusElement()
    };
}

test("imports status: createStatusService validates required dependencies", () => {
    assert.throws(
        function () {
            statusModule.createStatusService({});
        },
        /statusElements/);
});

test("imports status: default setter updates text and error class", () => {
    const elements = createElementsMap();
    const service = statusModule.createStatusService({
        statusElements: elements
    });

    service.setUploadStatus("ok", false);
    service.setTransitionStatus("error", true);

    assert.equal(elements.upload.textContent, "ok");
    assert.deepEqual(elements.upload.getToggles(), [{
        className: "imports-status--error",
        value: false
    }]);

    assert.equal(elements.transition.textContent, "error");
    assert.deepEqual(elements.transition.getToggles(), [{
        className: "imports-status--error",
        value: true
    }]);
});

test("imports status: custom setStatusView receives normalized payload", () => {
    const calls = [];
    const service = statusModule.createStatusService({
        setStatusView: function (key, message, isError) {
            calls.push({
                key: key,
                message: message,
                isError: isError
            });
        }
    });

    service.setMappingStatus("mapped", 0);
    service.setLotStatus("failed", 1);

    assert.deepEqual(calls, [
        { key: "mapping", message: "mapped", isError: false },
        { key: "lot", message: "failed", isError: true }
    ]);
});
