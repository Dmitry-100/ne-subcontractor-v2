"use strict";

(function () {
    function assertFactory(moduleRoot, methodName, moduleName) {
        if (!(moduleRoot && typeof moduleRoot[methodName] === "function")) {
            throw new Error(`Procedures services require '${moduleName}.${methodName}'.`);
        }
    }

    function createServices(options) {
        const settings = options || {};
        const moduleRoots = settings.moduleRoots || {};
        const proceduresConfig = settings.proceduresConfig || {};
        const endpoint = settings.endpoint || "/api/procedures";
        const locationSearch = typeof settings.locationSearch === "string" ? settings.locationSearch : "";

        assertFactory(moduleRoots.proceduresGridHelpersRoot, "createHelpers", "ProceduresGridHelpers");
        assertFactory(moduleRoots.proceduresApiRoot, "createApiClient", "ProceduresApi");
        assertFactory(moduleRoots.proceduresWorkflowRoot, "createWorkflow", "ProceduresWorkflow");
        assertFactory(moduleRoots.proceduresGridColumnsRoot, "createColumns", "ProceduresGridColumns");
        assertFactory(moduleRoots.proceduresDataRoot, "createDataService", "ProceduresData");

        const gridHelpers = moduleRoots.proceduresGridHelpersRoot.createHelpers({
            statusCaptions: proceduresConfig.statusCaptions || {},
            contractorStatusCaptions: proceduresConfig.contractorStatusCaptions || {},
            reliabilityClassCaptions: proceduresConfig.reliabilityClassCaptions || {},
            approvalModes: proceduresConfig.approvalModes || []
        });
        const urlFilterState = gridHelpers.readUrlFilterState(proceduresConfig.statusOrder || [], locationSearch);
        const apiClient = moduleRoots.proceduresApiRoot.createApiClient();
        const workflow = moduleRoots.proceduresWorkflowRoot.createWorkflow({
            statusOrder: proceduresConfig.statusOrder || [],
            localizeStatus: gridHelpers.localizeStatus
        });
        const columns = moduleRoots.proceduresGridColumnsRoot.createColumns({
            localizeStatus: gridHelpers.localizeStatus,
            localizeContractorStatus: gridHelpers.localizeContractorStatus,
            localizeReliabilityClass: gridHelpers.localizeReliabilityClass,
            localizeBoolean: gridHelpers.localizeBoolean,
            statusLookup: proceduresConfig.statusLookup || [],
            approvalModeLookup: proceduresConfig.approvalModeLookup || []
        });
        const dataService = moduleRoots.proceduresDataRoot.createDataService({
            apiClient: apiClient,
            endpoint: endpoint
        });

        return {
            gridHelpers: gridHelpers,
            urlFilterState: urlFilterState,
            apiClient: apiClient,
            workflow: workflow,
            columns: columns,
            dataService: dataService
        };
    }

    const exportsObject = {
        createServices: createServices
    };

    if (typeof window !== "undefined") {
        window.ProceduresServices = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
