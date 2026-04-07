"use strict";

(function () {
    const moduleRoot = document.querySelector("[data-contractors-module]");
    if (!moduleRoot) {
        return;
    }

    const endpoint = moduleRoot.getAttribute("data-api-endpoint") || "/api/contractors";
    const ratingModelEndpoint = moduleRoot.getAttribute("data-rating-model-endpoint") || "/api/contractors/rating/model";
    const ratingRecalculateEndpoint = moduleRoot.getAttribute("data-rating-recalculate-endpoint") || "/api/contractors/rating/recalculate";
    const ratingAnalyticsEndpoint = moduleRoot.getAttribute("data-rating-analytics-endpoint") || "/api/contractors/rating/analytics";

    const statusElement = moduleRoot.querySelector("[data-contractors-status]");
    const ratingStatusElement = moduleRoot.querySelector("[data-contractors-rating-status]");
    const selectedElement = moduleRoot.querySelector("[data-contractors-selected]");
    const historyStatusElement = moduleRoot.querySelector("[data-contractors-history-status]");
    const analyticsStatusElement = moduleRoot.querySelector("[data-contractors-analytics-status]");

    const refreshButton = moduleRoot.querySelector("[data-contractors-refresh]");
    const recalcAllButton = moduleRoot.querySelector("[data-contractors-recalculate-all]");
    const recalcSelectedButton = moduleRoot.querySelector("[data-contractors-recalculate-selected]");
    const reloadModelButton = moduleRoot.querySelector("[data-contractors-reload-model]");
    const saveModelButton = moduleRoot.querySelector("[data-contractors-save-model]");
    const manualSaveButton = moduleRoot.querySelector("[data-contractors-manual-save]");

    const versionCodeInput = moduleRoot.querySelector("[data-contractors-model-version-code]");
    const modelNameInput = moduleRoot.querySelector("[data-contractors-model-name]");
    const modelNotesInput = moduleRoot.querySelector("[data-contractors-model-notes]");
    const weightDeliveryInput = moduleRoot.querySelector("[data-contractors-weight-delivery]");
    const weightCommercialInput = moduleRoot.querySelector("[data-contractors-weight-commercial]");
    const weightClaimInput = moduleRoot.querySelector("[data-contractors-weight-claim]");
    const weightManualInput = moduleRoot.querySelector("[data-contractors-weight-manual]");
    const weightWorkloadInput = moduleRoot.querySelector("[data-contractors-weight-workload]");

    const manualScoreInput = moduleRoot.querySelector("[data-contractors-manual-score]");
    const manualCommentInput = moduleRoot.querySelector("[data-contractors-manual-comment]");

    const contractorsGridElement = moduleRoot.querySelector("[data-contractors-grid]");
    const historyGridElement = moduleRoot.querySelector("[data-contractors-history-grid]");
    const analyticsGridElement = moduleRoot.querySelector("[data-contractors-analytics-grid]");

    if (!statusElement || !ratingStatusElement || !selectedElement || !historyStatusElement || !analyticsStatusElement ||
        !refreshButton || !recalcAllButton || !recalcSelectedButton || !reloadModelButton || !saveModelButton || !manualSaveButton ||
        !versionCodeInput || !modelNameInput || !modelNotesInput || !weightDeliveryInput || !weightCommercialInput ||
        !weightClaimInput || !weightManualInput || !weightWorkloadInput || !manualScoreInput || !manualCommentInput ||
        !contractorsGridElement || !historyGridElement || !analyticsGridElement) {
        return;
    }

    if (!(window.jQuery && window.DevExpress && window.DevExpress.data)) {
        statusElement.textContent = "Скрипты DevExpress не загружены. Проверьте доступ к CDN.";
        statusElement.classList.add("contractors-status--error");
        return;
    }

    const contractorStatusCaptions = {
        Active: "Активен",
        Blocked: "Заблокирован"
    };

    const reliabilityCaptions = {
        A: "A (высокая)",
        B: "B (нормальная)",
        New: "Новый",
        D: "D (критическая)"
    };

    const ratingSourceCaptions = {
        AutoRecalculation: "Авто-пересчёт",
        ManualAssessment: "Ручная оценка"
    };

    const factorCodes = {
        delivery: "DeliveryDiscipline",
        commercial: "CommercialDiscipline",
        claim: "ClaimDiscipline",
        manual: "ManualExpertEvaluation",
        workload: "WorkloadPenalty"
    };

    let contractorsCache = [];
    let selectedContractor = null;
    let contractorsGridInstance = null;
    let historyGridInstance = null;
    let analyticsGridInstance = null;
    let uiBusy = false;

    function localizeContractorStatus(value) {
        const key = String(value || "");
        return contractorStatusCaptions[key] || key;
    }

    function localizeReliability(value) {
        const key = String(value || "");
        return reliabilityCaptions[key] || key;
    }

    function localizeSource(value) {
        const key = String(value || "");
        return ratingSourceCaptions[key] || key;
    }

    function setStatus(message, isError) {
        statusElement.textContent = message;
        statusElement.classList.toggle("contractors-status--error", Boolean(isError));
    }

    function setRatingStatus(message, isError) {
        ratingStatusElement.textContent = message;
        ratingStatusElement.classList.toggle("contractors-rating-status--error", Boolean(isError));
    }

    function setHistoryStatus(message, isError) {
        historyStatusElement.textContent = message;
        historyStatusElement.classList.toggle("contractors-rating-status--error", Boolean(isError));
    }

    function setAnalyticsStatus(message, isError) {
        analyticsStatusElement.textContent = message;
        analyticsStatusElement.classList.toggle("contractors-rating-status--error", Boolean(isError));
    }

    function normalizeOptionalText(value) {
        const text = String(value ?? "").trim();
        return text.length > 0 ? text : null;
    }

    function parseNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function formatDateTime(value) {
        if (!value) {
            return "—";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return "—";
        }

        return parsed.toLocaleString("ru-RU");
    }

    function parseRatingDelta(value) {
        if (value === null || value === undefined || !Number.isFinite(Number(value))) {
            return "—";
        }

        const numeric = Number(value);
        const sign = numeric > 0 ? "+" : "";
        return `${sign}${numeric.toFixed(3)}`;
    }

    function updateSelectionUi() {
        if (!selectedContractor) {
            selectedElement.textContent = "Выберите подрядчика в таблице для просмотра истории и ручной оценки.";
            recalcSelectedButton.disabled = true;
            manualSaveButton.disabled = true;
            return;
        }

        selectedElement.textContent = `Выбран: ${selectedContractor.name} · Рейтинг: ${Number(selectedContractor.currentRating).toFixed(3)} · Загрузка: ${Number(selectedContractor.currentLoadPercent).toFixed(2)}%`;
        recalcSelectedButton.disabled = uiBusy;
        manualSaveButton.disabled = uiBusy;
    }

    function setUiBusy(isBusy) {
        uiBusy = Boolean(isBusy);
        refreshButton.disabled = uiBusy;
        recalcAllButton.disabled = uiBusy;
        reloadModelButton.disabled = uiBusy;
        saveModelButton.disabled = uiBusy;
        versionCodeInput.disabled = uiBusy;
        modelNameInput.disabled = uiBusy;
        modelNotesInput.disabled = uiBusy;
        weightDeliveryInput.disabled = uiBusy;
        weightCommercialInput.disabled = uiBusy;
        weightClaimInput.disabled = uiBusy;
        weightManualInput.disabled = uiBusy;
        weightWorkloadInput.disabled = uiBusy;
        manualScoreInput.disabled = uiBusy;
        manualCommentInput.disabled = uiBusy;
        updateSelectionUi();
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

        return response.json();
    }

    function resolveWeightValue(weights, factorCode, fallback) {
        if (!Array.isArray(weights)) {
            return fallback;
        }

        const item = weights.find(function (entry) {
            return String(entry.factorCode || "") === factorCode;
        });

        return item && Number.isFinite(Number(item.weight)) ? Number(item.weight) : fallback;
    }

    function fillModelForm(model) {
        versionCodeInput.value = model?.versionCode || "";
        modelNameInput.value = model?.name || "";
        modelNotesInput.value = model?.notes || "";
        const weights = Array.isArray(model?.weights) ? model.weights : [];
        weightDeliveryInput.value = String(resolveWeightValue(weights, factorCodes.delivery, 0.30));
        weightCommercialInput.value = String(resolveWeightValue(weights, factorCodes.commercial, 0.20));
        weightClaimInput.value = String(resolveWeightValue(weights, factorCodes.claim, 0.15));
        weightManualInput.value = String(resolveWeightValue(weights, factorCodes.manual, 0.25));
        weightWorkloadInput.value = String(resolveWeightValue(weights, factorCodes.workload, 0.10));
    }

    function buildModelPayload() {
        return {
            versionCode: normalizeOptionalText(versionCodeInput.value),
            name: normalizeOptionalText(modelNameInput.value),
            notes: normalizeOptionalText(modelNotesInput.value),
            weights: [
                {
                    factorCode: factorCodes.delivery,
                    weight: parseNumber(weightDeliveryInput.value, 0.30)
                },
                {
                    factorCode: factorCodes.commercial,
                    weight: parseNumber(weightCommercialInput.value, 0.20)
                },
                {
                    factorCode: factorCodes.claim,
                    weight: parseNumber(weightClaimInput.value, 0.15)
                },
                {
                    factorCode: factorCodes.manual,
                    weight: parseNumber(weightManualInput.value, 0.25)
                },
                {
                    factorCode: factorCodes.workload,
                    weight: parseNumber(weightWorkloadInput.value, 0.10)
                }
            ]
        };
    }

    async function loadModel() {
        const model = await request(ratingModelEndpoint, { method: "GET" });
        fillModelForm(model);
        setRatingStatus(`Активная модель: ${model.versionCode}.`, false);
    }

    async function loadContractors() {
        const payload = await request(endpoint, { method: "GET" });
        contractorsCache = Array.isArray(payload) ? payload : [];
        contractorsGridInstance.option("dataSource", contractorsCache);
        setStatus(`Загружено подрядчиков: ${contractorsCache.length}.`, false);
    }

    async function loadHistory(contractorId) {
        if (!contractorId) {
            historyGridInstance.option("dataSource", []);
            setHistoryStatus("История пока не загружена.", false);
            return;
        }

        const history = await request(`${endpoint}/${contractorId}/rating/history?top=50`, { method: "GET" });
        const rows = Array.isArray(history) ? history : [];
        historyGridInstance.option("dataSource", rows);
        setHistoryStatus(`Загружено записей истории: ${rows.length}.`, false);
    }

    async function loadAnalytics() {
        const analytics = await request(ratingAnalyticsEndpoint, { method: "GET" });
        const rows = Array.isArray(analytics) ? analytics : [];
        analyticsGridInstance.option("dataSource", rows);
        setAnalyticsStatus(`Загружено аналитических строк: ${rows.length}.`, false);
    }

    async function refreshContractorsAndReselect(contractorId) {
        await loadContractors();
        if (!contractorId) {
            contractorsGridInstance.clearSelection();
            selectedContractor = null;
            updateSelectionUi();
            return;
        }

        await contractorsGridInstance.selectRows([contractorId], false);
        const selected = contractorsCache.find(function (item) {
            return item.id === contractorId;
        }) || null;
        selectedContractor = selected;
        updateSelectionUi();
    }

    async function recalculateRatings(payload) {
        return request(ratingRecalculateEndpoint, {
            method: "POST",
            body: JSON.stringify(payload || {})
        });
    }

    contractorsGridInstance = window.jQuery(contractorsGridElement).dxDataGrid({
        dataSource: [],
        keyExpr: "id",
        height: 520,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        focusedRowEnabled: true,
        selection: {
            mode: "single"
        },
        columnAutoWidth: true,
        remoteOperations: false,
        sorting: {
            mode: "multiple"
        },
        searchPanel: {
            visible: true,
            width: 280,
            placeholder: "Поиск подрядчиков..."
        },
        filterRow: {
            visible: true
        },
        paging: {
            pageSize: 15
        },
        pager: {
            showInfo: true,
            showPageSizeSelector: true,
            allowedPageSizes: [15, 30, 50]
        },
        editing: {
            mode: "row",
            allowAdding: false,
            allowUpdating: false,
            allowDeleting: false
        },
        columns: [
            {
                dataField: "inn",
                caption: "ИНН",
                width: 130
            },
            {
                dataField: "name",
                caption: "Подрядчик",
                minWidth: 220
            },
            {
                dataField: "city",
                caption: "Город",
                width: 140
            },
            {
                dataField: "status",
                caption: "Статус",
                width: 120,
                customizeText: function (cellInfo) {
                    return localizeContractorStatus(cellInfo.value);
                }
            },
            {
                dataField: "reliabilityClass",
                caption: "Надёжность",
                width: 130,
                customizeText: function (cellInfo) {
                    return localizeReliability(cellInfo.value);
                }
            },
            {
                dataField: "currentRating",
                caption: "Текущий рейтинг",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 3
                },
                width: 140
            },
            {
                dataField: "currentLoadPercent",
                caption: "Загрузка, %",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 130
            }
        ],
        onSelectionChanged: function (e) {
            const selected = Array.isArray(e.selectedRowsData) && e.selectedRowsData.length > 0
                ? e.selectedRowsData[0]
                : null;
            selectedContractor = selected;
            updateSelectionUi();

            if (!selectedContractor) {
                historyGridInstance.option("dataSource", []);
                setHistoryStatus("История пока не загружена.", false);
                return;
            }

            setHistoryStatus("Загружаем историю...", false);
            loadHistory(selectedContractor.id).catch(function (error) {
                setHistoryStatus(`Не удалось загрузить историю: ${error.message}`, true);
            });
        }
    }).dxDataGrid("instance");

    historyGridInstance = window.jQuery(historyGridElement).dxDataGrid({
        dataSource: [],
        height: 320,
        showBorders: true,
        rowAlternationEnabled: true,
        columnAutoWidth: true,
        paging: {
            pageSize: 8
        },
        pager: {
            showInfo: true
        },
        columns: [
            {
                dataField: "calculatedAtUtc",
                caption: "Дата расчёта (UTC)",
                dataType: "datetime",
                format: "yyyy-MM-dd HH:mm",
                sortOrder: "desc",
                width: 170
            },
            {
                dataField: "modelVersionCode",
                caption: "Версия модели",
                width: 130
            },
            {
                dataField: "sourceType",
                caption: "Источник",
                width: 150,
                customizeText: function (cellInfo) {
                    return localizeSource(cellInfo.value);
                }
            },
            {
                dataField: "deliveryDisciplineScore",
                caption: "Исполнение",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 100
            },
            {
                dataField: "commercialDisciplineScore",
                caption: "Коммерция",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 100
            },
            {
                dataField: "claimDisciplineScore",
                caption: "Претензии",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 100
            },
            {
                dataField: "manualExpertScore",
                caption: "Эксперт",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 90
            },
            {
                dataField: "workloadPenaltyScore",
                caption: "Загрузка",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 90
            },
            {
                dataField: "finalScore",
                caption: "Итог (0..100)",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 3
                },
                width: 120
            },
            {
                dataField: "createdBy",
                caption: "Кто запустил",
                width: 140
            },
            {
                dataField: "notes",
                caption: "Комментарий",
                minWidth: 220
            }
        ]
    }).dxDataGrid("instance");

    analyticsGridInstance = window.jQuery(analyticsGridElement).dxDataGrid({
        dataSource: [],
        keyExpr: "contractorId",
        height: 330,
        showBorders: true,
        rowAlternationEnabled: true,
        columnAutoWidth: true,
        sorting: {
            mode: "multiple"
        },
        searchPanel: {
            visible: true,
            width: 260,
            placeholder: "Поиск в аналитике..."
        },
        paging: {
            pageSize: 10
        },
        pager: {
            showInfo: true
        },
        columns: [
            {
                dataField: "contractorName",
                caption: "Подрядчик",
                minWidth: 240
            },
            {
                dataField: "contractorStatus",
                caption: "Статус",
                width: 120,
                customizeText: function (cellInfo) {
                    return localizeContractorStatus(cellInfo.value);
                }
            },
            {
                dataField: "reliabilityClass",
                caption: "Надёжность",
                width: 130,
                customizeText: function (cellInfo) {
                    return localizeReliability(cellInfo.value);
                }
            },
            {
                dataField: "currentRating",
                caption: "Рейтинг",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 3
                },
                width: 110
            },
            {
                dataField: "ratingDelta",
                caption: "Дельта",
                width: 100,
                customizeText: function (cellInfo) {
                    return parseRatingDelta(cellInfo.value);
                }
            },
            {
                dataField: "currentLoadPercent",
                caption: "Загрузка, %",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 120
            },
            {
                dataField: "modelVersionCode",
                caption: "Модель",
                width: 110
            },
            {
                dataField: "lastCalculatedAtUtc",
                caption: "Последний расчёт",
                width: 170,
                calculateCellValue: function (rowData) {
                    return formatDateTime(rowData.lastCalculatedAtUtc);
                }
            }
        ]
    }).dxDataGrid("instance");

    refreshButton.addEventListener("click", function () {
        const selectedId = selectedContractor ? selectedContractor.id : null;
        setUiBusy(true);
        Promise.all([
            refreshContractorsAndReselect(selectedId),
            loadAnalytics()
        ]).then(function () {
            if (selectedId) {
                return loadHistory(selectedId);
            }

            return null;
        }).catch(function (error) {
            setRatingStatus(`Не удалось обновить данные: ${error.message}`, true);
        }).finally(function () {
            setUiBusy(false);
        });
    });

    recalcAllButton.addEventListener("click", function () {
        const selectedId = selectedContractor ? selectedContractor.id : null;
        setUiBusy(true);
        setRatingStatus("Выполняется пересчёт рейтинга для активных подрядчиков...", false);

        recalculateRatings({
            includeInactiveContractors: false,
            reason: "Ручной пересчёт из интерфейса: все активные подрядчики."
        }).then(function (result) {
            setRatingStatus(
                `Пересчёт завершён. Обработано: ${result.processedContractors}; обновлено: ${result.updatedContractors}; модель: ${result.modelVersionCode}.`,
                false);
            return Promise.all([
                refreshContractorsAndReselect(selectedId),
                loadAnalytics()
            ]);
        }).then(function () {
            if (selectedId) {
                return loadHistory(selectedId);
            }

            return null;
        }).catch(function (error) {
            setRatingStatus(`Ошибка пересчёта рейтинга: ${error.message}`, true);
        }).finally(function () {
            setUiBusy(false);
        });
    });

    recalcSelectedButton.addEventListener("click", function () {
        if (!selectedContractor) {
            return;
        }

        const selectedId = selectedContractor.id;
        setUiBusy(true);
        setRatingStatus("Выполняется пересчёт рейтинга выбранного подрядчика...", false);

        recalculateRatings({
            contractorId: selectedId,
            includeInactiveContractors: true,
            reason: "Ручной пересчёт из интерфейса: выбранный подрядчик."
        }).then(function (result) {
            setRatingStatus(
                `Пересчёт выбранного подрядчика завершён. Обработано: ${result.processedContractors}; обновлено: ${result.updatedContractors}.`,
                false);
            return Promise.all([
                refreshContractorsAndReselect(selectedId),
                loadAnalytics(),
                loadHistory(selectedId)
            ]);
        }).catch(function (error) {
            setRatingStatus(`Ошибка пересчёта выбранного подрядчика: ${error.message}`, true);
        }).finally(function () {
            setUiBusy(false);
        });
    });

    reloadModelButton.addEventListener("click", function () {
        setUiBusy(true);
        loadModel().catch(function (error) {
            setRatingStatus(`Не удалось загрузить модель рейтинга: ${error.message}`, true);
        }).finally(function () {
            setUiBusy(false);
        });
    });

    saveModelButton.addEventListener("click", function () {
        const payload = buildModelPayload();
        setUiBusy(true);
        setRatingStatus("Сохраняем новую версию модели рейтинга...", false);

        request(ratingModelEndpoint, {
            method: "PUT",
            body: JSON.stringify(payload)
        }).then(function (model) {
            fillModelForm(model);
            setRatingStatus(`Сохранена новая активная модель: ${model.versionCode}.`, false);
            return Promise.all([
                loadAnalytics(),
                selectedContractor ? loadHistory(selectedContractor.id) : Promise.resolve()
            ]);
        }).catch(function (error) {
            setRatingStatus(`Не удалось сохранить модель рейтинга: ${error.message}`, true);
        }).finally(function () {
            setUiBusy(false);
        });
    });

    manualSaveButton.addEventListener("click", function () {
        if (!selectedContractor) {
            return;
        }

        const score = parseNumber(manualScoreInput.value, Number.NaN);
        if (!Number.isFinite(score) || score < 0 || score > 5) {
            setRatingStatus("Оценка ГИПа должна быть в диапазоне от 0 до 5.", true);
            return;
        }

        const selectedId = selectedContractor.id;
        setUiBusy(true);
        setRatingStatus("Сохраняем ручную оценку и пересчитываем рейтинг...", false);

        request(`${endpoint}/${selectedId}/rating/manual-assessment`, {
            method: "POST",
            body: JSON.stringify({
                score: score,
                comment: normalizeOptionalText(manualCommentInput.value)
            })
        }).then(function () {
            setRatingStatus("Ручная оценка применена.", false);
            return Promise.all([
                refreshContractorsAndReselect(selectedId),
                loadAnalytics(),
                loadHistory(selectedId)
            ]);
        }).catch(function (error) {
            setRatingStatus(`Не удалось применить ручную оценку: ${error.message}`, true);
        }).finally(function () {
            setUiBusy(false);
        });
    });

    setUiBusy(true);
    Promise.all([
        loadContractors(),
        loadModel(),
        loadAnalytics()
    ]).then(function () {
        updateSelectionUi();
        setRatingStatus("Модуль рейтинга готов к работе.", false);
        setHistoryStatus("Выберите подрядчика для просмотра истории.", false);
    }).catch(function (error) {
        setStatus(`Ошибка загрузки модуля подрядчиков: ${error.message}`, true);
        setRatingStatus(`Ошибка загрузки рейтинговых данных: ${error.message}`, true);
    }).finally(function () {
        setUiBusy(false);
    });
})();
