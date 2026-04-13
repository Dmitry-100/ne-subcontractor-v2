"use strict";

(function () {
    function isEventTarget(value) {
        return Boolean(value) && typeof value.addEventListener === "function";
    }

    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function findClosestWithAttribute(target, selector, attributeName) {
        if (!isNodeLike(target) || typeof target.closest !== "function") {
            return null;
        }

        const node = target.closest(selector);
        if (!isNodeLike(node) || typeof node.getAttribute !== "function") {
            return null;
        }

        const attributeValue = node.getAttribute(attributeName);
        if (!attributeValue) {
            return null;
        }

        return {
            node: node,
            attributeValue: attributeValue
        };
    }

    function createInteractionsService(options) {
        const settings = options || {};
        const lotGroupsTable = settings.lotGroupsTable || null;
        const lotSelectedTable = settings.lotSelectedTable || null;
        const batchesTable = settings.batchesTable || null;
        const xmlTable = settings.xmlTable || null;

        const onSetGroupSelected = settings.onSetGroupSelected;
        const onSetGroupLotCode = settings.onSetGroupLotCode;
        const onSetGroupLotName = settings.onSetGroupLotName;
        const onOpenBatch = settings.onOpenBatch;
        const onRetryXml = settings.onRetryXml;
        const onRetryXmlError = settings.onRetryXmlError || function () {};

        if (!isEventTarget(lotGroupsTable)) {
            throw new Error("createInteractionsService: lotGroupsTable is required.");
        }

        if (!isEventTarget(lotSelectedTable)) {
            throw new Error("createInteractionsService: lotSelectedTable is required.");
        }

        if (!isEventTarget(batchesTable)) {
            throw new Error("createInteractionsService: batchesTable is required.");
        }

        if (!isEventTarget(xmlTable)) {
            throw new Error("createInteractionsService: xmlTable is required.");
        }

        if (typeof onSetGroupSelected !== "function") {
            throw new Error("createInteractionsService: onSetGroupSelected is required.");
        }

        if (typeof onSetGroupLotCode !== "function") {
            throw new Error("createInteractionsService: onSetGroupLotCode is required.");
        }

        if (typeof onSetGroupLotName !== "function") {
            throw new Error("createInteractionsService: onSetGroupLotName is required.");
        }

        if (typeof onOpenBatch !== "function") {
            throw new Error("createInteractionsService: onOpenBatch is required.");
        }

        if (typeof onRetryXml !== "function") {
            throw new Error("createInteractionsService: onRetryXml is required.");
        }

        function bindLotInteractions() {
            lotGroupsTable.addEventListener("change", function (event) {
                const resolved = findClosestWithAttribute(
                    event && event.target,
                    "[data-lot-group-select]",
                    "data-lot-group-select");

                if (!resolved) {
                    return;
                }

                const checked = Boolean(resolved.node.checked);
                onSetGroupSelected(resolved.attributeValue, checked);
            });

            lotSelectedTable.addEventListener("input", function (event) {
                const eventTarget = event && event.target;

                const codeResolved = findClosestWithAttribute(
                    eventTarget,
                    "[data-lot-selected-code]",
                    "data-lot-selected-code");
                if (codeResolved) {
                    onSetGroupLotCode(codeResolved.attributeValue, String(codeResolved.node.value || ""));
                    return;
                }

                const nameResolved = findClosestWithAttribute(
                    eventTarget,
                    "[data-lot-selected-name]",
                    "data-lot-selected-name");
                if (nameResolved) {
                    onSetGroupLotName(nameResolved.attributeValue, String(nameResolved.node.value || ""));
                }
            });
        }

        function bindBatchInteractions() {
            batchesTable.addEventListener("click", async function (event) {
                const resolved = findClosestWithAttribute(
                    event && event.target,
                    "[data-batch-id]",
                    "data-batch-id");

                if (!resolved) {
                    return;
                }

                await onOpenBatch(resolved.attributeValue);
            });
        }

        function bindXmlInteractions() {
            xmlTable.addEventListener("click", async function (event) {
                const eventTarget = event && event.target;

                const viewResolved = findClosestWithAttribute(
                    eventTarget,
                    "[data-xml-view-batch-id]",
                    "data-xml-view-batch-id");
                if (viewResolved) {
                    await onOpenBatch(viewResolved.attributeValue);
                    return;
                }

                const retryResolved = findClosestWithAttribute(
                    eventTarget,
                    "[data-xml-retry-id]",
                    "data-xml-retry-id");
                if (!retryResolved) {
                    return;
                }

                try {
                    await onRetryXml(retryResolved.attributeValue);
                } catch (error) {
                    onRetryXmlError(error);
                }
            });
        }

        function bindAll() {
            bindLotInteractions();
            bindBatchInteractions();
            bindXmlInteractions();
        }

        return {
            bindLotInteractions: bindLotInteractions,
            bindBatchInteractions: bindBatchInteractions,
            bindXmlInteractions: bindXmlInteractions,
            bindAll: bindAll
        };
    }

    const exportsObject = {
        createInteractionsService: createInteractionsService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageInteractions = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
