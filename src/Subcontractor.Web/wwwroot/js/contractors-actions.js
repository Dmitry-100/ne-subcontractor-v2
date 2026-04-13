"use strict";

(function () {
    function requireControl(controls, key) {
        const control = controls ? controls[key] : null;
        if (!control) {
            throw new Error(`ContractorsActions requires control '${key}'.`);
        }

        return control;
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractorsActions requires ${name}.`);
        }
    }

    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль contractors actions: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    const ratingModule = resolveModule(
        "ContractorsActionsRating",
        "./contractors-actions-rating.js",
        ["createRatingHandlers"]);

    const modelModule = resolveModule(
        "ContractorsActionsModel",
        "./contractors-actions-model.js",
        ["createModelHandlers"]);

    const manualModule = resolveModule(
        "ContractorsActionsManual",
        "./contractors-actions-manual.js",
        ["createManualHandlers"]);

    function createActions(options) {
        const settings = options || {};
        const controls = settings.controls || {};
        const operations = settings.operations || {};
        const uiState = settings.uiState;
        const apiClient = settings.apiClient;
        const contractorsHelpers = settings.contractorsHelpers;
        const getSelectedContractor = settings.getSelectedContractor;

        const refreshButton = requireControl(controls, "refreshButton");
        const recalcAllButton = requireControl(controls, "recalcAllButton");
        const recalcSelectedButton = requireControl(controls, "recalcSelectedButton");
        const reloadModelButton = requireControl(controls, "reloadModelButton");
        const saveModelButton = requireControl(controls, "saveModelButton");
        const manualSaveButton = requireControl(controls, "manualSaveButton");
        const manualScoreInput = requireControl(controls, "manualScoreInput");
        const manualCommentInput = requireControl(controls, "manualCommentInput");

        if (!uiState) {
            throw new Error("ContractorsActions requires uiState.");
        }

        if (!apiClient) {
            throw new Error("ContractorsActions requires apiClient.");
        }

        if (!contractorsHelpers) {
            throw new Error("ContractorsActions requires contractorsHelpers.");
        }

        requireFunction(getSelectedContractor, "getSelectedContractor callback");
        requireFunction(operations.refreshContractorsAndReselect, "operations.refreshContractorsAndReselect");
        requireFunction(operations.loadAnalytics, "operations.loadAnalytics");
        requireFunction(operations.loadHistory, "operations.loadHistory");
        requireFunction(operations.loadModel, "operations.loadModel");
        requireFunction(operations.buildModelPayload, "operations.buildModelPayload");
        requireFunction(operations.fillModelForm, "operations.fillModelForm");

        const ratingHandlers = ratingModule.createRatingHandlers({
            operations: operations,
            uiState: uiState,
            apiClient: apiClient,
            getSelectedContractor: getSelectedContractor
        });

        const modelHandlers = modelModule.createModelHandlers({
            operations: operations,
            uiState: uiState,
            apiClient: apiClient,
            getSelectedContractor: getSelectedContractor
        });

        const manualHandlers = manualModule.createManualHandlers({
            controls: {
                manualScoreInput: manualScoreInput,
                manualCommentInput: manualCommentInput
            },
            operations: operations,
            uiState: uiState,
            apiClient: apiClient,
            contractorsHelpers: contractorsHelpers,
            getSelectedContractor: getSelectedContractor
        });

        const handleRefreshClick = ratingHandlers.handleRefreshClick;
        const handleRecalculateAllClick = ratingHandlers.handleRecalculateAllClick;
        const handleRecalculateSelectedClick = ratingHandlers.handleRecalculateSelectedClick;
        const handleReloadModelClick = modelHandlers.handleReloadModelClick;
        const handleSaveModelClick = modelHandlers.handleSaveModelClick;
        const handleManualSaveClick = manualHandlers.handleManualSaveClick;

        function bindEvents() {
            refreshButton.addEventListener("click", function () {
                handleRefreshClick();
            });

            recalcAllButton.addEventListener("click", function () {
                handleRecalculateAllClick();
            });

            recalcSelectedButton.addEventListener("click", function () {
                handleRecalculateSelectedClick();
            });

            reloadModelButton.addEventListener("click", function () {
                handleReloadModelClick();
            });

            saveModelButton.addEventListener("click", function () {
                handleSaveModelClick();
            });

            manualSaveButton.addEventListener("click", function () {
                handleManualSaveClick();
            });
        }

        return {
            bindEvents: bindEvents,
            handleRefreshClick: handleRefreshClick,
            handleRecalculateAllClick: handleRecalculateAllClick,
            handleRecalculateSelectedClick: handleRecalculateSelectedClick,
            handleReloadModelClick: handleReloadModelClick,
            handleSaveModelClick: handleSaveModelClick,
            handleManualSaveClick: handleManualSaveClick
        };
    }

    const exportsObject = {
        createActions: createActions
    };

    if (typeof window !== "undefined") {
        window.ContractorsActions = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
