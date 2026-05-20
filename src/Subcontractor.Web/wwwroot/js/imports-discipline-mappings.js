"use strict";

(function () {
    const HEADERS = ["Группа", "Раздел", "Проектная дисциплина", "Дисциплина-ресурс"];

    function toArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function text(value) {
        return String(value ?? "").trim();
    }

    function createCell(hostDocument, tagName, value) {
        const cell = hostDocument.createElement(tagName);
        cell.textContent = text(value);
        return cell;
    }

    function appendRow(hostDocument, section, values, cellTagName) {
        const row = hostDocument.createElement("tr");
        values.forEach(function (value) {
            row.appendChild(createCell(hostDocument, cellTagName, value));
        });
        section.appendChild(row);
    }

    function renderDisciplineMappingsTable(options) {
        const settings = options || {};
        const hostDocument = settings.document || null;
        const tableElement = settings.tableElement || null;
        const mappings = toArray(settings.mappings);

        if (!hostDocument || typeof hostDocument.createElement !== "function") {
            throw new Error("renderDisciplineMappingsTable: document with createElement is required.");
        }

        if (!tableElement || typeof tableElement.replaceChildren !== "function") {
            throw new Error("renderDisciplineMappingsTable: tableElement with replaceChildren is required.");
        }

        const thead = hostDocument.createElement("thead");
        appendRow(hostDocument, thead, HEADERS, "th");

        const tbody = hostDocument.createElement("tbody");
        if (mappings.length === 0) {
            const emptyRow = hostDocument.createElement("tr");
            const emptyCell = createCell(hostDocument, "td", "Справочник дисциплин пока не загружен.");
            emptyCell.setAttribute("colspan", String(HEADERS.length));
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        } else {
            mappings.forEach(function (mapping) {
                appendRow(hostDocument, tbody, [
                    mapping.projectDisciplineGroup,
                    mapping.projectDisciplineSection,
                    mapping.projectDisciplineName,
                    mapping.resourceDisciplineName
                ], "td");
            });
        }

        tableElement.replaceChildren(thead, tbody);
    }

    function createDisciplineMappingsRegistry(options) {
        const settings = options || {};
        const hostDocument = settings.document || null;
        const endpoint = settings.endpoint || "";
        const tableElement = settings.tableElement || null;
        const statusElement = settings.statusElement || null;
        const refreshButton = settings.refreshButton || null;
        const fetchImpl = settings.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);

        if (!endpoint) {
            throw new Error("createDisciplineMappingsRegistry: endpoint is required.");
        }

        if (typeof fetchImpl !== "function") {
            throw new Error("createDisciplineMappingsRegistry: Fetch API is unavailable.");
        }

        function setStatus(message, isError) {
            if (!statusElement) {
                return;
            }

            statusElement.textContent = message;
            if (statusElement.classList && typeof statusElement.classList.toggle === "function") {
                statusElement.classList.toggle("imports-status--error", Boolean(isError));
            }
        }

        async function load() {
            try {
                if (refreshButton) {
                    refreshButton.disabled = true;
                }
                setStatus("Загрузка справочника дисциплин...", false);

                const response = await fetchImpl(endpoint, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(`Ошибка загрузки справочника (${response.status}).`);
                }

                const mappings = toArray(await response.json());
                renderDisciplineMappingsTable({
                    document: hostDocument,
                    tableElement: tableElement,
                    mappings: mappings
                });
                setStatus(`Загружено записей: ${mappings.length}.`, false);
                return mappings;
            } catch (error) {
                setStatus(`Не удалось загрузить справочник дисциплин: ${error.message}`, true);
                throw error;
            } finally {
                if (refreshButton) {
                    refreshButton.disabled = false;
                }
            }
        }

        if (refreshButton && typeof refreshButton.addEventListener === "function") {
            refreshButton.addEventListener("click", function () {
                load().catch(function () {});
            });
        }

        return {
            load: load
        };
    }

    function autoInitialize() {
        if (typeof document === "undefined") {
            return;
        }

        const moduleRoot = document.querySelector("[data-imports-module]");
        if (!moduleRoot) {
            return;
        }

        const tableElement = moduleRoot.querySelector("[data-imports-discipline-mappings-table]");
        const statusElement = moduleRoot.querySelector("[data-imports-discipline-mappings-status]");
        const refreshButton = moduleRoot.querySelector("[data-imports-discipline-mappings-refresh]");
        const endpoint =
            moduleRoot.getAttribute("data-discipline-mappings-api-endpoint") ||
            "/api/imports/discipline-mappings";

        if (!tableElement || !statusElement) {
            return;
        }

        createDisciplineMappingsRegistry({
            document: document,
            endpoint: endpoint,
            tableElement: tableElement,
            statusElement: statusElement,
            refreshButton: refreshButton
        }).load().catch(function () {});
    }

    const exportsObject = {
        renderDisciplineMappingsTable: renderDisciplineMappingsTable,
        createDisciplineMappingsRegistry: createDisciplineMappingsRegistry
    };

    if (typeof window !== "undefined") {
        window.ImportsDisciplineMappings = exportsObject;

        if (typeof document !== "undefined") {
            if (document.readyState === "loading" && typeof document.addEventListener === "function") {
                document.addEventListener("DOMContentLoaded", autoInitialize, { once: true });
            } else {
                autoInitialize();
            }
        }
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
