"use strict";

(function () {
    function descriptor(alias, globalName, errorMessage, requiredMembers) {
        return {
            alias: alias,
            globalName: globalName,
            requiredMembers: Array.isArray(requiredMembers) ? requiredMembers : [],
            errorMessage: errorMessage
        };
    }

    const moduleDescriptors = [
        descriptor("helpers", "ContractsGridHelpers", "Вспомогательные скрипты contracts-grid не загружены."),
        descriptor("contractsApiModule", "ContractsGridApi", "API-скрипты contracts-grid не загружены.", ["createClient"]),
        descriptor("monitoringModelModule", "ContractsMonitoringModel", "Скрипты мониторинга contracts-grid не загружены.", ["createModel"]),
        descriptor("stateModule", "ContractsGridState", "Скрипты состояния contracts-grid не загружены.", ["createState"]),
        descriptor("executionModule", "ContractsExecution", "Скрипты исполнения contracts-grid не загружены."),
        descriptor("monitoringKpModule", "ContractsMonitoringKp", "Скрипты мониторинга КП contracts-grid не загружены."),
        descriptor("monitoringMdrModule", "ContractsMonitoringMdr", "Скрипты мониторинга MDR contracts-grid не загружены."),
        descriptor("monitoringKpGridsModule", "ContractsMonitoringKpGrids", "Скрипты monitoring-KP-grid конфигурации contracts-grid не загружены.", ["createKpGrids"]),
        descriptor("monitoringMdrGridsModule", "ContractsMonitoringMdrGrids", "Скрипты monitoring-MDR-grid конфигурации contracts-grid не загружены.", ["createMdrGrids"]),
        descriptor("monitoringGridsModule", "ContractsMonitoringGrids", "Скрипты monitoring-grid конфигурации contracts-grid не загружены.", ["createGrids"]),
        descriptor("monitoringControlsModule", "ContractsMonitoringControls", "Скрипты monitoring-controls contracts-grid не загружены.", ["createController"]),
        descriptor("monitoringSelectionModule", "ContractsMonitoringSelection", "Скрипты monitoring-selection contracts-grid не загружены.", ["createController"]),
        descriptor("monitoringImportStatusModule", "ContractsMonitoringImportStatus", "Скрипты статусов импорта MDR contracts-grid не загружены.", ["resolveImportMode", "buildImportStatuses", "validateImportPrerequisites"]),
        descriptor("monitoringImportModule", "ContractsMonitoringImport", "Скрипты контроллера импорта MDR contracts-grid не загружены.", ["createController"]),
        descriptor("monitoringDataModule", "ContractsMonitoringData", "Скрипты data-сервиса мониторинга contracts-grid не загружены.", ["createService"]),
        descriptor("monitoringBootstrapModule", "ContractsMonitoringBootstrap", "Скрипты bootstrap-слоя мониторинга contracts-grid не загружены.", ["createCompositionContext"]),
        descriptor("monitoringWiringModule", "ContractsMonitoringWiring", "Скрипты wiring-слоя мониторинга contracts-grid не загружены.", ["bindCoreEvents", "createGridDataBinders"]),
        descriptor("monitoringControllerModule", "ContractsMonitoring", "Скрипты контроллера мониторинга contracts-grid не загружены.", ["createController"]),
        descriptor("workflowControllerModule", "ContractsWorkflow", "Скрипты workflow contracts-grid не загружены.", ["createController"]),
        descriptor("workflowHistoryGridModule", "ContractsWorkflowHistoryGrid", "Скрипты workflow-history-grid contracts-grid не загружены.", ["createGridConfig"]),
        descriptor("workflowEventsModule", "ContractsWorkflowEvents", "Скрипты workflow-events contracts-grid не загружены.", ["createEvents"]),
        descriptor("draftControllerModule", "ContractsDraft", "Скрипты draft contracts-grid не загружены.", ["createController"]),
        descriptor("draftEventsModule", "ContractsDraftEvents", "Скрипты draft-events contracts-grid не загружены.", ["createEvents"]),
        descriptor("registryControllerModule", "ContractsRegistry", "Скрипты реестра contracts-grid не загружены.", ["createController"]),
        descriptor("registryPayloadModule", "ContractsRegistryPayload", "Скрипты payload-логики реестра contracts-grid не загружены.", ["createBuilder"]),
        descriptor("registryColumnsModule", "ContractsRegistryColumns", "Скрипты columns-логики реестра contracts-grid не загружены.", ["createFormItems", "createColumns"]),
        descriptor("registryEventsModule", "ContractsRegistryEvents", "Скрипты events-логики реестра contracts-grid не загружены.", ["createEvents"]),
        descriptor("registryStoreModule", "ContractsRegistryStore", "Скрипты store-логики реестра contracts-grid не загружены.", ["createContractsStore"]),
        descriptor("executionPanelControllerModule", "ContractsExecutionPanel", "Скрипты execution-panel contracts-grid не загружены.", ["createController"]),
        descriptor("executionPanelGridModule", "ContractsExecutionPanelGrid", "Скрипты execution-panel-grid contracts-grid не загружены.", ["createGridConfig"]),
        descriptor("executionPanelEventsModule", "ContractsExecutionPanelEvents", "Скрипты execution-panel-events contracts-grid не загружены.", ["createEvents"])
    ];

    function hasRequiredMembers(moduleObject, requiredMembers) {
        if (!moduleObject) {
            return false;
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        if (members.length === 0) {
            return true;
        }

        return members.every(function (memberName) {
            return typeof moduleObject[memberName] === "function";
        });
    }

    function resolveModules(options) {
        const settings = options || {};
        const source = settings.source;
        const statusElement = settings.statusElement;
        const setStatusError = settings.setStatusError;
        const modules = {};

        if (typeof setStatusError !== "function") {
            throw new Error("ContractsBootstrapModules requires setStatusError callback.");
        }

        if (!source || typeof source !== "object") {
            setStatusError(statusElement, "Скрипты contracts-grid не загружены.");
            return null;
        }

        for (let i = 0; i < moduleDescriptors.length; i += 1) {
            const descriptor = moduleDescriptors[i];
            const moduleObject = source[descriptor.globalName];

            if (!hasRequiredMembers(moduleObject, descriptor.requiredMembers)) {
                setStatusError(statusElement, descriptor.errorMessage);
                return null;
            }

            modules[descriptor.alias] = moduleObject;
        }

        return modules;
    }

    const exportsObject = {
        resolveModules: resolveModules,
        moduleDescriptors: moduleDescriptors
    };

    if (typeof window !== "undefined") {
        window.ContractsBootstrapModules = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
