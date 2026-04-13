"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const handlersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-shortlist-runtime-handlers.js"));

function createSetup(overrides) {
    const calls = {
        status: [],
        adjustmentsStatus: [],
        apply: [],
        recommendations: [],
        adjustments: [],
        busyFlags: []
    };

    const selectedRef = { value: null };
    const controls = {
        maxIncludedInput: { value: "5" },
        adjustmentReasonInput: { value: "Автоподбор" }
    };

    const dataController = {
        setShortlistBusy: function (value) {
            calls.busyFlags.push({ key: "shortlist", value: value });
        },
        setShortlistAdjustmentsBusy: function (value) {
            calls.busyFlags.push({ key: "adjustments", value: value });
        },
        resetBusyState: function () {
            calls.busyFlags.push({ key: "reset", value: true });
        }
    };

    const baseOptions = {
        controls: controls,
        services: {
            endpoint: "/api/procedures",
            apiClient: {
                applyShortlistRecommendations: async function (endpoint, procedureId, payload) {
                    calls.apply.push({ endpoint: endpoint, procedureId: procedureId, payload: payload });
                    return { appliedCount: 1, skippedCount: 0 };
                }
            },
            workflow: {
                buildApplyResultStatus: function () {
                    return "Рекомендации применены.";
                }
            },
            getSelectedProcedure: function () {
                return selectedRef.value;
            },
            supportsShortlistWorkspace: function (procedure) {
                return Boolean(procedure) && procedure.status !== "Completed" && procedure.status !== "Canceled";
            },
            normalizeMaxIncluded: function (value) {
                const parsed = Number.parseInt(value, 10);
                return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
            },
            normalizeAdjustmentReason: function (value) {
                const normalized = String(value || "").trim();
                return normalized || "Автоподбор списка кандидатов";
            },
            setShortlistStatus: function (message, isError) {
                calls.status.push({ message: message, isError: isError });
            },
            setShortlistAdjustmentsStatus: function (message, isError) {
                calls.adjustmentsStatus.push({ message: message, isError: isError });
            }
        },
        state: {
            dataController: dataController,
            updateControls: function () {},
            clearData: function () {},
            loadShortlistRecommendations: async function (procedureId) {
                calls.recommendations.push(procedureId);
                return [{ contractorId: "c-1" }];
            },
            loadShortlistAdjustments: async function (procedureId) {
                calls.adjustments.push(procedureId);
                return [{ id: "adj-1" }];
            }
        }
    };

    const merged = {
        controls: { ...baseOptions.controls, ...(overrides?.controls || {}) },
        services: { ...baseOptions.services, ...(overrides?.services || {}) },
        state: { ...baseOptions.state, ...(overrides?.state || {}) }
    };

    return {
        handlers: handlersModule.createHandlers(merged),
        calls: calls,
        controls: merged.controls,
        selectedRef: selectedRef
    };
}

test("procedures shortlist runtime handlers: validates required dependencies", () => {
    assert.throws(function () {
        handlersModule.createHandlers({});
    }, /getSelectedProcedure/);
});

test("procedures shortlist runtime handlers: max included normalization updates input", () => {
    const setup = createSetup();
    setup.controls.maxIncludedInput.value = "0";

    setup.handlers.onMaxIncludedChanged();

    assert.equal(setup.controls.maxIncludedInput.value, "1");
});

test("procedures shortlist runtime handlers: apply uses normalized payload and refreshes datasets", async () => {
    const setup = createSetup();
    setup.selectedRef.value = { id: "proc-7", status: "OnApproval" };
    setup.controls.maxIncludedInput.value = "-2";
    setup.controls.adjustmentReasonInput.value = " ";

    await setup.handlers.onApplyClick();

    assert.equal(setup.calls.apply.length, 1);
    assert.deepEqual(setup.calls.apply[0], {
        endpoint: "/api/procedures",
        procedureId: "proc-7",
        payload: {
            maxIncluded: 1,
            adjustmentReason: "Автоподбор списка кандидатов"
        }
    });
    assert.equal(setup.controls.maxIncludedInput.value, "1");
    assert.deepEqual(setup.calls.recommendations, ["proc-7"]);
    assert.deepEqual(setup.calls.adjustments, ["proc-7"]);
    assert.equal(setup.calls.status.some(function (item) {
        return item.message === "Рекомендации применены." && item.isError === false;
    }), true);
});

test("procedures shortlist runtime handlers: selection reset for null procedure", async () => {
    const statusCalls = [];
    const adjustmentsStatusCalls = [];

    const setup = createSetup({
        services: {
            setShortlistStatus: function (message, isError) {
                statusCalls.push({ message: message, isError: isError });
            },
            setShortlistAdjustmentsStatus: function (message, isError) {
                adjustmentsStatusCalls.push({ message: message, isError: isError });
            }
        }
    });

    await setup.handlers.onSelectionChanged(null);

    assert.deepEqual(statusCalls.at(-1), {
        message: "Рекомендации ещё не сформированы.",
        isError: false
    });
    assert.deepEqual(adjustmentsStatusCalls.at(-1), {
        message: "Журнал корректировок пока не загружен.",
        isError: false
    });
});
