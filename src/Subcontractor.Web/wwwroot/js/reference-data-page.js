"use strict";

(function () {
    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[^0-9a-zа-яё]+/gi, "");
    }

    function readCell(row, index) {
        return String(Array.isArray(row) ? row[index] ?? "" : "").trim();
    }

    function setStatus(element, message, isError) {
        if (!element) {
            return;
        }

        element.textContent = message;
        element.classList.toggle("imports-status--error", Boolean(isError));
    }

    function findSheetName(workbook, variants) {
        const names = Array.isArray(workbook?.SheetNames) ? workbook.SheetNames : [];
        const normalizedVariants = variants.map(normalizeText);
        return names.find(function (name) {
            const normalizedName = normalizeText(name);
            return normalizedVariants.some(function (variant) {
                return normalizedName === variant || normalizedName.includes(variant);
            });
        }) || null;
    }

    async function requestJson(url, options) {
        const response = await fetch(url, {
            credentials: "include",
            ...options,
            headers: {
                Accept: "application/json",
                ...(options?.headers || {})
            }
        });
        const bodyText = await response.text();
        if (!response.ok) {
            try {
                const problem = JSON.parse(bodyText);
                throw new Error(problem.detail || problem.title || `Ошибка запроса (${response.status}).`);
            } catch (error) {
                if (error instanceof SyntaxError) {
                    throw new Error(bodyText || `Ошибка запроса (${response.status}).`);
                }

                throw error;
            }
        }

        return bodyText ? JSON.parse(bodyText) : null;
    }

    async function parseWorkbook(file) {
        if (!file) {
            throw new Error("Сначала выберите Excel-файл справочника.");
        }

        if (!window.XLSX?.read || !window.XLSX?.utils?.sheet_to_json) {
            throw new Error("Парсер XLSX не загружен.");
        }

        const bytes = await file.arrayBuffer();
        return window.XLSX.read(bytes, { type: "array", raw: false });
    }

    function extractMappings(workbook) {
        const sheetName = findSheetName(workbook, ["выбр дисциплины", "выбор дисциплины", "дисциплины суб"]);
        if (!sheetName) {
            throw new Error("В книге не найден лист «выбр дисциплины».");
        }

        const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
            blankrows: false,
            raw: false,
            defval: ""
        });

        return rows
            .slice(1)
            .map(function (row) {
                return {
                    projectDisciplineGroup: readCell(row, 0),
                    projectDisciplineSection: readCell(row, 1),
                    projectDisciplineName: readCell(row, 2) || readCell(row, 0),
                    resourceDisciplineName: readCell(row, 3)
                };
            })
            .filter(function (item) {
                return item.projectDisciplineName && item.resourceDisciplineName;
            });
    }

    function matchesSearch(item, searchText) {
        if (!searchText) {
            return true;
        }

        return [
            item.projectDisciplineGroup,
            item.projectDisciplineSection,
            item.projectDisciplineName,
            item.resourceDisciplineName
        ].some(function (value) {
            return normalizeText(value).includes(searchText);
        });
    }

    function renderTable(table, rows, search) {
        const head = table?.querySelector("thead");
        const body = table?.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        const normalizedSearch = normalizeText(search);
        const filtered = rows.filter(function (item) {
            return matchesSearch(item, normalizedSearch);
        });

        head.innerHTML = "";
        body.innerHTML = "";

        const header = document.createElement("tr");
        ["Группа", "Раздел", "Проектная дисциплина", "Дисциплина-ресурс"].forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            header.appendChild(th);
        });
        head.appendChild(header);

        if (filtered.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 4;
            td.textContent = "Строки справочника не найдены.";
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        filtered.forEach(function (item) {
            const tr = document.createElement("tr");
            [
                item.projectDisciplineGroup,
                item.projectDisciplineSection,
                item.projectDisciplineName,
                item.resourceDisciplineName
            ].forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = value || "";
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    function initialize() {
        const root = document.querySelector("[data-reference-data-module]");
        if (!root) {
            return;
        }

        const endpoint = root.dataset.disciplineMappingsApiEndpoint;
        const controls = {
            file: root.querySelector("[data-reference-data-file]"),
            parse: root.querySelector("[data-reference-data-parse]"),
            save: root.querySelector("[data-reference-data-save]"),
            refresh: root.querySelector("[data-reference-data-refresh]"),
            search: root.querySelector("[data-reference-data-search]"),
            status: root.querySelector("[data-reference-data-status]"),
            table: root.querySelector("[data-reference-data-table]")
        };

        let rows = [];
        let parsedRows = [];

        async function loadCurrent() {
            try {
                setStatus(controls.status, "Загрузка справочника дисциплин...", false);
                rows = await requestJson(endpoint, { method: "GET" }) || [];
                parsedRows = [];
                controls.save.disabled = true;
                renderTable(controls.table, rows, controls.search?.value);
                setStatus(controls.status, `Справочник загружен: ${rows.length} строк.`, false);
            } catch (error) {
                setStatus(controls.status, `Не удалось загрузить справочник: ${error.message}`, true);
            }
        }

        async function parseFile() {
            try {
                setStatus(controls.status, "Разбор листа «выбр дисциплины»...", false);
                const workbook = await parseWorkbook(controls.file?.files?.[0]);
                parsedRows = extractMappings(workbook);
                if (parsedRows.length === 0) {
                    throw new Error("В листе «выбр дисциплины» нет строк для загрузки.");
                }

                rows = parsedRows;
                controls.save.disabled = false;
                renderTable(controls.table, rows, controls.search?.value);
                setStatus(controls.status, `Предпросмотр справочника: ${rows.length} строк. Нажмите «Сохранить справочник».`, false);
            } catch (error) {
                setStatus(controls.status, `Не удалось разобрать файл: ${error.message}`, true);
            }
        }

        async function saveParsed() {
            try {
                if (parsedRows.length === 0) {
                    throw new Error("Нет разобранных строк для сохранения.");
                }

                setStatus(controls.status, "Сохранение справочника дисциплин...", false);
                const result = await requestJson(endpoint, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items: parsedRows })
                });
                controls.save.disabled = true;
                await loadCurrent();
                setStatus(
                    controls.status,
                    `Справочник сохранён: ${result.totalItems} строк, новых ${result.createdItems}, обновлено ${result.updatedItems}.`,
                    false);
            } catch (error) {
                setStatus(controls.status, `Не удалось сохранить справочник: ${error.message}`, true);
            }
        }

        controls.parse?.addEventListener("click", parseFile);
        controls.save?.addEventListener("click", saveParsed);
        controls.refresh?.addEventListener("click", loadCurrent);
        controls.search?.addEventListener("input", function () {
            renderTable(controls.table, rows, controls.search.value);
        });

        loadCurrent();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
