"use strict";

(function () {
    const tableRenderersRoot =
        typeof window !== "undefined" && window.ImportsPageBatchTableRenderers
            ? window.ImportsPageBatchTableRenderers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-batch-table-renderers.js")
                : null;

    if (!tableRenderersRoot ||
        typeof tableRenderersRoot.isHtmlElement !== "function" ||
        typeof tableRenderersRoot.createDefaultTableRenderer !== "function") {
        throw new Error("createBatchTablesService: imports-page-batch-table-renderers contract is required.");
    }

    function createBatchTablesService(options) {
        const settings = options || {};
        const tableModels = settings.tableModels;
        const batchesTable = settings.batchesTable || null;
        const invalidTable = settings.invalidTable || null;
        const invalidWrapElement = settings.invalidWrapElement || null;
        const historyTable = settings.historyTable || null;
        const historyWrapElement = settings.historyWrapElement || null;
        const renderTable = settings.renderTable || null;

        if (!tableModels ||
            typeof tableModels.buildBatchesModel !== "function" ||
            typeof tableModels.buildInvalidRowsModel !== "function" ||
            typeof tableModels.buildHistoryModel !== "function") {
            throw new Error("createBatchTablesService: tableModels are required.");
        }

        if (!renderTable &&
            !(tableRenderersRoot.isHtmlElement(batchesTable) &&
                tableRenderersRoot.isHtmlElement(invalidTable) &&
                tableRenderersRoot.isHtmlElement(historyTable))) {
            throw new Error("createBatchTablesService: table elements are required when custom renderTable is not provided.");
        }

        const tableRenderer = typeof renderTable === "function"
            ? renderTable
            : tableRenderersRoot.createDefaultTableRenderer({
                batchesTable: batchesTable,
                invalidTable: invalidTable,
                invalidWrapElement: invalidWrapElement,
                historyTable: historyTable,
                historyWrapElement: historyWrapElement
            });

        function renderBatchesTable(items) {
            const model = tableModels.buildBatchesModel(items);
            tableRenderer({
                variant: "batches",
                model: model
            });
            return model;
        }

        function renderInvalidRows(details) {
            const model = tableModels.buildInvalidRowsModel(details);
            tableRenderer({
                variant: "invalid",
                model: model
            });
            return model;
        }

        function renderHistoryTable(items) {
            const model = tableModels.buildHistoryModel(items);
            tableRenderer({
                variant: "history",
                model: model
            });
            return model;
        }

        return {
            renderBatchesTable: renderBatchesTable,
            renderInvalidRows: renderInvalidRows,
            renderHistoryTable: renderHistoryTable
        };
    }

    const exportsObject = {
        createBatchTablesService: createBatchTablesService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBatchTables = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
