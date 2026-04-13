"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleUnderTest = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-grid-runtime-controllers-registry.js"));

test("contracts runtime registry controller module: validates required dependencies", () => {
    assert.throws(function () {
        moduleUnderTest.createRegistryController({
            foundation: {},
            elements: {},
            modules: {},
            onSelectionChanged: null,
            onDataMutated: null
        });
    }, /requires/i);
});

test("contracts runtime registry controller module: composes registry controller options", () => {
    const events = {
        createControllerOptions: null
    };

    const registryController = { id: "registry-controller" };
    const onSelectionChanged = function () {};
    const onDataMutated = function () {};

    const foundation = {
        helpers: {
            toNullableDate: function (value) { return value || null; },
            toNumber: function (value) { return Number(value); },
            isGuid: function () { return true; }
        },
        apiClient: { id: "api-client" },
        gridState: { id: "grid-state" },
        urlFilterState: { hasAny: true },
        statusLookup: [{ value: "Draft", text: "Черновик" }],
        setStatus: function () {},
        appendFilterHint: function (message) { return message; },
        clearUrlFilters: function () {}
    };

    const elements = {
        gridElement: { id: "contracts-grid" }
    };

    const modules = {
        registryControllerModule: {
            createController: function (options) {
                events.createControllerOptions = options;
                return registryController;
            }
        },
        registryPayloadModule: { id: "payload-module" },
        registryColumnsModule: { id: "columns-module" },
        registryEventsModule: { id: "events-module" },
        registryStoreModule: { id: "store-module" }
    };

    const controller = moduleUnderTest.createRegistryController({
        foundation: foundation,
        elements: elements,
        modules: modules,
        onSelectionChanged: onSelectionChanged,
        onDataMutated: onDataMutated
    });

    assert.equal(controller, registryController);
    assert.equal(events.createControllerOptions.elements.gridElement.id, "contracts-grid");
    assert.equal(events.createControllerOptions.payloadBuilderModule.id, "payload-module");
    assert.equal(events.createControllerOptions.columnsModule.id, "columns-module");
    assert.equal(events.createControllerOptions.eventsModule.id, "events-module");
    assert.equal(events.createControllerOptions.storeModule.id, "store-module");
    assert.equal(events.createControllerOptions.onSelectionChanged, onSelectionChanged);
    assert.equal(events.createControllerOptions.onDataMutated, onDataMutated);
    assert.equal(events.createControllerOptions.toNullableDate, foundation.helpers.toNullableDate);
    assert.equal(events.createControllerOptions.toNumber, foundation.helpers.toNumber);
    assert.equal(events.createControllerOptions.isGuid, foundation.helpers.isGuid);
});
