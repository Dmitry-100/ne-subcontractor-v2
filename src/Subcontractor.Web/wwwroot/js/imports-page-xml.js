"use strict";

(function () {
    function createXmlHelpers(options) {
        const settings = options || {};
        if (typeof settings.buildDefaultXmlFileName !== "function") {
            throw new Error("В ImportsPageXml отсутствуют обязательные зависимости.");
        }

        const buildDefaultXmlFileName = settings.buildDefaultXmlFileName;

        function normalizeRows(payload) {
            return Array.isArray(payload) ? payload : [];
        }

        function buildQueueRequest(formValues) {
            const form = formValues || {};
            const xmlContent = String(form.xmlContent || "").trim();
            if (!xmlContent) {
                throw new Error("XML-содержимое обязательно.");
            }

            const sourceSystem = String(form.sourceSystem || "").trim() || "ExpressPlanning";
            const externalDocumentId = String(form.externalDocumentId || "").trim() || null;
            const fileName = String(form.fileName || "").trim() || buildDefaultXmlFileName();

            return {
                payload: {
                    sourceSystem: sourceSystem,
                    externalDocumentId: externalDocumentId,
                    fileName: fileName,
                    xmlContent: xmlContent
                },
                normalizedFileName: fileName
            };
        }

        function buildLoadSuccessStatus(rowsCount) {
            const count = Number(rowsCount || 0);
            return `Загружено элементов XML: ${count}.`;
        }

        function buildQueueSuccessStatus(created) {
            const source = created || {};
            return `XML поставлен в очередь: ${source.id}. Статус: ${source.status}.`;
        }

        function buildRetrySuccessStatus(itemId) {
            return `XML ${itemId} перемещён в очередь повторной обработки.`;
        }

        return {
            normalizeRows: normalizeRows,
            buildQueueRequest: buildQueueRequest,
            buildLoadSuccessStatus: buildLoadSuccessStatus,
            buildQueueSuccessStatus: buildQueueSuccessStatus,
            buildRetrySuccessStatus: buildRetrySuccessStatus
        };
    }

    const exportsObject = {
        createXmlHelpers: createXmlHelpers
    };

    if (typeof window !== "undefined") {
        window.ImportsPageXml = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
