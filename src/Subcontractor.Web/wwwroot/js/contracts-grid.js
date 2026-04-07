"use strict";

(function () {
    const moduleRoot = document.querySelector("[data-contracts-module]");
    if (!moduleRoot) {
        return;
    }

    const gridElement = moduleRoot.querySelector("[data-contracts-grid]");
    const statusElement = moduleRoot.querySelector("[data-contracts-status]");
    const selectedElement = moduleRoot.querySelector("[data-contracts-selected]");
    const transitionStatusElement = moduleRoot.querySelector("[data-contracts-transition-status]");
    const transitionTargetSelect = moduleRoot.querySelector("[data-contracts-target]");
    const transitionReasonInput = moduleRoot.querySelector("[data-contracts-reason]");
    const transitionApplyButton = moduleRoot.querySelector("[data-contracts-apply]");
    const historyRefreshButton = moduleRoot.querySelector("[data-contracts-history-refresh]");
    const historyGridElement = moduleRoot.querySelector("[data-contracts-history-grid]");
    const draftStatusElement = moduleRoot.querySelector("[data-contracts-draft-status]");
    const draftProcedureIdInput = moduleRoot.querySelector("[data-contracts-draft-procedure-id]");
    const draftNumberInput = moduleRoot.querySelector("[data-contracts-draft-number]");
    const draftSigningDateInput = moduleRoot.querySelector("[data-contracts-draft-signing-date]");
    const draftStartDateInput = moduleRoot.querySelector("[data-contracts-draft-start-date]");
    const draftEndDateInput = moduleRoot.querySelector("[data-contracts-draft-end-date]");
    const draftCreateButton = moduleRoot.querySelector("[data-contracts-draft-create]");
    const executionSelectedElement = moduleRoot.querySelector("[data-contracts-execution-selected]");
    const executionSummaryElement = moduleRoot.querySelector("[data-contracts-execution-summary]");
    const executionStatusElement = moduleRoot.querySelector("[data-contracts-execution-status]");
    const executionRefreshButton = moduleRoot.querySelector("[data-contracts-execution-refresh]");
    const executionGridElement = moduleRoot.querySelector("[data-contracts-execution-grid]");
    const monitoringSelectedElement = moduleRoot.querySelector("[data-contracts-monitoring-selected]");
    const monitoringStatusElement = moduleRoot.querySelector("[data-contracts-monitoring-status]");
    const monitoringRefreshButton = moduleRoot.querySelector("[data-contracts-monitoring-refresh]");
    const monitoringSaveButton = moduleRoot.querySelector("[data-contracts-monitoring-save]");
    const monitoringControlPointsGridElement = moduleRoot.querySelector("[data-contracts-monitoring-control-points-grid]");
    const monitoringStagesGridElement = moduleRoot.querySelector("[data-contracts-monitoring-stages-grid]");
    const monitoringMdrCardsGridElement = moduleRoot.querySelector("[data-contracts-monitoring-mdr-cards-grid]");
    const monitoringMdrRowsGridElement = moduleRoot.querySelector("[data-contracts-monitoring-mdr-rows-grid]");
    const monitoringControlPointSelectedElement = moduleRoot.querySelector("[data-contracts-monitoring-control-point-selected]");
    const monitoringMdrCardSelectedElement = moduleRoot.querySelector("[data-contracts-monitoring-mdr-card-selected]");
    const mdrImportFileInput = moduleRoot.querySelector("[data-contracts-mdr-import-file]");
    const mdrImportModeSelect = moduleRoot.querySelector("[data-contracts-mdr-import-mode]");
    const mdrImportApplyButton = moduleRoot.querySelector("[data-contracts-mdr-import-apply]");
    const mdrImportResetButton = moduleRoot.querySelector("[data-contracts-mdr-import-reset]");
    const mdrImportStatusElement = moduleRoot.querySelector("[data-contracts-mdr-import-status]");

    if (!gridElement || !statusElement || !selectedElement || !transitionStatusElement || !transitionTargetSelect ||
        !transitionReasonInput || !transitionApplyButton || !historyRefreshButton || !historyGridElement ||
        !draftStatusElement || !draftProcedureIdInput || !draftNumberInput || !draftSigningDateInput ||
        !draftStartDateInput || !draftEndDateInput || !draftCreateButton || !executionSelectedElement ||
        !executionSummaryElement || !executionStatusElement || !executionRefreshButton || !executionGridElement ||
        !monitoringSelectedElement || !monitoringStatusElement || !monitoringRefreshButton || !monitoringSaveButton ||
        !monitoringControlPointsGridElement || !monitoringStagesGridElement || !monitoringMdrCardsGridElement ||
        !monitoringMdrRowsGridElement || !monitoringControlPointSelectedElement || !monitoringMdrCardSelectedElement ||
        !mdrImportFileInput || !mdrImportModeSelect || !mdrImportApplyButton || !mdrImportResetButton || !mdrImportStatusElement) {
        return;
    }

    if (!(window.jQuery && window.DevExpress && window.DevExpress.data)) {
        statusElement.textContent = "Скрипты DevExpress не загружены. Проверьте доступ к CDN.";
        statusElement.classList.add("contracts-status--error");
        return;
    }

    const endpoint = moduleRoot.getAttribute("data-api-endpoint") || "/api/contracts";
    const statusValues = ["Draft", "OnApproval", "Signed", "Active", "Closed"];
    const statusCaptions = {
        Draft: "Черновик",
        OnApproval: "На согласовании",
        Signed: "Подписан",
        Active: "Действует",
        Closed: "Закрыт"
    };
    const statusLookup = statusValues.map(function (value) {
        return {
            value: value,
            text: statusCaptions[value] || value
        };
    });
    const urlFilterState = readUrlFilterState(statusValues);

    let contractsCache = [];
    let selectedContractId = null;
    let gridInstance = null;
    let historyGridInstance = null;
    let executionGridInstance = null;
    let monitoringControlPointsGridInstance = null;
    let monitoringStagesGridInstance = null;
    let monitoringMdrCardsGridInstance = null;
    let monitoringMdrRowsGridInstance = null;
    let selectedMonitoringControlPointClientId = null;
    let selectedMonitoringMdrCardClientId = null;
    let monitoringClientKeySequence = 0;

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
        statusElement.classList.toggle("contracts-status--error", Boolean(isError));
    }

    function setDraftStatus(message, isError) {
        draftStatusElement.textContent = message;
        draftStatusElement.classList.toggle("contracts-draft-status--error", Boolean(isError));
    }

    function setTransitionStatus(message, isError) {
        transitionStatusElement.textContent = message;
        transitionStatusElement.classList.toggle("contracts-transition-status--error", Boolean(isError));
    }

    function setExecutionStatus(message, isError) {
        executionStatusElement.textContent = message;
        executionStatusElement.classList.toggle("contracts-execution-status--error", Boolean(isError));
    }

    function setMonitoringStatus(message, isError) {
        monitoringStatusElement.textContent = message;
        monitoringStatusElement.classList.toggle("contracts-monitoring-status--error", Boolean(isError));
    }

    function setMdrImportStatus(message, isError) {
        mdrImportStatusElement.textContent = message;
        mdrImportStatusElement.classList.toggle("contracts-monitoring-status--error", Boolean(isError));
    }

    function localizeStatus(status) {
        return statusCaptions[String(status || "")] || String(status || "");
    }

    function setExecutionSummary(summary) {
        if (!summary) {
            executionSummaryElement.textContent = "Метрики исполнения пока не загружены.";
            executionSummaryElement.classList.remove("contracts-execution-summary--warning");
            return;
        }

        const total = Number(summary.milestonesTotal ?? 0);
        const completed = Number(summary.milestonesCompleted ?? 0);
        const overdue = Number(summary.overdueMilestones ?? 0);
        const progress = Number(summary.progressPercent ?? 0).toFixed(1);
        const nextPlannedDate = summary.nextPlannedDate
            ? new Date(summary.nextPlannedDate).toLocaleDateString("ru-RU")
            : "н/д";

        executionSummaryElement.textContent =
            `Прогресс: ${progress}% | Выполнено: ${completed}/${total} | Просрочено: ${overdue} | Ближайшая плановая дата: ${nextPlannedDate}`;
        executionSummaryElement.classList.toggle("contracts-execution-summary--warning", overdue > 0);
    }

    function getSelectedContract() {
        if (!selectedContractId) {
            return null;
        }

        return contractsCache.find(function (item) {
            return item.id === selectedContractId;
        }) || null;
    }

    function hasOwn(source, key) {
        return Object.prototype.hasOwnProperty.call(source, key);
    }

    function getStatusRank(status) {
        return statusValues.indexOf(String(status || ""));
    }

    function getTransitionTargets(status) {
        const rank = getStatusRank(status);
        if (rank < 0) {
            return [];
        }

        const targets = [];
        if (rank + 1 < statusValues.length) {
            targets.push(statusValues[rank + 1]);
        }

        if (rank - 1 >= 0) {
            targets.push(statusValues[rank - 1]);
        }

        return targets;
    }

    function updateTransitionTargets(targets) {
        transitionTargetSelect.innerHTML = "";

        targets.forEach(function (status) {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = localizeStatus(status);
            transitionTargetSelect.appendChild(option);
        });
    }

    function updateTransitionControls() {
        const selectedContract = getSelectedContract();
        if (!selectedContract) {
            selectedElement.textContent = "Выберите договор в таблице, чтобы управлять статусом.";
            transitionTargetSelect.disabled = true;
            transitionApplyButton.disabled = true;
            historyRefreshButton.disabled = true;
            transitionReasonInput.value = "";
            updateTransitionTargets([]);
            if (historyGridInstance) {
                historyGridInstance.option("dataSource", []);
            }
            return;
        }

        const targets = getTransitionTargets(selectedContract.status);
        selectedElement.textContent = `Выбрано: ${selectedContract.contractNumber} (${localizeStatus(selectedContract.status)})`;
        updateTransitionTargets(targets);

        const hasTargets = targets.length > 0;
        transitionTargetSelect.disabled = !hasTargets;
        transitionApplyButton.disabled = !hasTargets;
        historyRefreshButton.disabled = false;
    }

    function canEditMilestones(status) {
        return status === "Signed" || status === "Active";
    }

    function updateExecutionControls() {
        const selectedContract = getSelectedContract();
        if (!selectedContract) {
            executionSelectedElement.textContent = "Выберите договор в таблице, чтобы управлять этапами.";
            executionRefreshButton.disabled = true;
            setExecutionSummary(null);
            setExecutionStatus("Выберите договор в статусе «Подписан» или «Действует» для редактирования этапов.", false);
            if (executionGridInstance) {
                executionGridInstance.option("dataSource", []);
                executionGridInstance.option("editing.allowAdding", false);
                executionGridInstance.option("editing.allowUpdating", false);
                executionGridInstance.option("editing.allowDeleting", false);
            }
            return;
        }

        const editable = canEditMilestones(selectedContract.status);
        executionSelectedElement.textContent =
            `Исполнение: ${selectedContract.contractNumber} (${localizeStatus(selectedContract.status)})`;
        executionRefreshButton.disabled = false;

        if (executionGridInstance) {
            executionGridInstance.option("editing.allowAdding", editable);
            executionGridInstance.option("editing.allowUpdating", editable);
            executionGridInstance.option("editing.allowDeleting", editable);
        }

        if (editable) {
            setExecutionStatus("Этапы можно редактировать для статусов «Подписан» и «Действует».", false);
        } else {
            setExecutionStatus("Для текущего статуса договора этапы доступны только для чтения.", false);
        }
    }

    function createMonitoringClientId(prefix) {
        monitoringClientKeySequence += 1;
        return `${prefix}-${monitoringClientKeySequence}`;
    }

    function normalizeMonitoringControlPointStage(stage, index) {
        return {
            clientId: createMonitoringClientId("cp-stage"),
            name: String(stage?.name || "").trim(),
            plannedDate: stage?.plannedDate || null,
            forecastDate: stage?.forecastDate || null,
            actualDate: stage?.actualDate || null,
            progressPercent: toNumber(stage?.progressPercent, 0),
            sortOrder: Number.isFinite(Number(stage?.sortOrder)) ? Math.max(0, Math.trunc(Number(stage.sortOrder))) : index,
            notes: stage?.notes === null || stage?.notes === undefined
                ? null
                : String(stage.notes).trim() || null,
            isDelayed: Boolean(stage?.isDelayed)
        };
    }

    function normalizeMonitoringControlPoint(point, index) {
        const stages = (Array.isArray(point?.stages) ? point.stages : []).map(function (stage, stageIndex) {
            return normalizeMonitoringControlPointStage(stage, stageIndex);
        });

        return {
            clientId: createMonitoringClientId("cp"),
            name: String(point?.name || "").trim(),
            responsibleRole: point?.responsibleRole === null || point?.responsibleRole === undefined
                ? null
                : String(point.responsibleRole).trim() || null,
            plannedDate: point?.plannedDate || null,
            forecastDate: point?.forecastDate || null,
            actualDate: point?.actualDate || null,
            progressPercent: toNumber(point?.progressPercent, 0),
            sortOrder: Number.isFinite(Number(point?.sortOrder)) ? Math.max(0, Math.trunc(Number(point.sortOrder))) : index,
            notes: point?.notes === null || point?.notes === undefined
                ? null
                : String(point.notes).trim() || null,
            isDelayed: Boolean(point?.isDelayed),
            stages: stages
        };
    }

    function normalizeMonitoringMdrRow(row, index) {
        return {
            clientId: createMonitoringClientId("mdr-row"),
            rowCode: String(row?.rowCode || "").trim(),
            description: String(row?.description || "").trim(),
            unitCode: String(row?.unitCode || "").trim(),
            planValue: toNumber(row?.planValue, 0),
            forecastValue: toNumber(row?.forecastValue, 0),
            factValue: toNumber(row?.factValue, 0),
            sortOrder: Number.isFinite(Number(row?.sortOrder)) ? Math.max(0, Math.trunc(Number(row.sortOrder))) : index,
            notes: row?.notes === null || row?.notes === undefined
                ? null
                : String(row.notes).trim() || null,
            forecastDeviationPercent: row?.forecastDeviationPercent === null || row?.forecastDeviationPercent === undefined
                ? null
                : toNumber(row.forecastDeviationPercent, 0),
            factDeviationPercent: row?.factDeviationPercent === null || row?.factDeviationPercent === undefined
                ? null
                : toNumber(row.factDeviationPercent, 0)
        };
    }

    function normalizeMonitoringMdrCard(card, index) {
        const rows = (Array.isArray(card?.rows) ? card.rows : []).map(function (row, rowIndex) {
            return normalizeMonitoringMdrRow(row, rowIndex);
        });

        return {
            clientId: createMonitoringClientId("mdr-card"),
            title: String(card?.title || "").trim(),
            reportingDate: card?.reportingDate || null,
            sortOrder: Number.isFinite(Number(card?.sortOrder)) ? Math.max(0, Math.trunc(Number(card.sortOrder))) : index,
            notes: card?.notes === null || card?.notes === undefined
                ? null
                : String(card.notes).trim() || null,
            totalPlanValue: toNumber(card?.totalPlanValue, 0),
            totalForecastValue: toNumber(card?.totalForecastValue, 0),
            totalFactValue: toNumber(card?.totalFactValue, 0),
            forecastDeviationPercent: card?.forecastDeviationPercent === null || card?.forecastDeviationPercent === undefined
                ? null
                : toNumber(card.forecastDeviationPercent, 0),
            factDeviationPercent: card?.factDeviationPercent === null || card?.factDeviationPercent === undefined
                ? null
                : toNumber(card.factDeviationPercent, 0),
            rows: rows
        };
    }

    function toControlPointStageRequestItem(stage, index) {
        return {
            name: String(stage?.name || "").trim(),
            plannedDate: toNullableDate(stage?.plannedDate),
            forecastDate: toNullableDate(stage?.forecastDate),
            actualDate: toNullableDate(stage?.actualDate),
            progressPercent: toNumber(stage?.progressPercent, 0),
            sortOrder: Number.isFinite(Number(stage?.sortOrder)) ? Math.max(0, Math.trunc(Number(stage.sortOrder))) : index,
            notes: stage?.notes === null || stage?.notes === undefined
                ? null
                : String(stage.notes).trim() || null
        };
    }

    function toControlPointRequestItem(point, index) {
        const stages = Array.isArray(point?.stages) ? point.stages : [];
        return {
            name: String(point?.name || "").trim(),
            responsibleRole: point?.responsibleRole === null || point?.responsibleRole === undefined
                ? null
                : String(point.responsibleRole).trim() || null,
            plannedDate: toNullableDate(point?.plannedDate),
            forecastDate: toNullableDate(point?.forecastDate),
            actualDate: toNullableDate(point?.actualDate),
            progressPercent: toNumber(point?.progressPercent, 0),
            sortOrder: Number.isFinite(Number(point?.sortOrder)) ? Math.max(0, Math.trunc(Number(point.sortOrder))) : index,
            notes: point?.notes === null || point?.notes === undefined
                ? null
                : String(point.notes).trim() || null,
            stages: stages.map(function (stage, stageIndex) {
                return toControlPointStageRequestItem(stage, stageIndex);
            })
        };
    }

    function toMdrRowRequestItem(row, index) {
        return {
            rowCode: String(row?.rowCode || "").trim(),
            description: String(row?.description || "").trim(),
            unitCode: String(row?.unitCode || "").trim(),
            planValue: toNumber(row?.planValue, 0),
            forecastValue: toNumber(row?.forecastValue, 0),
            factValue: toNumber(row?.factValue, 0),
            sortOrder: Number.isFinite(Number(row?.sortOrder)) ? Math.max(0, Math.trunc(Number(row.sortOrder))) : index,
            notes: row?.notes === null || row?.notes === undefined
                ? null
                : String(row.notes).trim() || null
        };
    }

    function toMdrCardRequestItem(card, index) {
        const rows = Array.isArray(card?.rows) ? card.rows : [];
        return {
            title: String(card?.title || "").trim(),
            reportingDate: toNullableDate(card?.reportingDate),
            sortOrder: Number.isFinite(Number(card?.sortOrder)) ? Math.max(0, Math.trunc(Number(card.sortOrder))) : index,
            notes: card?.notes === null || card?.notes === undefined
                ? null
                : String(card.notes).trim() || null,
            rows: rows.map(function (row, rowIndex) {
                return toMdrRowRequestItem(row, rowIndex);
            })
        };
    }

    function calculateDeviationPercent(planValue, actualValue) {
        const plan = toNumber(planValue, 0);
        const actual = toNumber(actualValue, 0);
        if (plan <= 0) {
            return null;
        }

        return Number((((actual - plan) / plan) * 100).toFixed(2));
    }

    function calculateMdrCardMetrics(card) {
        const rows = Array.isArray(card?.rows) ? card.rows : [];
        const totalPlanValue = rows.reduce(function (sum, row) {
            return sum + toNumber(row?.planValue, 0);
        }, 0);
        const totalForecastValue = rows.reduce(function (sum, row) {
            return sum + toNumber(row?.forecastValue, 0);
        }, 0);
        const totalFactValue = rows.reduce(function (sum, row) {
            return sum + toNumber(row?.factValue, 0);
        }, 0);

        return {
            totalPlanValue: Number(totalPlanValue.toFixed(2)),
            totalForecastValue: Number(totalForecastValue.toFixed(2)),
            totalFactValue: Number(totalFactValue.toFixed(2)),
            forecastDeviationPercent: calculateDeviationPercent(totalPlanValue, totalForecastValue),
            factDeviationPercent: calculateDeviationPercent(totalPlanValue, totalFactValue)
        };
    }

    function getMonitoringControlPointsData() {
        const source = monitoringControlPointsGridInstance
            ? monitoringControlPointsGridInstance.option("dataSource")
            : [];
        return Array.isArray(source) ? source : [];
    }

    function getMonitoringMdrCardsData() {
        const source = monitoringMdrCardsGridInstance
            ? monitoringMdrCardsGridInstance.option("dataSource")
            : [];
        return Array.isArray(source) ? source : [];
    }

    function getSelectedMonitoringControlPoint() {
        if (!selectedMonitoringControlPointClientId) {
            return null;
        }

        const source = getMonitoringControlPointsData();
        return source.find(function (item) {
            return item.clientId === selectedMonitoringControlPointClientId;
        }) || null;
    }

    function getSelectedMonitoringMdrCard() {
        if (!selectedMonitoringMdrCardClientId) {
            return null;
        }

        const source = getMonitoringMdrCardsData();
        return source.find(function (item) {
            return item.clientId === selectedMonitoringMdrCardClientId;
        }) || null;
    }

    function setMonitoringGridEditing(editable) {
        const grids = [
            monitoringControlPointsGridInstance,
            monitoringStagesGridInstance,
            monitoringMdrCardsGridInstance,
            monitoringMdrRowsGridInstance
        ];

        grids.forEach(function (grid) {
            if (!grid) {
                return;
            }

            grid.option("editing.allowAdding", editable);
            grid.option("editing.allowUpdating", editable);
            grid.option("editing.allowDeleting", editable);
        });
    }

    function refreshMonitoringSelectionStatus() {
        const selectedControlPoint = getSelectedMonitoringControlPoint();
        const selectedMdrCard = getSelectedMonitoringMdrCard();

        if (selectedControlPoint) {
            monitoringControlPointSelectedElement.textContent =
                `Выбрана КП: ${selectedControlPoint.name || "без наименования"} | Этапов: ${(selectedControlPoint.stages || []).length}`;
        } else {
            monitoringControlPointSelectedElement.textContent = "Выберите контрольную точку для просмотра этапов.";
        }

        if (selectedMdrCard) {
            monitoringMdrCardSelectedElement.textContent =
                `Выбрана карточка MDR: ${selectedMdrCard.title || "без наименования"} | Строк: ${(selectedMdrCard.rows || []).length}`;
        } else {
            monitoringMdrCardSelectedElement.textContent = "Выберите карточку MDR для просмотра строк.";
        }
    }

    function refreshMonitoringStagesGrid() {
        if (!monitoringStagesGridInstance) {
            return;
        }

        const selectedControlPoint = getSelectedMonitoringControlPoint();
        const source = selectedControlPoint && Array.isArray(selectedControlPoint.stages)
            ? selectedControlPoint.stages
            : [];
        monitoringStagesGridInstance.option("dataSource", source);
        refreshMonitoringSelectionStatus();
    }

    function refreshMonitoringRowsGrid() {
        if (!monitoringMdrRowsGridInstance) {
            return;
        }

        const selectedMdrCard = getSelectedMonitoringMdrCard();
        const source = selectedMdrCard && Array.isArray(selectedMdrCard.rows)
            ? selectedMdrCard.rows
            : [];
        monitoringMdrRowsGridInstance.option("dataSource", source);
        refreshMonitoringSelectionStatus();
    }

    function syncStagesWithSelectedControlPoint() {
        const selectedControlPoint = getSelectedMonitoringControlPoint();
        if (!selectedControlPoint || !monitoringStagesGridInstance) {
            return;
        }

        const source = monitoringStagesGridInstance.option("dataSource");
        selectedControlPoint.stages = Array.isArray(source) ? source : [];
        if (monitoringControlPointsGridInstance) {
            monitoringControlPointsGridInstance.refresh();
        }
        refreshMonitoringSelectionStatus();
    }

    function syncRowsWithSelectedMdrCard() {
        const selectedMdrCard = getSelectedMonitoringMdrCard();
        if (!selectedMdrCard || !monitoringMdrRowsGridInstance) {
            return;
        }

        const source = monitoringMdrRowsGridInstance.option("dataSource");
        selectedMdrCard.rows = Array.isArray(source) ? source : [];
        if (monitoringMdrCardsGridInstance) {
            monitoringMdrCardsGridInstance.refresh();
        }
        refreshMonitoringSelectionStatus();
    }

    function ensureMonitoringSelection() {
        const controlPoints = getMonitoringControlPointsData();
        const hasSelectedControlPoint = controlPoints.some(function (item) {
            return item.clientId === selectedMonitoringControlPointClientId;
        });
        if (!hasSelectedControlPoint) {
            selectedMonitoringControlPointClientId = controlPoints.length > 0
                ? controlPoints[0].clientId
                : null;
        }

        if (monitoringControlPointsGridInstance) {
            if (selectedMonitoringControlPointClientId) {
                monitoringControlPointsGridInstance.selectRows([selectedMonitoringControlPointClientId], false);
            } else {
                monitoringControlPointsGridInstance.clearSelection();
            }
        }

        const mdrCards = getMonitoringMdrCardsData();
        const hasSelectedMdrCard = mdrCards.some(function (item) {
            return item.clientId === selectedMonitoringMdrCardClientId;
        });
        if (!hasSelectedMdrCard) {
            selectedMonitoringMdrCardClientId = mdrCards.length > 0
                ? mdrCards[0].clientId
                : null;
        }

        if (monitoringMdrCardsGridInstance) {
            if (selectedMonitoringMdrCardClientId) {
                monitoringMdrCardsGridInstance.selectRows([selectedMonitoringMdrCardClientId], false);
            } else {
                monitoringMdrCardsGridInstance.clearSelection();
            }
        }

        refreshMonitoringStagesGrid();
        refreshMonitoringRowsGrid();
    }

    function markMonitoringDirty() {
        setMonitoringStatus("Есть несохранённые изменения. Нажмите «Сохранить мониторинг».", false);
    }

    function buildMonitoringControlPointsPayload(items) {
        const source = Array.isArray(items) ? items : [];
        return source.map(function (point, pointIndex) {
            const name = String(point?.name || "").trim();
            if (!name) {
                throw new Error(`КП #${pointIndex + 1}: наименование обязательно.`);
            }

            const plannedDate = toNullableDate(point?.plannedDate);
            if (!plannedDate) {
                throw new Error(`КП #${pointIndex + 1}: плановая дата обязательна.`);
            }

            const progressPercent = toNumber(point?.progressPercent, 0);
            if (progressPercent < 0 || progressPercent > 100) {
                throw new Error(`КП #${pointIndex + 1}: прогресс должен быть в диапазоне 0..100.`);
            }

            const stages = Array.isArray(point?.stages) ? point.stages : [];
            const stageItems = stages.map(function (stage, stageIndex) {
                const stageName = String(stage?.name || "").trim();
                if (!stageName) {
                    throw new Error(`КП #${pointIndex + 1}, этап #${stageIndex + 1}: наименование обязательно.`);
                }

                const stagePlannedDate = toNullableDate(stage?.plannedDate);
                if (!stagePlannedDate) {
                    throw new Error(`КП #${pointIndex + 1}, этап #${stageIndex + 1}: плановая дата обязательна.`);
                }

                const stageProgress = toNumber(stage?.progressPercent, 0);
                if (stageProgress < 0 || stageProgress > 100) {
                    throw new Error(`КП #${pointIndex + 1}, этап #${stageIndex + 1}: прогресс должен быть в диапазоне 0..100.`);
                }

                return toControlPointStageRequestItem(stage, stageIndex);
            });

            return {
                name: name,
                responsibleRole: point?.responsibleRole === null || point?.responsibleRole === undefined
                    ? null
                    : String(point.responsibleRole).trim() || null,
                plannedDate: plannedDate,
                forecastDate: toNullableDate(point?.forecastDate),
                actualDate: toNullableDate(point?.actualDate),
                progressPercent: progressPercent,
                sortOrder: Number.isFinite(Number(point?.sortOrder))
                    ? Math.max(0, Math.trunc(Number(point.sortOrder)))
                    : pointIndex,
                notes: point?.notes === null || point?.notes === undefined
                    ? null
                    : String(point.notes).trim() || null,
                stages: stageItems
            };
        });
    }

    function buildMonitoringMdrCardsPayload(items) {
        const source = Array.isArray(items) ? items : [];
        return source.map(function (card, cardIndex) {
            const title = String(card?.title || "").trim();
            if (!title) {
                throw new Error(`MDR карточка #${cardIndex + 1}: наименование обязательно.`);
            }

            const reportingDate = toNullableDate(card?.reportingDate);
            if (!reportingDate) {
                throw new Error(`MDR карточка #${cardIndex + 1}: отчётная дата обязательна.`);
            }

            const rows = Array.isArray(card?.rows) ? card.rows : [];
            const rowItems = rows.map(function (row, rowIndex) {
                const rowCode = String(row?.rowCode || "").trim();
                if (!rowCode) {
                    throw new Error(`MDR карточка #${cardIndex + 1}, строка #${rowIndex + 1}: код строки обязателен.`);
                }

                const description = String(row?.description || "").trim();
                if (!description) {
                    throw new Error(`MDR карточка #${cardIndex + 1}, строка #${rowIndex + 1}: описание обязательно.`);
                }

                const unitCode = String(row?.unitCode || "").trim();
                if (!unitCode) {
                    throw new Error(`MDR карточка #${cardIndex + 1}, строка #${rowIndex + 1}: единица измерения обязательна.`);
                }

                const planValue = toNumber(row?.planValue, 0);
                const forecastValue = toNumber(row?.forecastValue, 0);
                const factValue = toNumber(row?.factValue, 0);
                if (planValue < 0 || forecastValue < 0 || factValue < 0) {
                    throw new Error(`MDR карточка #${cardIndex + 1}, строка #${rowIndex + 1}: значения не могут быть отрицательными.`);
                }

                return toMdrRowRequestItem(row, rowIndex);
            });

            return {
                title: title,
                reportingDate: reportingDate,
                sortOrder: Number.isFinite(Number(card?.sortOrder))
                    ? Math.max(0, Math.trunc(Number(card.sortOrder)))
                    : cardIndex,
                notes: card?.notes === null || card?.notes === undefined
                    ? null
                    : String(card.notes).trim() || null,
                rows: rowItems
            };
        });
    }

    function updateMdrImportButtons() {
        const selectedContract = getSelectedContract();
        const editable = selectedContract ? canEditMilestones(selectedContract.status) : false;
        const hasFile = Boolean(mdrImportFileInput.files && mdrImportFileInput.files.length > 0);
        mdrImportApplyButton.disabled = !(editable && hasFile);
        mdrImportResetButton.disabled = !(editable && hasFile);
    }

    function updateMonitoringControls() {
        const selectedContract = getSelectedContract();
        if (!selectedContract) {
            monitoringSelectedElement.textContent = "Выберите договор в таблице, чтобы работать с данными мониторинга.";
            monitoringRefreshButton.disabled = true;
            monitoringSaveButton.disabled = true;
            mdrImportFileInput.value = "";
            mdrImportFileInput.disabled = true;
            mdrImportModeSelect.disabled = true;
            updateMdrImportButtons();
            selectedMonitoringControlPointClientId = null;
            selectedMonitoringMdrCardClientId = null;
            if (monitoringControlPointsGridInstance) {
                monitoringControlPointsGridInstance.option("dataSource", []);
            }
            if (monitoringMdrCardsGridInstance) {
                monitoringMdrCardsGridInstance.option("dataSource", []);
            }
            refreshMonitoringStagesGrid();
            refreshMonitoringRowsGrid();
            setMonitoringGridEditing(false);
            setMonitoringStatus("Мониторинг ещё не загружен.", false);
            setMdrImportStatus("Выберите договор, чтобы выполнить импорт MDR.", false);
            return;
        }

        const editable = canEditMilestones(selectedContract.status);
        monitoringSelectedElement.textContent =
            `Мониторинг: ${selectedContract.contractNumber} (${localizeStatus(selectedContract.status)})`;
        monitoringRefreshButton.disabled = false;
        monitoringSaveButton.disabled = !editable;
        mdrImportFileInput.disabled = !editable;
        mdrImportModeSelect.disabled = !editable;
        updateMdrImportButtons();
        setMonitoringGridEditing(editable);
        refreshMonitoringSelectionStatus();

        if (editable) {
            setMonitoringStatus("Мониторинг доступен для редактирования в табличном режиме.", false);
            if (!mdrImportFileInput.files || mdrImportFileInput.files.length === 0) {
                setMdrImportStatus("Выберите файл Excel или CSV и нажмите «Импортировать в MDR».", false);
            }
        } else {
            setMonitoringStatus("Для текущего статуса мониторинг доступен только для чтения.", false);
            setMdrImportStatus("Импорт MDR доступен только для договоров в статусах «Подписан» и «Действует».", false);
        }
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

    function toNullableDate(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    function toNumber(value, fallbackValue) {
        if (value === null || value === undefined || value === "") {
            return fallbackValue;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : fallbackValue;
    }

    function isRowEmpty(values) {
        return !Array.isArray(values) || values.every(function (value) {
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
            throw new Error("Файл импорта пуст.");
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

    async function parseWorkbookRows(file) {
        if (!(window.XLSX && window.XLSX.read && window.XLSX.utils && window.XLSX.utils.sheet_to_json)) {
            throw new Error("Парсер XLSX не загружен. Проверьте подключение SheetJS.");
        }

        const bytes = await file.arrayBuffer();
        const workbook = window.XLSX.read(bytes, { type: "array", raw: false });
        if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
            throw new Error("Книга XLSX не содержит листов.");
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

    function normalizeImportHeader(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/\uFEFF/g, "")
            .replace(/[^a-zа-я0-9]+/gi, "");
    }

    function formatDateIso(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function parseImportDate(rawValue) {
        const normalized = String(rawValue ?? "").trim();
        if (!normalized) {
            return { value: null, error: "пустая дата" };
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

    function parseImportNumber(rawValue) {
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

    function resolveImportHeaderMap(headerRow) {
        const normalizedHeaders = (Array.isArray(headerRow) ? headerRow : []).map(normalizeImportHeader);
        const resolve = function (tokens) {
            for (let index = 0; index < normalizedHeaders.length; index += 1) {
                if (tokens.includes(normalizedHeaders[index])) {
                    return index;
                }
            }

            return -1;
        };

        return {
            cardTitle: resolve(["cardtitle", "title", "card", "карточка", "наименованиекарточки", "заголовоккарточки"]),
            reportingDate: resolve(["reportingdate", "reportdate", "датаотчета", "отчетнаядата"]),
            rowCode: resolve(["rowcode", "кодстроки", "код"]),
            forecastValue: resolve(["forecastvalue", "forecast", "прогноз", "значениепрогноз"]),
            factValue: resolve(["factvalue", "fact", "факт", "значениефакт"])
        };
    }

    function parseMdrImportItemsFromRows(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error("Файл импорта не содержит данных.");
        }

        const headerRow = rows[0];
        const map = resolveImportHeaderMap(headerRow);
        const missingColumns = [];
        if (map.cardTitle < 0) {
            missingColumns.push("Название карточки");
        }

        if (map.reportingDate < 0) {
            missingColumns.push("Отчетная дата");
        }

        if (map.rowCode < 0) {
            missingColumns.push("Код строки");
        }

        if (map.forecastValue < 0) {
            missingColumns.push("Прогноз");
        }

        if (map.factValue < 0) {
            missingColumns.push("Факт");
        }

        if (missingColumns.length > 0) {
            throw new Error(`Не найдены обязательные колонки: ${missingColumns.join(", ")}.`);
        }

        const errors = [];
        const items = [];

        for (let index = 1; index < rows.length; index += 1) {
            const row = Array.isArray(rows[index]) ? rows[index] : [];
            if (isRowEmpty(row)) {
                continue;
            }

            const sourceRowNumber = index + 1;
            const cardTitle = String(row[map.cardTitle] ?? "").trim();
            const rowCode = String(row[map.rowCode] ?? "").trim();
            const reportingDateResult = parseImportDate(row[map.reportingDate]);
            const forecastValue = parseImportNumber(row[map.forecastValue]);
            const factValue = parseImportNumber(row[map.factValue]);
            const rowErrors = [];

            if (!cardTitle) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Название карточки" обязательно.`);
            }

            if (!rowCode) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Код строки" обязательно.`);
            }

            if (reportingDateResult.error) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Отчетная дата" — ${reportingDateResult.error}.`);
            }

            if (!Number.isFinite(forecastValue) || forecastValue < 0) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Прогноз" должно быть неотрицательным числом.`);
            }

            if (!Number.isFinite(factValue) || factValue < 0) {
                rowErrors.push(`Строка ${sourceRowNumber}: поле "Факт" должно быть неотрицательным числом.`);
            }

            if (rowErrors.length > 0) {
                errors.push(...rowErrors);
                continue;
            }

            items.push({
                sourceRowNumber: sourceRowNumber,
                cardTitle: cardTitle,
                reportingDate: reportingDateResult.value,
                rowCode: rowCode,
                forecastValue: Number(forecastValue.toFixed(2)),
                factValue: Number(factValue.toFixed(2))
            });
        }

        if (errors.length > 0) {
            const preview = errors.slice(0, 12).join(" ");
            throw new Error(errors.length > 12
                ? `${preview} Показаны первые 12 ошибок из ${errors.length}.`
                : preview);
        }

        if (items.length === 0) {
            throw new Error("Не найдено валидных строк для импорта MDR.");
        }

        return items;
    }

    async function parseMdrImportFile(file) {
        const extension = String(file?.name || "")
            .split(".")
            .pop()
            ?.toLowerCase();

        if (extension === "csv" || extension === "txt") {
            const text = await file.text();
            return parseDelimitedText(text);
        }

        if (extension === "xlsx" || extension === "xls") {
            return parseWorkbookRows(file);
        }

        throw new Error("Неподдерживаемый формат файла. Используйте .csv, .txt, .xlsx или .xls.");
    }

    function parseErrorBody(rawText, statusCode) {
        if (!rawText) {
            return `Ошибка запроса (${statusCode}).`;
        }

        try {
            const body = JSON.parse(rawText);
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
            return rawText;
        }

        return rawText;
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
            const bodyText = await response.text();
            throw new Error(parseErrorBody(bodyText, response.status));
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    function buildMilestonesPayload(items) {
        const source = Array.isArray(items) ? items : [];

        return source.map(function (item, index) {
            const title = String(item.title ?? "").trim();
            if (!title) {
                throw new Error(`Этап #${index + 1}: наименование обязательно.`);
            }

            const plannedDate = toNullableDate(item.plannedDate);
            if (!plannedDate) {
                throw new Error(`Этап #${index + 1}: плановая дата обязательна.`);
            }

            const progressPercent = toNumber(item.progressPercent, 0);
            if (progressPercent < 0 || progressPercent > 100) {
                throw new Error(`Этап #${index + 1}: прогресс должен быть в диапазоне 0..100.`);
            }

            const sortOrder = Number.isFinite(Number(item.sortOrder))
                ? Math.max(0, Math.trunc(Number(item.sortOrder)))
                : index;

            const notes = item.notes === null || item.notes === undefined
                ? null
                : String(item.notes).trim() || null;

            return {
                title: title,
                plannedDate: plannedDate,
                actualDate: toNullableDate(item.actualDate),
                progressPercent: progressPercent,
                sortOrder: sortOrder,
                notes: notes
            };
        });
    }

    async function loadHistory(showStatusMessage) {
        const selectedContract = getSelectedContract();
        if (!historyGridInstance) {
            return;
        }

        if (!selectedContract) {
            historyGridInstance.option("dataSource", []);
            return;
        }

        try {
            const payload = await request(`${endpoint}/${selectedContract.id}/history`, {
                method: "GET"
            });

            const history = Array.isArray(payload) ? payload : [];
            historyGridInstance.option("dataSource", history);
            if (showStatusMessage) {
                setTransitionStatus(`Загружено записей истории: ${history.length}.`, false);
            }
        } catch (error) {
            setTransitionStatus(`Не удалось загрузить историю: ${error.message}`, true);
        }
    }

    async function loadExecutionSummary(showStatusMessage) {
        const selectedContract = getSelectedContract();
        if (!selectedContract) {
            setExecutionSummary(null);
            return;
        }

        try {
            const summary = await request(`${endpoint}/${selectedContract.id}/execution`, {
                method: "GET"
            });

            setExecutionSummary(summary);
            if (showStatusMessage) {
                setExecutionStatus("Сводка исполнения загружена.", false);
            }
        } catch (error) {
            setExecutionSummary(null);
            setExecutionStatus(`Не удалось загрузить сводку исполнения: ${error.message}`, true);
        }
    }

    async function loadMilestones(showStatusMessage) {
        const selectedContract = getSelectedContract();
        if (!executionGridInstance) {
            return;
        }

        if (!selectedContract) {
            executionGridInstance.option("dataSource", []);
            return;
        }

        try {
            const payload = await request(`${endpoint}/${selectedContract.id}/milestones`, {
                method: "GET"
            });
            const milestones = Array.isArray(payload) ? payload : [];
            executionGridInstance.option("dataSource", milestones);
            if (showStatusMessage) {
                setExecutionStatus(`Загружено этапов: ${milestones.length}.`, false);
            }
        } catch (error) {
            executionGridInstance.option("dataSource", []);
            setExecutionStatus(`Не удалось загрузить этапы: ${error.message}`, true);
        }
    }

    async function loadExecutionData(showStatusMessage) {
        await loadExecutionSummary(showStatusMessage);
        await loadMilestones(showStatusMessage);
    }

    async function loadMonitoringData(showStatusMessage) {
        const selectedContract = getSelectedContract();
        if (!selectedContract) {
            selectedMonitoringControlPointClientId = null;
            selectedMonitoringMdrCardClientId = null;
            if (monitoringControlPointsGridInstance) {
                monitoringControlPointsGridInstance.option("dataSource", []);
            }
            if (monitoringMdrCardsGridInstance) {
                monitoringMdrCardsGridInstance.option("dataSource", []);
            }
            refreshMonitoringStagesGrid();
            refreshMonitoringRowsGrid();
            return;
        }

        try {
            const controlPointsPayload = await request(`${endpoint}/${selectedContract.id}/monitoring/control-points`, {
                method: "GET"
            });
            const controlPoints = Array.isArray(controlPointsPayload) ? controlPointsPayload : [];
            const normalizedControlPoints = controlPoints.map(function (item, index) {
                return normalizeMonitoringControlPoint(item, index);
            });
            if (monitoringControlPointsGridInstance) {
                monitoringControlPointsGridInstance.option("dataSource", normalizedControlPoints);
            }

            const mdrCardsPayload = await request(`${endpoint}/${selectedContract.id}/monitoring/mdr-cards`, {
                method: "GET"
            });
            const mdrCards = Array.isArray(mdrCardsPayload) ? mdrCardsPayload : [];
            const normalizedMdrCards = mdrCards.map(function (item, index) {
                return normalizeMonitoringMdrCard(item, index);
            });
            if (monitoringMdrCardsGridInstance) {
                monitoringMdrCardsGridInstance.option("dataSource", normalizedMdrCards);
            }

            selectedMonitoringControlPointClientId = normalizedControlPoints.length > 0
                ? normalizedControlPoints[0].clientId
                : null;
            selectedMonitoringMdrCardClientId = normalizedMdrCards.length > 0
                ? normalizedMdrCards[0].clientId
                : null;
            ensureMonitoringSelection();

            if (showStatusMessage) {
                setMonitoringStatus(
                    `Загружено: КП ${controlPoints.length}, MDR карточек ${mdrCards.length}.`,
                    false);
            }
        } catch (error) {
            selectedMonitoringControlPointClientId = null;
            selectedMonitoringMdrCardClientId = null;
            if (monitoringControlPointsGridInstance) {
                monitoringControlPointsGridInstance.option("dataSource", []);
            }
            if (monitoringMdrCardsGridInstance) {
                monitoringMdrCardsGridInstance.option("dataSource", []);
            }
            refreshMonitoringStagesGrid();
            refreshMonitoringRowsGrid();
            setMonitoringStatus(`Не удалось загрузить мониторинг: ${error.message}`, true);
        }
    }

    async function saveMonitoringData() {
        const selectedContract = getSelectedContract();
        if (!selectedContract) {
            return;
        }

        if (!canEditMilestones(selectedContract.status)) {
            setMonitoringStatus("Для текущего статуса договора мониторинг доступен только для чтения.", true);
            return;
        }

        const controlPointItems = buildMonitoringControlPointsPayload(getMonitoringControlPointsData());
        const mdrCardItems = buildMonitoringMdrCardsPayload(getMonitoringMdrCardsData());

        const savedControlPoints = await request(`${endpoint}/${selectedContract.id}/monitoring/control-points`, {
            method: "PUT",
            body: JSON.stringify({
                items: controlPointItems
            })
        });

        const savedMdrCards = await request(`${endpoint}/${selectedContract.id}/monitoring/mdr-cards`, {
            method: "PUT",
            body: JSON.stringify({
                items: mdrCardItems
            })
        });

        const normalizedControlPoints = (Array.isArray(savedControlPoints) ? savedControlPoints : [])
            .map(function (item, index) {
                return normalizeMonitoringControlPoint(item, index);
            });
        const normalizedMdrCards = (Array.isArray(savedMdrCards) ? savedMdrCards : [])
            .map(function (item, index) {
                return normalizeMonitoringMdrCard(item, index);
            });

        if (monitoringControlPointsGridInstance) {
            monitoringControlPointsGridInstance.option("dataSource", normalizedControlPoints);
        }
        if (monitoringMdrCardsGridInstance) {
            monitoringMdrCardsGridInstance.option("dataSource", normalizedMdrCards);
        }

        if (!normalizedControlPoints.some(function (item) { return item.clientId === selectedMonitoringControlPointClientId; })) {
            selectedMonitoringControlPointClientId = normalizedControlPoints.length > 0
                ? normalizedControlPoints[0].clientId
                : null;
        }

        if (!normalizedMdrCards.some(function (item) { return item.clientId === selectedMonitoringMdrCardClientId; })) {
            selectedMonitoringMdrCardClientId = normalizedMdrCards.length > 0
                ? normalizedMdrCards[0].clientId
                : null;
        }

        ensureMonitoringSelection();
        setMonitoringStatus(
            `Мониторинг сохранён: КП ${normalizedControlPoints.length}, MDR карточек ${normalizedMdrCards.length}.`,
            false);
    }

    function buildMdrCardSelectionKey(card) {
        if (!card) {
            return "";
        }

        const title = String(card.title || "").trim().toUpperCase();
        const reportingDateText = String(card.reportingDate || "").trim();
        const reportingDate = reportingDateText ? reportingDateText.slice(0, 10) : "";
        return `${title}|${reportingDate}`;
    }

    function resetMdrImportInput(message) {
        mdrImportFileInput.value = "";
        setMdrImportStatus(message || "Импорт MDR ещё не выполнялся.", false);
    }

    async function importMdrForecastFact() {
        const selectedContract = getSelectedContract();
        if (!selectedContract) {
            throw new Error("Сначала выберите договор.");
        }

        if (!canEditMilestones(selectedContract.status)) {
            throw new Error("Импорт MDR доступен только для договоров в статусах «Подписан» и «Действует».");
        }

        const file = mdrImportFileInput.files && mdrImportFileInput.files.length > 0
            ? mdrImportFileInput.files[0]
            : null;
        if (!file) {
            throw new Error("Выберите файл импорта MDR.");
        }

        setMdrImportStatus("Разбор файла импорта...", false);
        const parsedRows = await parseMdrImportFile(file);
        const importItems = parseMdrImportItemsFromRows(parsedRows);
        const skipConflicts = String(mdrImportModeSelect.value || "strict").toLowerCase() === "skip";
        const previousCardKey = buildMdrCardSelectionKey(getSelectedMonitoringMdrCard());

        const result = await request(`${endpoint}/${selectedContract.id}/monitoring/mdr-cards/import-forecast-fact`, {
            method: "POST",
            body: JSON.stringify({
                skipConflicts: skipConflicts,
                items: importItems
            })
        });

        const cardsPayload = Array.isArray(result?.cards) ? result.cards : [];
        const normalizedMdrCards = cardsPayload.map(function (item, index) {
            return normalizeMonitoringMdrCard(item, index);
        });

        if (monitoringMdrCardsGridInstance) {
            monitoringMdrCardsGridInstance.option("dataSource", normalizedMdrCards);
        }

        const restoredCard = normalizedMdrCards.find(function (card) {
            return buildMdrCardSelectionKey(card) === previousCardKey;
        });
        selectedMonitoringMdrCardClientId = restoredCard
            ? restoredCard.clientId
            : (normalizedMdrCards.length > 0 ? normalizedMdrCards[0].clientId : null);
        ensureMonitoringSelection();

        const totalRows = Number(result?.totalRows ?? importItems.length);
        const updatedRows = Number(result?.updatedRows ?? 0);
        const conflictRows = Number(result?.conflictRows ?? 0);
        const applied = Boolean(result?.applied);
        const conflicts = Array.isArray(result?.conflicts) ? result.conflicts : [];
        const conflictPreview = conflicts
            .slice(0, 3)
            .map(function (item) {
                return `#${item.sourceRowNumber}: ${item.code}`;
            })
            .join("; ");
        const summary = `Импорт MDR: строк ${totalRows}, обновлено ${updatedRows}, конфликтов ${conflictRows}.`;

        if (!applied && conflictRows > 0) {
            const details = conflictPreview ? ` ${conflictPreview}` : "";
            setMdrImportStatus(`${summary} Изменения не применены (строгий режим).${details}`, true);
            setMonitoringStatus("Импорт MDR завершился конфликтами. Данные не изменены.", true);
            return;
        }

        if (conflictRows > 0) {
            const details = conflictPreview ? ` ${conflictPreview}` : "";
            setMdrImportStatus(`${summary} Конфликтные строки пропущены.${details}`, false);
            setMonitoringStatus("Импорт MDR применён частично (конфликтные строки пропущены).", false);
            return;
        }

        setMdrImportStatus(summary, false);
        setMonitoringStatus("Импорт MDR выполнен успешно.", false);
    }

    async function persistMilestones(message) {
        const selectedContract = getSelectedContract();
        if (!selectedContract || !executionGridInstance) {
            return;
        }

        if (!canEditMilestones(selectedContract.status)) {
            await loadMilestones(false);
            setExecutionStatus("Для текущего статуса договора этапы доступны только для чтения.", true);
            return;
        }

        const items = executionGridInstance.option("dataSource");

        const payload = {
            items: buildMilestonesPayload(items)
        };

        const updated = await request(`${endpoint}/${selectedContract.id}/milestones`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        executionGridInstance.option("dataSource", Array.isArray(updated) ? updated : []);
        await loadExecutionSummary(false);
        setExecutionStatus(message, false);
    }

    function validateCreatePayload(payload) {
        if (!isGuid(payload.lotId)) {
            throw new Error("Поле «Идентификатор лота» должно содержать корректный GUID.");
        }

        if (!isGuid(payload.procedureId)) {
            throw new Error("Поле «Идентификатор процедуры» должно содержать корректный GUID.");
        }

        if (!isGuid(payload.contractorId)) {
            throw new Error("Поле «Идентификатор подрядчика» должно содержать корректный GUID.");
        }

        if (!payload.contractNumber) {
            throw new Error("Номер договора обязателен.");
        }

        if (payload.amountWithoutVat < 0 || payload.vatAmount < 0 || payload.totalAmount < 0) {
            throw new Error("Суммы не могут быть отрицательными.");
        }

        const expectedTotal = payload.amountWithoutVat + payload.vatAmount;
        if (Math.abs(expectedTotal - payload.totalAmount) > 0.01) {
            throw new Error("Общая сумма должна быть равна amountWithoutVat + vatAmount.");
        }
    }

    function createRequestPayload(values) {
        const payload = {
            lotId: String(values.lotId ?? "").trim(),
            procedureId: String(values.procedureId ?? "").trim(),
            contractorId: String(values.contractorId ?? "").trim(),
            contractNumber: String(values.contractNumber ?? "").trim(),
            signingDate: toNullableDate(values.signingDate),
            amountWithoutVat: toNumber(values.amountWithoutVat, 0),
            vatAmount: toNumber(values.vatAmount, 0),
            totalAmount: toNumber(values.totalAmount, 0),
            startDate: toNullableDate(values.startDate),
            endDate: toNullableDate(values.endDate),
            status: "Draft"
        };

        validateCreatePayload(payload);
        return payload;
    }

    function updateRequestPayload(current, values) {
        const payload = {
            contractNumber: String(values.contractNumber ?? current.contractNumber ?? "").trim(),
            signingDate: hasOwn(values, "signingDate")
                ? toNullableDate(values.signingDate)
                : toNullableDate(current.signingDate),
            amountWithoutVat: toNumber(values.amountWithoutVat, current.amountWithoutVat ?? 0),
            vatAmount: toNumber(values.vatAmount, current.vatAmount ?? 0),
            totalAmount: toNumber(values.totalAmount, current.totalAmount ?? 0),
            startDate: hasOwn(values, "startDate")
                ? toNullableDate(values.startDate)
                : toNullableDate(current.startDate),
            endDate: hasOwn(values, "endDate")
                ? toNullableDate(values.endDate)
                : toNullableDate(current.endDate),
            status: String(current.status || "Draft")
        };

        if (!payload.contractNumber) {
            throw new Error("Номер договора обязателен.");
        }

        if (payload.amountWithoutVat < 0 || payload.vatAmount < 0 || payload.totalAmount < 0) {
            throw new Error("Суммы не могут быть отрицательными.");
        }

        const expectedTotal = payload.amountWithoutVat + payload.vatAmount;
        if (Math.abs(expectedTotal - payload.totalAmount) > 0.01) {
            throw new Error("Общая сумма должна быть равна amountWithoutVat + vatAmount.");
        }

        return payload;
    }

    function clearDraftInputs() {
        draftProcedureIdInput.value = "";
        draftNumberInput.value = "";
        draftSigningDateInput.value = "";
        draftStartDateInput.value = "";
        draftEndDateInput.value = "";
    }

    async function refreshGridAndFocus(contractId) {
        if (!gridInstance) {
            return;
        }

        await gridInstance.refresh();

        if (contractId) {
            selectedContractId = contractId;
            await gridInstance.selectRows([contractId], false);
        } else if (selectedContractId) {
            await gridInstance.selectRows([selectedContractId], false);
        }

        updateTransitionControls();
        updateExecutionControls();
        updateMonitoringControls();
        await loadHistory(false);
        await loadExecutionData(false);
        await loadMonitoringData(false);
    }

    const store = new window.DevExpress.data.CustomStore({
        key: "id",
        load: async function () {
            const payload = await request(endpoint, {
                method: "GET"
            });

            contractsCache = Array.isArray(payload) ? payload : [];
            setStatus(appendFilterHint(`Загружено договоров: ${contractsCache.length}.`), false);
            updateTransitionControls();
            updateExecutionControls();
            updateMonitoringControls();
            return contractsCache;
        },
        insert: async function (values) {
            const payload = createRequestPayload(values);
            const created = await request(endpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            contractsCache.push(created);
            setStatus(`Договор '${created.contractNumber}' создан.`, false);
            return created;
        },
        update: async function (key, values) {
            const current = contractsCache.find(function (item) {
                return item.id === key;
            });

            if (!current) {
                throw new Error("Текущая запись договора не найдена в кэше.");
            }

            const payload = updateRequestPayload(current, values);
            const updated = await request(`${endpoint}/${key}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            contractsCache = contractsCache.map(function (item) {
                return item.id === key ? updated : item;
            });

            setStatus(`Договор '${updated.contractNumber}' обновлён.`, false);
            return updated;
        },
        remove: async function (key) {
            await request(`${endpoint}/${key}`, {
                method: "DELETE"
            });

            contractsCache = contractsCache.filter(function (item) {
                return item.id !== key;
            });

            if (selectedContractId === key) {
                selectedContractId = null;
            }

            setStatus("Договор удалён.", false);
            updateTransitionControls();
            updateExecutionControls();
            updateMonitoringControls();
        }
    });

    historyGridInstance = window.jQuery(historyGridElement).dxDataGrid({
        dataSource: [],
        keyExpr: "id",
        height: 260,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        columnAutoWidth: true,
        sorting: {
            mode: "multiple"
        },
        paging: {
            pageSize: 10
        },
        pager: {
            showInfo: true,
            showPageSizeSelector: true,
            allowedPageSizes: [10, 20, 40]
        },
        columns: [
            {
                dataField: "id",
                visible: false
            },
            {
                dataField: "fromStatus",
                caption: "Из статуса",
                width: 150,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "toStatus",
                caption: "В статус",
                width: 150,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "reason",
                caption: "Причина",
                minWidth: 260
            },
            {
                dataField: "changedBy",
                caption: "Кто изменил",
                width: 160
            },
            {
                dataField: "changedAtUtc",
                caption: "Дата изменения (UTC)",
                dataType: "datetime",
                width: 200
            }
        ]
    }).dxDataGrid("instance");

    executionGridInstance = window.jQuery(executionGridElement).dxDataGrid({
        dataSource: [],
        keyExpr: "id",
        height: 320,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        columnAutoWidth: true,
        sorting: {
            mode: "multiple"
        },
        paging: {
            pageSize: 10
        },
        pager: {
            showInfo: true,
            showPageSizeSelector: true,
            allowedPageSizes: [10, 20, 40]
        },
        editing: {
            mode: "popup",
            allowAdding: false,
            allowUpdating: false,
            allowDeleting: false,
            useIcons: true,
            popup: {
                title: "Этап исполнения",
                showTitle: true,
                width: 720
            },
            form: {
                colCount: 2,
                items: [
                    "title",
                    "sortOrder",
                    "plannedDate",
                    "actualDate",
                    "progressPercent",
                    {
                        dataField: "notes",
                        colSpan: 2,
                        editorType: "dxTextArea",
                        editorOptions: {
                            minHeight: 100
                        }
                    }
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
                dataField: "title",
                caption: "Этап",
                validationRules: [
                    { type: "required" }
                ],
                minWidth: 260
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                dataField: "plannedDate",
                caption: "Плановая дата",
                dataType: "date",
                width: 140,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "actualDate",
                caption: "Фактическая дата",
                dataType: "date",
                width: 140
            },
            {
                dataField: "progressPercent",
                caption: "Прогресс %",
                dataType: "number",
                width: 120,
                format: {
                    type: "fixedPoint",
                    precision: 2
                }
            },
            {
                dataField: "isOverdue",
                caption: "Просрочен",
                dataType: "boolean",
                allowEditing: false,
                width: 110
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 220
            }
        ],
        onInitNewRow: function (e) {
            const items = e.component.option("dataSource");
            const source = Array.isArray(items) ? items : [];
            e.data.sortOrder = source.length;
            e.data.progressPercent = 0;
        },
        onRowInserted: function () {
            persistMilestones("Этап добавлен.").catch(function (error) {
                setExecutionStatus(error.message || "Не удалось сохранить этапы.", true);
            });
        },
        onRowUpdated: function () {
            persistMilestones("Этап обновлён.").catch(function (error) {
                setExecutionStatus(error.message || "Не удалось сохранить этапы.", true);
            });
        },
        onRowRemoved: function () {
            persistMilestones("Этап удалён.").catch(function (error) {
                setExecutionStatus(error.message || "Не удалось сохранить этапы.", true);
            });
        },
        onDataErrorOccurred: function (e) {
            setExecutionStatus(e.error?.message ?? "Ошибка операции с этапами.", true);
        }
    }).dxDataGrid("instance");

    monitoringControlPointsGridInstance = window.jQuery(monitoringControlPointsGridElement).dxDataGrid({
        dataSource: [],
        keyExpr: "clientId",
        height: 280,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        selection: {
            mode: "single"
        },
        columnAutoWidth: true,
        sorting: {
            mode: "multiple"
        },
        paging: {
            pageSize: 8
        },
        pager: {
            showInfo: true,
            showPageSizeSelector: true,
            allowedPageSizes: [8, 16, 30]
        },
        editing: {
            mode: "popup",
            allowAdding: false,
            allowUpdating: false,
            allowDeleting: false,
            useIcons: true,
            popup: {
                title: "Контрольная точка",
                showTitle: true,
                width: 760
            },
            form: {
                colCount: 2,
                items: [
                    "name",
                    "responsibleRole",
                    "plannedDate",
                    "forecastDate",
                    "actualDate",
                    "progressPercent",
                    "sortOrder",
                    {
                        dataField: "notes",
                        colSpan: 2,
                        editorType: "dxTextArea",
                        editorOptions: {
                            minHeight: 90
                        }
                    }
                ]
            }
        },
        columns: [
            {
                dataField: "clientId",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "name",
                caption: "Контрольная точка",
                validationRules: [
                    { type: "required" }
                ],
                minWidth: 220
            },
            {
                dataField: "responsibleRole",
                caption: "Ответственный",
                width: 140
            },
            {
                dataField: "plannedDate",
                caption: "План",
                dataType: "date",
                width: 120,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "forecastDate",
                caption: "Прогноз",
                dataType: "date",
                width: 120
            },
            {
                dataField: "actualDate",
                caption: "Факт",
                dataType: "date",
                width: 120
            },
            {
                dataField: "progressPercent",
                caption: "Прогресс %",
                dataType: "number",
                width: 120,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                validationRules: [
                    {
                        type: "range",
                        min: 0,
                        max: 100
                    }
                ]
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                caption: "Этапов",
                dataType: "number",
                allowEditing: false,
                width: 90,
                calculateCellValue: function (rowData) {
                    return Array.isArray(rowData?.stages) ? rowData.stages.length : 0;
                }
            },
            {
                dataField: "isDelayed",
                caption: "Просрочена",
                dataType: "boolean",
                allowEditing: false,
                width: 110
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 180
            }
        ],
        onSelectionChanged: function (e) {
            selectedMonitoringControlPointClientId = e.selectedRowKeys.length > 0
                ? e.selectedRowKeys[0]
                : null;
            refreshMonitoringStagesGrid();
        },
        onInitNewRow: function (e) {
            const items = e.component.option("dataSource");
            const source = Array.isArray(items) ? items : [];
            e.data.clientId = createMonitoringClientId("cp");
            e.data.sortOrder = source.length;
            e.data.progressPercent = 0;
            e.data.stages = [];
            e.data.isDelayed = false;
        },
        onRowInserting: function (e) {
            if (!Array.isArray(e.data.stages)) {
                e.data.stages = [];
            }
        },
        onRowUpdating: function (e) {
            if (!e.newData.clientId) {
                e.newData.clientId = e.oldData?.clientId || createMonitoringClientId("cp");
            }

            if (!Array.isArray(e.newData.stages)) {
                e.newData.stages = Array.isArray(e.oldData?.stages) ? e.oldData.stages : [];
            }
        },
        onRowInserted: function () {
            ensureMonitoringSelection();
            markMonitoringDirty();
        },
        onRowUpdated: function () {
            ensureMonitoringSelection();
            markMonitoringDirty();
        },
        onRowRemoved: function () {
            ensureMonitoringSelection();
            markMonitoringDirty();
        },
        onDataErrorOccurred: function (e) {
            setMonitoringStatus(e.error?.message ?? "Ошибка операции с контрольными точками.", true);
        }
    }).dxDataGrid("instance");

    monitoringStagesGridInstance = window.jQuery(monitoringStagesGridElement).dxDataGrid({
        dataSource: [],
        keyExpr: "clientId",
        height: 260,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        columnAutoWidth: true,
        sorting: {
            mode: "multiple"
        },
        paging: {
            pageSize: 8
        },
        pager: {
            showInfo: true,
            showPageSizeSelector: true,
            allowedPageSizes: [8, 16, 30]
        },
        editing: {
            mode: "popup",
            allowAdding: false,
            allowUpdating: false,
            allowDeleting: false,
            useIcons: true,
            popup: {
                title: "Этап контрольной точки",
                showTitle: true,
                width: 720
            },
            form: {
                colCount: 2,
                items: [
                    "name",
                    "plannedDate",
                    "forecastDate",
                    "actualDate",
                    "progressPercent",
                    "sortOrder",
                    {
                        dataField: "notes",
                        colSpan: 2,
                        editorType: "dxTextArea",
                        editorOptions: {
                            minHeight: 90
                        }
                    }
                ]
            }
        },
        columns: [
            {
                dataField: "clientId",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "name",
                caption: "Этап",
                validationRules: [
                    { type: "required" }
                ],
                minWidth: 220
            },
            {
                dataField: "plannedDate",
                caption: "План",
                dataType: "date",
                width: 120,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "forecastDate",
                caption: "Прогноз",
                dataType: "date",
                width: 120
            },
            {
                dataField: "actualDate",
                caption: "Факт",
                dataType: "date",
                width: 120
            },
            {
                dataField: "progressPercent",
                caption: "Прогресс %",
                dataType: "number",
                width: 120,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                validationRules: [
                    {
                        type: "range",
                        min: 0,
                        max: 100
                    }
                ]
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                dataField: "isDelayed",
                caption: "Просрочен",
                dataType: "boolean",
                allowEditing: false,
                width: 110
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 180
            }
        ],
        onInitNewRow: function (e) {
            const items = e.component.option("dataSource");
            const source = Array.isArray(items) ? items : [];
            e.data.clientId = createMonitoringClientId("cp-stage");
            e.data.sortOrder = source.length;
            e.data.progressPercent = 0;
            e.data.isDelayed = false;
        },
        onRowInserting: function (e) {
            if (!getSelectedMonitoringControlPoint()) {
                e.cancel = true;
                setMonitoringStatus("Сначала выберите контрольную точку.", true);
            }
        },
        onRowUpdating: function (e) {
            if (!e.newData.clientId) {
                e.newData.clientId = e.oldData?.clientId || createMonitoringClientId("cp-stage");
            }
        },
        onRowInserted: function () {
            syncStagesWithSelectedControlPoint();
            markMonitoringDirty();
        },
        onRowUpdated: function () {
            syncStagesWithSelectedControlPoint();
            markMonitoringDirty();
        },
        onRowRemoved: function () {
            syncStagesWithSelectedControlPoint();
            markMonitoringDirty();
        },
        onDataErrorOccurred: function (e) {
            setMonitoringStatus(e.error?.message ?? "Ошибка операции с этапами контрольной точки.", true);
        }
    }).dxDataGrid("instance");

    monitoringMdrCardsGridInstance = window.jQuery(monitoringMdrCardsGridElement).dxDataGrid({
        dataSource: [],
        keyExpr: "clientId",
        height: 280,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        selection: {
            mode: "single"
        },
        columnAutoWidth: true,
        sorting: {
            mode: "multiple"
        },
        paging: {
            pageSize: 8
        },
        pager: {
            showInfo: true,
            showPageSizeSelector: true,
            allowedPageSizes: [8, 16, 30]
        },
        editing: {
            mode: "popup",
            allowAdding: false,
            allowUpdating: false,
            allowDeleting: false,
            useIcons: true,
            popup: {
                title: "Карточка MDR",
                showTitle: true,
                width: 760
            },
            form: {
                colCount: 2,
                items: [
                    "title",
                    "reportingDate",
                    "sortOrder",
                    {
                        dataField: "notes",
                        colSpan: 2,
                        editorType: "dxTextArea",
                        editorOptions: {
                            minHeight: 90
                        }
                    }
                ]
            }
        },
        columns: [
            {
                dataField: "clientId",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "title",
                caption: "Карточка",
                validationRules: [
                    { type: "required" }
                ],
                minWidth: 200
            },
            {
                dataField: "reportingDate",
                caption: "Отчётная дата",
                dataType: "date",
                width: 140,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                caption: "Строк",
                dataType: "number",
                allowEditing: false,
                width: 80,
                calculateCellValue: function (rowData) {
                    return Array.isArray(rowData?.rows) ? rowData.rows.length : 0;
                }
            },
            {
                caption: "План",
                dataType: "number",
                allowEditing: false,
                width: 110,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                calculateCellValue: function (rowData) {
                    return calculateMdrCardMetrics(rowData).totalPlanValue;
                }
            },
            {
                caption: "Прогноз",
                dataType: "number",
                allowEditing: false,
                width: 120,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                calculateCellValue: function (rowData) {
                    return calculateMdrCardMetrics(rowData).totalForecastValue;
                }
            },
            {
                caption: "Факт",
                dataType: "number",
                allowEditing: false,
                width: 110,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                calculateCellValue: function (rowData) {
                    return calculateMdrCardMetrics(rowData).totalFactValue;
                }
            },
            {
                caption: "Откл. прогноза, %",
                dataType: "number",
                allowEditing: false,
                width: 150,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                calculateCellValue: function (rowData) {
                    return calculateMdrCardMetrics(rowData).forecastDeviationPercent;
                }
            },
            {
                caption: "Откл. факта, %",
                dataType: "number",
                allowEditing: false,
                width: 130,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                calculateCellValue: function (rowData) {
                    return calculateMdrCardMetrics(rowData).factDeviationPercent;
                }
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 180
            }
        ],
        onSelectionChanged: function (e) {
            selectedMonitoringMdrCardClientId = e.selectedRowKeys.length > 0
                ? e.selectedRowKeys[0]
                : null;
            refreshMonitoringRowsGrid();
        },
        onInitNewRow: function (e) {
            const items = e.component.option("dataSource");
            const source = Array.isArray(items) ? items : [];
            e.data.clientId = createMonitoringClientId("mdr-card");
            e.data.sortOrder = source.length;
            e.data.rows = [];
        },
        onRowInserting: function (e) {
            if (!Array.isArray(e.data.rows)) {
                e.data.rows = [];
            }
        },
        onRowUpdating: function (e) {
            if (!e.newData.clientId) {
                e.newData.clientId = e.oldData?.clientId || createMonitoringClientId("mdr-card");
            }

            if (!Array.isArray(e.newData.rows)) {
                e.newData.rows = Array.isArray(e.oldData?.rows) ? e.oldData.rows : [];
            }
        },
        onRowInserted: function () {
            ensureMonitoringSelection();
            markMonitoringDirty();
        },
        onRowUpdated: function () {
            ensureMonitoringSelection();
            markMonitoringDirty();
        },
        onRowRemoved: function () {
            ensureMonitoringSelection();
            markMonitoringDirty();
        },
        onDataErrorOccurred: function (e) {
            setMonitoringStatus(e.error?.message ?? "Ошибка операции с карточками MDR.", true);
        }
    }).dxDataGrid("instance");

    monitoringMdrRowsGridInstance = window.jQuery(monitoringMdrRowsGridElement).dxDataGrid({
        dataSource: [],
        keyExpr: "clientId",
        height: 260,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        columnAutoWidth: true,
        sorting: {
            mode: "multiple"
        },
        paging: {
            pageSize: 8
        },
        pager: {
            showInfo: true,
            showPageSizeSelector: true,
            allowedPageSizes: [8, 16, 30]
        },
        editing: {
            mode: "popup",
            allowAdding: false,
            allowUpdating: false,
            allowDeleting: false,
            useIcons: true,
            popup: {
                title: "Строка MDR",
                showTitle: true,
                width: 860
            },
            form: {
                colCount: 2,
                items: [
                    "rowCode",
                    "unitCode",
                    {
                        dataField: "description",
                        colSpan: 2
                    },
                    "planValue",
                    "forecastValue",
                    "factValue",
                    "sortOrder",
                    {
                        dataField: "notes",
                        colSpan: 2,
                        editorType: "dxTextArea",
                        editorOptions: {
                            minHeight: 90
                        }
                    }
                ]
            }
        },
        columns: [
            {
                dataField: "clientId",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "rowCode",
                caption: "Код",
                validationRules: [
                    { type: "required" }
                ],
                width: 110
            },
            {
                dataField: "description",
                caption: "Описание",
                validationRules: [
                    { type: "required" }
                ],
                minWidth: 220
            },
            {
                dataField: "unitCode",
                caption: "Ед.",
                validationRules: [
                    { type: "required" }
                ],
                width: 90
            },
            {
                dataField: "planValue",
                caption: "План",
                dataType: "number",
                width: 110,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                validationRules: [
                    {
                        type: "range",
                        min: 0
                    }
                ]
            },
            {
                dataField: "forecastValue",
                caption: "Прогноз",
                dataType: "number",
                width: 120,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                validationRules: [
                    {
                        type: "range",
                        min: 0
                    }
                ]
            },
            {
                dataField: "factValue",
                caption: "Факт",
                dataType: "number",
                width: 110,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                validationRules: [
                    {
                        type: "range",
                        min: 0
                    }
                ]
            },
            {
                caption: "Откл. прогноза, %",
                dataType: "number",
                allowEditing: false,
                width: 150,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                calculateCellValue: function (rowData) {
                    return calculateDeviationPercent(rowData?.planValue, rowData?.forecastValue);
                }
            },
            {
                caption: "Откл. факта, %",
                dataType: "number",
                allowEditing: false,
                width: 130,
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                calculateCellValue: function (rowData) {
                    return calculateDeviationPercent(rowData?.planValue, rowData?.factValue);
                }
            },
            {
                dataField: "sortOrder",
                caption: "Порядок",
                dataType: "number",
                width: 90
            },
            {
                dataField: "notes",
                caption: "Примечания",
                minWidth: 180
            }
        ],
        onInitNewRow: function (e) {
            const items = e.component.option("dataSource");
            const source = Array.isArray(items) ? items : [];
            e.data.clientId = createMonitoringClientId("mdr-row");
            e.data.sortOrder = source.length;
            e.data.planValue = 0;
            e.data.forecastValue = 0;
            e.data.factValue = 0;
        },
        onRowInserting: function (e) {
            if (!getSelectedMonitoringMdrCard()) {
                e.cancel = true;
                setMonitoringStatus("Сначала выберите карточку MDR.", true);
            }
        },
        onRowUpdating: function (e) {
            if (!e.newData.clientId) {
                e.newData.clientId = e.oldData?.clientId || createMonitoringClientId("mdr-row");
            }
        },
        onRowInserted: function () {
            syncRowsWithSelectedMdrCard();
            markMonitoringDirty();
        },
        onRowUpdated: function () {
            syncRowsWithSelectedMdrCard();
            markMonitoringDirty();
        },
        onRowRemoved: function () {
            syncRowsWithSelectedMdrCard();
            markMonitoringDirty();
        },
        onDataErrorOccurred: function (e) {
            setMonitoringStatus(e.error?.message ?? "Ошибка операции со строками MDR.", true);
        }
    }).dxDataGrid("instance");

    gridInstance = window.jQuery(gridElement).dxDataGrid({
        dataSource: store,
        keyExpr: "id",
        height: 560,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
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
            placeholder: "Поиск договоров...",
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
                title: "Договор",
                showTitle: true,
                width: 820
            },
            form: {
                colCount: 2,
                items: [
                    "contractNumber",
                    "lotId",
                    "procedureId",
                    "contractorId",
                    "signingDate",
                    "amountWithoutVat",
                    "vatAmount",
                    "totalAmount",
                    "startDate",
                    "endDate"
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
                dataField: "contractNumber",
                caption: "Номер договора",
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
                width: 150
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
                dataField: "procedureId",
                caption: "Идентификатор процедуры",
                width: 230,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "contractorId",
                caption: "Идентификатор подрядчика",
                width: 230,
                validationRules: [
                    { type: "required" }
                ]
            },
            {
                dataField: "contractorName",
                caption: "Наименование подрядчика",
                allowEditing: false,
                width: 220
            },
            {
                dataField: "signingDate",
                caption: "Дата подписания",
                dataType: "date",
                width: 140
            },
            {
                dataField: "amountWithoutVat",
                caption: "Сумма без НДС",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 150
            },
            {
                dataField: "vatAmount",
                caption: "НДС",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 120
            },
            {
                dataField: "totalAmount",
                caption: "Итого",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                width: 140
            },
            {
                dataField: "startDate",
                caption: "Дата начала",
                dataType: "date",
                width: 130
            },
            {
                dataField: "endDate",
                caption: "Дата окончания",
                dataType: "date",
                width: 130
            }
        ],
        onSelectionChanged: function (e) {
            selectedContractId = e.selectedRowKeys.length > 0
                ? e.selectedRowKeys[0]
                : null;
            updateTransitionControls();
            updateExecutionControls();
            updateMonitoringControls();
            loadHistory(false);
            loadExecutionData(false);
            loadMonitoringData(false);
        },
        onEditorPreparing: function (e) {
            if (e.parentType !== "dataRow") {
                return;
            }

            const readOnlyFields = ["status"];
            const readOnlyOnUpdate = ["lotId", "procedureId", "contractorId"];

            if (readOnlyFields.includes(e.dataField)) {
                e.editorOptions.readOnly = true;
            }

            if (e.row && !e.row.isNewRow && readOnlyOnUpdate.includes(e.dataField)) {
                e.editorOptions.readOnly = true;
            }
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

    transitionApplyButton.addEventListener("click", function () {
        const selectedContract = getSelectedContract();
        if (!selectedContract) {
            setTransitionStatus("Сначала выберите договор.", true);
            return;
        }

        const targetStatus = String(transitionTargetSelect.value || "");
        if (!targetStatus) {
            setTransitionStatus("Выберите целевой статус.", true);
            return;
        }

        const currentRank = getStatusRank(selectedContract.status);
        const targetRank = getStatusRank(targetStatus);
        const reason = transitionReasonInput.value.trim();

        if (targetRank < currentRank && !reason) {
            setTransitionStatus("Для отката статуса необходимо указать причину.", true);
            return;
        }

        request(`${endpoint}/${selectedContract.id}/transition`, {
            method: "POST",
            body: JSON.stringify({
                targetStatus: targetStatus,
                reason: reason || null
            })
        }).then(function (history) {
            const fromStatus = history.fromStatus ? localizeStatus(history.fromStatus) : "не задан";
            setTransitionStatus(`Переход выполнен: ${fromStatus} -> ${localizeStatus(history.toStatus)}.`, false);
            transitionReasonInput.value = "";
            return refreshGridAndFocus(selectedContract.id);
        }).catch(function (error) {
            setTransitionStatus(error.message || "Ошибка выполнения перехода.", true);
        });
    });

    historyRefreshButton.addEventListener("click", function () {
        loadHistory(true);
    });

    executionRefreshButton.addEventListener("click", function () {
        loadExecutionData(true);
    });

    monitoringRefreshButton.addEventListener("click", function () {
        loadMonitoringData(true);
    });

    monitoringSaveButton.addEventListener("click", function () {
        saveMonitoringData().catch(function (error) {
            setMonitoringStatus(error.message || "Не удалось сохранить мониторинг.", true);
        });
    });

    mdrImportFileInput.addEventListener("change", function () {
        updateMdrImportButtons();
        const file = mdrImportFileInput.files && mdrImportFileInput.files.length > 0
            ? mdrImportFileInput.files[0]
            : null;
        if (!file) {
            setMdrImportStatus("Файл импорта не выбран.", false);
            return;
        }

        setMdrImportStatus(`Файл выбран: ${file.name}`, false);
    });

    mdrImportResetButton.addEventListener("click", function () {
        resetMdrImportInput("Файл импорта очищен.");
        updateMdrImportButtons();
    });

    mdrImportApplyButton.addEventListener("click", function () {
        mdrImportApplyButton.disabled = true;
        importMdrForecastFact().catch(function (error) {
            setMdrImportStatus(error.message || "Не удалось выполнить импорт MDR.", true);
        }).finally(function () {
            updateMdrImportButtons();
        });
    });

    draftCreateButton.addEventListener("click", function () {
        const procedureId = draftProcedureIdInput.value.trim();
        if (!isGuid(procedureId)) {
            setDraftStatus("Поле «Идентификатор процедуры» должно содержать корректный GUID.", true);
            return;
        }

        const payload = {
            contractNumber: draftNumberInput.value.trim() || null,
            signingDate: toNullableDate(draftSigningDateInput.value),
            startDate: toNullableDate(draftStartDateInput.value),
            endDate: toNullableDate(draftEndDateInput.value)
        };

        request(`${endpoint}/procedures/${procedureId}/draft`, {
            method: "POST",
            body: JSON.stringify(payload)
        }).then(function (created) {
            setDraftStatus(`Черновик договора '${created.contractNumber}' создан из процедуры.`, false);
            clearDraftInputs();
            return refreshGridAndFocus(created.id);
        }).catch(function (error) {
            setDraftStatus(error.message || "Не удалось создать черновик договора.", true);
        });
    });

    updateTransitionControls();
    updateExecutionControls();
    updateMonitoringControls();
    updateMdrImportButtons();
})();
