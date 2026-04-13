"use strict";

(function () {
    const transitionHelpersRoot =
        typeof window !== "undefined" && window.ProceduresTransitionHelpers
            ? window.ProceduresTransitionHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./procedures-transition-helpers.js")
                : null;

    if (!transitionHelpersRoot ||
        typeof transitionHelpersRoot.validateControls !== "function" ||
        typeof transitionHelpersRoot.validateDependencies !== "function" ||
        typeof transitionHelpersRoot.renderTargets !== "function") {
        throw new Error("ProceduresTransition requires ProceduresTransitionHelpers contract.");
    }

    function createTransitionController(options) {
        const settings = options || {};

        const targetSelect = settings.targetSelect || null;
        const reasonInput = settings.reasonInput || null;
        const applyButton = settings.applyButton || null;
        const historyRefreshButton = settings.historyRefreshButton || null;
        const historyGrid = settings.historyGrid || null;

        const endpoint = settings.endpoint || "";
        const apiClient = settings.apiClient || null;
        const transitionMap = settings.transitionMap || null;
        const localizeStatus = settings.localizeStatus || null;
        const validateTransitionRequest = settings.validateTransitionRequest || null;
        const buildTransitionSuccessMessage = settings.buildTransitionSuccessMessage || null;
        const getSelectedProcedure = settings.getSelectedProcedure || null;
        const setTransitionStatus = settings.setTransitionStatus || null;
        const refreshGridAndReselect = settings.refreshGridAndReselect || null;
        const createOption = settings.createOption || function (value, text) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = text;
            return option;
        };

        transitionHelpersRoot.validateControls({
            applyButton: applyButton,
            historyGrid: historyGrid,
            historyRefreshButton: historyRefreshButton,
            reasonInput: reasonInput,
            targetSelect: targetSelect
        });

        transitionHelpersRoot.validateDependencies({
            apiClient: apiClient,
            buildTransitionSuccessMessage: buildTransitionSuccessMessage,
            createOption: createOption,
            endpoint: endpoint,
            getSelectedProcedure: getSelectedProcedure,
            localizeStatus: localizeStatus,
            refreshGridAndReselect: refreshGridAndReselect,
            setTransitionStatus: setTransitionStatus,
            transitionMap: transitionMap,
            validateTransitionRequest: validateTransitionRequest
        });

        function renderTargets(procedure) {
            transitionHelpersRoot.renderTargets({
                applyButton: applyButton,
                createOption: createOption,
                historyRefreshButton: historyRefreshButton,
                localizeStatus: localizeStatus,
                targetSelect: targetSelect,
                transitionMap: transitionMap
            }, procedure);
        }

        async function loadHistory(procedureId) {
            if (!procedureId) {
                historyGrid.option("dataSource", []);
                return;
            }

            if (typeof historyGrid.ensureInitialized === "function") {
                historyGrid.ensureInitialized();
            }

            const history = await apiClient.getProcedureHistory(endpoint, procedureId);
            historyGrid.option("dataSource", Array.isArray(history) ? history : []);
        }

        function onSelectionChanged(procedure) {
            renderTargets(procedure);
        }

        async function onApplyClick() {
            const selectedProcedure = getSelectedProcedure();
            if (!selectedProcedure) {
                return;
            }

            const targetStatus = targetSelect.value;
            const reason = String(reasonInput.value || "").trim();
            const transitionRequest = validateTransitionRequest(selectedProcedure, targetStatus, reason);
            if (!transitionRequest || transitionRequest.isValid !== true) {
                setTransitionStatus(transitionRequest?.errorMessage || "Некорректный запрос перехода.", true);
                return;
            }

            try {
                await apiClient.transitionProcedure(endpoint, selectedProcedure.id, transitionRequest.payload);
                setTransitionStatus(buildTransitionSuccessMessage(selectedProcedure.status, targetStatus), false);
                reasonInput.value = "";
                await refreshGridAndReselect(selectedProcedure.id);
                await loadHistory(selectedProcedure.id);
            } catch (error) {
                setTransitionStatus(error?.message || "Ошибка выполнения перехода.", true);
            }
        }

        async function onHistoryRefreshClick() {
            const selectedProcedure = getSelectedProcedure();
            if (!selectedProcedure) {
                return;
            }

            try {
                await loadHistory(selectedProcedure.id);
                setTransitionStatus("История обновлена.", false);
            } catch (error) {
                setTransitionStatus(`Не удалось обновить историю: ${error.message}`, true);
            }
        }

        function bindEvents() {
            applyButton.addEventListener("click", onApplyClick);
            historyRefreshButton.addEventListener("click", onHistoryRefreshClick);
        }

        return {
            bindEvents: bindEvents,
            onSelectionChanged: onSelectionChanged,
            onApplyClick: onApplyClick,
            onHistoryRefreshClick: onHistoryRefreshClick,
            loadHistory: loadHistory
        };
    }

    const exportsObject = {
        createTransitionController: createTransitionController
    };

    if (typeof window !== "undefined") {
        window.ProceduresTransition = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
