"use strict";
(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`Registry runtime requires ${name}.`);
        }
    }
    function createRuntime(options) {
        const settings = options || {};
        const endpoint = settings.endpoint;
        const controls = settings.controls || {};
        const fetchImpl = settings.fetchImpl || (typeof fetch === "function" ? fetch : null);
        const helpers = settings.helpers;
        const documentRef = settings.document || (typeof document !== "undefined" ? document : null);
        if (!endpoint) {
            throw new Error("Registry runtime requires endpoint.");
        }
        requireFunction(fetchImpl, "fetch implementation");
        if (!helpers || typeof helpers !== "object") {
            throw new Error("Registry runtime requires helpers.");
        }
        requireFunction(helpers.isObject, "helpers.isObject");
        requireFunction(helpers.normalizeArray, "helpers.normalizeArray");
        requireFunction(helpers.buildColumns, "helpers.buildColumns");
        requireFunction(helpers.formatValue, "helpers.formatValue");
        requireFunction(helpers.filterItems, "helpers.filterItems");
        const statusElement = controls.statusElement;
        const searchInput = controls.searchInput;
        const refreshButton = controls.refreshButton;
        const tableWrap = controls.tableWrap;
        const table = controls.table;
        const rawWrap = controls.rawWrap;
        const rawElement = controls.rawElement;
        let lastPayload = [];
        let tableColumns = [];
        function setStatus(message, isError) {
            if (!statusElement) {
                return;
            }
            statusElement.textContent = message;
            if (statusElement.classList && typeof statusElement.classList.toggle === "function") {
                statusElement.classList.toggle("registry-status--error", Boolean(isError));
            }
        }
        function updateRaw(payload) {
            if (!rawWrap || !rawElement) {
                return;
            }
            rawElement.textContent = JSON.stringify(payload, null, 2);
            rawWrap.hidden = false;
        }
        function renderTable(items) {
            tableColumns = helpers.buildColumns(items);
            if (!table || !tableWrap) {
                return;
            }
            const thead = table.querySelector ? table.querySelector("thead") : null;
            const tbody = table.querySelector ? table.querySelector("tbody") : null;
            if (!thead || !tbody) {
                tableWrap.hidden = true;
                return;
            }
            tbody.innerHTML = "";
            thead.innerHTML = "";
            if (!tableColumns.length) {
                tableWrap.hidden = true;
                return;
            }
            if (!documentRef || typeof documentRef.createElement !== "function") {
                tableWrap.hidden = items.length === 0;
                return;
            }
            const headerRow = documentRef.createElement("tr");
            for (let columnIndex = 0; columnIndex < tableColumns.length; columnIndex += 1) {
                const column = tableColumns[columnIndex];
                const th = documentRef.createElement("th");
                th.textContent = column;
                headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);
            for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
                const item = items[itemIndex];
                const row = documentRef.createElement("tr");
                for (let columnIndex = 0; columnIndex < tableColumns.length; columnIndex += 1) {
                    const column = tableColumns[columnIndex];
                    const cell = documentRef.createElement("td");
                    cell.textContent = helpers.formatValue(helpers.isObject(item) ? item[column] : undefined);
                    row.appendChild(cell);
                }
                tbody.appendChild(row);
            }
            tableWrap.hidden = items.length === 0;
        }
        function applyLocalFilter(query) {
            const normalizedQuery = String(query ?? "");
            if (!normalizedQuery.trim()) {
                renderTable(lastPayload);
                setStatus(`Загружено записей: ${lastPayload.length}.`, false);
                return lastPayload.slice();
            }
            const filtered = helpers.filterItems(lastPayload, tableColumns, normalizedQuery);
            renderTable(filtered);
            setStatus(`Показано записей: ${filtered.length} из ${lastPayload.length}.`, false);
            return filtered;
        }
        async function load() {
            setStatus("Загрузка...", false);
            try {
                const response = await fetchImpl(endpoint, {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    }
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    renderTable([]);
                    setStatus(`Ошибка запроса (${response.status}).`, true);
                    updateRaw({
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });
                    return;
                }
                const payload = await response.json();
                const items = helpers.normalizeArray(payload);
                lastPayload = items;
                renderTable(items);
                updateRaw(payload);
                setStatus(`Загружено записей: ${items.length}.`, false);
                if (searchInput && typeof searchInput.value === "string" && searchInput.value.trim()) {
                    applyLocalFilter(searchInput.value);
                }
            } catch (error) {
                renderTable([]);
                setStatus("Не удалось загрузить данные из API.", true);
                updateRaw({
                    error: String(error)
                });
            }
        }
        function bind() {
            if (refreshButton && typeof refreshButton.addEventListener === "function") {
                refreshButton.addEventListener("click", load);
            }
            if (searchInput && typeof searchInput.addEventListener === "function") {
                searchInput.addEventListener("input", function () {
                    applyLocalFilter(searchInput.value);
                });
            }
        }
        return {
            bind: bind,
            load: load,
            applyLocalFilter: applyLocalFilter,
            getState: function () {
                return {
                    lastPayload: lastPayload.slice(),
                    tableColumns: tableColumns.slice()
                };
            }
        };
    }
    const exportsObject = {
        createRuntime: createRuntime
    };
    if (typeof window !== "undefined") {
        window.RegistryPageRuntime = exportsObject;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
