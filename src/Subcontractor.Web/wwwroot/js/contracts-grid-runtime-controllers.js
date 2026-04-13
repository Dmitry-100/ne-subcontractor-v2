"use strict";

(function () {
    function resolveResolverModule() {
        if (typeof window !== "undefined" && window.ContractsGridRuntimeControllersModuleResolver) {
            return window.ContractsGridRuntimeControllersModuleResolver;
        }

        if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            return require("./contracts-grid-runtime-controllers-module-resolver.js");
        }

        throw new Error("Не удалось загрузить модуль contracts grid runtime controllers: ContractsGridRuntimeControllersModuleResolver.");
    }

    const resolverModule = resolveResolverModule();
    const requireObject = resolverModule.requireObject;
    const resolveModule = resolverModule.resolveModule;

    function createControllersComposition(options) {
        const settings = options || {};
        const foundation = settings.foundation;
        const elements = settings.elements;
        const modules = settings.modules;

        requireObject(foundation, "foundation");
        requireObject(elements, "elements");
        requireObject(modules, "modules");

        const monitoringControllerModule = resolveModule(
            "ContractsGridRuntimeControllersMonitoring",
            "./contracts-grid-runtime-controllers-monitoring.js",
            ["createMonitoringController"]);
        const workflowControllerModule = resolveModule(
            "ContractsGridRuntimeControllersWorkflow",
            "./contracts-grid-runtime-controllers-workflow.js",
            ["createWorkflowAndDraftControllers"]);
        const executionControllerModule = resolveModule(
            "ContractsGridRuntimeControllersExecution",
            "./contracts-grid-runtime-controllers-execution.js",
            ["createExecutionController"]);
        const registryControllerModule = resolveModule(
            "ContractsGridRuntimeControllersRegistry",
            "./contracts-grid-runtime-controllers-registry.js",
            ["createRegistryController"]);

        let monitoringController = null;
        let workflowController = null;
        let draftController = null;
        let executionController = null;
        let registryController = null;
        let workflowInitialized = false;
        let executionInitialized = false;
        let monitoringInitialized = false;

        function getSelectedContractSafely() {
            if (typeof foundation.getSelectedContract !== "function") {
                return null;
            }

            return foundation.getSelectedContract();
        }

        function hasSelectionOrTarget(contractId) {
            return Boolean(contractId || getSelectedContractSafely());
        }

        function ensureExecutionInitialized() {
            if (executionInitialized) {
                return;
            }

            executionController.init();
            executionInitialized = true;
        }

        function ensureMonitoringInitialized() {
            if (monitoringInitialized) {
                return;
            }

            monitoringController.init();
            monitoringInitialized = true;
        }

        function ensureWorkflowInitialized() {
            if (workflowInitialized) {
                return;
            }

            workflowController.init();
            workflowInitialized = true;
        }

        function ensureDeferredControllers(contractId) {
            if (!hasSelectionOrTarget(contractId)) {
                return;
            }

            ensureWorkflowInitialized();
            ensureExecutionInitialized();
            ensureMonitoringInitialized();
        }

        function updateDeferredControls() {
            workflowController.updateControls();
            executionController.updateControls();
            monitoringController.updateControls();
        }

        function loadDeferredData() {
            return Promise.all([
                workflowController.loadHistory(false),
                executionController.loadExecutionData(false),
                monitoringController.loadData(false)
            ]);
        }

        function loadDeferredDataInBackground() {
            Promise.resolve(loadDeferredData()).catch(function () {
                // Each controller reports its own load errors into its status block.
            });
        }

        async function refreshGridAndFocus(contractId) {
            await registryController.refreshAndSelect(contractId);
            ensureDeferredControllers(contractId);
            updateDeferredControls();
            await loadDeferredData();
        }

        monitoringController = monitoringControllerModule.createMonitoringController({
            foundation: foundation,
            elements: elements,
            modules: modules
        });

        const workflowAndDraft = workflowControllerModule.createWorkflowAndDraftControllers({
            foundation: foundation,
            elements: elements,
            modules: modules,
            onRefreshAndFocus: refreshGridAndFocus
        });
        requireObject(workflowAndDraft, "workflowAndDraft");

        workflowController = workflowAndDraft.workflowController;
        draftController = workflowAndDraft.draftController;
        requireObject(workflowController, "workflowController");
        requireObject(draftController, "draftController");

        executionController = executionControllerModule.createExecutionController({
            foundation: foundation,
            elements: elements,
            modules: modules
        });

        registryController = registryControllerModule.createRegistryController({
            foundation: foundation,
            elements: elements,
            modules: modules,
            onSelectionChanged: function () {
                ensureDeferredControllers();
                updateDeferredControls();
                loadDeferredDataInBackground();
            },
            onDataMutated: function () {
                ensureDeferredControllers();
                updateDeferredControls();
            }
        });

        function initAll() {
            registryController.init();
            draftController.init();
            updateDeferredControls();
        }

        return {
            registryController: registryController,
            executionController: executionController,
            workflowController: workflowController,
            draftController: draftController,
            monitoringController: monitoringController,
            initAll: initAll
        };
    }

    const exportsObject = {
        createControllersComposition: createControllersComposition
    };

    if (typeof window !== "undefined") {
        window.ContractsGridRuntimeControllers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
