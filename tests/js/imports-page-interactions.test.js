"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const interactionsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-interactions.js"));

function createEventTarget() {
    const listeners = new Map();
    return {
        addEventListener: function (type, handler) {
            listeners.set(type, handler);
        },
        emit: async function (type, event) {
            const handler = listeners.get(type);
            if (typeof handler !== "function") {
                throw new Error(`No handler for "${type}".`);
            }

            return await handler(event || {});
        }
    };
}

function createNode(attributes, extra) {
    const attributeMap = attributes || {};
    const node = Object.assign({}, extra || {});
    node.getAttribute = function (name) {
        return Object.prototype.hasOwnProperty.call(attributeMap, name)
            ? attributeMap[name]
            : null;
    };

    return node;
}

function createTarget(resolvers) {
    const map = resolvers || {};
    return {
        closest: function (selector) {
            return Object.prototype.hasOwnProperty.call(map, selector)
                ? map[selector]
                : null;
        }
    };
}

function createRequiredOptions(overrides) {
    const calls = {
        selected: [],
        code: [],
        name: [],
        openBatch: [],
        retryXml: [],
        retryErrors: []
    };

    const options = {
        lotGroupsTable: createEventTarget(),
        lotSelectedTable: createEventTarget(),
        batchesTable: createEventTarget(),
        xmlTable: createEventTarget(),
        onSetGroupSelected: function (groupKey, value) {
            calls.selected.push({ groupKey: groupKey, value: value });
        },
        onSetGroupLotCode: function (groupKey, value) {
            calls.code.push({ groupKey: groupKey, value: value });
        },
        onSetGroupLotName: function (groupKey, value) {
            calls.name.push({ groupKey: groupKey, value: value });
        },
        onOpenBatch: async function (batchId) {
            calls.openBatch.push(batchId);
        },
        onRetryXml: async function (itemId) {
            calls.retryXml.push(itemId);
        },
        onRetryXmlError: function (error) {
            calls.retryErrors.push(error && error.message ? error.message : String(error));
        }
    };

    return {
        calls: calls,
        options: Object.assign(options, overrides || {})
    };
}

test("imports interactions: createInteractionsService validates dependencies", () => {
    assert.throws(
        function () {
            interactionsModule.createInteractionsService({});
        },
        /lotGroupsTable/);
});

test("imports interactions: lot handlers route selection, code and name updates", async () => {
    const setup = createRequiredOptions();
    const service = interactionsModule.createInteractionsService(setup.options);

    service.bindLotInteractions();

    const selectNode = createNode(
        { "data-lot-group-select": "group-a" },
        { checked: true });
    await setup.options.lotGroupsTable.emit("change", {
        target: createTarget({ "[data-lot-group-select]": selectNode })
    });

    const codeNode = createNode(
        { "data-lot-selected-code": "group-a" },
        { value: "LOT-001" });
    await setup.options.lotSelectedTable.emit("input", {
        target: createTarget({ "[data-lot-selected-code]": codeNode })
    });

    const nameNode = createNode(
        { "data-lot-selected-name": "group-a" },
        { value: "Лот 001" });
    await setup.options.lotSelectedTable.emit("input", {
        target: createTarget({ "[data-lot-selected-name]": nameNode })
    });

    assert.deepEqual(setup.calls.selected, [{ groupKey: "group-a", value: true }]);
    assert.deepEqual(setup.calls.code, [{ groupKey: "group-a", value: "LOT-001" }]);
    assert.deepEqual(setup.calls.name, [{ groupKey: "group-a", value: "Лот 001" }]);
});

test("imports interactions: batch click opens selected batch", async () => {
    const setup = createRequiredOptions();
    const service = interactionsModule.createInteractionsService(setup.options);

    service.bindBatchInteractions();

    const batchNode = createNode({ "data-batch-id": "batch-42" });
    await setup.options.batchesTable.emit("click", {
        target: createTarget({ "[data-batch-id]": batchNode })
    });

    assert.deepEqual(setup.calls.openBatch, ["batch-42"]);
});

test("imports interactions: xml click opens batch by view action", async () => {
    const setup = createRequiredOptions();
    const service = interactionsModule.createInteractionsService(setup.options);

    service.bindXmlInteractions();

    const viewNode = createNode({ "data-xml-view-batch-id": "batch-xml-1" });
    await setup.options.xmlTable.emit("click", {
        target: createTarget({ "[data-xml-view-batch-id]": viewNode })
    });

    assert.deepEqual(setup.calls.openBatch, ["batch-xml-1"]);
    assert.deepEqual(setup.calls.retryXml, []);
});

test("imports interactions: xml click retries item and reports retry failures", async () => {
    const setup = createRequiredOptions({
        onRetryXml: async function (itemId) {
            if (itemId === "broken") {
                throw new Error("retry failed");
            }
        }
    });
    const service = interactionsModule.createInteractionsService(setup.options);

    service.bindXmlInteractions();

    const retryNodeOk = createNode({ "data-xml-retry-id": "ok-item" });
    await setup.options.xmlTable.emit("click", {
        target: createTarget({ "[data-xml-retry-id]": retryNodeOk })
    });

    const retryNodeBroken = createNode({ "data-xml-retry-id": "broken" });
    await setup.options.xmlTable.emit("click", {
        target: createTarget({ "[data-xml-retry-id]": retryNodeBroken })
    });

    assert.deepEqual(setup.calls.retryErrors, ["retry failed"]);
});
