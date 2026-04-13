"use strict";

(function () {
    function toErrorMessage(error) {
        if (error && typeof error.message === "string" && error.message.trim().length > 0) {
            return error.message;
        }

        return "Неизвестная ошибка.";
    }

    function renderXmlInboxTable(tableElement, model) {
        const sourceTable = tableElement;
        if (!(sourceTable instanceof HTMLElement)) {
            return;
        }

        const head = sourceTable.querySelector("thead");
        const body = sourceTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        const sourceModel = model || {};
        const headers = Array.isArray(sourceModel.headers) ? sourceModel.headers : [];
        const rows = Array.isArray(sourceModel.rows) ? sourceModel.rows : [];

        head.innerHTML = "";
        body.innerHTML = "";

        const headerRow = document.createElement("tr");
        headers.forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        head.appendChild(headerRow);

        if (sourceModel.emptyMessage) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = sourceModel.emptyColSpan || headers.length || 1;
            td.textContent = sourceModel.emptyMessage;
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        rows.forEach(function (item) {
            const tr = document.createElement("tr");
            const cells = Array.isArray(item.cells) ? item.cells : [];

            cells.forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });

            const actionsCell = document.createElement("td");
            if (item.viewBatchId) {
                const viewButton = document.createElement("button");
                viewButton.type = "button";
                viewButton.className = "imports-button imports-button--secondary";
                viewButton.textContent = "Открыть пакет";
                viewButton.setAttribute("data-xml-view-batch-id", item.viewBatchId);
                actionsCell.appendChild(viewButton);
            }

            if (item.retryId) {
                const retryButton = document.createElement("button");
                retryButton.type = "button";
                retryButton.className = "imports-button imports-button--secondary";
                retryButton.textContent = "Повторить";
                retryButton.setAttribute("data-xml-retry-id", item.retryId);
                actionsCell.appendChild(retryButton);
            }

            tr.appendChild(actionsCell);
            body.appendChild(tr);
        });
    }

    function createXmlInboxService(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const xmlInboxEndpoint = settings.xmlInboxEndpoint;
        const xmlHelpers = settings.xmlHelpers;
        const tableModels = settings.tableModels;
        const setXmlStatus = settings.setXmlStatus;
        const xmlTable = settings.xmlTable;
        const renderTableModel = typeof settings.renderTableModel === "function"
            ? settings.renderTableModel
            : function (model) {
                renderXmlInboxTable(xmlTable, model);
            };

        if (!apiClient ||
            typeof apiClient.getXmlInbox !== "function" ||
            typeof apiClient.queueXmlInboxItem !== "function" ||
            typeof apiClient.retryXmlInboxItem !== "function") {
            throw new Error("createXmlInboxService: apiClient with XML inbox methods is required.");
        }

        if (!xmlInboxEndpoint || typeof xmlInboxEndpoint !== "string") {
            throw new Error("createXmlInboxService: xmlInboxEndpoint is required.");
        }

        if (!xmlHelpers ||
            typeof xmlHelpers.normalizeRows !== "function" ||
            typeof xmlHelpers.buildQueueRequest !== "function" ||
            typeof xmlHelpers.buildLoadSuccessStatus !== "function" ||
            typeof xmlHelpers.buildQueueSuccessStatus !== "function" ||
            typeof xmlHelpers.buildRetrySuccessStatus !== "function") {
            throw new Error("createXmlInboxService: xmlHelpers are required.");
        }

        if (!tableModels || typeof tableModels.buildXmlInboxModel !== "function") {
            throw new Error("createXmlInboxService: tableModels are required.");
        }

        if (typeof setXmlStatus !== "function") {
            throw new Error("createXmlInboxService: setXmlStatus callback is required.");
        }

        if (typeof renderTableModel !== "function") {
            throw new Error("createXmlInboxService: renderTableModel callback is required.");
        }

        function renderRows(rows) {
            const model = tableModels.buildXmlInboxModel(rows);
            renderTableModel(model);
            return model;
        }

        async function loadXmlInbox() {
            try {
                setXmlStatus("Загрузка XML-очереди...", false);
                const payload = await apiClient.getXmlInbox(xmlInboxEndpoint);
                const rows = xmlHelpers.normalizeRows(payload);
                renderRows(rows);
                setXmlStatus(xmlHelpers.buildLoadSuccessStatus(rows.length), false);
                return rows;
            } catch (error) {
                setXmlStatus(`Не удалось загрузить XML-очередь: ${toErrorMessage(error)}`, true);
                return [];
            }
        }

        async function queueXmlInboxItem(formValues) {
            const queueRequest = xmlHelpers.buildQueueRequest(formValues);
            const created = await apiClient.queueXmlInboxItem(xmlInboxEndpoint, queueRequest.payload);

            setXmlStatus(xmlHelpers.buildQueueSuccessStatus(created), false);
            await loadXmlInbox();

            return {
                created: created,
                normalizedFileName: queueRequest.normalizedFileName
            };
        }

        async function retryXmlInboxItem(itemId) {
            await apiClient.retryXmlInboxItem(xmlInboxEndpoint, itemId);
            setXmlStatus(xmlHelpers.buildRetrySuccessStatus(itemId), false);
            await loadXmlInbox();
        }

        return {
            renderRows: renderRows,
            loadXmlInbox: loadXmlInbox,
            queueXmlInboxItem: queueXmlInboxItem,
            retryXmlInboxItem: retryXmlInboxItem
        };
    }

    const exportsObject = {
        createXmlInboxService: createXmlInboxService,
        renderXmlInboxTable: renderXmlInboxTable
    };

    if (typeof window !== "undefined") {
        window.ImportsPageXmlInbox = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
