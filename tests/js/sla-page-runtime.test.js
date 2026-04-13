"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/sla-page-runtime.js"));

function createEventTarget() {
    return {
        handlers: {},
        disabled: false,
        checked: false,
        innerHTML: "",
        addEventListener: function (eventName, handler) {
            this.handlers[eventName] = handler;
        },
        dispatch: function (eventName, payload) {
            if (!this.handlers[eventName]) {
                return undefined;
            }

            return this.handlers[eventName](payload || {});
        }
    };
}

function createModuleElement(controls) {
    const selectorMap = {
        "[data-sla-rules-body]": controls.rulesBody,
        "[data-sla-violations-body]": controls.violationsBody,
        "[data-sla-include-resolved]": controls.includeResolvedInput,
        "[data-sla-run]": controls.runButton,
        "[data-sla-refresh-violations]": controls.refreshViolationsButton,
        "[data-sla-add-rule]": controls.addRuleButton,
        "[data-sla-save-rules]": controls.saveRulesButton,
        "[data-sla-reload-rules]": controls.reloadRulesButton
    };

    return {
        dataset: {
            rulesApi: "/api/custom/sla/rules",
            violationsApi: "/api/custom/sla/violations",
            runApi: "/api/custom/sla/run"
        },
        querySelector: function (selector) {
            return selectorMap[selector] || null;
        }
    };
}

test("sla-page runtime: validates required module roots", () => {
    assert.throws(function () {
        runtimeModule.initializeSlaPage({
            moduleElement: {
                querySelector: function () { return null; },
                dataset: {}
            },
            setStatus: function () {},
            moduleRoots: {}
        });
    }, /helper-скрипт не загружен/i);
});

test("sla-page runtime: composes modules, initializes data and binds events", async () => {
    const events = {
        apiClientOptions: null,
        getViolationsIncludeResolved: [],
        renderRulesCalls: [],
        renderViolationsCalls: [],
        statuses: []
    };

    const controls = {
        rulesBody: createEventTarget(),
        violationsBody: createEventTarget(),
        includeResolvedInput: createEventTarget(),
        runButton: createEventTarget(),
        refreshViolationsButton: createEventTarget(),
        addRuleButton: createEventTarget(),
        saveRulesButton: createEventTarget(),
        reloadRulesButton: createEventTarget()
    };
    controls.includeResolvedInput.checked = false;
    controls.rulesBody.querySelectorAll = function (selector) {
        if (selector !== "tr") {
            return [];
        }

        return [{ id: "rule-row" }];
    };
    controls.violationsBody.querySelector = function (selector) {
        if (selector === "tr[data-violation-id=\"v-1\"]") {
            return { id: "violation-row" };
        }

        return null;
    };

    const moduleElement = createModuleElement(controls);

    const runtime = runtimeModule.initializeSlaPage({
        window: {
            fetch: function () {}
        },
        moduleElement: moduleElement,
        setStatus: function (text, isError) {
            events.statuses.push({ text: text, isError: isError });
        },
        moduleRoots: {
            helpersRoot: {
                createHelpers: function () {
                    return {
                        parseApiError: function () { return "api-error"; },
                        getErrorMessage: function (error) { return error.message; },
                        escapeHtml: function (value) { return String(value); },
                        localizeSeverity: function (value) { return value; },
                        formatDate: function (value) { return String(value); },
                        cssEscape: function (value) { return String(value); }
                    };
                }
            },
            apiRoot: {
                createApiClient: function (options) {
                    events.apiClientOptions = options;
                    return {
                        getRules: async function () {
                            return [{
                                purchaseTypeCode: "PT-01",
                                warningDaysBeforeDue: 3,
                                isActive: true,
                                description: "Rule"
                            }];
                        },
                        saveRules: async function (items) {
                            events.savedRulesPayload = items;
                            return items;
                        },
                        getViolations: async function (includeResolved) {
                            events.getViolationsIncludeResolved.push(includeResolved);
                            return [{
                                id: "v-1",
                                severity: "Warning",
                                dueDate: "2026-04-12",
                                title: "Violation",
                                recipientEmail: "demo@example.com",
                                reasonCode: "",
                                reasonComment: null,
                                isResolved: false
                            }];
                        },
                        runMonitoring: async function () {
                            events.runMonitoringCalled = true;
                            return {
                                activeViolations: 1,
                                openViolations: 1,
                                notificationSuccessCount: 1,
                                notificationFailureCount: 0
                            };
                        },
                        saveViolationReason: async function (violationId, payload) {
                            events.savedViolationReason = {
                                violationId: violationId,
                                payload: payload
                            };
                        }
                    };
                }
            },
            rulesRoot: {
                createDraftRule: function () {
                    return {
                        purchaseTypeCode: "PT-NEW",
                        warningDaysBeforeDue: 2,
                        isActive: true,
                        description: ""
                    };
                },
                renderRulesMarkup: function (rules) {
                    events.renderRulesCalls.push(rules);
                    return `rules:${rules.length}`;
                },
                collectRulesFromRows: function (rows) {
                    events.collectRulesRows = rows;
                    return [{
                        purchaseTypeCode: "PT-SAVED",
                        warningDaysBeforeDue: 2,
                        isActive: true,
                        description: null
                    }];
                }
            },
            violationsRoot: {
                renderViolationsMarkup: function (violations) {
                    events.renderViolationsCalls.push(violations);
                    return `violations:${violations.length}`;
                },
                buildViolationReasonPayload: function (row) {
                    events.violationReasonRow = row;
                    return {
                        reasonCode: "DOC_DELAY",
                        reasonComment: null
                    };
                }
            }
        }
    });

    await Promise.resolve();
    await Promise.resolve();
    await new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });

    assert.equal(typeof runtime.loadRules, "function");
    assert.equal(typeof runtime.loadViolations, "function");
    assert.equal(events.apiClientOptions.rulesApi, "/api/custom/sla/rules");
    assert.equal(events.apiClientOptions.violationsApi, "/api/custom/sla/violations");
    assert.equal(events.apiClientOptions.runApi, "/api/custom/sla/run");
    assert.equal(typeof events.apiClientOptions.fetchImpl, "function");
    assert.equal(controls.rulesBody.innerHTML, "rules:1");
    assert.equal(controls.violationsBody.innerHTML, "violations:1");
    assert.equal(events.statuses.some(function (entry) {
        return entry.text === "SLA загружен.";
    }), true);
    assert.deepEqual(events.getViolationsIncludeResolved, [false]);

    controls.addRuleButton.dispatch("click");
    assert.equal(controls.rulesBody.innerHTML, "rules:2");

    await controls.saveRulesButton.dispatch("click");
    assert.deepEqual(events.collectRulesRows, [{ id: "rule-row" }]);
    assert.deepEqual(events.savedRulesPayload, [{
        purchaseTypeCode: "PT-SAVED",
        warningDaysBeforeDue: 2,
        isActive: true,
        description: null
    }]);

    await controls.runButton.dispatch("click");
    assert.equal(events.runMonitoringCalled, true);
    assert.equal(controls.runButton.disabled, false);
    assert.match(events.statuses.at(-1).text, /Цикл SLA завершен/i);
});
