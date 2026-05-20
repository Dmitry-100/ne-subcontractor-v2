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

    function findSheetName(workbook, variants) {
        const names = Array.isArray(workbook?.SheetNames) ? workbook.SheetNames : [];
        const normalizedVariants = variants.map(normalizeText);
        return names.find(function (name) {
            const normalizedName = normalizeText(name);
            return normalizedVariants.some(function (variant) {
                return normalizedName.includes(variant);
            });
        }) || null;
    }

    function setStatus(element, message, isError) {
        if (!element) {
            return;
        }

        element.textContent = message;
        element.classList.toggle("imports-status--error", Boolean(isError));
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
                const body = JSON.parse(bodyText);
                throw new Error(body.detail || body.title || body.error || `Ошибка запроса (${response.status}).`);
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
            throw new Error("Сначала выберите Excel-файл.");
        }

        if (!window.XLSX?.read || !window.XLSX?.utils?.sheet_to_json) {
            throw new Error("Парсер XLSX не загружен.");
        }

        const bytes = await file.arrayBuffer();
        return window.XLSX.read(bytes, { type: "array", raw: false });
    }

    function extractDisciplineMappings(workbook) {
        const sheetName = findSheetName(workbook, ["выбор дисциплины", "выбр дисциплины", "дисциплины суб"]);
        if (!sheetName) {
            throw new Error("В книге не найден лист справочника дисциплин.");
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

    function clearTable(table) {
        const head = table?.querySelector("thead");
        const body = table?.querySelector("tbody");
        if (!head || !body) {
            return null;
        }

        head.innerHTML = "";
        body.innerHTML = "";
        return { head, body };
    }

    function appendHeader(head, labels) {
        const tr = document.createElement("tr");
        labels.forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            tr.appendChild(th);
        });
        head.appendChild(tr);
    }

    function formatDate(value) {
        if (!value) {
            return "";
        }

        return new Date(value).toLocaleDateString("ru-RU");
    }

    function createCell(value) {
        const td = document.createElement("td");
        td.textContent = String(value ?? "");
        return td;
    }

    function createSelectionCell(rowId) {
        const td = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.setAttribute("data-imports-procurement-row", rowId);
        td.appendChild(checkbox);
        return td;
    }

    function createSourceProcurementModule() {
        const root = document.querySelector("[data-imports-module]");
        if (!root) {
            return null;
        }

        const controls = {
            sourceFileInput: root.querySelector("[data-imports-file]"),
            disciplineUploadButton: root.querySelector("[data-imports-discipline-upload]"),
            disciplineStatus: root.querySelector("[data-imports-discipline-status]"),
            requestSection: root.querySelector("[data-imports-procurement-request]"),
            rowsTable: root.querySelector("[data-imports-procurement-rows-table]"),
            selectAll: root.querySelector("[data-imports-procurement-select-all]"),
            titleInput: root.querySelector("[data-imports-procurement-title]"),
            fileInput: root.querySelector("[data-imports-procurement-file]"),
            createButton: root.querySelector("[data-imports-procurement-create]"),
            status: root.querySelector("[data-imports-procurement-status]"),
            disciplineResolutionSection: root.querySelector("[data-imports-discipline-resolution]"),
            disciplineResolutionTable: root.querySelector("[data-imports-discipline-resolution-table]"),
            disciplineResolutionApply: root.querySelector("[data-imports-discipline-resolution-apply]"),
            disciplineResolutionStatus: root.querySelector("[data-imports-discipline-resolution-status]")
        };

        const endpoints = {
            batches: root.dataset.batchesApiEndpoint,
            disciplineMappings: root.dataset.disciplineMappingsApiEndpoint,
            proceduresFromSourceData: root.dataset.proceduresFromSourceDataApiEndpoint,
            files: root.dataset.filesApiEndpoint
        };

        let currentRows = [];
        let currentBatchId = null;
        let disciplineMappings = null;

        async function loadDisciplineMappings() {
            if (disciplineMappings) {
                return disciplineMappings;
            }

            disciplineMappings = await requestJson(endpoints.disciplineMappings, { method: "GET" }) || [];
            return disciplineMappings;
        }

        async function uploadDisciplineMappings() {
            try {
                setStatus(controls.disciplineStatus, "Загрузка справочника дисциплин...", false);
                const workbook = await parseWorkbook(controls.sourceFileInput?.files?.[0]);
                const items = extractDisciplineMappings(workbook);
                if (items.length === 0) {
                    throw new Error("В листе справочника дисциплин нет строк для загрузки.");
                }

                const result = await requestJson(endpoints.disciplineMappings, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items })
                });
                setStatus(
                    controls.disciplineStatus,
                    `Справочник дисциплин загружен: ${result.totalItems} строк, новых ${result.createdItems}, обновлено ${result.updatedItems}.`,
                    false);
                disciplineMappings = null;
            } catch (error) {
                setStatus(controls.disciplineStatus, `Не удалось загрузить справочник дисциплин: ${error.message}`, true);
            }
        }

        function getAllowedDisciplines(resourceDisciplineName) {
            const resourceKey = normalizeText(resourceDisciplineName);
            const mappings = Array.isArray(disciplineMappings) ? disciplineMappings : [];
            return Array.from(new Set(mappings
                .filter(function (item) {
                    return normalizeText(item.resourceDisciplineName) === resourceKey;
                })
                .map(function (item) {
                    return String(item.projectDisciplineName || "").trim();
                })
                .filter(Boolean)))
                .sort(function (left, right) {
                    return left.localeCompare(right, "ru");
                });
        }

        function isDisciplineResolutionRow(row) {
            if (!row || row.isValid || !row.resourceDisciplineName) {
                return false;
            }

            const message = normalizeText(row.validationMessage);
            return message.includes("дисциплин") ||
                message.includes("соответствие") ||
                message.includes("вариант") ||
                message.includes("допустим");
        }

        function createResolutionSelect(row) {
            const select = document.createElement("select");
            select.className = "imports-mapping-select";
            select.setAttribute("data-imports-discipline-resolution-row", row.id);

            const allowed = getAllowedDisciplines(row.resourceDisciplineName);
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = allowed.length > 0
                ? "Выберите проектную дисциплину..."
                : "Нет вариантов: загрузите справочник";
            select.appendChild(placeholder);

            allowed.forEach(function (projectDisciplineName) {
                const option = document.createElement("option");
                option.value = projectDisciplineName;
                option.textContent = projectDisciplineName;
                if (normalizeText(projectDisciplineName) === normalizeText(row.disciplineCode)) {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            select.disabled = allowed.length === 0;
            return select;
        }

        async function renderDisciplineResolution(details) {
            if (!controls.disciplineResolutionSection || !controls.disciplineResolutionTable) {
                return;
            }

            currentBatchId = details?.id || null;
            await loadDisciplineMappings();

            const rows = (Array.isArray(details?.rows) ? details.rows : [])
                .filter(isDisciplineResolutionRow);
            controls.disciplineResolutionSection.hidden = rows.length === 0;
            if (controls.disciplineResolutionApply) {
                controls.disciplineResolutionApply.disabled = rows.length === 0;
            }

            const sections = clearTable(controls.disciplineResolutionTable);
            if (!sections) {
                return;
            }

            appendHeader(sections.head, [
                "Строка",
                "Проект",
                "Объект",
                "Дисциплина-ресурс",
                "Сообщение",
                "Проектная дисциплина"
            ]);

            if (rows.length === 0) {
                setStatus(controls.disciplineResolutionStatus, "Для выбранного пакета ручное сопоставление дисциплин не требуется.", false);
                return;
            }

            rows.forEach(function (row) {
                const tr = document.createElement("tr");
                tr.appendChild(createCell(row.rowNumber));
                tr.appendChild(createCell(`${row.projectCode}${row.projectName ? " / " + row.projectName : ""}`));
                tr.appendChild(createCell(row.objectWbs));
                tr.appendChild(createCell(row.resourceDisciplineName));
                tr.appendChild(createCell(row.validationMessage || ""));

                const selectCell = document.createElement("td");
                selectCell.appendChild(createResolutionSelect(row));
                tr.appendChild(selectCell);
                sections.body.appendChild(tr);
            });

            setStatus(controls.disciplineResolutionStatus, `Нужно сопоставить строк: ${rows.length}.`, false);
        }

        function renderBatchDetails(details) {
            if (!controls.requestSection || !controls.rowsTable) {
                return;
            }

            currentBatchId = details?.id || null;
            currentRows = (Array.isArray(details?.rows) ? details.rows : [])
                .filter(function (row) {
                    return row.isValid;
                });
            renderDisciplineResolution(details).catch(function (error) {
                setStatus(
                    controls.disciplineResolutionStatus,
                    `Не удалось подготовить сопоставление дисциплин: ${error.message}`,
                    true);
            });
            controls.requestSection.hidden = false;

            const sections = clearTable(controls.rowsTable);
            if (!sections) {
                return;
            }

            appendHeader(sections.head, [
                "",
                "Строка",
                "Проект",
                "Объект",
                "Проектная дисциплина",
                "Дисциплина-ресурс",
                "Чел.-ч",
                "Период"
            ]);

            if (currentRows.length === 0) {
                const tr = document.createElement("tr");
                const td = createCell("В выбранном пакете нет валидных работ.");
                td.colSpan = 8;
                tr.appendChild(td);
                sections.body.appendChild(tr);
                controls.createButton.disabled = true;
                return;
            }

            currentRows.forEach(function (row) {
                const tr = document.createElement("tr");
                tr.appendChild(createSelectionCell(row.id));
                tr.appendChild(createCell(row.rowNumber));
                tr.appendChild(createCell(`${row.projectCode}${row.projectName ? " / " + row.projectName : ""}`));
                tr.appendChild(createCell(row.objectWbs));
                tr.appendChild(createCell(row.disciplineCode));
                tr.appendChild(createCell(row.resourceDisciplineName));
                tr.appendChild(createCell(row.manHours));
                tr.appendChild(createCell(`${formatDate(row.plannedStartDate)} - ${formatDate(row.plannedFinishDate)}`));
                sections.body.appendChild(tr);
            });

            controls.createButton.disabled = false;
            setStatus(controls.status, `Доступно валидных работ для заявки: ${currentRows.length}.`, false);
        }

        function getSelectedRowIds() {
            return Array.from(root.querySelectorAll("[data-imports-procurement-row]:checked"))
                .map(function (item) {
                    return item.getAttribute("data-imports-procurement-row");
                })
                .filter(Boolean);
        }

        async function uploadTechnicalAssignment(file) {
            const form = new FormData();
            form.append("file", file);
            return await requestJson(endpoints.files, {
                method: "POST",
                body: form
            });
        }

        async function createProcurementRequest() {
            try {
                const rowIds = getSelectedRowIds();
                if (rowIds.length === 0) {
                    throw new Error("Выберите хотя бы одну работу.");
                }

                const file = controls.fileInput?.files?.[0];
                if (!file) {
                    throw new Error("Прикрепите файл технического задания.");
                }

                setStatus(controls.status, "Загружаю ТЗ и создаю заявку...", false);
                const uploaded = await uploadTechnicalAssignment(file);
                const result = await requestJson(endpoints.proceduresFromSourceData, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sourceDataRowIds: rowIds,
                        technicalAssignmentFileId: uploaded.id,
                        requestTitle: controls.titleInput?.value || null,
                        purchaseTypeCode: "SUBCONTRACT"
                    })
                });

                setStatus(
                    controls.status,
                    `Заявка создана: процедура ${result.procedureId}, работ ${result.sourceRowsCount}, объём ${result.totalManHours} чел.-ч.`,
                    false);
                if (controls.status) {
                    const procedureLink = document.createElement("a");
                    procedureLink.href = `/procedures?search=${encodeURIComponent(result.procedureId)}`;
                    procedureLink.textContent = " Открыть процедуру";
                    const lotLink = document.createElement("a");
                    lotLink.href = `/lots?search=${encodeURIComponent(result.lotId)}`;
                    lotLink.textContent = " Открыть лот";
                    controls.status.appendChild(procedureLink);
                    controls.status.appendChild(lotLink);
                }
            } catch (error) {
                setStatus(controls.status, `Не удалось создать заявку: ${error.message}`, true);
            }
        }

        async function applyDisciplineResolutions() {
            try {
                if (!currentBatchId) {
                    throw new Error("Сначала выберите пакет импорта.");
                }

                const items = Array.from(root.querySelectorAll("[data-imports-discipline-resolution-row]"))
                    .map(function (select) {
                        return {
                            rowId: select.getAttribute("data-imports-discipline-resolution-row"),
                            projectDisciplineName: select.value
                        };
                    })
                    .filter(function (item) {
                        return item.rowId && item.projectDisciplineName;
                    });
                if (items.length === 0) {
                    throw new Error("Выберите проектную дисциплину хотя бы для одной строки.");
                }

                setStatus(controls.disciplineResolutionStatus, "Применяю сопоставление дисциплин...", false);
                const result = await requestJson(`${endpoints.batches}/${currentBatchId}/discipline-resolutions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items })
                });
                setStatus(
                    controls.disciplineResolutionStatus,
                    `Сопоставление применено. Валидных строк: ${result.validRows}, ошибок: ${result.invalidRows}.`,
                    false);
                renderBatchDetails(result);
            } catch (error) {
                setStatus(controls.disciplineResolutionStatus, `Не удалось применить сопоставление: ${error.message}`, true);
            }
        }

        controls.disciplineUploadButton?.addEventListener("click", uploadDisciplineMappings);
        controls.createButton?.addEventListener("click", createProcurementRequest);
        controls.disciplineResolutionApply?.addEventListener("click", applyDisciplineResolutions);
        controls.selectAll?.addEventListener("change", function () {
            const checked = Boolean(controls.selectAll.checked);
            root.querySelectorAll("[data-imports-procurement-row]").forEach(function (checkbox) {
                checkbox.checked = checked;
            });
        });

        return {
            renderBatchDetails: renderBatchDetails
        };
    }

    window.ImportsSourceProcurement = createSourceProcurementModule();
})();
