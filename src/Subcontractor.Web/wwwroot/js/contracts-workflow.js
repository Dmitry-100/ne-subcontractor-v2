"use strict";

(function () {
    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль contracts-workflow: ${globalName}.`);
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

    function createController(options) {
        const settings = options || {};
        const elements = settings.elements || {};
        const gridState = settings.gridState;
        const apiClient = settings.apiClient;
        const localizeStatus = settings.localizeStatus;
        const getStatusRank = settings.getStatusRank;
        const statusValues = Array.isArray(settings.statusValues) ? settings.statusValues : [];
        const onTransitionCompleted = typeof settings.onTransitionCompleted === "function"
            ? settings.onTransitionCompleted
            : function () { return Promise.resolve(); };
        const historyGridModule = settings.historyGridModule
            || resolveModule("ContractsWorkflowHistoryGrid", "./contracts-workflow-history-grid.js", ["createGridConfig"]);
        const eventsModule = settings.eventsModule
            || resolveModule("ContractsWorkflowEvents", "./contracts-workflow-events.js", ["createEvents"]);

        const selectedElement = elements.selectedElement;
        const transitionStatusElement = elements.transitionStatusElement;
        const transitionTargetSelect = elements.transitionTargetSelect;
        const transitionReasonInput = elements.transitionReasonInput;
        const transitionApplyButton = elements.transitionApplyButton;
        const historyRefreshButton = elements.historyRefreshButton;
        const historyGridElement = elements.historyGridElement;

        let historyGridInstance = null;

        function setTransitionStatus(message, isError) {
            transitionStatusElement.textContent = message;
            transitionStatusElement.classList.toggle("contracts-transition-status--error", Boolean(isError));
        }

        function getSelectedContract() {
            return gridState.getSelectedContract();
        }

        function getTransitionTargets(status) {
            const rank = getStatusRank(status);
            if (rank < 0) {
                return [];
            }

            const targets = [];
            if (rank + 1 < statusValues.length) {
                targets.push(statusValues[rank + 1]);
            }

            if (rank - 1 >= 0) {
                targets.push(statusValues[rank - 1]);
            }

            return targets;
        }

        function updateTransitionTargets(targets) {
            transitionTargetSelect.innerHTML = "";

            targets.forEach(function (status) {
                const option = document.createElement("option");
                option.value = status;
                option.textContent = localizeStatus(status);
                transitionTargetSelect.appendChild(option);
            });
        }

        async function loadHistory(showStatusMessage) {
            const selectedContract = getSelectedContract();
            if (!historyGridInstance) {
                return;
            }

            if (!selectedContract) {
                historyGridInstance.option("dataSource", []);
                return;
            }

            try {
                const payload = await apiClient.getContractHistory(selectedContract.id);
                const history = Array.isArray(payload) ? payload : [];
                historyGridInstance.option("dataSource", history);

                if (showStatusMessage) {
                    setTransitionStatus(`Загружено записей истории: ${history.length}.`, false);
                }
            } catch (error) {
                setTransitionStatus(`Не удалось загрузить историю: ${error.message}`, true);
            }
        }

        function updateControls() {
            const selectedContract = getSelectedContract();
            if (!selectedContract) {
                selectedElement.textContent = "Выберите договор в таблице, чтобы управлять статусом.";
                transitionTargetSelect.disabled = true;
                transitionApplyButton.disabled = true;
                historyRefreshButton.disabled = true;
                transitionReasonInput.value = "";
                updateTransitionTargets([]);
                if (historyGridInstance) {
                    historyGridInstance.option("dataSource", []);
                }
                return;
            }

            const targets = getTransitionTargets(selectedContract.status);
            selectedElement.textContent = `Выбрано: ${selectedContract.contractNumber} (${localizeStatus(selectedContract.status)})`;
            updateTransitionTargets(targets);

            const hasTargets = targets.length > 0;
            transitionTargetSelect.disabled = !hasTargets;
            transitionApplyButton.disabled = !hasTargets;
            historyRefreshButton.disabled = false;
        }

        function bindEventHandlers() {
            const events = eventsModule.createEvents({
                getSelectedContract: getSelectedContract,
                setTransitionStatus: setTransitionStatus,
                getTargetStatus: function () {
                    return String(transitionTargetSelect.value || "");
                },
                getReason: function () {
                    return transitionReasonInput.value.trim();
                },
                clearReason: function () {
                    transitionReasonInput.value = "";
                },
                getStatusRank: getStatusRank,
                localizeStatus: localizeStatus,
                transitionContract: apiClient.transitionContract.bind(apiClient),
                onTransitionCompleted: onTransitionCompleted,
                loadHistory: loadHistory
            });

            transitionApplyButton.addEventListener("click", events.onApplyClick);
            historyRefreshButton.addEventListener("click", events.onHistoryRefreshClick);
        }

        function init() {
            historyGridInstance = window.jQuery(historyGridElement)
                .dxDataGrid(historyGridModule.createGridConfig(localizeStatus))
                .dxDataGrid("instance");

            bindEventHandlers();
            updateControls();
        }

        return {
            init: init,
            loadHistory: loadHistory,
            updateControls: updateControls
        };
    }

    const exportsObject = {
        createController: createController
    };

    if (typeof window !== "undefined") {
        window.ContractsWorkflow = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
