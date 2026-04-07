"use strict";

(function () {
    const moduleRoot = document.querySelector("[data-procedures-module]");
    if (!moduleRoot) {
        return;
    }

    const gridElement = moduleRoot.querySelector("[data-procedures-grid]");
    const historyGridElement = moduleRoot.querySelector("[data-procedures-history-grid]");
    const statusElement = moduleRoot.querySelector("[data-procedures-status]");
    const selectedElement = moduleRoot.querySelector("[data-procedures-selected]");
    const transitionStatusElement = moduleRoot.querySelector("[data-procedures-transition-status]");
    const targetSelect = moduleRoot.querySelector("[data-procedures-target]");
    const reasonInput = moduleRoot.querySelector("[data-procedures-reason]");
    const applyButton = moduleRoot.querySelector("[data-procedures-apply]");
    const historyRefreshButton = moduleRoot.querySelector("[data-procedures-history-refresh]");
    const shortlistSelectedElement = moduleRoot.querySelector("[data-procedures-shortlist-selected]");
    const shortlistMaxIncludedInput = moduleRoot.querySelector("[data-procedures-shortlist-max-included]");
    const shortlistAdjustmentReasonInput = moduleRoot.querySelector("[data-procedures-shortlist-adjustment-reason]");
    const shortlistBuildButton = moduleRoot.querySelector("[data-procedures-shortlist-build]");
    const shortlistApplyButton = moduleRoot.querySelector("[data-procedures-shortlist-apply]");
    const shortlistAdjustmentsRefreshButton = moduleRoot.querySelector("[data-procedures-shortlist-adjustments-refresh]");
    const shortlistStatusElement = moduleRoot.querySelector("[data-procedures-shortlist-status]");
    const shortlistAdjustmentsStatusElement = moduleRoot.querySelector("[data-procedures-shortlist-adjustments-status]");
    const shortlistGridElement = moduleRoot.querySelector("[data-procedures-shortlist-grid]");
    const shortlistAdjustmentsGridElement = moduleRoot.querySelector("[data-procedures-shortlist-adjustments-grid]");

    if (!gridElement || !historyGridElement || !statusElement || !selectedElement || !transitionStatusElement ||
        !targetSelect || !reasonInput || !applyButton || !historyRefreshButton || !shortlistSelectedElement ||
        !shortlistMaxIncludedInput || !shortlistAdjustmentReasonInput || !shortlistBuildButton ||
        !shortlistApplyButton || !shortlistAdjustmentsRefreshButton || !shortlistStatusElement ||
        !shortlistAdjustmentsStatusElement || !shortlistGridElement || !shortlistAdjustmentsGridElement) {
        return;
    }

    if (!(window.jQuery && window.DevExpress && window.DevExpress.data)) {
        statusElement.textContent = "Скрипты DevExpress не загружены. Проверьте доступ к CDN.";
        statusElement.classList.add("procedures-status--error");
        return;
    }

    const endpoint = moduleRoot.getAttribute("data-api-endpoint") || "/api/procedures";
    const statusOrder = [
        "Created",
        "DocumentsPreparation",
        "OnApproval",
        "Sent",
        "OffersReceived",
        "Retender",
        "DecisionMade",
        "Completed",
        "Canceled"
    ];

    const transitionMap = {
        Created: ["DocumentsPreparation", "Canceled"],
        DocumentsPreparation: ["Created", "OnApproval", "Canceled"],
        OnApproval: ["DocumentsPreparation", "Sent", "Canceled"],
        Sent: ["OnApproval", "OffersReceived", "Canceled"],
        OffersReceived: ["DecisionMade", "Retender", "Canceled"],
        Retender: ["Sent", "Canceled"],
        DecisionMade: ["Completed", "Retender", "Canceled"],
        Completed: [],
        Canceled: []
    };

    const statusRank = statusOrder.reduce(function (map, status, index) {
        map[status] = index + 1;
        return map;
    }, {});

    const statusCaptions = {
        Created: "Создана",
        DocumentsPreparation: "Подготовка документов",
        OnApproval: "На согласовании",
        Sent: "Отправлена",
        OffersReceived: "Предложения получены",
        Retender: "Переторжка",
        DecisionMade: "Решение принято",
        Completed: "Завершена",
        Canceled: "Отменена"
    };
    const contractorStatusCaptions = {
        Active: "Активен",
        Blocked: "Заблокирован",
        Archived: "Архивный"
    };
    const reliabilityClassCaptions = {
        A: "A (высокая)",
        B: "B (нормальная)",
        C: "C (пониженная)",
        D: "D (критическая)"
    };

    const approvalModes = ["InSystem", "External"];
    const approvalModeCaptions = {
        InSystem: "В системе",
        External: "Внешнее"
    };
    const approvalModeLookup = approvalModes.map(function (value) {
        return {
            value: value,
            text: approvalModeCaptions[value] || value
        };
    });
    const statusLookup = statusOrder.map(function (value) {
        return {
            value: value,
            text: statusCaptions[value] || value
        };
    });
    const urlFilterState = readUrlFilterState(statusOrder);

    let proceduresCache = [];
    const detailsCache = new Map();
    let selectedProcedure = null;
    let gridInstance = null;
    let historyGridInstance = null;
    let shortlistGridInstance = null;
    let shortlistAdjustmentsGridInstance = null;
    let shortlistRecommendationsCache = [];
    let shortlistBusy = false;
    let shortlistAdjustmentsBusy = false;

    function readUrlFilterState(allowedStatuses) {
        const params = new URLSearchParams(window.location.search || "");
        const allowedMap = allowedStatuses.reduce(function (map, status) {
            map[status.toLowerCase()] = status;
            return map;
        }, {});

        const rawStatus = String(params.get("status") || "");
        const statuses = rawStatus
            .split(",")
            .map(function (value) {
                return String(value || "").trim();
            })
            .filter(function (value) {
                return value.length > 0;
            })
            .map(function (value) {
                return allowedMap[value.toLowerCase()] || null;
            })
            .filter(function (value, index, values) {
                return Boolean(value) && values.indexOf(value) === index;
            });

        const searchText = String(params.get("search") || "").trim();
        const statusFilter = buildStatusFilter(statuses);

        return {
            statuses: statuses,
            searchText: searchText,
            statusFilter: statusFilter,
            hasAny: statuses.length > 0 || searchText.length > 0
        };
    }

    function buildStatusFilter(statuses) {
        if (!Array.isArray(statuses) || statuses.length === 0) {
            return null;
        }

        if (statuses.length === 1) {
            return ["status", "=", statuses[0]];
        }

        let filter = ["status", "=", statuses[0]];
        for (let index = 1; index < statuses.length; index += 1) {
            filter = [filter, "or", ["status", "=", statuses[index]]];
        }

        return filter;
    }

    function describeUrlFilters(filterState) {
        if (!filterState || !filterState.hasAny) {
            return "";
        }

        const tokens = [];
        if (filterState.statuses.length > 0) {
            tokens.push("статусы: " + filterState.statuses.map(localizeStatus).join(", "));
        }

        if (filterState.searchText.length > 0) {
            tokens.push(`поиск: "${filterState.searchText}"`);
        }

        return tokens.join("; ");
    }

    function appendFilterHint(message) {
        if (!urlFilterState.hasAny) {
            return message;
        }

        const filterText = describeUrlFilters(urlFilterState);
        return filterText
            ? `${message} URL-фильтры: ${filterText}.`
            : message;
    }

    function clearUrlFilters() {
        const url = new URL(window.location.href);
        url.searchParams.delete("status");
        url.searchParams.delete("search");
        window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    }

    function setStatus(message, isError) {
        statusElement.textContent = message;
        statusElement.classList.toggle("procedures-status--error", Boolean(isError));
    }

    function setTransitionStatus(message, isError) {
        transitionStatusElement.textContent = message;
        transitionStatusElement.classList.toggle("procedures-transition-status--error", Boolean(isError));
    }

    function localizeStatus(status) {
        return statusCaptions[String(status || "")] || String(status || "");
    }

    function localizeContractorStatus(status) {
        return contractorStatusCaptions[String(status || "")] || String(status || "");
    }

    function localizeReliabilityClass(value) {
        return reliabilityClassCaptions[String(value || "")] || String(value || "");
    }

    function localizeBoolean(value) {
        return value ? "Да" : "Нет";
    }

    function setShortlistStatus(message, isError) {
        shortlistStatusElement.textContent = message;
        shortlistStatusElement.classList.toggle("procedures-shortlist-status--error", Boolean(isError));
    }

    function setShortlistAdjustmentsStatus(message, isError) {
        shortlistAdjustmentsStatusElement.textContent = message;
        shortlistAdjustmentsStatusElement.classList.toggle("procedures-shortlist-status--error", Boolean(isError));
    }

    function supportsShortlistWorkspace(procedure) {
        return Boolean(procedure) && procedure.status !== "Canceled" && procedure.status !== "Completed";
    }

    function normalizeMaxIncluded(value) {
        const parsed = Number.parseInt(String(value || ""), 10);
        if (!Number.isFinite(parsed)) {
            return 5;
        }

        return Math.min(30, Math.max(1, parsed));
    }

    function normalizeAdjustmentReason(value) {
        const text = String(value ?? "").trim();
        return text.length > 0 ? text : null;
    }

    function updateShortlistControls() {
        const canUse = supportsShortlistWorkspace(selectedProcedure);
        shortlistMaxIncludedInput.disabled = !canUse || shortlistBusy;
        shortlistAdjustmentReasonInput.disabled = !canUse || shortlistBusy;
        shortlistBuildButton.disabled = !canUse || shortlistBusy;
        shortlistApplyButton.disabled = !canUse || shortlistBusy;
        shortlistAdjustmentsRefreshButton.disabled = !canUse || shortlistBusy || shortlistAdjustmentsBusy;
    }

    function clearShortlistData() {
        shortlistRecommendationsCache = [];
        shortlistGridInstance?.option("dataSource", []);
        shortlistAdjustmentsGridInstance?.option("dataSource", []);
    }

    function normalizeGuid(value) {
        if (value === null || value === undefined) {
            return null;
        }

        const text = String(value).trim();
        return text.length === 0 ? null : text;
    }

    function isGuid(value) {
        if (typeof value !== "string") {
            return false;
        }

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
    }

    function toIsoDate(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    function toNullableNumber(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function normalizeRequiredString(value, fallback) {
        const text = String(value ?? "").trim();
        return text.length > 0 ? text : fallback;
    }

    function normalizeNullableString(value) {
        if (value === null || value === undefined) {
            return null;
        }

        const text = String(value).trim();
        return text.length > 0 ? text : null;
    }

    function normalizeApprovalMode(value) {
        const normalized = String(value ?? "").trim();
        return approvalModes.includes(normalized) ? normalized : "InSystem";
    }

    function hasOwn(source, key) {
        return Object.prototype.hasOwnProperty.call(source, key);
    }

    function pickValue(values, key, fallback) {
        return hasOwn(values, key) ? values[key] : fallback;
    }

    function reasonRequired(currentStatus, targetStatus) {
        if (targetStatus === "Canceled") {
            return true;
        }

        const currentRank = statusRank[currentStatus];
        const targetRank = statusRank[targetStatus];
        return Number.isFinite(currentRank) && Number.isFinite(targetRank) && targetRank < currentRank;
    }

    function toListItem(details, fallback) {
        if (!details || typeof details !== "object") {
            return fallback;
        }

        return {
            id: details.id ?? fallback?.id,
            lotId: details.lotId ?? fallback?.lotId ?? null,
            status: details.status ?? fallback?.status ?? "Created",
            purchaseTypeCode: details.purchaseTypeCode ?? fallback?.purchaseTypeCode ?? "",
            objectName: details.objectName ?? fallback?.objectName ?? "",
            initiatorUserId: details.initiatorUserId ?? fallback?.initiatorUserId ?? null,
            responsibleCommercialUserId: details.responsibleCommercialUserId ?? fallback?.responsibleCommercialUserId ?? null,
            requiredSubcontractorDeadline: details.requiredSubcontractorDeadline ?? fallback?.requiredSubcontractorDeadline ?? null,
            approvalMode: details.approvalMode ?? fallback?.approvalMode ?? "InSystem",
            workScope: details.workScope ?? fallback?.workScope ?? "",
            plannedBudgetWithoutVat: details.plannedBudgetWithoutVat ?? fallback?.plannedBudgetWithoutVat ?? null,
            proposalDueDate: details.proposalDueDate ?? fallback?.proposalDueDate ?? null,
            notes: details.notes ?? fallback?.notes ?? null
        };
    }

    function createPayload(values) {
        const lotId = String(values.lotId ?? "").trim();
        if (!isGuid(lotId)) {
            throw new Error("Поле «Идентификатор лота» должно содержать корректный GUID.");
        }

        const purchaseTypeCode = normalizeRequiredString(values.purchaseTypeCode, "");
        if (!purchaseTypeCode) {
            throw new Error("Код типа закупки обязателен.");
        }

        const objectName = normalizeRequiredString(values.objectName, "");
        if (!objectName) {
            throw new Error("Наименование объекта обязательно.");
        }

        const workScope = normalizeRequiredString(values.workScope, "");
        if (!workScope) {
            throw new Error("Состав работ обязателен.");
        }

        return {
            lotId: lotId,
            requestDate: toIsoDate(values.requestDate),
            purchaseTypeCode: purchaseTypeCode,
            initiatorUserId: normalizeGuid(values.initiatorUserId),
            responsibleCommercialUserId: normalizeGuid(values.responsibleCommercialUserId),
            objectName: objectName,
            workScope: workScope,
            customerName: normalizeRequiredString(values.customerName, "Заказчик"),
            leadOfficeCode: normalizeRequiredString(values.leadOfficeCode, "MAIN"),
            analyticsLevel1Code: normalizeRequiredString(values.analyticsLevel1Code, "GEN"),
            analyticsLevel2Code: normalizeRequiredString(values.analyticsLevel2Code, "GEN"),
            analyticsLevel3Code: normalizeRequiredString(values.analyticsLevel3Code, "GEN"),
            analyticsLevel4Code: normalizeRequiredString(values.analyticsLevel4Code, "GEN"),
            analyticsLevel5Code: normalizeRequiredString(values.analyticsLevel5Code, "GEN"),
            customerContractNumber: normalizeNullableString(values.customerContractNumber),
            customerContractDate: toIsoDate(values.customerContractDate),
            requiredSubcontractorDeadline: toIsoDate(values.requiredSubcontractorDeadline),
            proposalDueDate: toIsoDate(values.proposalDueDate),
            plannedBudgetWithoutVat: toNullableNumber(values.plannedBudgetWithoutVat),
            notes: normalizeNullableString(values.notes),
            approvalMode: normalizeApprovalMode(values.approvalMode),
            approvalRouteCode: normalizeNullableString(values.approvalRouteCode),
            containsConfidentialInfo: Boolean(values.containsConfidentialInfo),
            requiresTechnicalNegotiations: Boolean(values.requiresTechnicalNegotiations),
            attachmentFileIds: []
        };
    }

    function updatePayload(details, values) {
        return {
            requestDate: toIsoDate(pickValue(values, "requestDate", details.requestDate)),
            purchaseTypeCode: normalizeRequiredString(
                pickValue(values, "purchaseTypeCode", details.purchaseTypeCode),
                "PT"
            ),
            initiatorUserId: normalizeGuid(pickValue(values, "initiatorUserId", details.initiatorUserId)),
            responsibleCommercialUserId: normalizeGuid(
                pickValue(values, "responsibleCommercialUserId", details.responsibleCommercialUserId)
            ),
            objectName: normalizeRequiredString(pickValue(values, "objectName", details.objectName), "Процедура"),
            workScope: normalizeRequiredString(pickValue(values, "workScope", details.workScope), "Scope"),
            customerName: normalizeRequiredString(pickValue(values, "customerName", details.customerName), "Customer"),
            leadOfficeCode: normalizeRequiredString(pickValue(values, "leadOfficeCode", details.leadOfficeCode), "MAIN"),
            analyticsLevel1Code: normalizeRequiredString(
                pickValue(values, "analyticsLevel1Code", details.analyticsLevel1Code),
                "GEN"
            ),
            analyticsLevel2Code: normalizeRequiredString(
                pickValue(values, "analyticsLevel2Code", details.analyticsLevel2Code),
                "GEN"
            ),
            analyticsLevel3Code: normalizeRequiredString(
                pickValue(values, "analyticsLevel3Code", details.analyticsLevel3Code),
                "GEN"
            ),
            analyticsLevel4Code: normalizeRequiredString(
                pickValue(values, "analyticsLevel4Code", details.analyticsLevel4Code),
                "GEN"
            ),
            analyticsLevel5Code: normalizeRequiredString(
                pickValue(values, "analyticsLevel5Code", details.analyticsLevel5Code),
                "GEN"
            ),
            customerContractNumber: normalizeNullableString(
                pickValue(values, "customerContractNumber", details.customerContractNumber)
            ),
            customerContractDate: toIsoDate(pickValue(values, "customerContractDate", details.customerContractDate)),
            requiredSubcontractorDeadline: toIsoDate(
                pickValue(values, "requiredSubcontractorDeadline", details.requiredSubcontractorDeadline)
            ),
            proposalDueDate: toIsoDate(pickValue(values, "proposalDueDate", details.proposalDueDate)),
            plannedBudgetWithoutVat: toNullableNumber(
                pickValue(values, "plannedBudgetWithoutVat", details.plannedBudgetWithoutVat)
            ),
            notes: normalizeNullableString(pickValue(values, "notes", details.notes)),
            approvalMode: normalizeApprovalMode(pickValue(values, "approvalMode", details.approvalMode)),
            approvalRouteCode: normalizeNullableString(pickValue(values, "approvalRouteCode", details.approvalRouteCode)),
            containsConfidentialInfo: Boolean(
                pickValue(values, "containsConfidentialInfo", details.containsConfidentialInfo)
            ),
            requiresTechnicalNegotiations: Boolean(
                pickValue(values, "requiresTechnicalNegotiations", details.requiresTechnicalNegotiations)
            ),
            attachmentFileIds: Array.isArray(details.attachments)
                ? details.attachments.map(function (item) { return item.id; })
                : []
        };
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

    async function getDetails(procedureId, forceReload) {
        if (!forceReload && detailsCache.has(procedureId)) {
            return detailsCache.get(procedureId);
        }

        const details = await request(`${endpoint}/${procedureId}`, {
            method: "GET"
        });

        detailsCache.set(procedureId, details);
        return details;
    }

    async function loadHistory(procedureId) {
        if (!historyGridInstance) {
            return;
        }

        if (!procedureId) {
            historyGridInstance.option("dataSource", []);
            return;
        }

        const history = await request(`${endpoint}/${procedureId}/history`, {
            method: "GET"
        });

        historyGridInstance.option("dataSource", Array.isArray(history) ? history : []);
    }

    async function loadShortlistRecommendations(procedureId) {
        if (!shortlistGridInstance) {
            return;
        }

        const currentProcedureId = String(procedureId || "");
        const compareProcedureId = currentProcedureId.toLowerCase();
        const recommendations = await request(`${endpoint}/${currentProcedureId}/shortlist/recommendations`, {
            method: "GET"
        });

        if (!selectedProcedure || String(selectedProcedure.id || "").toLowerCase() !== compareProcedureId) {
            return;
        }

        shortlistRecommendationsCache = Array.isArray(recommendations) ? recommendations : [];
        shortlistGridInstance.option("dataSource", shortlistRecommendationsCache);

        const recommendedCount = shortlistRecommendationsCache.filter(function (item) {
            return Boolean(item.isRecommended);
        }).length;

        setShortlistStatus(
            `Кандидатов: ${shortlistRecommendationsCache.length}. Рекомендовано: ${recommendedCount}.`,
            false);
    }

    async function loadShortlistAdjustments(procedureId) {
        if (!shortlistAdjustmentsGridInstance) {
            return;
        }

        const currentProcedureId = String(procedureId || "");
        const compareProcedureId = currentProcedureId.toLowerCase();
        const adjustments = await request(`${endpoint}/${currentProcedureId}/shortlist/adjustments`, {
            method: "GET"
        });

        if (!selectedProcedure || String(selectedProcedure.id || "").toLowerCase() !== compareProcedureId) {
            return;
        }

        const rows = Array.isArray(adjustments) ? adjustments : [];
        shortlistAdjustmentsGridInstance.option("dataSource", rows);
        setShortlistAdjustmentsStatus(`Записей в журнале: ${rows.length}.`, false);
    }

    function updateTransitionTargets() {
        targetSelect.innerHTML = "";
        if (!selectedProcedure) {
            targetSelect.disabled = true;
            applyButton.disabled = true;
            historyRefreshButton.disabled = true;
            return;
        }

        const targets = transitionMap[selectedProcedure.status] || [];
        if (targets.length === 0) {
            targetSelect.disabled = true;
            applyButton.disabled = true;
        } else {
            targets.forEach(function (targetStatus) {
                const option = document.createElement("option");
                option.value = targetStatus;
                option.textContent = localizeStatus(targetStatus);
                targetSelect.appendChild(option);
            });
            targetSelect.disabled = false;
            applyButton.disabled = false;
        }

        historyRefreshButton.disabled = false;
    }

    function applySelection(procedure) {
        selectedProcedure = procedure;
        shortlistBusy = false;
        shortlistAdjustmentsBusy = false;
        if (!procedure) {
            selectedElement.textContent = "Выберите процедуру в таблице, чтобы выполнить переход.";
            shortlistSelectedElement.textContent = "Выберите процедуру в таблице, чтобы сформировать рекомендации по списку кандидатов.";
            clearShortlistData();
            setShortlistStatus("Рекомендации ещё не сформированы.", false);
            setShortlistAdjustmentsStatus("Журнал корректировок пока не загружен.", false);
            updateTransitionTargets();
            updateShortlistControls();
            loadHistory(null).catch(function () {
                historyGridInstance?.option("dataSource", []);
            });
            return;
        }

        selectedElement.textContent = `Выбрано: ${procedure.objectName} · Статус: ${localizeStatus(procedure.status)} · Лот: ${procedure.lotId}`;
        shortlistSelectedElement.textContent = `Процедура: ${procedure.objectName} · Статус: ${localizeStatus(procedure.status)}`;
        updateTransitionTargets();
        updateShortlistControls();

        if (!supportsShortlistWorkspace(procedure)) {
            clearShortlistData();
            setShortlistStatus("Для завершённых и отменённых процедур автоподбор списка кандидатов недоступен.", false);
            setShortlistAdjustmentsStatus("Журнал корректировок недоступен для выбранного статуса процедуры.", false);
        } else {
            clearShortlistData();
            setShortlistStatus("Нажмите «Сформировать рекомендации», чтобы построить список кандидатов.", false);
            setShortlistAdjustmentsStatus("Загружаем журнал корректировок...", false);
            shortlistAdjustmentsBusy = true;
            updateShortlistControls();
            loadShortlistAdjustments(procedure.id).catch(function (error) {
                setShortlistAdjustmentsStatus(`Не удалось загрузить журнал корректировок: ${error.message}`, true);
            }).finally(function () {
                shortlistAdjustmentsBusy = false;
                updateShortlistControls();
            });
        }

        loadHistory(procedure.id).catch(function (error) {
            setTransitionStatus(`Не удалось загрузить историю статусов: ${error.message}`, true);
        });
    }

    async function refreshGridAndReselect(procedureId) {
        if (!gridInstance) {
            return;
        }

        await gridInstance.refresh();
        if (!procedureId) {
            return;
        }

        await gridInstance.selectRows([procedureId], false);
        const refreshed = proceduresCache.find(function (item) {
            return item.id === procedureId;
        });
        applySelection(refreshed ?? null);
    }

    const store = new window.DevExpress.data.CustomStore({
        key: "id",
        load: async function () {
            const payload = await request(endpoint, {
                method: "GET"
            });

            proceduresCache = Array.isArray(payload) ? payload : [];
            setStatus(appendFilterHint(`Загружено процедур: ${proceduresCache.length}.`), false);
            return proceduresCache;
        },
        insert: async function (values) {
            const payload = createPayload(values);
            const createdDetails = await request(endpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const created = toListItem(createdDetails, null);
            proceduresCache.push(created);
            detailsCache.set(created.id, createdDetails);
            setStatus(`Процедура создана для лота ${created.lotId}.`, false);
            return created;
        },
        update: async function (key, values) {
            const current = proceduresCache.find(function (item) {
                return item.id === key;
            });

            const details = await getDetails(key, false);
            const payload = updatePayload(details, values);
            const updatedDetails = await request(`${endpoint}/${key}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            detailsCache.set(key, updatedDetails);
            const updated = toListItem(updatedDetails, current);
            proceduresCache = proceduresCache.map(function (item) {
                return item.id === key ? updated : item;
            });

            setStatus(`Процедура '${updated.objectName}' обновлена.`, false);
            return updated;
        },
        remove: async function (key) {
            await request(`${endpoint}/${key}`, {
                method: "DELETE"
            });

            detailsCache.delete(key);
            proceduresCache = proceduresCache.filter(function (item) {
                return item.id !== key;
            });

            if (selectedProcedure && selectedProcedure.id === key) {
                applySelection(null);
            }

            setStatus("Процедура удалена.", false);
        }
    });

    historyGridInstance = window.jQuery(historyGridElement).dxDataGrid({
        dataSource: [],
        height: 320,
        showBorders: true,
        rowAlternationEnabled: true,
        paging: {
            pageSize: 10
        },
        pager: {
            showInfo: true
        },
        columns: [
            {
                dataField: "fromStatus",
                caption: "Из статуса",
                width: 190,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "toStatus",
                caption: "В статус",
                width: 190,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "reason",
                caption: "Причина"
            },
            {
                dataField: "changedBy",
                caption: "Кто изменил",
                width: 200
            },
            {
                dataField: "changedAtUtc",
                caption: "Дата изменения (UTC)",
                dataType: "datetime",
                format: "yyyy-MM-dd HH:mm",
                sortOrder: "desc",
                width: 180
            }
        ]
    }).dxDataGrid("instance");

    shortlistGridInstance = window.jQuery(shortlistGridElement).dxDataGrid({
        dataSource: [],
        height: 330,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        columnAutoWidth: true,
        paging: {
            pageSize: 8
        },
        pager: {
            showInfo: true
        },
        sorting: {
            mode: "multiple"
        },
        searchPanel: {
            visible: true,
            width: 260,
            placeholder: "Поиск по подрядчикам..."
        },
        columns: [
            {
                dataField: "contractorName",
                caption: "Субподрядчик",
                minWidth: 220
            },
            {
                dataField: "isRecommended",
                caption: "Рекомендован",
                dataType: "boolean",
                width: 130
            },
            {
                dataField: "suggestedSortOrder",
                caption: "Позиция",
                width: 95,
                customizeText: function (cellInfo) {
                    if (cellInfo.value === null || cellInfo.value === undefined) {
                        return "—";
                    }

                    return String(cellInfo.value);
                }
            },
            {
                dataField: "score",
                caption: "Баллы",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 90
            },
            {
                dataField: "currentLoadPercent",
                caption: "Загрузка, %",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 1
                },
                width: 120
            },
            {
                dataField: "currentRating",
                caption: "Рейтинг",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 95
            },
            {
                dataField: "contractorStatus",
                caption: "Статус",
                width: 130,
                customizeText: function (cellInfo) {
                    return localizeContractorStatus(cellInfo.value);
                }
            },
            {
                dataField: "reliabilityClass",
                caption: "Надёжность",
                width: 140,
                customizeText: function (cellInfo) {
                    return localizeReliabilityClass(cellInfo.value);
                }
            },
            {
                dataField: "hasRequiredQualifications",
                caption: "Квалификация OK",
                dataType: "boolean",
                width: 145
            },
            {
                dataField: "missingDisciplineCodes",
                caption: "Отсутствуют дисциплины",
                minWidth: 180,
                calculateCellValue: function (rowData) {
                    const codes = Array.isArray(rowData?.missingDisciplineCodes)
                        ? rowData.missingDisciplineCodes
                        : [];
                    return codes.join(", ");
                }
            },
            {
                dataField: "decisionFactors",
                caption: "Факторы решения",
                minWidth: 320,
                calculateCellValue: function (rowData) {
                    const factors = Array.isArray(rowData?.decisionFactors)
                        ? rowData.decisionFactors
                        : [];
                    return factors.join(" | ");
                }
            }
        ],
        onRowPrepared: function (e) {
            if (e.rowType === "data" && e.data && e.data.isRecommended === true) {
                window.jQuery(e.rowElement).addClass("procedures-shortlist-row--recommended");
            }
        }
    }).dxDataGrid("instance");

    shortlistAdjustmentsGridInstance = window.jQuery(shortlistAdjustmentsGridElement).dxDataGrid({
        dataSource: [],
        height: 300,
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
                dataField: "changedAtUtc",
                caption: "Дата изменения (UTC)",
                dataType: "datetime",
                format: "yyyy-MM-dd HH:mm",
                sortOrder: "desc",
                width: 175
            },
            {
                dataField: "contractorName",
                caption: "Субподрядчик",
                minWidth: 220
            },
            {
                dataField: "previousIsIncluded",
                caption: "Было включено",
                width: 120,
                customizeText: function (cellInfo) {
                    if (cellInfo.value === null || cellInfo.value === undefined) {
                        return "—";
                    }

                    return localizeBoolean(Boolean(cellInfo.value));
                }
            },
            {
                dataField: "newIsIncluded",
                caption: "Стало включено",
                width: 130,
                customizeText: function (cellInfo) {
                    return localizeBoolean(Boolean(cellInfo.value));
                }
            },
            {
                dataField: "previousSortOrder",
                caption: "Старая позиция",
                width: 115,
                customizeText: function (cellInfo) {
                    if (cellInfo.value === null || cellInfo.value === undefined) {
                        return "—";
                    }

                    return String(cellInfo.value);
                }
            },
            {
                dataField: "newSortOrder",
                caption: "Новая позиция",
                width: 115
            },
            {
                dataField: "previousExclusionReason",
                caption: "Старая причина исключения",
                minWidth: 200
            },
            {
                dataField: "newExclusionReason",
                caption: "Новая причина исключения",
                minWidth: 200
            },
            {
                dataField: "reason",
                caption: "Причина корректировки",
                minWidth: 230
            },
            {
                dataField: "changedBy",
                caption: "Кто изменил",
                width: 165
            }
        ]
    }).dxDataGrid("instance");

    gridInstance = window.jQuery(gridElement).dxDataGrid({
        dataSource: store,
        keyExpr: "id",
        height: 560,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        focusedRowEnabled: true,
        selection: {
            mode: "single"
        },
        columnAutoWidth: true,
        repaintChangesOnly: true,
        remoteOperations: false,
        sorting: {
            mode: "multiple"
        },
        searchPanel: {
            visible: true,
            width: 300,
            placeholder: "Поиск процедур...",
            text: urlFilterState.searchText
        },
        filterValue: urlFilterState.statusFilter,
        filterRow: {
            visible: true
        },
        headerFilter: {
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
            mode: "popup",
            allowAdding: true,
            allowUpdating: true,
            allowDeleting: true,
            useIcons: true,
            popup: {
                title: "Закупочная процедура",
                showTitle: true,
                width: 900
            },
            form: {
                colCount: 2,
                items: [
                    "lotId",
                    "purchaseTypeCode",
                    "objectName",
                    "workScope",
                    "approvalMode",
                    "responsibleCommercialUserId",
                    "requiredSubcontractorDeadline",
                    "proposalDueDate",
                    "plannedBudgetWithoutVat",
                    "customerName",
                    "leadOfficeCode",
                    "analyticsLevel1Code",
                    "analyticsLevel2Code",
                    "analyticsLevel3Code",
                    "analyticsLevel4Code",
                    "analyticsLevel5Code",
                    "notes",
                    "containsConfidentialInfo",
                    "requiresTechnicalNegotiations"
                ]
            }
        },
        columns: [
            {
                dataField: "id",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "lotId",
                caption: "Идентификатор лота",
                width: 230,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "status",
                caption: "Статус",
                lookup: {
                    dataSource: statusLookup,
                    valueExpr: "value",
                    displayExpr: "text"
                },
                allowEditing: false,
                width: 170
            },
            {
                dataField: "purchaseTypeCode",
                caption: "Тип закупки",
                width: 130,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "objectName",
                caption: "Объект закупки",
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "workScope",
                caption: "Состав работ",
                visible: false
            },
            {
                dataField: "approvalMode",
                caption: "Режим согласования",
                lookup: {
                    dataSource: approvalModeLookup,
                    valueExpr: "value",
                    displayExpr: "text"
                },
                width: 140
            },
            {
                dataField: "requiredSubcontractorDeadline",
                caption: "Требуемый срок",
                dataType: "date",
                width: 160
            },
            {
                dataField: "proposalDueDate",
                caption: "Срок предложений",
                dataType: "date",
                visible: false
            },
            {
                dataField: "plannedBudgetWithoutVat",
                caption: "Бюджет (без НДС)",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 170
            },
            {
                dataField: "responsibleCommercialUserId",
                caption: "ID ответственного",
                visible: false
            },
            {
                dataField: "customerName",
                caption: "Заказчик",
                visible: false
            },
            {
                dataField: "leadOfficeCode",
                caption: "Ведущий офис",
                visible: false
            },
            {
                dataField: "analyticsLevel1Code",
                caption: "Аналитика L1",
                visible: false
            },
            {
                dataField: "analyticsLevel2Code",
                caption: "Аналитика L2",
                visible: false
            },
            {
                dataField: "analyticsLevel3Code",
                caption: "Аналитика L3",
                visible: false
            },
            {
                dataField: "analyticsLevel4Code",
                caption: "Аналитика L4",
                visible: false
            },
            {
                dataField: "analyticsLevel5Code",
                caption: "Аналитика L5",
                visible: false
            },
            {
                dataField: "notes",
                caption: "Примечания",
                visible: false
            },
            {
                dataField: "containsConfidentialInfo",
                caption: "Конфиденциально",
                dataType: "boolean",
                visible: false
            },
            {
                dataField: "requiresTechnicalNegotiations",
                caption: "Тех. переговоры",
                dataType: "boolean",
                visible: false
            }
        ],
        onEditorPreparing: function (e) {
            if (e.parentType === "dataRow" && e.dataField === "lotId" && e.row && !e.row.isNewRow) {
                e.editorOptions.readOnly = true;
            }
        },
        onSelectionChanged: function (e) {
            const selected = Array.isArray(e.selectedRowsData) && e.selectedRowsData.length > 0
                ? e.selectedRowsData[0]
                : null;
            applySelection(selected);
        },
        onToolbarPreparing: function (e) {
            e.toolbarOptions.items.push({
                location: "after",
                widget: "dxButton",
                options: {
                    icon: "refresh",
                    text: "Обновить",
                    onClick: function () {
                        if (gridInstance) {
                            gridInstance.refresh();
                        }
                    }
                }
            });

            if (urlFilterState.hasAny) {
                e.toolbarOptions.items.push({
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "clear",
                        text: "Сбросить URL-фильтры",
                        onClick: function () {
                            clearUrlFilters();
                        }
                    }
                });
            }
        },
        onDataErrorOccurred: function (e) {
            setStatus(e.error?.message ?? "Ошибка операции с данными.", true);
        }
    }).dxDataGrid("instance");

    applyButton.addEventListener("click", function () {
        if (!selectedProcedure) {
            return;
        }

        const targetStatus = targetSelect.value;
        if (!targetStatus) {
            setTransitionStatus("Сначала выберите целевой статус.", true);
            return;
        }

        const reason = reasonInput.value.trim();
        if (reasonRequired(selectedProcedure.status, targetStatus) && !reason) {
            setTransitionStatus("Для отката или отмены необходимо указать причину.", true);
            return;
        }

        request(`${endpoint}/${selectedProcedure.id}/transition`, {
            method: "POST",
            body: JSON.stringify({
                targetStatus: targetStatus,
                reason: reason || null
            })
        }).then(function () {
            setTransitionStatus(`Переход выполнен: ${localizeStatus(selectedProcedure.status)} -> ${localizeStatus(targetStatus)}.`, false);
            reasonInput.value = "";
            return refreshGridAndReselect(selectedProcedure.id);
        }).then(function () {
            return loadHistory(selectedProcedure.id);
        }).catch(function (error) {
            setTransitionStatus(error.message || "Ошибка выполнения перехода.", true);
        });
    });

    historyRefreshButton.addEventListener("click", function () {
        if (!selectedProcedure) {
            return;
        }

        loadHistory(selectedProcedure.id).then(function () {
            setTransitionStatus("История обновлена.", false);
        }).catch(function (error) {
            setTransitionStatus(`Не удалось обновить историю: ${error.message}`, true);
        });
    });

    shortlistMaxIncludedInput.addEventListener("change", function () {
        const normalized = normalizeMaxIncluded(shortlistMaxIncludedInput.value);
        shortlistMaxIncludedInput.value = String(normalized);
    });

    shortlistBuildButton.addEventListener("click", function () {
        if (!selectedProcedure || !supportsShortlistWorkspace(selectedProcedure)) {
            return;
        }

        const procedureId = selectedProcedure.id;
        shortlistBusy = true;
        updateShortlistControls();
        setShortlistStatus("Формируем рекомендации по списку кандидатов...", false);

        loadShortlistRecommendations(procedureId).catch(function (error) {
            setShortlistStatus(`Не удалось сформировать рекомендации: ${error.message}`, true);
        }).finally(function () {
            shortlistBusy = false;
            updateShortlistControls();
        });
    });

    shortlistApplyButton.addEventListener("click", function () {
        if (!selectedProcedure || !supportsShortlistWorkspace(selectedProcedure)) {
            return;
        }

        const procedureId = selectedProcedure.id;
        const requestPayload = {
            maxIncluded: normalizeMaxIncluded(shortlistMaxIncludedInput.value),
            adjustmentReason: normalizeAdjustmentReason(shortlistAdjustmentReasonInput.value)
        };

        shortlistMaxIncludedInput.value = String(requestPayload.maxIncluded);
        shortlistBusy = true;
        shortlistAdjustmentsBusy = true;
        updateShortlistControls();
        setShortlistStatus("Применяем рекомендации в список кандидатов...", false);
        setShortlistAdjustmentsStatus("Обновляем журнал корректировок...", false);

        request(`${endpoint}/${procedureId}/shortlist/recommendations/apply`, {
            method: "POST",
            body: JSON.stringify(requestPayload)
        }).then(function (applyResult) {
            const includedCandidates = Number(applyResult?.includedCandidates ?? 0);
            const totalCandidates = Number(applyResult?.totalCandidates ?? 0);
            setShortlistStatus(
                `Рекомендации применены. Включено: ${includedCandidates} из ${totalCandidates} кандидатов.`,
                false);
            return Promise.all([
                loadShortlistRecommendations(procedureId),
                loadShortlistAdjustments(procedureId)
            ]);
        }).catch(function (error) {
            setShortlistStatus(`Не удалось применить рекомендации: ${error.message}`, true);
            setShortlistAdjustmentsStatus(`Не удалось обновить журнал корректировок: ${error.message}`, true);
        }).finally(function () {
            shortlistBusy = false;
            shortlistAdjustmentsBusy = false;
            updateShortlistControls();
        });
    });

    shortlistAdjustmentsRefreshButton.addEventListener("click", function () {
        if (!selectedProcedure || !supportsShortlistWorkspace(selectedProcedure)) {
            return;
        }

        const procedureId = selectedProcedure.id;
        shortlistAdjustmentsBusy = true;
        updateShortlistControls();
        setShortlistAdjustmentsStatus("Обновляем журнал корректировок...", false);

        loadShortlistAdjustments(procedureId).catch(function (error) {
            setShortlistAdjustmentsStatus(`Не удалось обновить журнал корректировок: ${error.message}`, true);
        }).finally(function () {
            shortlistAdjustmentsBusy = false;
            updateShortlistControls();
        });
    });

    applySelection(null);
})();
