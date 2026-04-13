"use strict";

(function () {
    const moduleResolverRoot =
        typeof window !== "undefined" && window.ProceduresRuntimeModuleResolver
            ? window.ProceduresRuntimeModuleResolver
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./procedures-runtime-module-resolver.js")
                : null;

    if (!moduleResolverRoot || typeof moduleResolverRoot.resolveModule !== "function") {
        throw new Error("ProceduresShortlistRuntime requires ProceduresRuntimeModuleResolver.resolveModule.");
    }

    const dataModule = moduleResolverRoot.resolveModule(
        "ProceduresShortlistRuntimeData",
        "./procedures-shortlist-runtime-data.js",
        ["createDataController"]);
    const handlersModule = moduleResolverRoot.resolveModule(
        "ProceduresShortlistRuntimeHandlers",
        "./procedures-shortlist-runtime-handlers.js",
        ["createHandlers"]);

    function createShortlistWorkspaceRuntime(options) {
        const settings = options || {};

        const maxIncludedInput = settings.maxIncludedInput;
        const adjustmentReasonInput = settings.adjustmentReasonInput;
        const buildButton = settings.buildButton;
        const applyButton = settings.applyButton;
        const adjustmentsRefreshButton = settings.adjustmentsRefreshButton;

        const endpoint = settings.endpoint;
        const apiClient = settings.apiClient;
        const workflow = settings.workflow;
        const getSelectedProcedure = settings.getSelectedProcedure;
        const supportsShortlistWorkspace = settings.supportsShortlistWorkspace;
        const normalizeMaxIncluded = settings.normalizeMaxIncluded;
        const normalizeAdjustmentReason = settings.normalizeAdjustmentReason;
        const setShortlistStatus = settings.setShortlistStatus;
        const setShortlistAdjustmentsStatus = settings.setShortlistAdjustmentsStatus;

        const dataController = dataModule.createDataController(settings);
        const updateControls = dataController.updateControls;
        const clearData = dataController.clearData;
        const loadShortlistRecommendations = dataController.loadShortlistRecommendations;
        const loadShortlistAdjustments = dataController.loadShortlistAdjustments;

        const handlers = handlersModule.createHandlers({
            controls: {
                maxIncludedInput: maxIncludedInput,
                adjustmentReasonInput: adjustmentReasonInput
            },
            services: {
                endpoint: endpoint,
                apiClient: apiClient,
                workflow: workflow,
                getSelectedProcedure: getSelectedProcedure,
                supportsShortlistWorkspace: supportsShortlistWorkspace,
                normalizeMaxIncluded: normalizeMaxIncluded,
                normalizeAdjustmentReason: normalizeAdjustmentReason,
                setShortlistStatus: setShortlistStatus,
                setShortlistAdjustmentsStatus: setShortlistAdjustmentsStatus
            },
            state: {
                dataController: dataController,
                updateControls: updateControls,
                clearData: clearData,
                loadShortlistRecommendations: loadShortlistRecommendations,
                loadShortlistAdjustments: loadShortlistAdjustments
            }
        });

        function bindEvents() {
            maxIncludedInput.addEventListener("change", handlers.onMaxIncludedChanged);
            buildButton.addEventListener("click", handlers.onBuildClick);
            applyButton.addEventListener("click", handlers.onApplyClick);
            adjustmentsRefreshButton.addEventListener("click", handlers.onAdjustmentsRefreshClick);
        }

        return {
            bindEvents: bindEvents,
            onSelectionChanged: handlers.onSelectionChanged,
            onMaxIncludedChanged: handlers.onMaxIncludedChanged,
            onBuildClick: handlers.onBuildClick,
            onApplyClick: handlers.onApplyClick,
            onAdjustmentsRefreshClick: handlers.onAdjustmentsRefreshClick,
            updateControls: updateControls,
            clearData: clearData,
            loadShortlistRecommendations: loadShortlistRecommendations,
            loadShortlistAdjustments: loadShortlistAdjustments
        };
    }

    const exportsObject = {
        createShortlistWorkspaceRuntime: createShortlistWorkspaceRuntime
    };

    if (typeof window !== "undefined") {
        window.ProceduresShortlistRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
