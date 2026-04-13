"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const helpersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/sla-page-runtime-helpers.js"));

function createValidRoots() {
    return {
        helpersRoot: { createHelpers: function () {} },
        apiRoot: { createApiClient: function () {} },
        rulesRoot: {
            createDraftRule: function () {},
            renderRulesMarkup: function () {},
            collectRulesFromRows: function () {}
        },
        violationsRoot: {
            renderViolationsMarkup: function () {},
            buildViolationReasonPayload: function () {}
        }
    };
}

test("sla runtime helpers: ensureModuleRoots validates required contracts", () => {
    assert.doesNotThrow(function () {
        helpersModule.ensureModuleRoots(createValidRoots());
    });

    assert.throws(function () {
        helpersModule.ensureModuleRoots({});
    }, /helper-скрипт не загружен/i);
});

test("sla runtime helpers: resolveFetchImpl prioritizes explicit fetch", () => {
    const customFetch = function () {};
    const hostFetch = function () {};
    const resolved = helpersModule.resolveFetchImpl(
        { fetchImpl: customFetch },
        { fetch: hostFetch });

    assert.equal(resolved, customFetch);
});

test("sla runtime helpers: resolveControls validates required elements", () => {
    function createControl() {
        return {
            addEventListener: function () {}
        };
    }

    const controls = {
        "[data-sla-rules-body]": { addEventListener: function () {} },
        "[data-sla-violations-body]": { addEventListener: function () {} },
        "[data-sla-include-resolved]": createControl(),
        "[data-sla-run]": createControl(),
        "[data-sla-refresh-violations]": createControl(),
        "[data-sla-add-rule]": createControl(),
        "[data-sla-save-rules]": createControl(),
        "[data-sla-reload-rules]": createControl()
    };

    const moduleElement = {
        querySelector: function (selector) {
            return controls[selector] || null;
        }
    };

    const result = helpersModule.resolveControls(moduleElement);
    assert.equal(result.runButton, controls["[data-sla-run]"]);

    const missingControlsElement = {
        querySelector: function () {
            return null;
        }
    };

    assert.throws(function () {
        helpersModule.resolveControls(missingControlsElement);
    }, /не найдены обязательные элементы интерфейса/i);
});

test("sla runtime helpers: createApiOptions and run-status formatter are deterministic", () => {
    const moduleElement = {
        dataset: {}
    };
    const fetchImpl = function () {};
    const parseApiError = function () {};

    const options = helpersModule.createApiOptions(moduleElement, fetchImpl, parseApiError);
    assert.equal(options.rulesApi, "/api/sla/rules");
    assert.equal(options.fetchImpl, fetchImpl);
    assert.equal(options.parseApiError, parseApiError);

    const status = helpersModule.formatRunMonitoringStatus({
        activeViolations: 3,
        openViolations: 2,
        notificationSuccessCount: 5,
        notificationFailureCount: 1
    });
    assert.match(status, /Активно: 3/);
    assert.match(status, /ошибки: 1/);
});
