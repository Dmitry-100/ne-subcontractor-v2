"use strict";

(function () {
    function isHtmlElement(value) {
        return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
    }

    function isHtmlSelectElement(value) {
        return typeof HTMLSelectElement !== "undefined" && value instanceof HTMLSelectElement;
    }

    function renderMappingGridDefault(mappingGrid, model) {
        if (!isHtmlElement(mappingGrid)) {
            return;
        }

        mappingGrid.innerHTML = "";

        (Array.isArray(model?.fields) ? model.fields : []).forEach(function (field) {
            const wrapper = document.createElement("label");
            wrapper.className = "imports-field";

            const caption = document.createElement("span");
            caption.textContent = field.required ? `${field.label} *` : field.label;
            wrapper.appendChild(caption);

            const select = document.createElement("select");
            select.className = "imports-mapping-select";
            select.setAttribute("data-mapping-field", field.key);

            const emptyOption = document.createElement("option");
            emptyOption.value = "";
            emptyOption.textContent = field.emptyOptionLabel;
            select.appendChild(emptyOption);

            (Array.isArray(field.options) ? field.options : []).forEach(function (optionSource) {
                const option = document.createElement("option");
                option.value = optionSource.value;
                option.textContent = optionSource.label;
                select.appendChild(option);
            });

            if (field.selected) {
                select.value = field.selected;
            }

            wrapper.appendChild(select);
            mappingGrid.appendChild(wrapper);
        });
    }

    function readMappingFromUiDefault(mappingGrid, fieldDefinitions) {
        if (!isHtmlElement(mappingGrid)) {
            return {};
        }

        const mapping = {};
        const fields = Array.isArray(fieldDefinitions) ? fieldDefinitions : [];

        fields.forEach(function (field) {
            const selector = `[data-mapping-field="${field.key}"]`;
            const select = mappingGrid.querySelector(selector);
            if (!isHtmlSelectElement(select)) {
                mapping[field.key] = -1;
                return;
            }

            const value = Number.parseInt(select.value, 10);
            mapping[field.key] = Number.isInteger(value) ? value : -1;
        });

        return mapping;
    }

    function renderPreviewDefault(previewTable, previewWrap, model) {
        if (!isHtmlElement(previewTable) || !isHtmlElement(previewWrap)) {
            return;
        }

        const head = previewTable.querySelector("thead");
        const body = previewTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const headerRow = document.createElement("tr");
        (Array.isArray(model?.headers) ? model.headers : []).forEach(function (header) {
            const cell = document.createElement("th");
            cell.textContent = header;
            headerRow.appendChild(cell);
        });
        head.appendChild(headerRow);

        (Array.isArray(model?.rows) ? model.rows : []).forEach(function (row) {
            const tr = document.createElement("tr");
            if (row.rowClassName) {
                tr.className = row.rowClassName;
            }

            (Array.isArray(row.cells) ? row.cells : []).forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });

            body.appendChild(tr);
        });

        previewWrap.hidden = false;
    }

    const exportsObject = {
        isHtmlElement: isHtmlElement,
        renderMappingGridDefault: renderMappingGridDefault,
        readMappingFromUiDefault: readMappingFromUiDefault,
        renderPreviewDefault: renderPreviewDefault
    };

    if (typeof window !== "undefined") {
        window.ImportsPageMappingUiViewDefaults = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
