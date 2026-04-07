"use strict";

(function () {
    const moduleRoot = document.querySelector("[data-imports-module]");
    if (!moduleRoot) {
        return;
    }

    const endpoint = moduleRoot.getAttribute("data-batches-api-endpoint") || "/api/imports/source-data/batches";
    const queuedEndpoint = `${endpoint}/queued`;
    const xmlInboxEndpoint = moduleRoot.getAttribute("data-xml-inbox-api-endpoint") || "/api/imports/source-data/xml/inbox";
    const lotRecommendationsEndpoint =
        moduleRoot.getAttribute("data-lot-recommendations-api-endpoint") || "/api/lots/recommendations/import-batches";

    const fileInput = moduleRoot.querySelector("[data-imports-file]");
    const notesInput = moduleRoot.querySelector("[data-imports-notes]");
    const parseButton = moduleRoot.querySelector("[data-imports-parse]");
    const resetButton = moduleRoot.querySelector("[data-imports-reset]");
    const uploadButton = moduleRoot.querySelector("[data-imports-upload]");

    const uploadStatusElement = moduleRoot.querySelector("[data-imports-upload-status]");
    const mappingSection = moduleRoot.querySelector("[data-imports-mapping]");
    const hasHeaderCheckbox = moduleRoot.querySelector("[data-imports-has-header]");
    const mappingGrid = moduleRoot.querySelector("[data-imports-mapping-grid]");
    const applyMappingButton = moduleRoot.querySelector("[data-imports-apply-mapping]");
    const mappingStatusElement = moduleRoot.querySelector("[data-imports-mapping-status]");
    const parseSummaryElement = moduleRoot.querySelector("[data-imports-parse-summary]");
    const previewWrap = moduleRoot.querySelector("[data-imports-preview-wrap]");
    const previewTable = moduleRoot.querySelector("[data-imports-preview-table]");

    const refreshBatchesButton = moduleRoot.querySelector("[data-imports-refresh]");
    const batchesStatusElement = moduleRoot.querySelector("[data-imports-batches-status]");
    const batchesTable = moduleRoot.querySelector("[data-imports-batches-table]");

    const detailsElement = moduleRoot.querySelector("[data-imports-details]");
    const detailsTitleElement = moduleRoot.querySelector("[data-imports-details-title]");
    const detailsSummaryElement = moduleRoot.querySelector("[data-imports-details-summary]");
    const downloadInvalidReportButton = moduleRoot.querySelector("[data-imports-download-invalid-report]");
    const downloadFullReportButton = moduleRoot.querySelector("[data-imports-download-full-report]");
    const downloadLotReconciliationReportButton = moduleRoot.querySelector("[data-imports-download-lot-reconciliation-report]");
    const transitionTargetSelect = moduleRoot.querySelector("[data-imports-target-status]");
    const transitionReasonInput = moduleRoot.querySelector("[data-imports-transition-reason]");
    const transitionApplyButton = moduleRoot.querySelector("[data-imports-apply-transition]");
    const transitionStatusElement = moduleRoot.querySelector("[data-imports-transition-status]");
    const historyRefreshButton = moduleRoot.querySelector("[data-imports-history-refresh]");
    const invalidWrapElement = moduleRoot.querySelector("[data-imports-invalid-wrap]");
    const invalidTable = moduleRoot.querySelector("[data-imports-invalid-table]");
    const historyWrapElement = moduleRoot.querySelector("[data-imports-history-wrap]");
    const historyTable = moduleRoot.querySelector("[data-imports-history-table]");

    const xmlSourceInput = moduleRoot.querySelector("[data-imports-xml-source]");
    const xmlExternalIdInput = moduleRoot.querySelector("[data-imports-xml-external-id]");
    const xmlFileNameInput = moduleRoot.querySelector("[data-imports-xml-file-name]");
    const xmlContentInput = moduleRoot.querySelector("[data-imports-xml-content]");
    const xmlQueueButton = moduleRoot.querySelector("[data-imports-xml-queue]");
    const xmlRefreshButton = moduleRoot.querySelector("[data-imports-xml-refresh]");
    const xmlStatusElement = moduleRoot.querySelector("[data-imports-xml-status]");
    const xmlTable = moduleRoot.querySelector("[data-imports-xml-table]");
    const lotBuildButton = moduleRoot.querySelector("[data-imports-lot-build]");
    const lotApplyButton = moduleRoot.querySelector("[data-imports-lot-apply]");
    const lotStatusElement = moduleRoot.querySelector("[data-imports-lot-status]");
    const lotGroupsTable = moduleRoot.querySelector("[data-imports-lot-groups-table]");
    const lotSelectedTable = moduleRoot.querySelector("[data-imports-lot-selected-table]");

    if (!fileInput ||
        !notesInput ||
        !parseButton ||
        !resetButton ||
        !uploadButton ||
        !uploadStatusElement ||
        !mappingSection ||
        !hasHeaderCheckbox ||
        !mappingGrid ||
        !applyMappingButton ||
        !mappingStatusElement ||
        !parseSummaryElement ||
        !previewWrap ||
        !previewTable ||
        !refreshBatchesButton ||
        !batchesStatusElement ||
        !batchesTable ||
        !detailsElement ||
        !detailsTitleElement ||
        !detailsSummaryElement ||
        !downloadInvalidReportButton ||
        !downloadFullReportButton ||
        !downloadLotReconciliationReportButton ||
        !transitionTargetSelect ||
        !transitionReasonInput ||
        !transitionApplyButton ||
        !transitionStatusElement ||
        !historyRefreshButton ||
        !invalidWrapElement ||
        !invalidTable ||
        !historyWrapElement ||
        !historyTable ||
        !xmlSourceInput ||
        !xmlExternalIdInput ||
        !xmlFileNameInput ||
        !xmlContentInput ||
        !xmlQueueButton ||
        !xmlRefreshButton ||
        !xmlStatusElement ||
        !xmlTable ||
        !lotBuildButton ||
        !lotApplyButton ||
        !lotStatusElement ||
        !lotGroupsTable ||
        !lotSelectedTable) {
        return;
    }

    const PREVIEW_ROW_LIMIT = 200;
    const MAX_IMPORT_ROWS = 10000;
    const IMPORT_STATUS_TRANSITIONS = {
        Validated: ["ReadyForLotting", "Rejected"],
        ValidatedWithErrors: ["Rejected"],
        ReadyForLotting: ["Rejected"],
        Rejected: [],
        Uploaded: [],
        Processing: [],
        Failed: []
    };
    const IMPORT_STATUS_LABELS = {
        Uploaded: "Загружен",
        Processing: "Обрабатывается",
        Validated: "Проверен",
        ValidatedWithErrors: "Проверен с ошибками",
        ReadyForLotting: "Готов к лотированию",
        Rejected: "Отклонён",
        Failed: "Ошибка обработки"
    };

    const FIELD_DEFINITIONS = [
        {
            key: "rowNumber",
            label: "Номер строки",
            required: false,
            synonyms: ["rownumber", "row", "linenumber", "line"]
        },
        {
            key: "projectCode",
            label: "Код проекта",
            required: true,
            synonyms: ["projectcode", "project", "projectid"]
        },
        {
            key: "objectWbs",
            label: "Объект WBS",
            required: true,
            synonyms: ["objectwbs", "wbs", "object"]
        },
        {
            key: "disciplineCode",
            label: "Код дисциплины",
            required: true,
            synonyms: ["disciplinecode", "discipline", "disciplineid"]
        },
        {
            key: "manHours",
            label: "Трудозатраты (чел.-ч)",
            required: true,
            synonyms: ["manhours", "hours", "laborhours"]
        },
        {
            key: "plannedStartDate",
            label: "Плановая дата начала",
            required: false,
            synonyms: ["plannedstartdate", "startdate", "plannedstart", "start"]
        },
        {
            key: "plannedFinishDate",
            label: "Плановая дата окончания",
            required: false,
            synonyms: ["plannedfinishdate", "finishdate", "plannedfinish", "finish"]
        }
    ];

    let parsedRows = [];
    let sourceFileName = "";
    let rawRows = [];
    let sourceColumns = [];
    let dataStartRowIndex = 1;
    let mappingSelection = {};
    let selectedBatch = null;
    let detailsPollHandle = null;
    let lotRecommendations = null;
    let lotRecommendationsBatchId = null;
    let lotSelectionsByKey = new Map();

    function localizeImportStatus(status) {
        const key = String(status || "").trim();
        return IMPORT_STATUS_LABELS[key] || key;
    }

    function setUploadStatus(message, isError) {
        uploadStatusElement.textContent = message;
        uploadStatusElement.classList.toggle("imports-status--error", Boolean(isError));
    }

    function setBatchesStatus(message, isError) {
        batchesStatusElement.textContent = message;
        batchesStatusElement.classList.toggle("imports-status--error", Boolean(isError));
    }

    function setMappingStatus(message, isError) {
        mappingStatusElement.textContent = message;
        mappingStatusElement.classList.toggle("imports-status--error", Boolean(isError));
    }

    function setTransitionStatus(message, isError) {
        transitionStatusElement.textContent = message;
        transitionStatusElement.classList.toggle("imports-status--error", Boolean(isError));
    }

    function setXmlStatus(message, isError) {
        xmlStatusElement.textContent = message;
        xmlStatusElement.classList.toggle("imports-status--error", Boolean(isError));
    }

    function setLotStatus(message, isError) {
        lotStatusElement.textContent = message;
        lotStatusElement.classList.toggle("imports-status--error", Boolean(isError));
    }

    function clearDetailsPoll() {
        if (detailsPollHandle) {
            window.clearTimeout(detailsPollHandle);
            detailsPollHandle = null;
        }
    }

    function shouldAutoRefreshDetails(status) {
        return status === "Uploaded" || status === "Processing";
    }

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[\s_\-]+/g, "");
    }

    function isRowEmpty(values) {
        if (!Array.isArray(values)) {
            return true;
        }

        return values.every(function (value) {
            return String(value ?? "").trim().length === 0;
        });
    }

    function detectDelimiter(headerLine) {
        const candidates = [",", ";", "\t"];
        let selected = ",";
        let bestCount = -1;

        candidates.forEach(function (delimiter) {
            const count = String(headerLine ?? "").split(delimiter).length - 1;
            if (count > bestCount) {
                bestCount = count;
                selected = delimiter;
            }
        });

        return selected;
    }

    function parseCsvLine(line, delimiter) {
        const result = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];

            if (char === "\"") {
                if (inQuotes && line[i + 1] === "\"") {
                    current += "\"";
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === delimiter && !inQuotes) {
                result.push(current);
                current = "";
                continue;
            }

            current += char;
        }

        result.push(current);
        return result;
    }

    function parseDelimitedText(rawText) {
        const lines = String(rawText ?? "")
            .replace(/\uFEFF/g, "")
            .split(/\r?\n/);

        let headerIndex = 0;
        while (headerIndex < lines.length && lines[headerIndex].trim().length === 0) {
            headerIndex += 1;
        }

        if (headerIndex >= lines.length) {
            throw new Error("Файл пуст.");
        }

        const delimiter = detectDelimiter(lines[headerIndex]);
        const rows = [];
        for (let i = headerIndex; i < lines.length; i += 1) {
            const line = lines[i];
            if (!line || line.trim().length === 0) {
                continue;
            }

            rows.push(parseCsvLine(line, delimiter));
        }

        return rows;
    }

    async function parseWorkbookFile(file) {
        if (!(window.XLSX && window.XLSX.read && window.XLSX.utils && window.XLSX.utils.sheet_to_json)) {
            throw new Error("Парсер XLSX не загружен. Проверьте доступ к CDN SheetJS.");
        }

        const bytes = await file.arrayBuffer();
        const workbook = window.XLSX.read(bytes, { type: "array", raw: false });
        if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
            throw new Error("Книга не содержит листов.");
        }

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = window.XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: false,
            raw: false,
            defval: ""
        });

        return (Array.isArray(rows) ? rows : []).filter(function (row) {
            return !isRowEmpty(row);
        });
    }

    function parseNumber(rawValue) {
        const normalized = String(rawValue ?? "")
            .trim()
            .replace(/\s+/g, "")
            .replace(",", ".");

        if (!normalized) {
            return Number.NaN;
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    function formatDateIso(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function parseDate(rawValue) {
        const normalized = String(rawValue ?? "").trim();
        if (!normalized) {
            return { value: null, error: null };
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            return { value: normalized, error: null };
        }

        const dotted = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (dotted) {
            return { value: `${dotted[3]}-${dotted[2]}-${dotted[1]}`, error: null };
        }

        const parsed = new Date(normalized);
        if (Number.isNaN(parsed.getTime())) {
            return { value: null, error: "некорректный формат даты" };
        }

        return { value: formatDateIso(parsed), error: null };
    }

    function ensureUniqueColumnNames(values) {
        const nameUsage = new Map();
        return values.map(function (value, index) {
            const baseName = String(value ?? "").trim() || `Column ${index + 1}`;
            const normalized = normalizeText(baseName);
            const count = (nameUsage.get(normalized) || 0) + 1;
            nameUsage.set(normalized, count);
            return count === 1 ? baseName : `${baseName} (${count})`;
        });
    }

    function deriveColumns(rows, hasHeader) {
        const maxColumns = rows.reduce(function (max, row) {
            const count = Array.isArray(row) ? row.length : 0;
            return Math.max(max, count);
        }, 0);

        if (maxColumns === 0) {
            throw new Error("В исходном файле не обнаружены колонки.");
        }

        const defaultNames = Array.from({ length: maxColumns }, function (_, index) {
            return `Column ${index + 1}`;
        });

        if (!hasHeader) {
            return {
                columns: defaultNames,
                dataStartIndex: 0
            };
        }

        const headerRow = rows[0] || [];
        const resolved = Array.from({ length: maxColumns }, function (_, index) {
            return String(headerRow[index] ?? "").trim() || `Column ${index + 1}`;
        });

        return {
            columns: ensureUniqueColumnNames(resolved),
            dataStartIndex: 1
        };
    }

    function findColumnIndex(columns, synonyms) {
        const normalizedColumns = columns.map(normalizeText);

        for (let i = 0; i < synonyms.length; i += 1) {
            const synonym = normalizeText(synonyms[i]);
            const exact = normalizedColumns.indexOf(synonym);
            if (exact >= 0) {
                return exact;
            }
        }

        for (let i = 0; i < synonyms.length; i += 1) {
            const synonym = normalizeText(synonyms[i]);
            const contains = normalizedColumns.findIndex(function (value) {
                return value.includes(synonym);
            });
            if (contains >= 0) {
                return contains;
            }
        }

        return -1;
    }

    function buildAutoMapping(columns, hasHeader) {
        const mapping = {};
        FIELD_DEFINITIONS.forEach(function (field) {
            mapping[field.key] = findColumnIndex(columns, field.synonyms);
        });

        if (!hasHeader) {
            if (mapping.projectCode < 0 && columns.length >= 1) {
                mapping.projectCode = 0;
            }
            if (mapping.objectWbs < 0 && columns.length >= 2) {
                mapping.objectWbs = 1;
            }
            if (mapping.disciplineCode < 0 && columns.length >= 3) {
                mapping.disciplineCode = 2;
            }
            if (mapping.manHours < 0 && columns.length >= 4) {
                mapping.manHours = 3;
            }
            if (mapping.plannedStartDate < 0 && columns.length >= 5) {
                mapping.plannedStartDate = 4;
            }
            if (mapping.plannedFinishDate < 0 && columns.length >= 6) {
                mapping.plannedFinishDate = 5;
            }
        }

        return mapping;
    }

    function renderMappingGrid(columns, mapping) {
        mappingGrid.innerHTML = "";

        FIELD_DEFINITIONS.forEach(function (field) {
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
            emptyOption.textContent = field.required ? "Выберите колонку источника..." : "Не сопоставлено";
            select.appendChild(emptyOption);

            columns.forEach(function (columnName, index) {
                const option = document.createElement("option");
                option.value = String(index);
                option.textContent = columnName;
                select.appendChild(option);
            });

            const selected = mapping[field.key];
            if (Number.isInteger(selected) && selected >= 0 && selected < columns.length) {
                select.value = String(selected);
            }

            wrapper.appendChild(select);
            mappingGrid.appendChild(wrapper);
        });
    }

    function readMappingFromUi() {
        const mapping = {};
        FIELD_DEFINITIONS.forEach(function (field) {
            const selector = `[data-mapping-field="${field.key}"]`;
            const select = mappingGrid.querySelector(selector);
            if (!(select instanceof HTMLSelectElement)) {
                mapping[field.key] = -1;
                return;
            }

            const value = Number.parseInt(select.value, 10);
            mapping[field.key] = Number.isInteger(value) ? value : -1;
        });

        return mapping;
    }

    function mapRawRow(rowValues, mapping, fallbackRowNumber) {
        function valueAt(index) {
            if (!Number.isInteger(index) || index < 0 || index >= rowValues.length) {
                return "";
            }

            return String(rowValues[index] ?? "").trim();
        }

        const errors = [];

        const rawRowNumber = valueAt(mapping.rowNumber);
        let rowNumber = Number.parseInt(rawRowNumber, 10);
        if (!Number.isInteger(rowNumber) || rowNumber <= 0) {
            rowNumber = fallbackRowNumber;
        }

        const projectCode = valueAt(mapping.projectCode).toUpperCase();
        const objectWbs = valueAt(mapping.objectWbs);
        const disciplineCode = valueAt(mapping.disciplineCode).toUpperCase();

        const manHoursParsed = parseNumber(valueAt(mapping.manHours));
        const manHours = Number.isFinite(manHoursParsed) ? manHoursParsed : 0;

        const startDate = parseDate(valueAt(mapping.plannedStartDate));
        const finishDate = parseDate(valueAt(mapping.plannedFinishDate));

        if (!projectCode) {
            errors.push("Код проекта обязателен");
        }

        if (!objectWbs) {
            errors.push("Объект WBS обязателен");
        }

        if (!disciplineCode) {
            errors.push("Код дисциплины обязателен");
        }

        if (!Number.isFinite(manHoursParsed)) {
            errors.push("Трудозатраты должны быть числом");
        } else if (manHoursParsed < 0) {
            errors.push("Трудозатраты не могут быть отрицательными");
        }

        if (startDate.error) {
            errors.push("Плановая дата начала: " + startDate.error);
        }

        if (finishDate.error) {
            errors.push("Плановая дата окончания: " + finishDate.error);
        }

        if (startDate.value && finishDate.value && startDate.value > finishDate.value) {
            errors.push("Плановая дата начала должна быть <= плановой дате окончания");
        }

        return {
            rowNumber: rowNumber,
            projectCode: projectCode,
            objectWbs: objectWbs,
            disciplineCode: disciplineCode,
            manHours: manHours,
            plannedStartDate: startDate.value,
            plannedFinishDate: finishDate.value,
            isLocallyValid: errors.length === 0,
            localValidationMessage: errors.length > 0 ? errors.join("; ") : ""
        };
    }

    function renderPreviewTable(rows) {
        const head = previewTable.querySelector("thead");
        const body = previewTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const headerRow = document.createElement("tr");
        [
            "Строка",
            "Код проекта",
            "Объект WBS",
            "Код дисциплины",
            "Трудозатраты",
            "План. начало",
            "План. окончание",
            "Локальная валидация"
        ].forEach(function (header) {
            const cell = document.createElement("th");
            cell.textContent = header;
            headerRow.appendChild(cell);
        });
        head.appendChild(headerRow);

        rows.slice(0, PREVIEW_ROW_LIMIT).forEach(function (row) {
            const tr = document.createElement("tr");
            if (!row.isLocallyValid) {
                tr.className = "imports-row--invalid";
            }

            [
                row.rowNumber,
                row.projectCode,
                row.objectWbs,
                row.disciplineCode,
                row.manHours,
                row.plannedStartDate || "",
                row.plannedFinishDate || "",
                row.localValidationMessage || "ОК"
            ].forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });

            body.appendChild(tr);
        });

        previewWrap.hidden = false;
    }

    function applyMappingToRows() {
        if (!Array.isArray(rawRows) || rawRows.length === 0) {
            throw new Error("Сначала разберите исходный файл.");
        }

        const mapping = readMappingFromUi();
        const missingRequiredFields = FIELD_DEFINITIONS
            .filter(function (field) {
                return field.required && (!Number.isInteger(mapping[field.key]) || mapping[field.key] < 0);
            })
            .map(function (field) { return field.label; });

        if (missingRequiredFields.length > 0) {
            throw new Error("Отсутствуют обязательные сопоставления: " + missingRequiredFields.join(", ") + ".");
        }

        mappingSelection = mapping;

        const rows = [];
        for (let index = dataStartRowIndex; index < rawRows.length; index += 1) {
            const rowValues = rawRows[index];
            if (!Array.isArray(rowValues) || isRowEmpty(rowValues)) {
                continue;
            }

            rows.push(mapRawRow(rowValues, mapping, index - dataStartRowIndex + 1));
        }

        if (rows.length === 0) {
            throw new Error("После сопоставления не найдено строк с данными.");
        }

        if (rows.length > MAX_IMPORT_ROWS) {
            throw new Error(`Источник содержит ${rows.length} строк, максимально допустимо ${MAX_IMPORT_ROWS}.`);
        }

        parsedRows = rows;
        renderPreviewTable(rows);

        const invalidLocalCount = rows.filter(function (row) { return !row.isLocallyValid; }).length;

        parseSummaryElement.hidden = false;
        parseSummaryElement.textContent =
            `Разобрано строк: ${rows.length}. Локальных ошибок валидации: ${invalidLocalCount}. ` +
            `Предпросмотр показывает первые ${Math.min(rows.length, PREVIEW_ROW_LIMIT)} строк.`;

        uploadButton.disabled = rows.length === 0;
        setMappingStatus(
            `Сопоставление применено. Разобрано строк: ${rows.length}, локальных ошибок: ${invalidLocalCount}.`,
            false);
        setUploadStatus("Файл разобран и сопоставлен. Проверьте предпросмотр и загрузите пакет.", false);
    }

    function rebuildMappingFromRaw(keepPreviousSelection) {
        const hasHeader = hasHeaderCheckbox.checked;
        const derived = deriveColumns(rawRows, hasHeader);
        sourceColumns = derived.columns;
        dataStartRowIndex = derived.dataStartIndex;

        const autoMapping = buildAutoMapping(sourceColumns, hasHeader);
        const resolvedMapping = {};
        FIELD_DEFINITIONS.forEach(function (field) {
            const previousValue = keepPreviousSelection ? mappingSelection[field.key] : -1;
            if (Number.isInteger(previousValue) && previousValue >= 0 && previousValue < sourceColumns.length) {
                resolvedMapping[field.key] = previousValue;
            } else {
                resolvedMapping[field.key] = autoMapping[field.key];
            }
        });

        mappingSelection = resolvedMapping;
        renderMappingGrid(sourceColumns, resolvedMapping);
        setMappingStatus("Проверьте сопоставление колонок и нажмите «Применить сопоставление».", false);
    }

    async function parseSelectedFile() {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
            throw new Error("Сначала выберите исходный файл.");
        }

        const fileName = file.name || "source-data.csv";
        const extension = fileName.split(".").pop()?.toLowerCase() || "";

        let parsedRawRows = [];
        if (extension === "csv" || extension === "txt") {
            const text = await file.text();
            parsedRawRows = parseDelimitedText(text);
        } else if (extension === "xlsx" || extension === "xls") {
            parsedRawRows = await parseWorkbookFile(file);
        } else {
            throw new Error("Неподдерживаемый тип файла. Используйте .csv, .txt, .xlsx или .xls.");
        }

        if (!Array.isArray(parsedRawRows) || parsedRawRows.length === 0) {
            throw new Error("Исходный файл не содержит строк.");
        }

        rawRows = parsedRawRows;
        sourceFileName = fileName;
        mappingSection.hidden = false;

        rebuildMappingFromRaw(false);
        applyMappingToRows();
    }

    async function parseError(response) {
        const fallback = `Ошибка запроса (${response.status}).`;
        const bodyText = await response.text();
        if (!bodyText) {
            return fallback;
        }

        try {
            const body = JSON.parse(bodyText);
            if (body && typeof body.detail === "string" && body.detail.trim().length > 0) {
                return body.detail;
            }

            if (body && typeof body.error === "string" && body.error.trim().length > 0) {
                return body.error;
            }

            if (body && typeof body.title === "string" && body.title.trim().length > 0) {
                return body.title;
            }
        } catch {
            return bodyText;
        }

        return bodyText;
    }

    async function request(url, options) {
        const hasBody = options && typeof options.body === "string";
        const headers = {
            Accept: "application/json"
        };

        if (hasBody) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            credentials: "include",
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        if (response.status === 204) {
            return null;
        }

        const bodyText = await response.text();
        if (!bodyText) {
            return null;
        }

        return JSON.parse(bodyText);
    }

    function renderBatchesTable(items) {
        const head = batchesTable.querySelector("thead");
        const body = batchesTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const headerRow = document.createElement("tr");
        ["Создан", "Файл", "Статус", "Строк", "Валидных", "Невалидных", "Кем", "Действия"].forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        head.appendChild(headerRow);

        const source = Array.isArray(items) ? items : [];
        if (source.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 8;
            td.textContent = "Пакеты импорта не найдены.";
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        source.forEach(function (item) {
            const tr = document.createElement("tr");
            [
                item.createdAtUtc ? new Date(item.createdAtUtc).toLocaleString("ru-RU") : "",
                item.fileName,
                localizeImportStatus(item.status),
                item.totalRows,
                item.validRows,
                item.invalidRows,
                item.createdBy || ""
            ].forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });

            const actionsCell = document.createElement("td");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "imports-button imports-button--secondary";
            button.textContent = "Открыть";
            button.setAttribute("data-batch-id", item.id);
            actionsCell.appendChild(button);
            tr.appendChild(actionsCell);
            body.appendChild(tr);
        });
    }

    function renderInvalidRows(details) {
        const head = invalidTable.querySelector("thead");
        const body = invalidTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const invalidRows = (details.rows || []).filter(function (row) {
            return !row.isValid;
        });

        if (invalidRows.length === 0) {
            invalidWrapElement.hidden = true;
            return;
        }

        invalidWrapElement.hidden = false;

        const headerRow = document.createElement("tr");
        ["Строка", "Код проекта", "Объект WBS", "Код дисциплины", "Трудозатраты", "Сообщение валидации"].forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        head.appendChild(headerRow);

        invalidRows.forEach(function (row) {
            const tr = document.createElement("tr");
            [
                row.rowNumber,
                row.projectCode,
                row.objectWbs,
                row.disciplineCode,
                row.manHours,
                row.validationMessage || ""
            ].forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    function setWorkflowActionsEnabled(enabled) {
        const state = Boolean(enabled);
        downloadInvalidReportButton.disabled = !state;
        downloadFullReportButton.disabled = !state;
        downloadLotReconciliationReportButton.disabled = !state;
        historyRefreshButton.disabled = !state;
        transitionTargetSelect.disabled = !state;
        transitionReasonInput.disabled = !state;

        if (!state) {
            transitionTargetSelect.innerHTML = "";
            transitionReasonInput.value = "";
            transitionApplyButton.disabled = true;
            lotBuildButton.disabled = true;
            lotApplyButton.disabled = true;
            return;
        }

        transitionApplyButton.disabled = transitionTargetSelect.options.length === 0;
        updateLotActionButtons();
    }

    function renderTransitionTargets(currentStatus) {
        transitionTargetSelect.innerHTML = "";
        const targets = IMPORT_STATUS_TRANSITIONS[currentStatus] || [];
        targets.forEach(function (status) {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = localizeImportStatus(status);
            transitionTargetSelect.appendChild(option);
        });

        transitionApplyButton.disabled = targets.length === 0;
        if (targets.length === 0) {
            if (currentStatus === "Uploaded" || currentStatus === "Processing") {
                setTransitionStatus("Пакет поставлен в очередь на асинхронную валидацию. Переходы недоступны до завершения обработки.", false);
            } else if (currentStatus === "Failed") {
                setTransitionStatus("Обработка пакета завершилась ошибкой. Загрузите исправленные исходные данные повторно.", true);
            } else {
                setTransitionStatus("Для текущего статуса переходы процесса недоступны.", false);
            }
        } else {
            setTransitionStatus(`Выберите целевой статус и примените переход из «${localizeImportStatus(currentStatus)}».`, false);
        }
    }

    function renderHistoryTable(items) {
        const head = historyTable.querySelector("thead");
        const body = historyTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const rows = Array.isArray(items) ? items : [];
        if (rows.length === 0) {
            historyWrapElement.hidden = true;
            return;
        }

        historyWrapElement.hidden = false;

        const headerRow = document.createElement("tr");
        ["Изменено", "Из", "В", "Причина", "Кем"].forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        head.appendChild(headerRow);

        rows.forEach(function (item) {
            const tr = document.createElement("tr");
            [
                item.changedAtUtc ? new Date(item.changedAtUtc).toLocaleString("ru-RU") : "",
                item.fromStatus ? localizeImportStatus(item.fromStatus) : "",
                localizeImportStatus(item.toStatus),
                item.reason || "",
                item.changedBy || ""
            ].forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    async function loadBatchHistory(batchId) {
        const history = await request(`${endpoint}/${batchId}/history`, { method: "GET" });
        renderHistoryTable(history);
    }

    function buildValidationReportUrl(batchId, includeValidRows) {
        const query = includeValidRows ? "?includeValidRows=true" : "";
        return `${endpoint}/${batchId}/validation-report${query}`;
    }

    function buildLotReconciliationReportUrl(batchId) {
        return `${endpoint}/${batchId}/lot-reconciliation-report`;
    }

    function downloadValidationReport(batchId, includeValidRows) {
        const url = buildValidationReportUrl(batchId, includeValidRows);
        window.open(url, "_blank", "noopener");
    }

    function downloadLotReconciliationReport(batchId) {
        const url = buildLotReconciliationReportUrl(batchId);
        window.open(url, "_blank", "noopener");
    }

    function renderXmlInboxTable(items) {
        const head = xmlTable.querySelector("thead");
        const body = xmlTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const headerRow = document.createElement("tr");
        ["Создан", "Источник", "Файл", "Статус", "Пакет", "Ошибка", "Действия"].forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        head.appendChild(headerRow);

        const rows = Array.isArray(items) ? items : [];
        if (rows.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 7;
            td.textContent = "Элементы XML-очереди не найдены.";
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        rows.forEach(function (item) {
            const tr = document.createElement("tr");
            [
                item.createdAtUtc ? new Date(item.createdAtUtc).toLocaleString("ru-RU") : "",
                item.sourceSystem || "",
                item.fileName || "",
                localizeImportStatus(item.status),
                item.sourceDataImportBatchId || "",
                item.errorMessage || ""
            ].forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });

            const actionsCell = document.createElement("td");
            if (item.sourceDataImportBatchId) {
                const viewButton = document.createElement("button");
                viewButton.type = "button";
                viewButton.className = "imports-button imports-button--secondary";
                viewButton.textContent = "Открыть пакет";
                viewButton.setAttribute("data-xml-view-batch-id", item.sourceDataImportBatchId);
                actionsCell.appendChild(viewButton);
            }

            if (item.status === "Failed") {
                const retryButton = document.createElement("button");
                retryButton.type = "button";
                retryButton.className = "imports-button imports-button--secondary";
                retryButton.textContent = "Повторить";
                retryButton.setAttribute("data-xml-retry-id", item.id);
                actionsCell.appendChild(retryButton);
            }

            tr.appendChild(actionsCell);
            body.appendChild(tr);
        });
    }

    async function loadXmlInbox() {
        try {
            setXmlStatus("Загрузка XML-очереди...", false);
            const payload = await request(xmlInboxEndpoint, { method: "GET" });
            const rows = Array.isArray(payload) ? payload : [];
            renderXmlInboxTable(rows);
            setXmlStatus(`Загружено элементов XML: ${rows.length}.`, false);
        } catch (error) {
            setXmlStatus(`Не удалось загрузить XML-очередь: ${error.message}`, true);
        }
    }

    function buildDefaultXmlFileName() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");
        const sec = String(now.getSeconds()).padStart(2, "0");
        return `express-plan-${yyyy}${mm}${dd}-${hh}${min}${sec}.xml`;
    }

    async function queueXmlInboxItem() {
        const xmlContent = String(xmlContentInput.value || "").trim();
        if (!xmlContent) {
            throw new Error("XML-содержимое обязательно.");
        }

        const sourceSystem = String(xmlSourceInput.value || "").trim() || "ExpressPlanning";
        const externalDocumentId = String(xmlExternalIdInput.value || "").trim() || null;
        const fileName = String(xmlFileNameInput.value || "").trim() || buildDefaultXmlFileName();

        const created = await request(xmlInboxEndpoint, {
            method: "POST",
            body: JSON.stringify({
                sourceSystem: sourceSystem,
                externalDocumentId: externalDocumentId,
                fileName: fileName,
                xmlContent: xmlContent
            })
        });

        xmlFileNameInput.value = fileName;
        setXmlStatus(`XML поставлен в очередь: ${created.id}. Статус: ${created.status}.`, false);
        await loadXmlInbox();
    }

    async function retryXmlInboxItem(itemId) {
        await request(`${xmlInboxEndpoint}/${itemId}/retry`, { method: "POST" });
        setXmlStatus(`XML ${itemId} перемещён в очередь повторной обработки.`, false);
        await loadXmlInbox();
    }

    function renderEmptyTable(tableElement, colSpan, message) {
        const head = tableElement.querySelector("thead");
        const body = tableElement.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = colSpan;
        td.textContent = message;
        tr.appendChild(td);
        body.appendChild(tr);
    }

    function formatNumber(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return String(value ?? "");
        }

        return number.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }

    function formatShortDate(value) {
        if (!value) {
            return "";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("ru-RU");
    }

    function formatDateRange(startDate, finishDate) {
        if (startDate && finishDate) {
            return `${formatShortDate(startDate)} - ${formatShortDate(finishDate)}`;
        }

        if (startDate) {
            return `с ${formatShortDate(startDate)}`;
        }

        if (finishDate) {
            return `до ${formatShortDate(finishDate)}`;
        }

        return "-";
    }

    function getRecommendationGroups() {
        return Array.isArray(lotRecommendations?.groups) ? lotRecommendations.groups : [];
    }

    function getSelectedRecommendationGroups() {
        return getRecommendationGroups()
            .map(function (group) {
                return {
                    group: group,
                    selection: lotSelectionsByKey.get(group.groupKey) || null
                };
            })
            .filter(function (item) {
                return item.selection && item.selection.selected;
            });
    }

    function updateLotActionButtons() {
        const hasSelectedBatch = Boolean(selectedBatch && selectedBatch.id);
        lotBuildButton.disabled = !hasSelectedBatch;

        const canApply =
            hasSelectedBatch &&
            lotRecommendationsBatchId === selectedBatch.id &&
            Boolean(lotRecommendations?.canApply) &&
            getSelectedRecommendationGroups().length > 0;
        lotApplyButton.disabled = !canApply;
    }

    function renderLotGroupsTable() {
        const head = lotGroupsTable.querySelector("thead");
        const body = lotGroupsTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const groups = getRecommendationGroups();
        if (groups.length === 0) {
            renderEmptyTable(lotGroupsTable, 8, "Постройте рекомендации, чтобы увидеть сгруппированные кандидаты.");
            return;
        }

        const headerRow = document.createElement("tr");
        ["Выбрать", "Проект", "Дисциплина", "Строк", "Трудозатраты", "Период", "Рекоменд. код", "Рекоменд. наименование"].forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        head.appendChild(headerRow);

        groups.forEach(function (group) {
            const tr = document.createElement("tr");
            const selection = lotSelectionsByKey.get(group.groupKey);

            const selectCell = document.createElement("td");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = !selection || selection.selected;
            checkbox.setAttribute("data-lot-group-select", group.groupKey);
            selectCell.appendChild(checkbox);
            tr.appendChild(selectCell);

            [
                group.projectCode,
                group.disciplineCode,
                group.rowsCount,
                formatNumber(group.totalManHours),
                formatDateRange(group.plannedStartDate, group.plannedFinishDate),
                group.suggestedLotCode,
                group.suggestedLotName
            ].forEach(function (value) {
                const td = document.createElement("td");
                td.textContent = String(value ?? "");
                tr.appendChild(td);
            });

            body.appendChild(tr);
        });
    }

    function renderLotSelectedTable() {
        const head = lotSelectedTable.querySelector("thead");
        const body = lotSelectedTable.querySelector("tbody");
        if (!head || !body) {
            return;
        }

        head.innerHTML = "";
        body.innerHTML = "";

        const selected = getSelectedRecommendationGroups();
        if (selected.length === 0) {
            renderEmptyTable(lotSelectedTable, 5, "Выберите группы в левой таблице, чтобы подготовить черновые лоты.");
            return;
        }

        const headerRow = document.createElement("tr");
        ["Группа", "Строк", "Трудозатраты", "Код лота", "Наименование лота"].forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });
        head.appendChild(headerRow);

        selected.forEach(function (entry) {
            const group = entry.group;
            const selection = entry.selection;
            if (!selection) {
                return;
            }

            const tr = document.createElement("tr");

            const groupCell = document.createElement("td");
            groupCell.textContent = `${group.projectCode} / ${group.disciplineCode}`;
            tr.appendChild(groupCell);

            const rowsCell = document.createElement("td");
            rowsCell.textContent = String(group.rowsCount);
            tr.appendChild(rowsCell);

            const mhCell = document.createElement("td");
            mhCell.textContent = formatNumber(group.totalManHours);
            tr.appendChild(mhCell);

            const codeCell = document.createElement("td");
            const codeInput = document.createElement("input");
            codeInput.type = "text";
            codeInput.maxLength = 64;
            codeInput.value = selection.lotCode;
            codeInput.setAttribute("data-lot-selected-code", group.groupKey);
            codeCell.appendChild(codeInput);
            tr.appendChild(codeCell);

            const nameCell = document.createElement("td");
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.maxLength = 512;
            nameInput.value = selection.lotName;
            nameInput.setAttribute("data-lot-selected-name", group.groupKey);
            nameCell.appendChild(nameInput);
            tr.appendChild(nameCell);

            body.appendChild(tr);
        });
    }

    function initializeLotSelections() {
        const groups = getRecommendationGroups();
        const previousSelections = lotSelectionsByKey;
        lotSelectionsByKey = new Map();

        groups.forEach(function (group) {
            const previous = previousSelections.get(group.groupKey);
            const lotCode = String(previous?.lotCode || group.suggestedLotCode || "").trim();
            const lotName = String(previous?.lotName || group.suggestedLotName || "").trim();

            lotSelectionsByKey.set(group.groupKey, {
                selected: previous ? Boolean(previous.selected) : true,
                lotCode: lotCode || String(group.suggestedLotCode || "").trim(),
                lotName: lotName || String(group.suggestedLotName || "").trim()
            });
        });
    }

    function clearLotRecommendations(message) {
        lotRecommendations = null;
        lotRecommendationsBatchId = null;
        lotSelectionsByKey = new Map();
        renderLotGroupsTable();
        renderLotSelectedTable();
        updateLotActionButtons();
        setLotStatus(message, false);
    }

    async function buildLotRecommendations() {
        if (!selectedBatch || !selectedBatch.id) {
            throw new Error("Сначала выберите пакет импорта.");
        }

        setLotStatus("Построение рекомендаций по лотам...", false);
        lotRecommendations = await request(`${lotRecommendationsEndpoint}/${selectedBatch.id}`, { method: "GET" });
        lotRecommendationsBatchId = selectedBatch.id;
        initializeLotSelections();
        renderLotGroupsTable();
        renderLotSelectedTable();
        updateLotActionButtons();

        const groups = getRecommendationGroups();
        if (groups.length === 0) {
            const candidateRows = Number(lotRecommendations?.candidateRows || 0);
            setLotStatus(`Рекомендательные группы не сформированы. Валидных строк-кандидатов: ${candidateRows}.`, false);
            return;
        }

        if (!lotRecommendations?.canApply) {
            const note = String(lotRecommendations?.note || "Операция применения сейчас недоступна.");
            setLotStatus(`Сформировано рекомендационных групп: ${groups.length}. ${note}`, false);
            return;
        }

        const selectedCount = getSelectedRecommendationGroups().length;
        setLotStatus(`Сформировано рекомендационных групп: ${groups.length}. Выбрано к применению: ${selectedCount}.`, false);
    }

    function buildLotApplyPayload() {
        const selected = getSelectedRecommendationGroups();
        if (selected.length === 0) {
            throw new Error("Выберите хотя бы одну рекомендационную группу.");
        }

        return {
            groups: selected.map(function (entry) {
                const group = entry.group;
                const selection = entry.selection;
                const lotCode = String(selection?.lotCode || "").trim() || String(group.suggestedLotCode || "").trim();
                const lotName = String(selection?.lotName || "").trim() || String(group.suggestedLotName || "").trim();

                return {
                    groupKey: group.groupKey,
                    lotCode: lotCode,
                    lotName: lotName
                };
            })
        };
    }

    async function applyLotRecommendations() {
        if (!selectedBatch || !selectedBatch.id) {
            throw new Error("Сначала выберите пакет импорта.");
        }

        if (!lotRecommendations || lotRecommendationsBatchId !== selectedBatch.id) {
            throw new Error("Перед созданием лотов сначала постройте рекомендации.");
        }

        if (!lotRecommendations.canApply) {
            throw new Error(String(lotRecommendations.note || "Пакет не готов к созданию лотов."));
        }

        const payload = buildLotApplyPayload();
        const result = await request(`${lotRecommendationsEndpoint}/${selectedBatch.id}/apply`, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const createdLots = Array.isArray(result?.createdLots) ? result.createdLots : [];
        const skippedGroups = Array.isArray(result?.skippedGroups) ? result.skippedGroups : [];
        const createdCodes = createdLots
            .map(function (lot) { return lot.lotCode; })
            .filter(function (code) { return Boolean(code); });

        await buildLotRecommendations();

        const codesPreview = createdCodes.slice(0, 3).join(", ");
        const suffix = createdCodes.length > 3 ? ", ..." : "";
        const summary = createdCodes.length > 0
            ? ` Созданные лоты: ${codesPreview}${suffix}.`
            : "";
        const firstSkipReason = skippedGroups.length > 0 && skippedGroups[0].reason
            ? ` Первая причина пропуска: ${skippedGroups[0].reason}`
            : "";

        setLotStatus(
            `Применение завершено. Создано: ${createdLots.length}. Пропущено: ${skippedGroups.length}.${summary}${firstSkipReason}`,
            createdLots.length === 0 && skippedGroups.length > 0);
    }

    async function loadBatchDetails(batchId) {
        clearDetailsPoll();
        try {
            const details = await request(`${endpoint}/${batchId}`, { method: "GET" });
            const previousBatchId = selectedBatch && selectedBatch.id ? selectedBatch.id : null;
            selectedBatch = details;
            detailsElement.hidden = false;
            detailsTitleElement.textContent = `Пакет: ${details.fileName}`;
            detailsSummaryElement.textContent =
                `Статус: ${details.status}. Строк: ${details.totalRows}. Валидных: ${details.validRows}. Невалидных: ${details.invalidRows}.`;
            renderInvalidRows(details);
            renderTransitionTargets(details.status);
            setWorkflowActionsEnabled(true);
            if (!lotRecommendations ||
                lotRecommendationsBatchId !== details.id ||
                previousBatchId !== details.id ||
                String(lotRecommendations.batchStatus || "") !== String(details.status || "")) {
                clearLotRecommendations("Выбран пакет. Постройте рекомендации для подготовки черновых лотов.");
            } else {
                renderLotGroupsTable();
                renderLotSelectedTable();
                updateLotActionButtons();
            }
            await loadBatchHistory(batchId);

            if (shouldAutoRefreshDetails(details.status)) {
                detailsPollHandle = window.setTimeout(function () {
                    loadBatchDetails(batchId).catch(function (error) {
                        setBatchesStatus(`Ошибка автообновления: ${error.message}`, true);
                    });
                }, 3000);
            }
        } catch (error) {
            selectedBatch = null;
            setBatchesStatus(`Не удалось загрузить детали пакета: ${error.message}`, true);
            setWorkflowActionsEnabled(false);
            clearLotRecommendations("Выберите пакет для построения рекомендаций.");
        }
    }

    async function loadBatches(selectedBatchId) {
        try {
            setBatchesStatus("Загрузка пакетов...", false);
            const payload = await request(endpoint, { method: "GET" });
            const rows = Array.isArray(payload) ? payload : [];
            renderBatchesTable(rows);
            setBatchesStatus(`Загружено пакетов: ${rows.length}.`, false);

            const targetBatchId = selectedBatchId || (selectedBatch && selectedBatch.id ? selectedBatch.id : null);
            if (targetBatchId) {
                await loadBatchDetails(targetBatchId);
            }
        } catch (error) {
            setBatchesStatus(`Не удалось загрузить пакеты: ${error.message}`, true);
        }
    }

    async function applyBatchTransition() {
        if (!selectedBatch || !selectedBatch.id) {
            throw new Error("Сначала выберите пакет.");
        }

        const targetStatus = String(transitionTargetSelect.value || "").trim();
        if (!targetStatus) {
            throw new Error("Сначала выберите целевой статус.");
        }

        const reason = String(transitionReasonInput.value || "").trim();
        if (targetStatus === "Rejected" && reason.length === 0) {
            throw new Error("Для перехода в статус «Отклонён» требуется причина.");
        }

        await request(`${endpoint}/${selectedBatch.id}/transition`, {
            method: "POST",
            body: JSON.stringify({
                targetStatus: targetStatus,
                reason: reason || null
            })
        });

        transitionReasonInput.value = "";
        await loadBatches(selectedBatch.id);
        setTransitionStatus(`Переход применён: ${localizeImportStatus(targetStatus)}.`, false);
    }

    async function uploadBatch() {
        if (parsedRows.length === 0) {
            throw new Error("Нет разобранных строк для загрузки.");
        }

        const payload = {
            fileName: sourceFileName || "source-data.csv",
            notes: String(notesInput.value || "").trim() || null,
            rows: parsedRows.map(function (row) {
                return {
                    rowNumber: row.rowNumber,
                    projectCode: row.projectCode,
                    objectWbs: row.objectWbs,
                    disciplineCode: row.disciplineCode,
                    manHours: row.manHours,
                    plannedStartDate: row.plannedStartDate,
                    plannedFinishDate: row.plannedFinishDate
                };
            })
        };

        const created = await request(queuedEndpoint, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        setUploadStatus(
            `Пакет поставлен в очередь: ${created.id}. Статус: ${created.status}. Валидация будет выполнена асинхронно.`,
            false);

        await loadBatches(created.id);
    }

    function resetWizard() {
        parsedRows = [];
        sourceFileName = "";
        rawRows = [];
        sourceColumns = [];
        dataStartRowIndex = 1;
        mappingSelection = {};
        selectedBatch = null;
        clearDetailsPoll();

        fileInput.value = "";
        notesInput.value = "";
        hasHeaderCheckbox.checked = true;
        transitionReasonInput.value = "";

        mappingGrid.innerHTML = "";
        mappingSection.hidden = true;
        setMappingStatus("", false);

        uploadButton.disabled = true;
        previewWrap.hidden = true;
        parseSummaryElement.hidden = true;
        parseSummaryElement.textContent = "";
        detailsElement.hidden = true;
        historyWrapElement.hidden = true;
        invalidWrapElement.hidden = true;
        setWorkflowActionsEnabled(false);
        setTransitionStatus("Выберите пакет для выполнения действия процесса.", false);
        clearLotRecommendations("Выберите пакет для построения рекомендаций.");

        setUploadStatus("Выберите исходный файл и нажмите «Разобрать файл».", false);
    }

    parseButton.addEventListener("click", async function () {
        parseButton.disabled = true;
        try {
            await parseSelectedFile();
        } catch (error) {
            setUploadStatus(`Ошибка разбора: ${error.message}`, true);
            setMappingStatus(`Сопоставление недоступно: ${error.message}`, true);
            uploadButton.disabled = true;
            previewWrap.hidden = true;
            parseSummaryElement.hidden = true;
        } finally {
            parseButton.disabled = false;
        }
    });

    applyMappingButton.addEventListener("click", function () {
        try {
            applyMappingToRows();
        } catch (error) {
            setMappingStatus(`Ошибка применения сопоставления: ${error.message}`, true);
            uploadButton.disabled = true;
            previewWrap.hidden = true;
            parseSummaryElement.hidden = true;
        }
    });

    hasHeaderCheckbox.addEventListener("change", function () {
        if (!Array.isArray(rawRows) || rawRows.length === 0) {
            return;
        }

        try {
            rebuildMappingFromRaw(false);
            applyMappingToRows();
        } catch (error) {
            setMappingStatus(`Ошибка переключения опции заголовка: ${error.message}`, true);
            uploadButton.disabled = true;
            previewWrap.hidden = true;
            parseSummaryElement.hidden = true;
        }
    });

    resetButton.addEventListener("click", function () {
        resetWizard();
    });

    uploadButton.addEventListener("click", async function () {
        uploadButton.disabled = true;
        try {
            await uploadBatch();
        } catch (error) {
            setUploadStatus(`Ошибка загрузки: ${error.message}`, true);
        } finally {
            if (parsedRows.length > 0) {
                uploadButton.disabled = false;
            }
        }
    });

    refreshBatchesButton.addEventListener("click", async function () {
        refreshBatchesButton.disabled = true;
        try {
            await loadBatches();
        } finally {
            refreshBatchesButton.disabled = false;
        }
    });

    xmlQueueButton.addEventListener("click", async function () {
        xmlQueueButton.disabled = true;
        try {
            await queueXmlInboxItem();
        } catch (error) {
            setXmlStatus(`Ошибка постановки XML в очередь: ${error.message}`, true);
        } finally {
            xmlQueueButton.disabled = false;
        }
    });

    xmlRefreshButton.addEventListener("click", async function () {
        xmlRefreshButton.disabled = true;
        try {
            await loadXmlInbox();
        } finally {
            xmlRefreshButton.disabled = false;
        }
    });

    lotBuildButton.addEventListener("click", async function () {
        lotBuildButton.disabled = true;
        try {
            await buildLotRecommendations();
        } catch (error) {
            setLotStatus(`Ошибка построения рекомендаций: ${error.message}`, true);
            updateLotActionButtons();
        } finally {
            updateLotActionButtons();
        }
    });

    lotApplyButton.addEventListener("click", async function () {
        lotApplyButton.disabled = true;
        try {
            await applyLotRecommendations();
        } catch (error) {
            setLotStatus(`Ошибка создания черновых лотов: ${error.message}`, true);
            updateLotActionButtons();
        } finally {
            updateLotActionButtons();
        }
    });

    lotGroupsTable.addEventListener("change", function (event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const checkbox = target.closest("[data-lot-group-select]");
        if (!(checkbox instanceof HTMLInputElement)) {
            return;
        }

        const groupKey = checkbox.getAttribute("data-lot-group-select");
        if (!groupKey) {
            return;
        }

        const existing = lotSelectionsByKey.get(groupKey);
        if (!existing) {
            return;
        }

        lotSelectionsByKey.set(groupKey, {
            ...existing,
            selected: checkbox.checked
        });

        renderLotSelectedTable();
        updateLotActionButtons();
        setLotStatus(`Выбрано к применению: ${getSelectedRecommendationGroups().length} групп(ы).`, false);
    });

    lotSelectedTable.addEventListener("input", function (event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const codeInput = target.closest("[data-lot-selected-code]");
        if (codeInput instanceof HTMLInputElement) {
            const groupKey = codeInput.getAttribute("data-lot-selected-code");
            if (!groupKey) {
                return;
            }

            const existing = lotSelectionsByKey.get(groupKey);
            if (!existing) {
                return;
            }

            lotSelectionsByKey.set(groupKey, {
                ...existing,
                lotCode: codeInput.value
            });
            return;
        }

        const nameInput = target.closest("[data-lot-selected-name]");
        if (!(nameInput instanceof HTMLInputElement)) {
            return;
        }

        const groupKey = nameInput.getAttribute("data-lot-selected-name");
        if (!groupKey) {
            return;
        }

        const existing = lotSelectionsByKey.get(groupKey);
        if (!existing) {
            return;
        }

        lotSelectionsByKey.set(groupKey, {
            ...existing,
            lotName: nameInput.value
        });
    });

    transitionApplyButton.addEventListener("click", async function () {
        transitionApplyButton.disabled = true;
        try {
            await applyBatchTransition();
        } catch (error) {
            setTransitionStatus(`Ошибка перехода: ${error.message}`, true);
        } finally {
            if (selectedBatch && selectedBatch.id) {
                transitionApplyButton.disabled = transitionTargetSelect.options.length === 0;
            }
        }
    });

    historyRefreshButton.addEventListener("click", async function () {
        if (!selectedBatch || !selectedBatch.id) {
            return;
        }

        historyRefreshButton.disabled = true;
        try {
            await loadBatchHistory(selectedBatch.id);
            setTransitionStatus("История обновлена.", false);
        } catch (error) {
            setTransitionStatus(`Ошибка обновления истории: ${error.message}`, true);
        } finally {
            historyRefreshButton.disabled = false;
        }
    });

    downloadInvalidReportButton.addEventListener("click", function () {
        if (!selectedBatch || !selectedBatch.id) {
            return;
        }

        downloadValidationReport(selectedBatch.id, false);
    });

    downloadFullReportButton.addEventListener("click", function () {
        if (!selectedBatch || !selectedBatch.id) {
            return;
        }

        downloadValidationReport(selectedBatch.id, true);
    });

    downloadLotReconciliationReportButton.addEventListener("click", function () {
        if (!selectedBatch || !selectedBatch.id) {
            return;
        }

        downloadLotReconciliationReport(selectedBatch.id);
    });

    batchesTable.addEventListener("click", async function (event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const button = target.closest("[data-batch-id]");
        if (!button) {
            return;
        }

        const batchId = button.getAttribute("data-batch-id");
        if (!batchId) {
            return;
        }

        await loadBatchDetails(batchId);
    });

    xmlTable.addEventListener("click", async function (event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const viewButton = target.closest("[data-xml-view-batch-id]");
        if (viewButton) {
            const batchId = viewButton.getAttribute("data-xml-view-batch-id");
            if (batchId) {
                await loadBatchDetails(batchId);
            }
            return;
        }

        const retryButton = target.closest("[data-xml-retry-id]");
        if (!retryButton) {
            return;
        }

        const itemId = retryButton.getAttribute("data-xml-retry-id");
        if (!itemId) {
            return;
        }

        try {
            await retryXmlInboxItem(itemId);
        } catch (error) {
            setXmlStatus(`Ошибка повторной обработки: ${error.message}`, true);
        }
    });

    resetWizard();
    setXmlStatus("Операции с XML ещё не выполнялись.", false);
    loadXmlInbox().catch(function (error) {
        setXmlStatus(`Не удалось инициализировать XML-очередь: ${error.message}`, true);
    });
    loadBatches().catch(function (error) {
        setBatchesStatus(`Не удалось инициализировать модуль импорта: ${error.message}`, true);
    });
})();
