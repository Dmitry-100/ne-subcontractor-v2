"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`ContractsGridRuntimeControllersWorkflow requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsGridRuntimeControllersWorkflow requires ${name}.`);
        }
    }

    function createWorkflowAndDraftControllers(options) {
        const settings = options || {};
        const foundation = settings.foundation;
        const elements = settings.elements;
        const modules = settings.modules;
        const onRefreshAndFocus = settings.onRefreshAndFocus;

        requireObject(foundation, "foundation");
        requireObject(elements, "elements");
        requireObject(modules, "modules");
        requireFunction(onRefreshAndFocus, "onRefreshAndFocus");

        const helpers = foundation.helpers;
        const apiClient = foundation.apiClient;
        const gridState = foundation.gridState;
        const statusValues = foundation.statusValues;
        const localizeStatus = foundation.localizeStatus;
        const getStatusRank = foundation.getStatusRank;

        requireObject(helpers, "foundation.helpers");
        requireFunction(helpers.isGuid, "foundation.helpers.isGuid");
        requireFunction(helpers.toNullableDate, "foundation.helpers.toNullableDate");

        const workflowControllerModule = modules.workflowControllerModule;
        const draftControllerModule = modules.draftControllerModule;
        requireFunction(workflowControllerModule?.createController, "modules.workflowControllerModule.createController");
        requireFunction(draftControllerModule?.createController, "modules.draftControllerModule.createController");

        const workflowController = workflowControllerModule.createController({
            elements: {
                selectedElement: elements.selectedElement,
                transitionStatusElement: elements.transitionStatusElement,
                transitionTargetSelect: elements.transitionTargetSelect,
                transitionReasonInput: elements.transitionReasonInput,
                transitionApplyButton: elements.transitionApplyButton,
                historyRefreshButton: elements.historyRefreshButton,
                historyGridElement: elements.historyGridElement
            },
            gridState: gridState,
            apiClient: apiClient,
            localizeStatus: localizeStatus,
            getStatusRank: getStatusRank,
            statusValues: statusValues,
            historyGridModule: modules.workflowHistoryGridModule,
            eventsModule: modules.workflowEventsModule,
            onTransitionCompleted: onRefreshAndFocus
        });

        const draftController = draftControllerModule.createController({
            elements: {
                draftStatusElement: elements.draftStatusElement,
                draftProcedureIdInput: elements.draftProcedureIdInput,
                draftNumberInput: elements.draftNumberInput,
                draftSigningDateInput: elements.draftSigningDateInput,
                draftStartDateInput: elements.draftStartDateInput,
                draftEndDateInput: elements.draftEndDateInput,
                draftCreateButton: elements.draftCreateButton
            },
            apiClient: apiClient,
            isGuid: helpers.isGuid,
            toNullableDate: helpers.toNullableDate,
            eventsModule: modules.draftEventsModule,
            onDraftCreated: function (created) {
                return onRefreshAndFocus(created.id);
            }
        });

        return {
            workflowController: workflowController,
            draftController: draftController
        };
    }

    const exportsObject = {
        createWorkflowAndDraftControllers: createWorkflowAndDraftControllers
    };

    if (typeof window !== "undefined") {
        window.ContractsGridRuntimeControllersWorkflow = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
