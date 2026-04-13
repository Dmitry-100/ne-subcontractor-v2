"use strict";

(function () {
    const MODULE_REQUIREMENTS = [
        {
            key: "importsPageHelpersRoot",
            globalName: "ImportsPageHelpers",
            methodName: "createHelpers",
            errorMessage: "ImportsPageHelpers не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageApiRoot",
            globalName: "ImportsPageApi",
            methodName: "createApiClient",
            errorMessage: "ImportsPageApi не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageLotStateRoot",
            globalName: "ImportsPageLotState",
            errorMessage: "ImportsPageLotState не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageWorkflowRoot",
            globalName: "ImportsPageWorkflow",
            methodName: "createWorkflow",
            errorMessage: "ImportsPageWorkflow не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageWorkflowUiRoot",
            globalName: "ImportsPageWorkflowUi",
            methodName: "createWorkflowUiService",
            errorMessage: "ImportsPageWorkflowUi не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageMappingRoot",
            globalName: "ImportsPageMapping",
            methodName: "createMappingService",
            errorMessage: "ImportsPageMapping не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageMappingOrchestrationRoot",
            globalName: "ImportsPageMappingOrchestration",
            methodName: "createMappingOrchestrationService",
            errorMessage: "ImportsPageMappingOrchestration не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageFileParserRoot",
            globalName: "ImportsPageFileParser",
            methodName: "createFileParser",
            errorMessage: "ImportsPageFileParser не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageWorkbookRoot",
            globalName: "ImportsPageWorkbook",
            methodName: "createWorkbookParser",
            errorMessage: "ImportsPageWorkbook не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageXmlRoot",
            globalName: "ImportsPageXml",
            methodName: "createXmlHelpers",
            errorMessage: "ImportsPageXml не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageXmlInboxRoot",
            globalName: "ImportsPageXmlInbox",
            methodName: "createXmlInboxService",
            errorMessage: "ImportsPageXmlInbox не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageUploadRoot",
            globalName: "ImportsPageUpload",
            methodName: "createUploadHelpers",
            errorMessage: "ImportsPageUpload не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageTableModelsRoot",
            globalName: "ImportsPageTableModels",
            methodName: "createTableModels",
            errorMessage: "ImportsPageTableModels не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageBatchesRoot",
            globalName: "ImportsPageBatches",
            methodName: "createBatchesService",
            errorMessage: "ImportsPageBatches не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageReportsRoot",
            globalName: "ImportsPageReports",
            methodName: "createReportsHelpers",
            errorMessage: "ImportsPageReports не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageLotOrchestrationRoot",
            globalName: "ImportsPageLotOrchestration",
            methodName: "createLotOrchestrationService",
            errorMessage: "ImportsPageLotOrchestration не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageLotTablesRoot",
            globalName: "ImportsPageLotTables",
            methodName: "createLotTablesService",
            errorMessage: "ImportsPageLotTables не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageBatchTablesRoot",
            globalName: "ImportsPageBatchTables",
            methodName: "createBatchTablesService",
            errorMessage: "ImportsPageBatchTables не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageMappingUiRoot",
            globalName: "ImportsPageMappingUi",
            methodName: "createMappingUiService",
            errorMessage: "ImportsPageMappingUi не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageStatusRoot",
            globalName: "ImportsPageStatus",
            methodName: "createStatusService",
            errorMessage: "ImportsPageStatus не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageWizardSessionRoot",
            globalName: "ImportsPageWizardSession",
            methodName: "createWizardSessionService",
            errorMessage: "ImportsPageWizardSession не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageActionHandlersRoot",
            globalName: "ImportsPageActionHandlers",
            methodName: "createActionHandlers",
            errorMessage: "ImportsPageActionHandlers не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageActionBindingsRoot",
            globalName: "ImportsPageActionBindings",
            methodName: "createActionBindingsService",
            errorMessage: "ImportsPageActionBindings не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageSessionWiringRoot",
            globalName: "ImportsPageSessionWiring",
            methodName: "createSessionWiring",
            errorMessage: "ImportsPageSessionWiring не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageServicesWiringRoot",
            globalName: "ImportsPageServicesWiring",
            methodName: "createServicesWiring",
            errorMessage: "ImportsPageServicesWiring не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageRuntimeRoot",
            globalName: "ImportsPageRuntime",
            methodName: "createRuntimeService",
            errorMessage: "ImportsPageRuntime не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageStateRoot",
            globalName: "ImportsPageState",
            methodName: "createStateStore",
            errorMessage: "ImportsPageState не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageConfigRoot",
            globalName: "ImportsPageConfig",
            methodName: "createConfig",
            errorMessage: "ImportsPageConfig не загружен. Проверьте порядок подключения скриптов."
        },
        {
            key: "importsPageInteractionsRoot",
            globalName: "ImportsPageInteractions",
            methodName: "createInteractionsService",
            errorMessage: "ImportsPageInteractions не загружен. Проверьте порядок подключения скриптов."
        }
    ];

    const exportsObject = {
        MODULE_REQUIREMENTS: MODULE_REQUIREMENTS
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBootstrapModuleRequirements = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
