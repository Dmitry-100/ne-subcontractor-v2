"use strict";

(function () {
    function isHtmlElement(value) {
        return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
    }

    function clearTable(tableElement) {
        const table = tableElement;
        if (!isHtmlElement(table)) {
            return null;
        }

        const head = table.querySelector("thead");
        const body = table.querySelector("tbody");
        if (!head || !body) {
            return null;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        return {
            head: head,
            body: body
        };
    }

    function renderHeaderRow(head, headers) {
        const row = document.createElement("tr");
        (Array.isArray(headers) ? headers : []).forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            row.appendChild(th);
        });
        head.appendChild(row);
    }

    function renderBatchesTableDefault(tableElement, model) {
        const sections = clearTable(tableElement);
        if (!sections) {
            return;
        }

        const sourceModel = model || {};
        renderHeaderRow(sections.head, sourceModel.headers);

        if (sourceModel.emptyMessage) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            const headersLength = Array.isArray(sourceModel.headers) ? sourceModel.headers.length : 0;
            td.colSpan = sourceModel.emptyColSpan || headersLength || 1;
            td.textContent = sourceModel.emptyMessage;
            tr.appendChild(td);
            sections.body.appendChild(tr);
            return;
        }

        (Array.isArray(sourceModel.rows) ? sourceModel.rows : []).forEach(function (item) {
            const tr = document.createElement("tr");
            (Array.isArray(item.cells) ? item.cells : []).forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });

            const actionsCell = document.createElement("td");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "imports-button imports-button--secondary";
            button.textContent = "Открыть";
            button.setAttribute("data-batch-id", item.batchId);
            actionsCell.appendChild(button);
            tr.appendChild(actionsCell);
            sections.body.appendChild(tr);
        });
    }

    function setWrapVisibility(wrapElement, visible) {
        if (isHtmlElement(wrapElement)) {
            wrapElement.hidden = !visible;
        }
    }

    function appendRows(body, rows) {
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            const tr = document.createElement("tr");
            (Array.isArray(row.cells) ? row.cells : []).forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    function renderRowsTableDefault(tableElement, wrapElement, model) {
        const sections = clearTable(tableElement);
        if (!sections) {
            return;
        }

        const sourceModel = model || {};
        if (!sourceModel.visible) {
            setWrapVisibility(wrapElement, false);
            return;
        }

        setWrapVisibility(wrapElement, true);
        renderHeaderRow(sections.head, sourceModel.headers);
        appendRows(sections.body, sourceModel.rows);
    }

    function createDefaultTableRenderer(options) {
        const settings = options || {};
        const batchesTable = settings.batchesTable || null;
        const invalidTable = settings.invalidTable || null;
        const invalidWrapElement = settings.invalidWrapElement || null;
        const historyTable = settings.historyTable || null;
        const historyWrapElement = settings.historyWrapElement || null;

        return function (context) {
            const source = context || {};
            if (source.variant === "batches") {
                renderBatchesTableDefault(batchesTable, source.model);
                return;
            }

            if (source.variant === "invalid") {
                renderRowsTableDefault(invalidTable, invalidWrapElement, source.model);
                return;
            }

            if (source.variant === "history") {
                renderRowsTableDefault(historyTable, historyWrapElement, source.model);
            }
        };
    }

    const exportsObject = {
        createDefaultTableRenderer: createDefaultTableRenderer,
        isHtmlElement: isHtmlElement
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBatchTableRenderers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
