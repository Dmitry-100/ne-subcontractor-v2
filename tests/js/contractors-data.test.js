"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractorsDataModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contractors-data.js"));

function createGridStub() {
    return {
        optionCalls: [],
        selectedRowsCalls: [],
        cleared: 0,
        option: function (key, value) {
            this.optionCalls.push({ key: key, value: value });
        },
        clearSelection: function () {
            this.cleared += 1;
        },
        selectRows: async function (keys, preserve) {
            this.selectedRowsCalls.push({ keys: keys, preserve: preserve });
        }
    };
}

function createUiStateStub() {
    return {
        statusCalls: [],
        historyStatusCalls: [],
        analyticsStatusCalls: [],
        selectionUpdates: 0,
        setStatus: function (message, isError) {
            this.statusCalls.push({ message: message, isError: isError });
        },
        setHistoryStatus: function (message, isError) {
            this.historyStatusCalls.push({ message: message, isError: isError });
        },
        setAnalyticsStatus: function (message, isError) {
            this.analyticsStatusCalls.push({ message: message, isError: isError });
        },
        updateSelectionUi: function () {
            this.selectionUpdates += 1;
        }
    };
}

function createRuntime(overrides) {
    const settings = overrides || {};
    const contractorsGridInstance = settings.contractorsGridInstance || createGridStub();
    const historyGridInstance = settings.historyGridInstance || createGridStub();
    const analyticsGridInstance = settings.analyticsGridInstance || createGridStub();
    const uiState = settings.uiState || createUiStateStub();

    const apiClient = settings.apiClient || {
        getContractors: async function () {
            return [];
        },
        getRatingHistory: async function () {
            return [];
        },
        getRatingAnalytics: async function () {
            return [];
        }
    };

    const runtime = contractorsDataModule.createDataRuntime({
        apiClient: apiClient,
        grids: {
            contractorsGridInstance: contractorsGridInstance,
            historyGridInstance: historyGridInstance,
            analyticsGridInstance: analyticsGridInstance
        },
        uiState: uiState
    });

    return {
        runtime: runtime,
        contractorsGridInstance: contractorsGridInstance,
        historyGridInstance: historyGridInstance,
        analyticsGridInstance: analyticsGridInstance,
        uiState: uiState
    };
}

test("contractors data: validates required dependencies", () => {
    assert.throws(function () {
        contractorsDataModule.createDataRuntime({});
    }, /apiClient/);

    assert.throws(function () {
        contractorsDataModule.createDataRuntime({
            apiClient: {
                getContractors: async function () {
                    return [];
                },
                getRatingHistory: null,
                getRatingAnalytics: async function () {
                    return [];
                }
            },
            grids: {
                contractorsGridInstance: createGridStub(),
                historyGridInstance: createGridStub(),
                analyticsGridInstance: createGridStub()
            },
            uiState: createUiStateStub()
        });
    }, /getRatingHistory/);
});

test("contractors data: loadContractors updates registry grid and status", async () => {
    const contractors = [
        { id: "ctr-1", shortName: "СК Профи" },
        { id: "ctr-2", shortName: "Монтаж-Сервис" }
    ];

    const runtimeContext = createRuntime({
        apiClient: {
            getContractors: async function () {
                return contractors;
            },
            getRatingHistory: async function () {
                return [];
            },
            getRatingAnalytics: async function () {
                return [];
            }
        }
    });

    const result = await runtimeContext.runtime.loadContractors();

    assert.equal(result.length, 2);
    assert.equal(runtimeContext.contractorsGridInstance.optionCalls.length, 1);
    assert.deepEqual(runtimeContext.contractorsGridInstance.optionCalls[0], {
        key: "dataSource",
        value: contractors
    });
    assert.equal(runtimeContext.uiState.statusCalls.length, 1);
    assert.equal(runtimeContext.uiState.statusCalls[0].message, "Загружено подрядчиков: 2.");
});

test("contractors data: loadHistory resets data source when contractor is not selected", async () => {
    const runtimeContext = createRuntime();

    const rows = await runtimeContext.runtime.loadHistory(null);

    assert.deepEqual(rows, []);
    assert.equal(runtimeContext.historyGridInstance.optionCalls.length, 1);
    assert.deepEqual(runtimeContext.historyGridInstance.optionCalls[0], {
        key: "dataSource",
        value: []
    });
    assert.equal(runtimeContext.uiState.historyStatusCalls[0].message, "История пока не загружена.");
});

test("contractors data: refreshContractorsAndReselect restores selected contractor", async () => {
    const contractors = [
        { id: "ctr-1", shortName: "СК Профи" },
        { id: "ctr-2", shortName: "Монтаж-Сервис" }
    ];

    const runtimeContext = createRuntime({
        apiClient: {
            getContractors: async function () {
                return contractors;
            },
            getRatingHistory: async function () {
                return [];
            },
            getRatingAnalytics: async function () {
                return [];
            }
        }
    });

    const selected = await runtimeContext.runtime.refreshContractorsAndReselect("ctr-2");

    assert.deepEqual(selected, { id: "ctr-2", shortName: "Монтаж-Сервис" });
    assert.equal(runtimeContext.contractorsGridInstance.selectedRowsCalls.length, 1);
    assert.deepEqual(runtimeContext.contractorsGridInstance.selectedRowsCalls[0], {
        keys: ["ctr-2"],
        preserve: false
    });
    assert.equal(runtimeContext.runtime.getSelectedContractor().id, "ctr-2");
    assert.equal(runtimeContext.uiState.selectionUpdates, 1);
});

test("contractors data: selection handler loads history for selected contractor", async () => {
    const historyRows = [{ rating: 4.7 }];
    const runtimeContext = createRuntime({
        apiClient: {
            getContractors: async function () {
                return [];
            },
            getRatingHistory: async function () {
                return historyRows;
            },
            getRatingAnalytics: async function () {
                return [];
            }
        }
    });

    runtimeContext.runtime.handleContractorSelectionChanged({ id: "ctr-7" });
    await new Promise(function (resolve) {
        setImmediate(resolve);
    });

    assert.equal(runtimeContext.runtime.getSelectedContractor().id, "ctr-7");
    assert.equal(runtimeContext.historyGridInstance.optionCalls.length, 1);
    assert.deepEqual(runtimeContext.historyGridInstance.optionCalls[0], {
        key: "dataSource",
        value: historyRows
    });
    assert.equal(runtimeContext.uiState.historyStatusCalls[0].message, "Загружаем историю...");
    assert.equal(runtimeContext.uiState.historyStatusCalls[1].message, "Загружено записей истории: 1.");
});

test("contractors data: loadHistory/loadAnalytics initialize deferred grids when available", async () => {
    const historyGridInstance = createGridStub();
    const analyticsGridInstance = createGridStub();
    historyGridInstance.ensureInitializedCalls = 0;
    analyticsGridInstance.ensureInitializedCalls = 0;
    historyGridInstance.ensureInitialized = function () {
        this.ensureInitializedCalls += 1;
        return this;
    };
    analyticsGridInstance.ensureInitialized = function () {
        this.ensureInitializedCalls += 1;
        return this;
    };

    const runtimeContext = createRuntime({
        historyGridInstance: historyGridInstance,
        analyticsGridInstance: analyticsGridInstance,
        apiClient: {
            getContractors: async function () {
                return [];
            },
            getRatingHistory: async function () {
                return [];
            },
            getRatingAnalytics: async function () {
                return [];
            }
        }
    });

    await runtimeContext.runtime.loadHistory("ctr-42");
    await runtimeContext.runtime.loadAnalytics();

    assert.equal(historyGridInstance.ensureInitializedCalls, 1);
    assert.equal(analyticsGridInstance.ensureInitializedCalls, 1);
});

test("contractors data: createRegistryStore supports paged payload", async () => {
    const queryCalls = [];
    const runtimeContext = createRuntime({
        apiClient: {
            getContractors: async function (query) {
                queryCalls.push(query);
                return {
                    items: [{ id: "ctr-31", inn: "7703000031" }],
                    totalCount: 81,
                    skip: query?.skip ?? 0,
                    take: query?.take ?? 15
                };
            },
            getRatingHistory: async function () {
                return [];
            },
            getRatingAnalytics: async function () {
                return [];
            }
        }
    });

    const store = runtimeContext.runtime.createRegistryStore({
        CustomStore: function (config) {
            return config;
        }
    });

    const result = await store.load({
        skip: 30,
        take: 15,
        searchValue: "ctr-31"
    });

    assert.deepEqual(queryCalls, [{
        skip: 30,
        take: 15,
        requireTotalCount: true,
        search: "ctr-31"
    }]);
    assert.deepEqual(result, {
        data: [{ id: "ctr-31", inn: "7703000031" }],
        totalCount: 81
    });
    assert.equal(runtimeContext.uiState.statusCalls.at(-1).message, "Загружено подрядчиков: 1 (всего: 81).");
});
