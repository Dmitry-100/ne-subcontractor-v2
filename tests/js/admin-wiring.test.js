"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const wiringModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-wiring.js"));

function createEventControl(initialState) {
    const state = initialState || {};
    const listeners = {};

    return {
        value: state.value ?? "",
        checked: Boolean(state.checked),
        href: state.href ?? "",
        addEventListener: function (eventName, handler) {
            if (!listeners[eventName]) {
                listeners[eventName] = [];
            }

            listeners[eventName].push(handler);
        },
        dispatch: function (eventName, eventData) {
            const handlers = listeners[eventName] || [];
            for (let index = 0; index < handlers.length; index += 1) {
                handlers[index](eventData || {});
            }
        }
    };
}

function createControls() {
    return {
        usersSearchInput: createEventControl({ value: "  ivanov  " }),
        usersSearchApplyButton: createEventControl(),
        usersSearchResetButton: createEventControl(),
        referenceTypeCodeInput: createEventControl({ value: " purchase_type " }),
        referenceActiveOnlyCheckbox: createEventControl({ checked: false }),
        referenceLoadButton: createEventControl(),
        referenceOpenApiLink: createEventControl({ href: "#" })
    };
}

function createNormalizeTypeCode() {
    return function normalizeTypeCode(value) {
        const normalized = String(value ?? "").trim().toUpperCase();
        if (!normalized) {
            throw new Error("Код типа обязателен.");
        }

        return normalized;
    };
}

test("admin wiring: validates required dependencies", () => {
    assert.throws(function () {
        wiringModule.createWiring({});
    }, /usersSearchInput/i);

    assert.throws(function () {
        wiringModule.createWiring({
            controls: createControls(),
            referenceApiRoot: "/api/reference-data"
        });
    }, /normalizeTypeCode/i);
});

test("admin wiring: initializes state, updates links and routes events", () => {
    const controls = createControls();
    const usersRefreshCalls = [];
    const referenceRefreshCalls = [];
    const referenceStatusCalls = [];

    const wiring = wiringModule.createWiring({
        controls: controls,
        referenceApiRoot: "/api/reference-data",
        normalizeTypeCode: createNormalizeTypeCode(),
        buildReferenceItemsUrl: function (root, typeCode, activeOnly) {
            const activeOnlyText = activeOnly ? "true" : "false";
            return `${root}/${encodeURIComponent(typeCode)}/items?activeOnly=${activeOnlyText}`;
        },
        setReferenceStatus: function (message, isError) {
            referenceStatusCalls.push({ message: message, isError: isError });
        },
        onUsersRefreshRequested: function () {
            usersRefreshCalls.push("refresh");
        },
        onReferenceRefreshRequested: function () {
            referenceRefreshCalls.push("refresh");
        }
    });

    wiring.initialize();
    assert.equal(wiring.getUsersSearch(), "ivanov");
    assert.deepEqual(wiring.getReferenceContext(), {
        typeCode: "PURCHASE_TYPE",
        activeOnly: false
    });
    assert.equal(controls.referenceOpenApiLink.href, "/api/reference-data/PURCHASE_TYPE/items?activeOnly=false");

    wiring.bindEvents();
    wiring.bindEvents();

    controls.usersSearchInput.value = "  petrov  ";
    controls.usersSearchApplyButton.dispatch("click");
    assert.equal(wiring.getUsersSearch(), "petrov");
    assert.equal(usersRefreshCalls.length, 1);

    let usersEnterPrevented = false;
    controls.usersSearchInput.value = "  sidorov ";
    controls.usersSearchInput.dispatch("keydown", {
        key: "Enter",
        preventDefault: function () {
            usersEnterPrevented = true;
        }
    });
    assert.equal(usersEnterPrevented, true);
    assert.equal(wiring.getUsersSearch(), "sidorov");
    assert.equal(usersRefreshCalls.length, 2);

    controls.usersSearchResetButton.dispatch("click");
    assert.equal(controls.usersSearchInput.value, "");
    assert.equal(wiring.getUsersSearch(), "");
    assert.equal(usersRefreshCalls.length, 3);

    controls.referenceTypeCodeInput.value = " approval_mode ";
    controls.referenceActiveOnlyCheckbox.checked = true;
    controls.referenceLoadButton.dispatch("click");
    assert.deepEqual(wiring.getReferenceContext(), {
        typeCode: "APPROVAL_MODE",
        activeOnly: true
    });
    assert.equal(controls.referenceOpenApiLink.href, "/api/reference-data/APPROVAL_MODE/items?activeOnly=true");
    assert.equal(referenceRefreshCalls.length, 1);

    let referenceEnterPrevented = false;
    controls.referenceTypeCodeInput.value = " analytics_level_1 ";
    controls.referenceTypeCodeInput.dispatch("keydown", {
        key: "Enter",
        preventDefault: function () {
            referenceEnterPrevented = true;
        }
    });
    assert.equal(referenceEnterPrevented, true);
    assert.deepEqual(wiring.getReferenceContext(), {
        typeCode: "ANALYTICS_LEVEL_1",
        activeOnly: true
    });
    assert.equal(referenceRefreshCalls.length, 2);

    controls.referenceActiveOnlyCheckbox.checked = false;
    controls.referenceActiveOnlyCheckbox.dispatch("change");
    assert.deepEqual(wiring.getReferenceContext(), {
        typeCode: "ANALYTICS_LEVEL_1",
        activeOnly: false
    });
    assert.equal(referenceRefreshCalls.length, 3);

    controls.referenceTypeCodeInput.value = "   ";
    controls.referenceLoadButton.dispatch("click");
    assert.equal(referenceRefreshCalls.length, 3);
    assert.equal(referenceStatusCalls.length, 1);
    assert.equal(referenceStatusCalls[0].isError, true);
    assert.match(referenceStatusCalls[0].message, /Код типа обязателен/i);
});
