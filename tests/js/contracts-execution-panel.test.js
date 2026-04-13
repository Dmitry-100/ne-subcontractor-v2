"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const panelModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-execution-panel.js"));

function createTextElement() {
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

function createRefreshButton() {
    return {
        disabled: false,
        handlers: {},
        addEventListener: function (eventName, handler) {
            this.handlers[eventName] = handler;
        }
    };
}

function createJQueryStub(record) {
    return function (element) {
        return {
            dxDataGrid: function (config) {
                const optionState = {
                    dataSource: config.dataSource,
                    "editing.allowAdding": config.editing.allowAdding,
                    "editing.allowUpdating": config.editing.allowUpdating,
                    "editing.allowDeleting": config.editing.allowDeleting
                };
                const optionCalls = [];

                record.element = element;
                record.config = config;
                record.instance = {
                    optionCalls: optionCalls,
                    option: function (name, value) {
                        if (arguments.length === 1) {
                            return optionState[name];
                        }

                        optionState[name] = value;
                        optionCalls.push({ name: name, value: value });
                    }
                };

                return {
                    dxDataGrid: function (arg) {
                        if (arg === "instance") {
                            return record.instance;
                        }

                        throw new Error("Unsupported dxDataGrid call");
                    }
                };
            }
        };
    };
}

test("execution panel controller: composes grid/events modules and handles refresh", async () => {
    const gridRecord = {};
    const refreshButton = createRefreshButton();
    const executionSelectedElement = createTextElement();
    const executionSummaryElement = createTextElement();
    const executionStatusElement = createTextElement();

    let selectedContract = null;
    const executionCalls = {
        loadExecutionData: []
    };
    const createGridConfigCalls = [];
    const createEventsCalls = [];

    global.window = {
        jQuery: createJQueryStub(gridRecord)
    };

    const controller = panelModule.createController({
        elements: {
            executionSelectedElement: executionSelectedElement,
            executionSummaryElement: executionSummaryElement,
            executionStatusElement: executionStatusElement,
            executionRefreshButton: refreshButton,
            executionGridElement: { id: "execution-grid" }
        },
        executionModule: {
            formatExecutionSummary: function () {
                return {
                    text: "summary",
                    hasWarning: false
                };
            },
            canEditMilestones: function (status) {
                return status === "Signed" || status === "Active";
            },
            loadExecutionSummary: async function () {},
            loadMilestones: async function () {},
            loadExecutionData: async function (options) {
                executionCalls.loadExecutionData.push(options);
            },
            persistMilestones: async function () {}
        },
        apiClient: { id: "api-client" },
        getSelectedContract: function () {
            return selectedContract;
        },
        localizeStatus: function (status) {
            return status === "Active" ? "Действует" : status;
        },
        buildMilestonesPayload: function (items) {
            return items;
        },
        gridModule: {
            createGridConfig: function () {
                createGridConfigCalls.push(true);
                return {
                    dataSource: [],
                    editing: {
                        allowAdding: false,
                        allowUpdating: false,
                        allowDeleting: false
                    }
                };
            }
        },
        eventsModule: {
            createEvents: function (options) {
                createEventsCalls.push(options);
                return {
                    onRowInserted: function () {}
                };
            }
        }
    });

    controller.init();

    assert.equal(createGridConfigCalls.length, 1);
    assert.equal(createEventsCalls.length, 1);
    assert.equal(typeof createEventsCalls[0].persistMilestones, "function");
    assert.equal(typeof createEventsCalls[0].setExecutionStatus, "function");
    assert.equal(typeof gridRecord.config.onRowInserted, "function");
    assert.equal(refreshButton.disabled, true);

    selectedContract = {
        id: "contract-1",
        contractNumber: "SC-100",
        status: "Active"
    };
    controller.updateControls();

    assert.equal(refreshButton.disabled, false);
    assert.match(executionSelectedElement.textContent, /SC-100/);
    assert.match(executionSelectedElement.textContent, /Действует/);
    assert.deepEqual(gridRecord.instance.optionCalls.slice(-3), [
        { name: "editing.allowAdding", value: true },
        { name: "editing.allowUpdating", value: true },
        { name: "editing.allowDeleting", value: true }
    ]);

    await controller.loadExecutionData(true);
    assert.equal(executionCalls.loadExecutionData.length, 1);
    assert.equal(executionCalls.loadExecutionData[0].showStatusMessage, true);
    assert.ok(executionCalls.loadExecutionData[0].executionGridInstance);

    refreshButton.handlers.click();
    await new Promise(function (resolve) { setImmediate(resolve); });
    assert.equal(executionCalls.loadExecutionData.length, 2);
    assert.equal(executionCalls.loadExecutionData[1].showStatusMessage, true);
});

test("execution panel controller: resets execution panel when contract is not selected", () => {
    const gridRecord = {};
    const refreshButton = createRefreshButton();
    const executionSelectedElement = createTextElement();
    const executionSummaryElement = createTextElement();
    const executionStatusElement = createTextElement();
    let selectedContract = {
        id: "contract-1",
        contractNumber: "SC-100",
        status: "Active"
    };

    global.window = {
        jQuery: createJQueryStub(gridRecord)
    };

    const controller = panelModule.createController({
        elements: {
            executionSelectedElement: executionSelectedElement,
            executionSummaryElement: executionSummaryElement,
            executionStatusElement: executionStatusElement,
            executionRefreshButton: refreshButton,
            executionGridElement: { id: "execution-grid" }
        },
        executionModule: {
            formatExecutionSummary: function (summary) {
                if (!summary) {
                    return {
                        text: "empty",
                        hasWarning: false
                    };
                }

                return {
                    text: "summary",
                    hasWarning: false
                };
            },
            canEditMilestones: function (status) {
                return status === "Active";
            },
            loadExecutionSummary: async function () {},
            loadMilestones: async function () {},
            loadExecutionData: async function () {},
            persistMilestones: async function () {}
        },
        apiClient: {},
        getSelectedContract: function () {
            return selectedContract;
        },
        localizeStatus: function (status) {
            return status;
        },
        buildMilestonesPayload: function (items) {
            return items;
        },
        gridModule: {
            createGridConfig: function () {
                return {
                    dataSource: [{ id: 1 }],
                    editing: {
                        allowAdding: false,
                        allowUpdating: false,
                        allowDeleting: false
                    }
                };
            }
        },
        eventsModule: {
            createEvents: function () {
                return {};
            }
        }
    });

    controller.init();
    selectedContract = null;

    controller.updateControls();

    assert.equal(refreshButton.disabled, true);
    assert.match(executionSelectedElement.textContent, /Выберите договор/);
    assert.deepEqual(gridRecord.instance.optionCalls.slice(-4), [
        { name: "dataSource", value: [] },
        { name: "editing.allowAdding", value: false },
        { name: "editing.allowUpdating", value: false },
        { name: "editing.allowDeleting", value: false }
    ]);
});
