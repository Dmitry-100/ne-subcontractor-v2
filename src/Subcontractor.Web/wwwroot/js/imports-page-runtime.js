"use strict";

(function () {
    function createRuntimeService(options) {
        const settings = options || {};
        const apiClient = settings.apiClient || null;
        const endpoint = settings.endpoint || "";
        const renderHistoryTable = settings.renderHistoryTable;
        const resetWizard = settings.resetWizard;
        const setXmlStatus = settings.setXmlStatus;
        const setBatchesStatus = settings.setBatchesStatus;
        const loadXmlInbox = settings.loadXmlInbox;
        const loadBatches = settings.loadBatches;

        if (!apiClient || typeof apiClient.getBatchHistory !== "function") {
            throw new Error("createRuntimeService: apiClient.getBatchHistory is required.");
        }

        if (!endpoint) {
            throw new Error("createRuntimeService: endpoint is required.");
        }

        if (typeof renderHistoryTable !== "function" ||
            typeof resetWizard !== "function" ||
            typeof setXmlStatus !== "function" ||
            typeof setBatchesStatus !== "function" ||
            typeof loadXmlInbox !== "function" ||
            typeof loadBatches !== "function") {
            throw new Error("createRuntimeService: required callbacks are missing.");
        }

        async function loadBatchHistory(batchId) {
            const history = await apiClient.getBatchHistory(endpoint, batchId);
            renderHistoryTable(history);
            return history;
        }

        async function initialize() {
            resetWizard();
            setXmlStatus("Операции с XML ещё не выполнялись.", false);

            try {
                await loadXmlInbox();
            } catch (error) {
                setXmlStatus(`Не удалось инициализировать XML-очередь: ${error.message}`, true);
            }

            try {
                await loadBatches();
            } catch (error) {
                setBatchesStatus(`Не удалось инициализировать модуль импорта: ${error.message}`, true);
            }
        }

        return {
            loadBatchHistory: loadBatchHistory,
            initialize: initialize
        };
    }

    const exportsObject = {
        createRuntimeService: createRuntimeService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
