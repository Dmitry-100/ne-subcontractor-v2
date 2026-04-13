"use strict";

(function () {
    const contractorStatusCaptions = {
        Active: "Активен",
        Blocked: "Заблокирован"
    };

    const reliabilityCaptions = {
        A: "A (высокая)",
        B: "B (нормальная)",
        New: "Новый",
        D: "D (критическая)"
    };

    const ratingSourceCaptions = {
        AutoRecalculation: "Авто-пересчёт",
        ManualAssessment: "Ручная оценка"
    };

    const factorCodes = {
        delivery: "DeliveryDiscipline",
        commercial: "CommercialDiscipline",
        claim: "ClaimDiscipline",
        manual: "ManualExpertEvaluation",
        workload: "WorkloadPenalty"
    };

    function requireFactory(root, rootName, factoryName) {
        if (!root || typeof root[factoryName] !== "function") {
            throw new Error(`ContractorsGridEntrypointHelpers requires ${rootName}.${factoryName}.`);
        }
    }

    function requireModuleRoot(moduleRoots, key, rootName, factoryName) {
        const root = moduleRoots ? moduleRoots[key] : null;
        requireFactory(root, rootName, factoryName);
        return root;
    }

    function createHelpersAndApi(moduleRoots, endpoints) {
        const helpersRoot = requireModuleRoot(
            moduleRoots,
            "contractorsGridHelpersRoot",
            "contractorsGridHelpersRoot",
            "createHelpers");
        const apiRoot = requireModuleRoot(
            moduleRoots,
            "contractorsApiRoot",
            "contractorsApiRoot",
            "createApiClient");

        const helpers = helpersRoot.createHelpers({
            contractorStatusCaptions: contractorStatusCaptions,
            reliabilityCaptions: reliabilityCaptions,
            ratingSourceCaptions: ratingSourceCaptions,
            factorCodes: factorCodes
        });

        const apiClient = apiRoot.createApiClient({
            endpoint: endpoints.endpoint,
            ratingModelEndpoint: endpoints.ratingModelEndpoint,
            ratingRecalculateEndpoint: endpoints.ratingRecalculateEndpoint,
            ratingAnalyticsEndpoint: endpoints.ratingAnalyticsEndpoint
        });

        return {
            apiClient: apiClient,
            helpers: helpers
        };
    }

    function createUiState(moduleRoots, controls, getSelectedContractor) {
        const uiStateRoot = requireModuleRoot(
            moduleRoots,
            "contractorsUiStateRoot",
            "contractorsUiStateRoot",
            "createUiState");

        return uiStateRoot.createUiState({
            controls: controls,
            getSelectedContractor: getSelectedContractor
        });
    }

    function createDataRuntime(moduleRoots, apiClient, grids, uiState) {
        const dataRoot = requireModuleRoot(
            moduleRoots,
            "contractorsDataRoot",
            "contractorsDataRoot",
            "createDataRuntime");

        return dataRoot.createDataRuntime({
            apiClient: apiClient,
            grids: {
                contractorsGridInstance: grids.contractorsGridInstance,
                historyGridInstance: grids.historyGridInstance,
                analyticsGridInstance: grids.analyticsGridInstance
            },
            uiState: {
                setStatus: uiState.setStatus,
                setHistoryStatus: uiState.setHistoryStatus,
                setAnalyticsStatus: uiState.setAnalyticsStatus,
                updateSelectionUi: uiState.updateSelectionUi
            }
        });
    }

    function createModelService(moduleRoots, helpers, apiClient, controls, uiState) {
        const modelRoot = requireModuleRoot(
            moduleRoots,
            "contractorsModelRoot",
            "contractorsModelRoot",
            "createModelService");

        return modelRoot.createModelService({
            helpers: helpers,
            apiClient: apiClient,
            setRatingStatus: uiState.setRatingStatus,
            controls: {
                versionCodeInput: controls.versionCodeInput,
                modelNameInput: controls.modelNameInput,
                modelNotesInput: controls.modelNotesInput,
                weightDeliveryInput: controls.weightDeliveryInput,
                weightCommercialInput: controls.weightCommercialInput,
                weightClaimInput: controls.weightClaimInput,
                weightManualInput: controls.weightManualInput,
                weightWorkloadInput: controls.weightWorkloadInput
            }
        });
    }

    function createActions(moduleRoots, controls, operations, apiClient, helpers, uiState, getSelectedContractor) {
        const actionsRoot = requireModuleRoot(
            moduleRoots,
            "contractorsActionsRoot",
            "contractorsActionsRoot",
            "createActions");

        return actionsRoot.createActions({
            controls: {
                refreshButton: controls.refreshButton,
                recalcAllButton: controls.recalcAllButton,
                recalcSelectedButton: controls.recalcSelectedButton,
                reloadModelButton: controls.reloadModelButton,
                saveModelButton: controls.saveModelButton,
                manualSaveButton: controls.manualSaveButton,
                manualScoreInput: controls.manualScoreInput,
                manualCommentInput: controls.manualCommentInput
            },
            operations: operations,
            apiClient: apiClient,
            contractorsHelpers: helpers,
            uiState: uiState,
            getSelectedContractor: getSelectedContractor
        });
    }

    const exportsObject = {
        createHelpersAndApi: createHelpersAndApi,
        createUiState: createUiState,
        createDataRuntime: createDataRuntime,
        createModelService: createModelService,
        createActions: createActions,
        requireModuleRoot: requireModuleRoot
    };

    if (typeof window !== "undefined") {
        window.ContractorsGridEntrypointDependencies = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
