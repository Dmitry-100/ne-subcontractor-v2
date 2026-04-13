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

    function renderEmptyTable(tableElement, colSpan, message) {
        const sections = clearTable(tableElement);
        if (!sections) {
            return;
        }

        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = colSpan;
        td.textContent = message;
        tr.appendChild(td);
        sections.body.appendChild(tr);
    }

    function renderGroupsTableDefault(tableElement, model) {
        const sourceModel = model || {};
        if (sourceModel.emptyMessage) {
            renderEmptyTable(tableElement, sourceModel.emptyColSpan || 8, sourceModel.emptyMessage);
            return;
        }

        const sections = clearTable(tableElement);
        if (!sections) {
            return;
        }

        const headerRow = document.createElement("tr");
        (Array.isArray(sourceModel.headers) ? sourceModel.headers : []).forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        sections.head.appendChild(headerRow);

        (Array.isArray(sourceModel.rows) ? sourceModel.rows : []).forEach(function (group) {
            const tr = document.createElement("tr");

            const selectCell = document.createElement("td");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = Boolean(group.checked);
            checkbox.setAttribute("data-lot-group-select", group.groupKey);
            selectCell.appendChild(checkbox);
            tr.appendChild(selectCell);

            (Array.isArray(group.cells) ? group.cells : []).forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });

            sections.body.appendChild(tr);
        });
    }

    function renderSelectedTableDefault(tableElement, model) {
        const sourceModel = model || {};
        if (sourceModel.emptyMessage) {
            renderEmptyTable(tableElement, sourceModel.emptyColSpan || 5, sourceModel.emptyMessage);
            return;
        }

        const sections = clearTable(tableElement);
        if (!sections) {
            return;
        }

        const headerRow = document.createElement("tr");
        (Array.isArray(sourceModel.headers) ? sourceModel.headers : []).forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        sections.head.appendChild(headerRow);

        (Array.isArray(sourceModel.rows) ? sourceModel.rows : []).forEach(function (entry) {
            const tr = document.createElement("tr");

            const groupCell = document.createElement("td");
            groupCell.textContent = entry.groupLabel;
            tr.appendChild(groupCell);

            const rowsCell = document.createElement("td");
            rowsCell.textContent = String(entry.rowsCount ?? "");
            tr.appendChild(rowsCell);

            const mhCell = document.createElement("td");
            mhCell.textContent = String(entry.totalManHours ?? "");
            tr.appendChild(mhCell);

            const codeCell = document.createElement("td");
            const codeInput = document.createElement("input");
            codeInput.type = "text";
            codeInput.maxLength = 64;
            codeInput.value = String(entry.lotCode || "");
            codeInput.setAttribute("data-lot-selected-code", entry.groupKey);
            codeCell.appendChild(codeInput);
            tr.appendChild(codeCell);

            const nameCell = document.createElement("td");
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.maxLength = 512;
            nameInput.value = String(entry.lotName || "");
            nameInput.setAttribute("data-lot-selected-name", entry.groupKey);
            nameCell.appendChild(nameInput);
            tr.appendChild(nameCell);

            sections.body.appendChild(tr);
        });
    }

    const exportsObject = {
        isHtmlElement: isHtmlElement,
        clearTable: clearTable,
        renderEmptyTable: renderEmptyTable,
        renderGroupsTableDefault: renderGroupsTableDefault,
        renderSelectedTableDefault: renderSelectedTableDefault
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotTableRenderers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
