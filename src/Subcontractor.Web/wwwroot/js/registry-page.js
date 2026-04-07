"use strict";

(function () {
    const root = document.querySelector("[data-registry]");
    if (!root) {
        return;
    }

    const endpoint = root.getAttribute("data-api-endpoint");
    if (!endpoint) {
        return;
    }

    const searchInput = root.querySelector("[data-registry-search]");
    const refreshButton = root.querySelector("[data-registry-refresh]");
    const statusElement = root.querySelector("[data-registry-status]");
    const tableWrap = root.querySelector("[data-registry-table-wrap]");
    const table = root.querySelector("[data-registry-table]");
    const rawWrap = root.querySelector("[data-registry-raw-wrap]");
    const rawElement = root.querySelector("[data-registry-raw]");

    let lastPayload = [];
    let tableColumns = [];

    function isObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function normalizeArray(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }

        if (isObject(payload)) {
            return [payload];
        }

        return [];
    }

    function setStatus(message, isError) {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;
        statusElement.classList.toggle("registry-status--error", Boolean(isError));
    }

    function updateRaw(payload) {
        if (!rawWrap || !rawElement) {
            return;
        }

        rawElement.textContent = JSON.stringify(payload, null, 2);
        rawWrap.hidden = false;
    }

    function buildColumns(items) {
        if (!items.length) {
            return [];
        }

        const firstObject = items.find(isObject);
        if (!firstObject) {
            return [];
        }

        return Object.keys(firstObject).slice(0, 8);
    }

    function formatValue(value) {
        if (value === null || value === undefined) {
            return "—";
        }

        if (typeof value === "object") {
            return JSON.stringify(value);
        }

        const text = String(value);
        return text.length > 120 ? `${text.slice(0, 117)}...` : text;
    }

    function renderTable(items) {
        if (!table || !tableWrap) {
            return;
        }

        const thead = table.querySelector("thead");
        const tbody = table.querySelector("tbody");
        if (!thead || !tbody) {
            return;
        }

        tbody.innerHTML = "";
        thead.innerHTML = "";

        tableColumns = buildColumns(items);
        if (!tableColumns.length) {
            tableWrap.hidden = true;
            return;
        }

        const headerRow = document.createElement("tr");
        for (const column of tableColumns) {
            const th = document.createElement("th");
            th.textContent = column;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);

        for (const item of items) {
            const row = document.createElement("tr");
            for (const column of tableColumns) {
                const cell = document.createElement("td");
                cell.textContent = formatValue(isObject(item) ? item[column] : undefined);
                row.appendChild(cell);
            }
            tbody.appendChild(row);
        }

        tableWrap.hidden = items.length === 0;
    }

    function applyLocalFilter(query) {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            renderTable(lastPayload);
            setStatus(`Загружено записей: ${lastPayload.length}.`, false);
            return;
        }

        const filtered = lastPayload.filter((item) =>
            tableColumns.some((column) => {
                const value = isObject(item) ? item[column] : null;
                return formatValue(value).toLowerCase().includes(normalizedQuery);
            }));

        renderTable(filtered);
        setStatus(`Показано записей: ${filtered.length} из ${lastPayload.length}.`, false);
    }

    async function load() {
        setStatus("Загрузка...", false);

        try {
            const response = await fetch(endpoint, {
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
            const items = normalizeArray(payload);
            lastPayload = items;

            renderTable(items);
            updateRaw(payload);
            setStatus(`Загружено записей: ${items.length}.`, false);

            if (searchInput && searchInput.value.trim()) {
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

    if (refreshButton) {
        refreshButton.addEventListener("click", load);
    }

    if (searchInput) {
        searchInput.addEventListener("input", () => applyLocalFilter(searchInput.value));
    }

    load();
})();
