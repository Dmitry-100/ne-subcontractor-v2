"use strict";

(function () {
    const bootstrapRoot = window.ProjectsBootstrap;
    if (!bootstrapRoot || typeof bootstrapRoot.createBootstrapContext !== "function") {
        return;
    }

    const maxAssetWaitAttempts = 50;
    const assetWaitDelayMs = 100;
    let initialized = false;

    function hasDevExpressAssets() {
        return Boolean(window.jQuery && window.DevExpress && window.DevExpress.data);
    }

    function logError(message) {
        if (window.console && typeof window.console.error === "function") {
            window.console.error(message);
        }
    }

    function reportAssetLoadFailure() {
        const moduleRoot = document.querySelector("[data-projects-module]");
        const statusElement = moduleRoot ? moduleRoot.querySelector("[data-projects-status]") : null;
        const message = "Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).";

        if (statusElement) {
            statusElement.textContent = message;
            statusElement.classList.add("projects-status--error");
        }

        logError(message);
    }

    function initialize(attempt) {
        if (initialized) {
            return;
        }

        if (!hasDevExpressAssets()) {
            if (attempt < maxAssetWaitAttempts) {
                window.setTimeout(function () {
                    initialize(attempt + 1);
                }, assetWaitDelayMs);
                return;
            }

            reportAssetLoadFailure();
            return;
        }

        initialized = true;

        const context = bootstrapRoot.createBootstrapContext({
            document: document,
            window: window,
            logError: logError
        });

        if (!context) {
            return;
        }

        const endpoint = context.endpoint;
        const sourceDataEndpoint = context.sourceDataEndpoint;
        const proceduresFromSourceDataEndpoint = context.proceduresFromSourceDataEndpoint;
        const filesEndpoint = context.filesEndpoint;
        const controls = context.controls;
        const moduleRoots = context.moduleRoots;
        const statusElement = controls.statusElement;
        const sourceStatusElement = controls.sourceStatusElement || statusElement;
        let selectedProcurementRows = [];
        let apiClient = null;

        function setStatus(message, isError) {
            statusElement.textContent = message;
            statusElement.classList.toggle("projects-status--error", Boolean(isError));
        }

        function setSourceStatus(message, isError) {
            sourceStatusElement.textContent = message;
            sourceStatusElement.classList.toggle("projects-status--error", Boolean(isError));
        }

        function setProcurementStatus(message, isError) {
            const element = controls.procurementStatus || sourceStatusElement;
            element.textContent = message;
            element.classList.toggle("projects-status--error", Boolean(isError));
        }

        function createCell(value) {
            const td = document.createElement("td");
            td.textContent = String(value ?? "");
            return td;
        }

        function formatNumber(value) {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                return String(value ?? "");
            }

            return number.toLocaleString("ru-RU", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
        }

        function formatDate(value) {
            if (!value) {
                return "";
            }

            return new Date(value).toLocaleDateString("ru-RU");
        }

        function renderSelectedRows(rows) {
            const table = controls.procurementTable;
            const head = table?.querySelector("thead");
            const body = table?.querySelector("tbody");
            if (!head || !body) {
                return;
            }

            head.innerHTML = "";
            body.innerHTML = "";
            const header = document.createElement("tr");
            ["Строка", "Проект", "Комплекс/проект", "Объект", "Проектная дисциплина", "Чел.-ч", "Период"].forEach(function (label) {
                const th = document.createElement("th");
                th.textContent = label;
                header.appendChild(th);
            });
            head.appendChild(header);

            rows.forEach(function (row) {
                const tr = document.createElement("tr");
                tr.appendChild(createCell(row.rowNumber));
                tr.appendChild(createCell(`${row.projectCode}${row.projectName ? " / " + row.projectName : ""}`));
                tr.appendChild(createCell(row.complexProjectName || ""));
                tr.appendChild(createCell(row.objectWbs));
                tr.appendChild(createCell(row.disciplineCode));
                tr.appendChild(createCell(formatNumber(row.manHours)));
                tr.appendChild(createCell(`${formatDate(row.plannedStartDate)} - ${formatDate(row.plannedFinishDate)}`));
                body.appendChild(tr);
            });
        }

        function openProcurementRequest(rows) {
            const selectedRows = Array.isArray(rows) ? rows : [];
            const invalidRows = selectedRows.filter(function (row) {
                return !row.isValid;
            });
            const validRows = selectedRows.filter(function (row) {
                return row.isValid;
            });

            if (selectedRows.length === 0) {
                setSourceStatus("Выберите одну или несколько валидных работ из Express.", true);
                return;
            }

            if (invalidRows.length > 0) {
                setSourceStatus("В заявке можно использовать только валидные строки. Сначала исправьте сопоставление дисциплин в разделе Импорт.", true);
                return;
            }

            selectedProcurementRows = validRows;
            const totalManHours = validRows.reduce(function (sum, row) {
                return sum + (Number(row.manHours) || 0);
            }, 0);

            if (controls.procurementSection) {
                controls.procurementSection.hidden = false;
            }
            if (controls.procurementSummary) {
                controls.procurementSummary.textContent = `Выбрано работ: ${validRows.length}, суммарно ${formatNumber(totalManHours)} чел.-ч. Прикрепите ТЗ и создайте закупочную заявку.`;
            }
            if (controls.procurementResult) {
                controls.procurementResult.hidden = true;
                controls.procurementResult.innerHTML = "";
            }

            renderSelectedRows(validRows);
            setProcurementStatus("Готово к созданию заявки.", false);
            controls.procurementSection?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }

        async function createProcurementRequest() {
            try {
                if (selectedProcurementRows.length === 0) {
                    throw new Error("Выберите валидные работы в таблице Express.");
                }

                const file = controls.procurementFile?.files?.[0];
                if (!file) {
                    throw new Error("Прикрепите файл технического задания.");
                }

                setProcurementStatus("Загружаю ТЗ и создаю закупочную процедуру...", false);
                const uploaded = await apiClient.uploadTechnicalAssignment(file);
                const result = await apiClient.createProcedureFromSourceData({
                    sourceDataRowIds: selectedProcurementRows.map(function (row) {
                        return row.id;
                    }),
                    technicalAssignmentFileId: uploaded.id,
                    requestTitle: controls.procurementTitle?.value || null,
                    purchaseTypeCode: "SUBCONTRACT"
                });

                setProcurementStatus(
                    `Заявка создана: работ ${result.sourceRowsCount}, объём ${formatNumber(result.totalManHours)} чел.-ч.`,
                    false);
                if (controls.procurementResult) {
                    controls.procurementResult.hidden = false;
                    controls.procurementResult.innerHTML = "";

                    const procedureLink = document.createElement("a");
                    procedureLink.className = "registry-api-link";
                    procedureLink.href = `/procedures?search=${encodeURIComponent(result.procedureId)}`;
                    procedureLink.textContent = "Открыть процедуру";

                    const lotLink = document.createElement("a");
                    lotLink.className = "registry-api-link";
                    lotLink.href = `/lots?search=${encodeURIComponent(result.lotId)}`;
                    lotLink.textContent = "Открыть лот";

                    controls.procurementResult.appendChild(procedureLink);
                    controls.procurementResult.appendChild(lotLink);
                }
            } catch (error) {
                const message = error && error.message ? error.message : "Не удалось создать заявку.";
                setProcurementStatus(message, true);
            }
        }

        function closeProcurementRequest() {
            selectedProcurementRows = [];
            if (controls.procurementSection) {
                controls.procurementSection.hidden = true;
            }
            if (controls.procurementFile) {
                controls.procurementFile.value = "";
            }
            if (controls.procurementResult) {
                controls.procurementResult.hidden = true;
                controls.procurementResult.innerHTML = "";
            }
        }

        const projectsHelpersRoot = moduleRoots.projectsHelpersRoot;
        const projectsApiRoot = moduleRoots.projectsApiRoot;
        const projectsRuntimeRoot = moduleRoots.projectsRuntimeRoot;
        const projectsGridsRoot = moduleRoots.projectsGridsRoot;

        try {
            const helpers = projectsHelpersRoot.createHelpers();
            apiClient = projectsApiRoot.createApiClient({
                endpoint: endpoint,
                sourceDataEndpoint: sourceDataEndpoint,
                proceduresFromSourceDataEndpoint: proceduresFromSourceDataEndpoint,
                filesEndpoint: filesEndpoint,
                parseErrorBody: helpers.parseErrorBody
            });
            const runtime = projectsRuntimeRoot.createRuntime({
                apiClient: apiClient,
                helpers: helpers,
                customStoreCtor: window.DevExpress.data.CustomStore,
                setStatus: setStatus,
                setSourceStatus: setSourceStatus
            });

            if (controls.sourceGridElement && typeof projectsGridsRoot.createSourceDataGrid === "function") {
                const sourceDataStore = runtime.createSourceDataStore();
                projectsGridsRoot.createSourceDataGrid({
                    jQueryImpl: window.jQuery,
                    gridElement: controls.sourceGridElement,
                    store: sourceDataStore,
                    setStatus: setSourceStatus,
                    onCreateProcurementRequest: openProcurementRequest
                });
            }

            const store = runtime.createStore();
            projectsGridsRoot.createGrid({
                jQueryImpl: window.jQuery,
                gridElement: controls.gridElement,
                store: store,
                setStatus: setStatus
            });

            controls.procurementCreate?.addEventListener("click", createProcurementRequest);
            controls.procurementCancel?.addEventListener("click", closeProcurementRequest);
        } catch (error) {
            const message = error && error.message ? error.message : "Не удалось инициализировать модуль проектов.";
            setStatus(message, true);
        }
    }

    initialize(0);
})();
