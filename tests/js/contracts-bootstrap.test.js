"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const bootstrapModule = require(path.resolve(__dirname, "../../src/Subcontractor.Web/wwwroot/js/contracts-bootstrap.js"));

const selectors = [
    "[data-contracts-grid]",
    "[data-contracts-status]",
    "[data-contracts-selected]",
    "[data-contracts-transition-status]",
    "[data-contracts-target]",
    "[data-contracts-reason]",
    "[data-contracts-apply]",
    "[data-contracts-history-refresh]",
    "[data-contracts-history-grid]",
    "[data-contracts-draft-status]",
    "[data-contracts-draft-procedure-id]",
    "[data-contracts-draft-number]",
    "[data-contracts-draft-signing-date]",
    "[data-contracts-draft-start-date]",
    "[data-contracts-draft-end-date]",
    "[data-contracts-draft-create]",
    "[data-contracts-execution-selected]",
    "[data-contracts-execution-summary]",
    "[data-contracts-execution-status]",
    "[data-contracts-execution-refresh]",
    "[data-contracts-execution-grid]",
    "[data-contracts-monitoring-selected]",
    "[data-contracts-monitoring-status]",
    "[data-contracts-monitoring-refresh]",
    "[data-contracts-monitoring-save]",
    "[data-contracts-monitoring-control-points-grid]",
    "[data-contracts-monitoring-stages-grid]",
    "[data-contracts-monitoring-mdr-cards-grid]",
    "[data-contracts-monitoring-mdr-rows-grid]",
    "[data-contracts-monitoring-control-point-selected]",
    "[data-contracts-monitoring-mdr-card-selected]",
    "[data-contracts-mdr-import-file]",
    "[data-contracts-mdr-import-mode]",
    "[data-contracts-mdr-import-apply]",
    "[data-contracts-mdr-import-reset]",
    "[data-contracts-mdr-import-status]"
];

function createStatusElement() {
    return {
        textContent: "",
        classList: {
            added: false,
            add: function () {
                this.added = true;
            }
        }
    };
}

function createElementsMap() {
    const map = {};
    selectors.forEach((selector) => {
        map[selector] = {};
    });
    map["[data-contracts-status]"] = createStatusElement();
    return map;
}

function createModuleRoot(elementsMap) {
    return {
        querySelector: function (selector) {
            return elementsMap[selector] || null;
        }
    };
}

function createAllModules() {
    return {
        ContractsGridHelpers: {},
        ContractsGridApi: { createClient: function () { return {}; } },
        ContractsMonitoringModel: { createModel: function () { return {}; } },
        ContractsGridState: { createState: function () { return {}; } },
        ContractsExecution: {},
        ContractsMonitoringKp: {},
        ContractsMonitoringMdr: {},
        ContractsMonitoringKpGrids: { createKpGrids: function () { return {}; } },
        ContractsMonitoringMdrGrids: { createMdrGrids: function () { return {}; } },
        ContractsMonitoringGrids: { createGrids: function () { return {}; } },
        ContractsMonitoringControls: { createController: function () { return {}; } },
        ContractsMonitoringSelection: { createController: function () { return {}; } },
        ContractsMonitoringImportStatus: {
            resolveImportMode: function () { return "strict"; },
            buildImportStatuses: function () {
                return {
                    mdrStatusMessage: "",
                    monitoringStatusMessage: "",
                    isError: false
                };
            },
            validateImportPrerequisites: function () { }
        },
        ContractsMonitoringImport: { createController: function () { return {}; } },
        ContractsMonitoringData: { createService: function () { return {}; } },
        ContractsMonitoringBootstrap: { createCompositionContext: function () { return {}; } },
        ContractsMonitoringWiring: {
            bindCoreEvents: function () { },
            createGridDataBinders: function () { return {}; }
        },
        ContractsMonitoring: { createController: function () { return {}; } },
        ContractsWorkflow: { createController: function () { return {}; } },
        ContractsWorkflowHistoryGrid: { createGridConfig: function () { return {}; } },
        ContractsWorkflowEvents: { createEvents: function () { return {}; } },
        ContractsDraft: { createController: function () { return {}; } },
        ContractsDraftEvents: { createEvents: function () { return {}; } },
        ContractsRegistry: { createController: function () { return {}; } },
        ContractsRegistryPayload: { createBuilder: function () { return {}; } },
        ContractsRegistryColumns: {
            createFormItems: function () { return []; },
            createColumns: function () { return []; }
        },
        ContractsRegistryEvents: { createEvents: function () { return {}; } },
        ContractsRegistryStore: { createContractsStore: function () { return {}; } },
        ContractsExecutionPanel: { createController: function () { return {}; } },
        ContractsExecutionPanelGrid: { createGridConfig: function () { return {}; } },
        ContractsExecutionPanelEvents: { createEvents: function () { return {}; } }
    };
}

test("createBootstrapContext returns null when module root is missing", () => {
    global.document = {
        querySelector: function () {
            return null;
        }
    };
    global.window = {};

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
});

test("createBootstrapContext reports DevExpress load error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = {};

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /DevExpress/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext returns full context when dependencies are available", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.ok(context);
    assert.equal(context.moduleRoot, moduleRoot);
    assert.equal(context.elements.gridElement, elementsMap["[data-contracts-grid]"]);
    assert.equal(context.modules.registryPayloadModule, modules.ContractsRegistryPayload);
    assert.equal(context.modules.executionPanelControllerModule, modules.ContractsExecutionPanel);
    assert.equal(context.modules.workflowHistoryGridModule, modules.ContractsWorkflowHistoryGrid);
    assert.equal(context.modules.workflowEventsModule, modules.ContractsWorkflowEvents);
    assert.equal(context.modules.draftEventsModule, modules.ContractsDraftEvents);
    assert.equal(context.modules.executionPanelGridModule, modules.ContractsExecutionPanelGrid);
    assert.equal(context.modules.executionPanelEventsModule, modules.ContractsExecutionPanelEvents);
});

test("createBootstrapContext reports monitoring grids module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsMonitoringGrids;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /monitoring-grid/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports monitoring KP grids module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsMonitoringKpGrids;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /monitoring-kp-grid/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports monitoring MDR grids module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsMonitoringMdrGrids;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /monitoring-mdr-grid/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports monitoring controls module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsMonitoringControls;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /monitoring-controls/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports monitoring selection module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsMonitoringSelection;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /monitoring-selection/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports monitoring bootstrap module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsMonitoringBootstrap;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /bootstrap-слоя мониторинга/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports monitoring wiring module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsMonitoringWiring;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /wiring-слоя мониторинга/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports workflow history-grid module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsWorkflowHistoryGrid;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /workflow-history-grid/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports workflow events module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsWorkflowEvents;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /workflow-events/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports draft events module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsDraftEvents;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /draft-events/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports registry columns module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsRegistryColumns;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /columns-логики реестра/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports registry events module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsRegistryEvents;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /events-логики реестра/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports registry store module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsRegistryStore;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /store-логики реестра/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports execution panel grid module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsExecutionPanelGrid;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /execution-panel-grid/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});

test("createBootstrapContext reports execution panel events module error", () => {
    const elementsMap = createElementsMap();
    const moduleRoot = createModuleRoot(elementsMap);
    const modules = createAllModules();
    delete modules.ContractsExecutionPanelEvents;

    global.document = {
        querySelector: function (selector) {
            return selector === "[data-contracts-module]" ? moduleRoot : null;
        }
    };
    global.window = Object.assign({
        jQuery: function () { },
        DevExpress: {
            data: {}
        }
    }, modules);

    const context = bootstrapModule.createBootstrapContext();
    assert.equal(context, null);
    assert.match(elementsMap["[data-contracts-status]"].textContent, /execution-panel-events/i);
    assert.equal(elementsMap["[data-contracts-status]"].classList.added, true);
});
