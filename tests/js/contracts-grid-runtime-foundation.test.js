"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const foundationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-foundation.js"));

function createStatusElement() {
    return {
        textContent: "",
        classList: {
            toggles: [],
            toggle: function (name, value) {
                this.toggles.push({ name: name, value: value });
            }
        }
    };
}

test("contracts runtime foundation: validates required options", () => {
    assert.throws(function () {
        foundationModule.createRuntimeFoundation({
            hostWindow: {},
            moduleRoot: {},
            elements: {}
        });
    }, /modules/i);
});

test("contracts runtime foundation: composes base api/model/state/status contracts", () => {
    const events = {
        apiClientOptions: null,
        modelOptions: null,
        readUrlFilterState: null,
        clearUrlFiltersCalls: [],
        locationAssignUrl: null
    };

    const hostWindow = {
        location: {
            search: "?status=Active",
            href: "https://demo.test/Home/Contracts",
            assign: function (url) {
                events.locationAssignUrl = url;
            }
        }
    };

    const statusElement = createStatusElement();
    const monitoringStatusElement = createStatusElement();
    const mdrImportStatusElement = createStatusElement();

    const foundation = foundationModule.createRuntimeFoundation({
        hostWindow: hostWindow,
        moduleRoot: {
            getAttribute: function (name) {
                if (name === "data-api-endpoint") {
                    return "/api/custom/contracts";
                }

                return null;
            }
        },
        elements: {
            statusElement: statusElement,
            monitoringStatusElement: monitoringStatusElement,
            mdrImportStatusElement: mdrImportStatusElement
        },
        modules: {
            helpers: {
                parseErrorBody: function () { return "parsed"; },
                toNumber: function (value) { return Number(value); },
                toNullableDate: function (value) { return value || null; },
                readUrlFilterState: function (search, statusValues) {
                    events.readUrlFilterState = { search: search, statusValues: statusValues };
                    return { hasAny: true };
                },
                appendFilterHint: function (message) {
                    return `${message}#hint`;
                },
                clearUrlFilters: function (url) {
                    events.clearUrlFiltersCalls.push(url);
                    return `${url}#cleared`;
                }
            },
            contractsApiModule: {
                createClient: function (options) {
                    events.apiClientOptions = options;
                    return { id: "api-client" };
                }
            },
            monitoringModelModule: {
                createModel: function (options) {
                    events.modelOptions = options;
                    return { id: "monitoring-model" };
                }
            },
            stateModule: {
                createState: function () {
                    return {
                        getSelectedContract: function () {
                            return { id: "contract-1", status: "Active" };
                        }
                    };
                }
            },
            executionModule: {
                canEditMilestones: function (status) {
                    return status === "Active";
                }
            }
        }
    });

    assert.equal(events.apiClientOptions.endpoint, "/api/custom/contracts");
    assert.equal(typeof events.apiClientOptions.parseErrorBody, "function");
    assert.equal(typeof events.modelOptions.toNumber, "function");
    assert.equal(events.readUrlFilterState.search, "?status=Active");
    assert.deepEqual(events.readUrlFilterState.statusValues, ["Draft", "OnApproval", "Signed", "Active", "Closed"]);
    assert.equal(foundation.localizeStatus("Active"), "Действует");
    assert.equal(foundation.localizeStatus("Unknown"), "Unknown");
    assert.equal(foundation.appendFilterHint("status"), "status#hint");

    foundation.setStatus("ok", true);
    foundation.setMonitoringStatus("monitoring", false);
    foundation.setMdrImportStatus("mdr", true);
    assert.equal(statusElement.textContent, "ok");
    assert.equal(monitoringStatusElement.textContent, "monitoring");
    assert.equal(mdrImportStatusElement.textContent, "mdr");
    assert.deepEqual(statusElement.classList.toggles, [{ name: "contracts-status--error", value: true }]);

    foundation.clearUrlFilters();
    assert.deepEqual(events.clearUrlFiltersCalls, ["https://demo.test/Home/Contracts"]);
    assert.equal(events.locationAssignUrl, "https://demo.test/Home/Contracts#cleared");
    assert.equal(foundation.getStatusRank("Signed"), 2);
    assert.equal(foundation.canEditMilestones("Active"), true);
    assert.equal(foundation.canEditMilestones("Draft"), false);
    assert.deepEqual(foundation.getSelectedContract(), { id: "contract-1", status: "Active" });
});
