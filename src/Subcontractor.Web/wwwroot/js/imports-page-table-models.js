"use strict";

(function () {
    const buildersRoot =
        typeof window !== "undefined" && window.ImportsPageTableModelsBuilders
            ? window.ImportsPageTableModelsBuilders
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-table-models-builders.js")
                : null;

    if (!buildersRoot ||
        typeof buildersRoot.buildPreviewModel !== "function" ||
        typeof buildersRoot.buildBatchesModel !== "function" ||
        typeof buildersRoot.buildInvalidRowsModel !== "function" ||
        typeof buildersRoot.buildHistoryModel !== "function" ||
        typeof buildersRoot.buildXmlInboxModel !== "function") {
        throw new Error("ImportsPageTableModels requires ImportsPageTableModelsBuilders helpers.");
    }

    function createTableModels(args) {
        const options = args || {};
        if (typeof options.localizeImportStatus !== "function") {
            throw new Error("В ImportsPageTableModels отсутствуют обязательные зависимости.");
        }

        const localizeImportStatus = options.localizeImportStatus;

        function buildPreviewModel(rows, previewRowLimit) {
            return buildersRoot.buildPreviewModel(rows, previewRowLimit);
        }

        function buildBatchesModel(items) {
            return buildersRoot.buildBatchesModel(items, localizeImportStatus);
        }

        function buildInvalidRowsModel(details) {
            return buildersRoot.buildInvalidRowsModel(details);
        }

        function buildHistoryModel(items) {
            return buildersRoot.buildHistoryModel(items, localizeImportStatus);
        }

        function buildXmlInboxModel(items) {
            return buildersRoot.buildXmlInboxModel(items, localizeImportStatus);
        }

        return {
            buildPreviewModel: buildPreviewModel,
            buildBatchesModel: buildBatchesModel,
            buildInvalidRowsModel: buildInvalidRowsModel,
            buildHistoryModel: buildHistoryModel,
            buildXmlInboxModel: buildXmlInboxModel
        };
    }

    const exportsObject = {
        createTableModels: createTableModels
    };

    if (typeof window !== "undefined") {
        window.ImportsPageTableModels = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
