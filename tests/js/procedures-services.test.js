"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const proceduresServicesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-services.js"));

test("procedures services: validates required module factories", () => {
    assert.throws(function () {
        proceduresServicesModule.createServices({});
    }, /ProceduresGridHelpers\.createHelpers/i);
});

test("procedures services: creates helpers, workflow, columns and data service with expected contracts", () => {
    const captured = {};
    const helperObject = {
        readUrlFilterState: function (statusOrder, search) {
            captured.readUrlFilterState = { statusOrder: statusOrder, search: search };
            return { hasAny: true, searchText: "test", statusFilter: [["status", "anyof", ["Created"]]] };
        },
        localizeStatus: function (value) {
            return `status:${value}`;
        },
        localizeContractorStatus: function (value) {
            return `contractor:${value}`;
        },
        localizeReliabilityClass: function (value) {
            return `reliability:${value}`;
        },
        localizeBoolean: function (value) {
            return value ? "Да" : "Нет";
        }
    };
    const apiClient = { id: "api-client" };
    const workflow = { id: "workflow" };
    const columns = { id: "columns" };
    const dataService = { id: "data-service" };

    const services = proceduresServicesModule.createServices({
        moduleRoots: {
            proceduresGridHelpersRoot: {
                createHelpers: function (options) {
                    captured.helpersOptions = options;
                    return helperObject;
                }
            },
            proceduresApiRoot: {
                createApiClient: function () {
                    captured.apiClientCreated = true;
                    return apiClient;
                }
            },
            proceduresWorkflowRoot: {
                createWorkflow: function (options) {
                    captured.workflowOptions = options;
                    return workflow;
                }
            },
            proceduresGridColumnsRoot: {
                createColumns: function (options) {
                    captured.columnsOptions = options;
                    return columns;
                }
            },
            proceduresDataRoot: {
                createDataService: function (options) {
                    captured.dataServiceOptions = options;
                    return dataService;
                }
            }
        },
        proceduresConfig: {
            statusOrder: ["Created", "Sent"],
            statusCaptions: { Created: "Создана", Sent: "Отправлена" },
            contractorStatusCaptions: { Active: "Активен" },
            reliabilityClassCaptions: { A: "A" },
            approvalModes: ["InSystem"],
            statusLookup: [{ value: "Created", text: "Создана" }],
            approvalModeLookup: [{ value: "InSystem", text: "В системе" }]
        },
        endpoint: "/api/custom/procedures",
        locationSearch: "?status=Created&search=test"
    });

    assert.equal(services.gridHelpers, helperObject);
    assert.equal(services.apiClient, apiClient);
    assert.equal(services.workflow, workflow);
    assert.equal(services.columns, columns);
    assert.equal(services.dataService, dataService);
    assert.equal(services.urlFilterState.searchText, "test");

    assert.deepEqual(captured.readUrlFilterState, {
        statusOrder: ["Created", "Sent"],
        search: "?status=Created&search=test"
    });
    assert.equal(captured.workflowOptions.localizeStatus("Created"), "status:Created");
    assert.equal(captured.columnsOptions.localizeContractorStatus("Active"), "contractor:Active");
    assert.equal(captured.columnsOptions.localizeReliabilityClass("A"), "reliability:A");
    assert.equal(captured.dataServiceOptions.endpoint, "/api/custom/procedures");
    assert.equal(captured.dataServiceOptions.apiClient, apiClient);
    assert.equal(captured.apiClientCreated, true);
});
