"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const workflowModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-workflow.js"));

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

function createButton() {
    return {
        disabled: false,
        handlers: {},
        addEventListener: function (eventName, handler) {
            this.handlers[eventName] = handler;
        }
    };
}

function createTargetSelect() {
    return {
        disabled: false,
        value: "",
        innerHTML: "",
        options: [],
        appendChild: function (option) {
            this.options.push(option);
            if (!this.value) {
                this.value = option.value;
            }
        }
    };
}

function createJQueryStub(record) {
    return function (element) {
        return {
            dxDataGrid: function (config) {
                const optionState = {
                    dataSource: config.dataSource
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

test("workflow controller: composes history-grid/events modules and updates controls", async () => {
    const gridRecord = {};
    const selectedElement = createTextElement();
    const transitionStatusElement = createTextElement();
    const transitionTargetSelect = createTargetSelect();
    const transitionReasonInput = {
        value: ""
    };
    const transitionApplyButton = createButton();
    const historyRefreshButton = createButton();
    let selectedContract = null;
    const events = {
        gridConfigLocalizeCalls: 0,
        createEventsCalls: [],
        onApplyClickCalls: 0,
        onHistoryRefreshClickCalls: 0,
        historyRequests: []
    };

    global.document = {
        createElement: function () {
            return {
                value: "",
                textContent: ""
            };
        }
    };
    global.window = {
        jQuery: createJQueryStub(gridRecord)
    };

    const controller = workflowModule.createController({
        elements: {
            selectedElement: selectedElement,
            transitionStatusElement: transitionStatusElement,
            transitionTargetSelect: transitionTargetSelect,
            transitionReasonInput: transitionReasonInput,
            transitionApplyButton: transitionApplyButton,
            historyRefreshButton: historyRefreshButton,
            historyGridElement: { id: "history-grid" }
        },
        gridState: {
            getSelectedContract: function () {
                return selectedContract;
            }
        },
        apiClient: {
            getContractHistory: async function (id) {
                events.historyRequests.push(id);
                return [{ id: "h-1" }, { id: "h-2" }];
            },
            transitionContract: async function () {
                return {};
            }
        },
        localizeStatus: function (status) {
            return status === "Active" ? "Действует" : "Закрыт";
        },
        getStatusRank: function (status) {
            return status === "Active" ? 3 : 4;
        },
        statusValues: ["Draft", "OnApproval", "Signed", "Active", "Closed"],
        onTransitionCompleted: function () {
            return Promise.resolve();
        },
        historyGridModule: {
            createGridConfig: function (localizeStatus) {
                events.gridConfigLocalizeCalls += 1;
                assert.equal(typeof localizeStatus, "function");
                return {
                    dataSource: []
                };
            }
        },
        eventsModule: {
            createEvents: function (options) {
                events.createEventsCalls.push(options);
                return {
                    onApplyClick: function () {
                        events.onApplyClickCalls += 1;
                    },
                    onHistoryRefreshClick: function () {
                        events.onHistoryRefreshClickCalls += 1;
                    }
                };
            }
        }
    });

    controller.init();

    assert.equal(events.gridConfigLocalizeCalls, 1);
    assert.equal(events.createEventsCalls.length, 1);
    assert.equal(typeof transitionApplyButton.handlers.click, "function");
    assert.equal(typeof historyRefreshButton.handlers.click, "function");
    assert.equal(transitionTargetSelect.disabled, true);
    assert.equal(transitionApplyButton.disabled, true);
    assert.equal(historyRefreshButton.disabled, true);

    selectedContract = {
        id: "contract-1",
        contractNumber: "SC-77",
        status: "Active"
    };
    controller.updateControls();

    assert.equal(transitionTargetSelect.disabled, false);
    assert.equal(transitionApplyButton.disabled, false);
    assert.equal(historyRefreshButton.disabled, false);
    assert.match(selectedElement.textContent, /SC-77/);
    assert.equal(transitionTargetSelect.options.length, 2);

    await controller.loadHistory(true);
    assert.deepEqual(events.historyRequests, ["contract-1"]);
    assert.deepEqual(gridRecord.instance.optionCalls.at(-1), {
        name: "dataSource",
        value: [{ id: "h-1" }, { id: "h-2" }]
    });
    assert.match(transitionStatusElement.textContent, /Загружено записей истории: 2/);

    transitionApplyButton.handlers.click();
    historyRefreshButton.handlers.click();

    assert.equal(events.onApplyClickCalls, 1);
    assert.equal(events.onHistoryRefreshClickCalls, 1);
});

test("workflow controller: resets history data source when contract is not selected", async () => {
    const gridRecord = {};
    const transitionTargetSelect = createTargetSelect();
    const transitionApplyButton = createButton();
    const historyRefreshButton = createButton();
    let selectedContract = {
        id: "contract-1",
        contractNumber: "SC-77",
        status: "Active"
    };

    global.document = {
        createElement: function () {
            return {
                value: "",
                textContent: ""
            };
        }
    };
    global.window = {
        jQuery: createJQueryStub(gridRecord)
    };

    const controller = workflowModule.createController({
        elements: {
            selectedElement: createTextElement(),
            transitionStatusElement: createTextElement(),
            transitionTargetSelect: transitionTargetSelect,
            transitionReasonInput: {
                value: ""
            },
            transitionApplyButton: transitionApplyButton,
            historyRefreshButton: historyRefreshButton,
            historyGridElement: { id: "history-grid" }
        },
        gridState: {
            getSelectedContract: function () {
                return selectedContract;
            }
        },
        apiClient: {
            getContractHistory: async function () {
                return [{ id: "h-1" }];
            },
            transitionContract: async function () {
                return {};
            }
        },
        localizeStatus: function (status) {
            return status;
        },
        getStatusRank: function (status) {
            return status === "Active" ? 3 : 4;
        },
        statusValues: ["Draft", "OnApproval", "Signed", "Active", "Closed"],
        historyGridModule: {
            createGridConfig: function () {
                return {
                    dataSource: []
                };
            }
        },
        eventsModule: {
            createEvents: function () {
                return {
                    onApplyClick: function () {},
                    onHistoryRefreshClick: function () {}
                };
            }
        }
    });

    controller.init();
    selectedContract = null;

    await controller.loadHistory(true);

    assert.deepEqual(gridRecord.instance.optionCalls.at(-1), {
        name: "dataSource",
        value: []
    });
});
