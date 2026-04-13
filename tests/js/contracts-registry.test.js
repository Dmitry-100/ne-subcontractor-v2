"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const registryModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-registry.js"));

function createJQueryStub(registry) {
    return function (element) {
        return {
            dxDataGrid: function (config) {
                const record = {
                    element: element,
                    config: config,
                    instance: {
                        refreshCalls: 0,
                        selectRowsCalls: [],
                        refresh: async function () {
                            this.refreshCalls += 1;
                        },
                        selectRows: async function (rows, preserve) {
                            this.selectRowsCalls.push({ rows: rows, preserve: preserve });
                        }
                    }
                };
                registry.push(record);
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

test("contracts registry: init composes store/columns/events modules", () => {
    const gridRecords = [];
    global.window = {
        jQuery: createJQueryStub(gridRecords)
    };

    const controller = registryModule.createController({
        elements: {
            gridElement: { id: "contracts-grid" }
        },
        apiClient: {},
        gridState: {
            setSelectedContractId: function () {},
            getSelectedContractId: function () { return null; }
        },
        urlFilterState: {
            hasAny: false
        },
        statusLookup: [{ value: "Draft", text: "Черновик" }],
        setStatus: function () {},
        appendFilterHint: function (message) { return message; },
        clearUrlFilters: function () {},
        toNullableDate: function (value) { return value; },
        toNumber: function (value) { return Number(value); },
        isGuid: function () { return true; },
        payloadBuilderModule: {
            createBuilder: function () {
                return { id: "payload-builder" };
            }
        },
        columnsModule: {
            createFormItems: function () {
                return ["contractNumber"];
            },
            createColumns: function (lookup) {
                return [{ dataField: "status", lookup: lookup }];
            }
        },
        eventsModule: {
            createEvents: function () {
                return {
                    onSelectionChanged: function () {}
                };
            }
        },
        storeModule: {
            createContractsStore: function (options) {
                return {
                    payloadBuilderId: options.payloadBuilder.id
                };
            }
        }
    });

    controller.init();

    assert.equal(gridRecords.length, 1);
    const gridConfig = gridRecords[0].config;
    assert.deepEqual(gridConfig.editing.form.items, ["contractNumber"]);
    assert.equal(gridConfig.dataSource.payloadBuilderId, "payload-builder");
    assert.equal(gridConfig.columns[0].dataField, "status");
});

test("contracts registry: refreshAndSelect refreshes grid and keeps selected contract", async () => {
    const gridRecords = [];
    global.window = {
        jQuery: createJQueryStub(gridRecords)
    };
    let selectedId = "selected-1";

    const controller = registryModule.createController({
        elements: {
            gridElement: { id: "contracts-grid" }
        },
        apiClient: {},
        gridState: {
            setSelectedContractId: function (id) {
                selectedId = id;
            },
            getSelectedContractId: function () {
                return selectedId;
            }
        },
        urlFilterState: {
            hasAny: false
        },
        setStatus: function () {},
        appendFilterHint: function (message) { return message; },
        clearUrlFilters: function () {},
        toNullableDate: function (value) { return value; },
        toNumber: function (value) { return Number(value); },
        isGuid: function () { return true; },
        payloadBuilderModule: {
            createBuilder: function () {
                return {};
            }
        },
        columnsModule: {
            createFormItems: function () {
                return [];
            },
            createColumns: function () {
                return [];
            }
        },
        eventsModule: {
            createEvents: function () {
                return {};
            }
        },
        storeModule: {
            createContractsStore: function () {
                return {};
            }
        }
    });

    controller.init();
    const gridInstance = gridRecords[0].instance;

    await controller.refreshAndSelect();
    assert.equal(gridInstance.refreshCalls, 1);
    assert.deepEqual(gridInstance.selectRowsCalls.at(-1), {
        rows: ["selected-1"],
        preserve: false
    });

    await controller.refreshAndSelect("forced-2");
    assert.equal(selectedId, "forced-2");
    assert.deepEqual(gridInstance.selectRowsCalls.at(-1), {
        rows: ["forced-2"],
        preserve: false
    });
});
