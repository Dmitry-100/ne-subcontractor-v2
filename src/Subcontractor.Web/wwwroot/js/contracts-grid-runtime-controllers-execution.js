"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`ContractsGridRuntimeControllersExecution requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsGridRuntimeControllersExecution requires ${name}.`);
        }
    }

    function createExecutionController(options) {
        const settings = options || {};
        const foundation = settings.foundation;
        const elements = settings.elements;
        const modules = settings.modules;

        requireObject(foundation, "foundation");
        requireObject(elements, "elements");
        requireObject(modules, "modules");

        const helpers = foundation.helpers;
        const executionModule = foundation.executionModule;
        const apiClient = foundation.apiClient;
        const localizeStatus = foundation.localizeStatus;
        const getSelectedContract = foundation.getSelectedContract;

        requireObject(helpers, "foundation.helpers");
        requireFunction(helpers.buildMilestonesPayload, "foundation.helpers.buildMilestonesPayload");

        const executionPanelControllerModule = modules.executionPanelControllerModule;
        requireFunction(executionPanelControllerModule?.createController, "modules.executionPanelControllerModule.createController");

        return executionPanelControllerModule.createController({
            elements: {
                executionSelectedElement: elements.executionSelectedElement,
                executionSummaryElement: elements.executionSummaryElement,
                executionStatusElement: elements.executionStatusElement,
                executionRefreshButton: elements.executionRefreshButton,
                executionGridElement: elements.executionGridElement
            },
            executionModule: executionModule,
            apiClient: apiClient,
            getSelectedContract: getSelectedContract,
            localizeStatus: localizeStatus,
            buildMilestonesPayload: helpers.buildMilestonesPayload,
            gridModule: modules.executionPanelGridModule,
            eventsModule: modules.executionPanelEventsModule
        });
    }

    const exportsObject = {
        createExecutionController: createExecutionController
    };

    if (typeof window !== "undefined") {
        window.ContractsGridRuntimeControllersExecution = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
