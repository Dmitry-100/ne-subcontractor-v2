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
            throw new Error(`Не удалось загрузить модуль contracts-execution-panel: ${globalName}.`);
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
        const executionModule = settings.executionModule;
        const apiClient = settings.apiClient;
        const getSelectedContract = settings.getSelectedContract;
        const localizeStatus = settings.localizeStatus;
        const buildMilestonesPayload = settings.buildMilestonesPayload;
        const gridModule = settings.gridModule
            || resolveModule("ContractsExecutionPanelGrid", "./contracts-execution-panel-grid.js", ["createGridConfig"]);
        const eventsModule = settings.eventsModule
            || resolveModule("ContractsExecutionPanelEvents", "./contracts-execution-panel-events.js", ["createEvents"]);

        const executionSelectedElement = elements.executionSelectedElement;
        const executionSummaryElement = elements.executionSummaryElement;
        const executionStatusElement = elements.executionStatusElement;
        const executionRefreshButton = elements.executionRefreshButton;
        const executionGridElement = elements.executionGridElement;

        let executionGridInstance = null;

        function setExecutionStatus(message, isError) {
            executionStatusElement.textContent = message;
            executionStatusElement.classList.toggle("contracts-execution-status--error", Boolean(isError));
        }

        function setExecutionSummary(summary) {
            const viewModel = executionModule.formatExecutionSummary(summary);
            executionSummaryElement.textContent = viewModel.text;
            executionSummaryElement.classList.toggle("contracts-execution-summary--warning", Boolean(viewModel.hasWarning));
        }

        function canEditMilestones(status) {
            return executionModule.canEditMilestones(status);
        }

        async function loadExecutionSummary(showStatusMessage) {
            await executionModule.loadExecutionSummary({
                selectedContract: getSelectedContract(),
                apiClient: apiClient,
                setExecutionSummary: setExecutionSummary,
                setExecutionStatus: setExecutionStatus,
                showStatusMessage: showStatusMessage
            });
        }

        async function loadMilestones(showStatusMessage) {
            await executionModule.loadMilestones({
                selectedContract: getSelectedContract(),
                executionGridInstance: executionGridInstance,
                apiClient: apiClient,
                setExecutionStatus: setExecutionStatus,
                showStatusMessage: showStatusMessage
            });
        }

        async function loadExecutionData(showStatusMessage) {
            await executionModule.loadExecutionData({
                selectedContract: getSelectedContract(),
                executionGridInstance: executionGridInstance,
                apiClient: apiClient,
                setExecutionSummary: setExecutionSummary,
                setExecutionStatus: setExecutionStatus,
                showStatusMessage: showStatusMessage
            });
        }

        async function persistMilestones(message) {
            await executionModule.persistMilestones({
                selectedContract: getSelectedContract(),
                executionGridInstance: executionGridInstance,
                apiClient: apiClient,
                buildMilestonesPayload: buildMilestonesPayload,
                canEditMilestones: canEditMilestones,
                reloadMilestones: loadMilestones,
                reloadExecutionSummary: loadExecutionSummary,
                setExecutionStatus: setExecutionStatus,
                message: message
            });
        }

        function updateControls() {
            const selectedContract = getSelectedContract();
            if (!selectedContract) {
                executionSelectedElement.textContent = "Выберите договор в таблице, чтобы управлять этапами.";
                executionRefreshButton.disabled = true;
                setExecutionSummary(null);
                setExecutionStatus("Выберите договор в статусе «Подписан» или «Действует» для редактирования этапов.", false);
                if (executionGridInstance) {
                    executionGridInstance.option("dataSource", []);
                    executionGridInstance.option("editing.allowAdding", false);
                    executionGridInstance.option("editing.allowUpdating", false);
                    executionGridInstance.option("editing.allowDeleting", false);
                }
                return;
            }

            const editable = canEditMilestones(selectedContract.status);
            executionSelectedElement.textContent =
                `Исполнение: ${selectedContract.contractNumber} (${localizeStatus(selectedContract.status)})`;
            executionRefreshButton.disabled = false;

            if (executionGridInstance) {
                executionGridInstance.option("editing.allowAdding", editable);
                executionGridInstance.option("editing.allowUpdating", editable);
                executionGridInstance.option("editing.allowDeleting", editable);
            }

            if (editable) {
                setExecutionStatus("Этапы можно редактировать для статусов «Подписан» и «Действует».", false);
            } else {
                setExecutionStatus("Для текущего статуса договора этапы доступны только для чтения.", false);
            }
        }

        function initGrid() {
            const gridConfig = gridModule.createGridConfig();
            const events = eventsModule.createEvents({
                persistMilestones: persistMilestones,
                setExecutionStatus: setExecutionStatus
            });

            Object.assign(gridConfig, events);

            executionGridInstance = window.jQuery(executionGridElement).dxDataGrid(gridConfig).dxDataGrid("instance");
        }

        function init() {
            initGrid();
            executionRefreshButton.addEventListener("click", function () {
                loadExecutionData(true);
            });
            updateControls();
        }

        return {
            init: init,
            updateControls: updateControls,
            loadExecutionData: loadExecutionData
        };
    }

    const exportsObject = {
        createController: createController
    };

    if (typeof window !== "undefined") {
        window.ContractsExecutionPanel = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
