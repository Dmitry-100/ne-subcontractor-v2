"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`ContractsGridRuntimeControllersRegistry requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsGridRuntimeControllersRegistry requires ${name}.`);
        }
    }

    function createRegistryController(options) {
        const settings = options || {};
        const foundation = settings.foundation;
        const elements = settings.elements;
        const modules = settings.modules;
        const onSelectionChanged = settings.onSelectionChanged;
        const onDataMutated = settings.onDataMutated;

        requireObject(foundation, "foundation");
        requireObject(elements, "elements");
        requireObject(modules, "modules");
        requireFunction(onSelectionChanged, "onSelectionChanged");
        requireFunction(onDataMutated, "onDataMutated");

        const helpers = foundation.helpers;
        const apiClient = foundation.apiClient;
        const gridState = foundation.gridState;
        const urlFilterState = foundation.urlFilterState;
        const statusLookup = foundation.statusLookup;
        const setStatus = foundation.setStatus;
        const appendFilterHint = foundation.appendFilterHint;
        const clearUrlFilters = foundation.clearUrlFilters;

        requireObject(helpers, "foundation.helpers");
        requireFunction(helpers.toNullableDate, "foundation.helpers.toNullableDate");
        requireFunction(helpers.toNumber, "foundation.helpers.toNumber");
        requireFunction(helpers.isGuid, "foundation.helpers.isGuid");

        const registryControllerModule = modules.registryControllerModule;
        requireFunction(registryControllerModule?.createController, "modules.registryControllerModule.createController");

        return registryControllerModule.createController({
            elements: {
                gridElement: elements.gridElement
            },
            apiClient: apiClient,
            gridState: gridState,
            urlFilterState: urlFilterState,
            statusLookup: statusLookup,
            setStatus: setStatus,
            appendFilterHint: appendFilterHint,
            clearUrlFilters: clearUrlFilters,
            toNullableDate: helpers.toNullableDate,
            toNumber: helpers.toNumber,
            isGuid: helpers.isGuid,
            payloadBuilderModule: modules.registryPayloadModule,
            columnsModule: modules.registryColumnsModule,
            eventsModule: modules.registryEventsModule,
            storeModule: modules.registryStoreModule,
            onSelectionChanged: onSelectionChanged,
            onDataMutated: onDataMutated
        });
    }

    const exportsObject = {
        createRegistryController: createRegistryController
    };

    if (typeof window !== "undefined") {
        window.ContractsGridRuntimeControllersRegistry = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
