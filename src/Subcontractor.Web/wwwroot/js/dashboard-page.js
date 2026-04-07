"use strict";

(function () {
    const moduleRoot = document.querySelector("[data-dashboard-module]");
    if (!moduleRoot) {
        return;
    }

    const endpoint = moduleRoot.getAttribute("data-api-endpoint") || "/api/dashboard/summary";
    const analyticsEndpoint = moduleRoot.getAttribute("data-analytics-endpoint") || "/api/analytics/kpi";
    const statusElement = moduleRoot.querySelector("[data-dashboard-status]");
    const refreshButton = moduleRoot.querySelector("[data-dashboard-refresh]");
    const tasksElement = moduleRoot.querySelector("[data-dashboard-tasks]");
    const lotStatusesElement = moduleRoot.querySelector('[data-dashboard-status-list="lots"]');
    const procedureStatusesElement = moduleRoot.querySelector('[data-dashboard-status-list="procedures"]');
    const contractStatusesElement = moduleRoot.querySelector('[data-dashboard-status-list="contracts"]');
    const analyticsStatusElement = moduleRoot.querySelector("[data-dashboard-analytics-status]");
    const topContractorsElement = moduleRoot.querySelector("[data-dashboard-top-contractors]");

    if (!statusElement || !refreshButton || !tasksElement || !lotStatusesElement || !procedureStatusesElement || !contractStatusesElement) {
        return;
    }

    const counterFields = {
        projectsTotal: moduleRoot.querySelector('[data-dashboard-counter="projectsTotal"]'),
        lotsTotal: moduleRoot.querySelector('[data-dashboard-counter="lotsTotal"]'),
        proceduresTotal: moduleRoot.querySelector('[data-dashboard-counter="proceduresTotal"]'),
        contractsTotal: moduleRoot.querySelector('[data-dashboard-counter="contractsTotal"]')
    };

    const overdueFields = {
        proceduresCount: moduleRoot.querySelector('[data-dashboard-overdue="proceduresCount"]'),
        contractsCount: moduleRoot.querySelector('[data-dashboard-overdue="contractsCount"]'),
        milestonesCount: moduleRoot.querySelector('[data-dashboard-overdue="milestonesCount"]')
    };

    const kpiFields = {
        procedureCompletionRatePercent: moduleRoot.querySelector('[data-dashboard-kpi="procedureCompletionRatePercent"]'),
        contractClosureRatePercent: moduleRoot.querySelector('[data-dashboard-kpi="contractClosureRatePercent"]'),
        milestoneCompletionRatePercent: moduleRoot.querySelector('[data-dashboard-kpi="milestoneCompletionRatePercent"]')
    };

    const importFields = {
        sourceUploadedCount: moduleRoot.querySelector('[data-dashboard-import="sourceUploadedCount"]'),
        sourceProcessingCount: moduleRoot.querySelector('[data-dashboard-import="sourceProcessingCount"]'),
        sourceReadyForLottingCount: moduleRoot.querySelector('[data-dashboard-import="sourceReadyForLottingCount"]'),
        sourceValidatedWithErrorsCount: moduleRoot.querySelector('[data-dashboard-import="sourceValidatedWithErrorsCount"]'),
        sourceFailedCount: moduleRoot.querySelector('[data-dashboard-import="sourceFailedCount"]'),
        sourceRejectedCount: moduleRoot.querySelector('[data-dashboard-import="sourceRejectedCount"]'),
        sourceInvalidRowsCount: moduleRoot.querySelector('[data-dashboard-import="sourceInvalidRowsCount"]'),
        xmlReceivedCount: moduleRoot.querySelector('[data-dashboard-import="xmlReceivedCount"]'),
        xmlProcessingCount: moduleRoot.querySelector('[data-dashboard-import="xmlProcessingCount"]'),
        xmlCompletedCount: moduleRoot.querySelector('[data-dashboard-import="xmlCompletedCount"]'),
        xmlFailedCount: moduleRoot.querySelector('[data-dashboard-import="xmlFailedCount"]'),
        xmlRetriedPendingCount: moduleRoot.querySelector('[data-dashboard-import="xmlRetriedPendingCount"]'),
        traceAppliedGroupsCount: moduleRoot.querySelector('[data-dashboard-import="traceAppliedGroupsCount"]'),
        traceCreatedGroupsCount: moduleRoot.querySelector('[data-dashboard-import="traceCreatedGroupsCount"]'),
        traceSkippedGroupsCount: moduleRoot.querySelector('[data-dashboard-import="traceSkippedGroupsCount"]'),
        traceCreatedLotsCount: moduleRoot.querySelector('[data-dashboard-import="traceCreatedLotsCount"]')
    };

    const analyticsFields = {
        lotFunnel: moduleRoot.querySelector('[data-dashboard-analytics="lotFunnel"]'),
        contractorLoad: moduleRoot.querySelector('[data-dashboard-analytics="contractorLoad"]'),
        averageContractorLoad: moduleRoot.querySelector('[data-dashboard-analytics="averageContractorLoad"]'),
        averageContractorRating: moduleRoot.querySelector('[data-dashboard-analytics="averageContractorRating"]'),
        slaOpen: moduleRoot.querySelector('[data-dashboard-analytics="slaOpen"]'),
        contractingTotals: moduleRoot.querySelector('[data-dashboard-analytics="contractingTotals"]'),
        mdrFactCoverage: moduleRoot.querySelector('[data-dashboard-analytics="mdrFactCoverage"]'),
        subcontractingShare: moduleRoot.querySelector('[data-dashboard-analytics="subcontractingShare"]')
    };

    const statusCaptions = {
        Draft: "Черновик",
        InProcurement: "В закупке",
        ContractorSelected: "Подрядчик выбран",
        Contracted: "Законтрактован",
        InExecution: "В исполнении",
        Closed: "Закрыт",
        Created: "Создана",
        DocumentsPreparation: "Подготовка документов",
        OnApproval: "На согласовании",
        Sent: "Отправлена",
        OffersReceived: "Предложения получены",
        Retender: "Переторжка",
        DecisionMade: "Решение принято",
        Completed: "Завершена",
        Canceled: "Отменена",
        Signed: "Подписан",
        Active: "Действует"
    };

    function setStatus(message, isError) {
        statusElement.textContent = message;
        statusElement.classList.toggle("dashboard-status--error", Boolean(isError));
    }

    function setAnalyticsStatus(message, isError) {
        if (!analyticsStatusElement) {
            return;
        }

        analyticsStatusElement.textContent = message;
        analyticsStatusElement.classList.toggle("dashboard-status--error", Boolean(isError));
    }

    function parseErrorBody(rawText, statusCode) {
        if (!rawText) {
            return "Ошибка запроса (" + statusCode + ").";
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
        const response = await fetch(url, {
            credentials: "include",
            ...options,
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            const bodyText = await response.text();
            throw new Error(parseErrorBody(bodyText, response.status));
        }

        return response.json();
    }

    function setValue(target, value, fallback) {
        if (!target) {
            return;
        }

        if (value === null || value === undefined) {
            target.textContent = fallback;
            return;
        }

        target.textContent = String(value);
    }

    function formatPercent(value) {
        if (typeof value !== "number" || Number.isNaN(value)) {
            return "н/д";
        }

        return value.toFixed(2) + "%";
    }

    function formatMoney(value) {
        if (typeof value !== "number" || Number.isNaN(value)) {
            return "0";
        }

        return value.toLocaleString("ru-RU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatDate(value) {
        if (!value) {
            return "Без срока";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return "Без срока";
        }

        return parsed.toLocaleDateString("ru-RU");
    }

    function localizeStatus(value) {
        return statusCaptions[String(value || "").trim()] || String(value || "Неизвестно");
    }

    function renderStatusList(target, rows) {
        if (!target) {
            return;
        }

        target.innerHTML = "";

        const items = Array.isArray(rows) ? rows : [];
        if (items.length === 0) {
            const empty = document.createElement("li");
            empty.className = "dashboard-status-list__empty";
            empty.textContent = "Нет данных.";
            target.appendChild(empty);
            return;
        }

        items.forEach(function (row) {
            const item = document.createElement("li");

            const status = document.createElement("span");
            status.textContent = localizeStatus(row.status);

            const count = document.createElement("strong");
            count.textContent = String(row.count ?? 0);

            item.appendChild(status);
            item.appendChild(count);
            target.appendChild(item);
        });
    }

    function renderTasks(rows) {
        tasksElement.innerHTML = "";

        const tasks = Array.isArray(rows) ? rows : [];
        if (tasks.length === 0) {
            const empty = document.createElement("li");
            empty.className = "dashboard-task dashboard-task--empty";
            empty.textContent = "Активных задач не назначено.";
            tasksElement.appendChild(empty);
            return;
        }

        tasks.forEach(function (task) {
            const item = document.createElement("li");
            item.className = "dashboard-task";

            const top = document.createElement("div");
            top.className = "dashboard-task__top";

            const module = document.createElement("span");
            module.className = "dashboard-task__module";
            module.textContent = task.module || "Задача";

            const priority = document.createElement("span");
            const priorityCode = String(task.priority || "Normal");
            priority.className = "dashboard-task__priority dashboard-task__priority--" + priorityCode.toLowerCase();
            priority.textContent = localizePriority(priorityCode);

            top.appendChild(module);
            top.appendChild(priority);

            const title = document.createElement("strong");
            title.className = "dashboard-task__title";
            title.textContent = task.title || "Задача";

            const description = document.createElement("p");
            description.className = "dashboard-task__description";
            description.textContent = task.description || "";

            const footer = document.createElement("div");
            footer.className = "dashboard-task__footer";

            const due = document.createElement("span");
            due.textContent = "Срок: " + formatDate(task.dueDate);

            const link = document.createElement("a");
            link.className = "dashboard-task__link";
            link.href = task.actionUrl || "#";
            link.textContent = "Открыть";

            footer.appendChild(due);
            footer.appendChild(link);

            item.appendChild(top);
            item.appendChild(title);
            item.appendChild(description);
            item.appendChild(footer);
            tasksElement.appendChild(item);
        });
    }

    function localizePriority(priorityCode) {
        const normalized = String(priorityCode || "").trim().toLowerCase();
        if (normalized === "high") {
            return "Высокий";
        }

        if (normalized === "low") {
            return "Низкий";
        }

        return "Обычный";
    }

    function getLotCountByStatus(stages, statusName) {
        const entries = Array.isArray(stages) ? stages : [];
        const normalized = String(statusName || "").trim().toLowerCase();
        const row = entries.find(function (stage) {
            return String(stage.status || "").trim().toLowerCase() === normalized;
        });

        return row && typeof row.count === "number" ? row.count : 0;
    }

    function renderTopContractors(rows) {
        if (!topContractorsElement) {
            return;
        }

        topContractorsElement.innerHTML = "";
        const items = Array.isArray(rows) ? rows : [];
        if (items.length === 0) {
            const empty = document.createElement("li");
            empty.className = "dashboard-top-contractors__empty";
            empty.textContent = "Данных по рейтингу подрядчиков пока нет.";
            topContractorsElement.appendChild(empty);
            return;
        }

        items.forEach(function (item) {
            const row = document.createElement("li");
            row.className = "dashboard-top-contractor";
            row.textContent = (item.name || "Подрядчик")
                + " · рейтинг " + Number(item.currentRating || 0).toFixed(3)
                + " · загрузка " + formatPercent(item.currentLoadPercent || 0);
            topContractorsElement.appendChild(row);
        });
    }

    function applyAnalytics(payload) {
        const analytics = payload || {};
        const lotFunnel = Array.isArray(analytics.lotFunnel) ? analytics.lotFunnel : [];
        const contractorLoad = analytics.contractorLoad || {};
        const sla = analytics.sla || {};
        const contracting = analytics.contractingAmounts || {};
        const mdr = analytics.mdrProgress || {};
        const share = analytics.subcontractingShare || {};

        const lotDraft = getLotCountByStatus(lotFunnel, "Draft");
        const lotInProcurement = getLotCountByStatus(lotFunnel, "InProcurement");
        const lotContracted = getLotCountByStatus(lotFunnel, "Contracted");

        setValue(analyticsFields.lotFunnel, `${lotDraft} / ${lotInProcurement} / ${lotContracted}`, "0 / 0 / 0");
        setValue(
            analyticsFields.contractorLoad,
            `${contractorLoad.activeContractors ?? 0} / ${contractorLoad.overloadedContractors ?? 0}`,
            "0 / 0");
        setValue(analyticsFields.averageContractorLoad, formatPercent(contractorLoad.averageLoadPercent), "н/д");
        setValue(
            analyticsFields.averageContractorRating,
            contractorLoad.averageRating === null || contractorLoad.averageRating === undefined
                ? "н/д"
                : Number(contractorLoad.averageRating).toFixed(3),
            "н/д");
        setValue(analyticsFields.slaOpen, `${sla.openWarnings ?? 0} / ${sla.openOverdue ?? 0}`, "0 / 0");
        setValue(
            analyticsFields.contractingTotals,
            `${formatMoney(contracting.signedAndActiveTotalAmount)} / ${formatMoney(contracting.closedTotalAmount)}`,
            "0 / 0");
        setValue(analyticsFields.mdrFactCoverage, formatPercent(mdr.factCoveragePercent), "н/д");
        setValue(analyticsFields.subcontractingShare, formatPercent(share.sharePercent), "н/д");
        renderTopContractors(analytics.topContractors);
    }

    function applySummary(summary) {
        const counters = summary && summary.counters ? summary.counters : {};
        const overdue = summary && summary.overdue ? summary.overdue : {};
        const kpi = summary && summary.kpi ? summary.kpi : {};
        const imports = summary && summary.importPipeline ? summary.importPipeline : {};

        Object.keys(counterFields).forEach(function (key) {
            setValue(counterFields[key], counters[key], "0");
        });

        Object.keys(overdueFields).forEach(function (key) {
            setValue(overdueFields[key], overdue[key], "0");
        });

        Object.keys(kpiFields).forEach(function (key) {
            setValue(kpiFields[key], formatPercent(kpi[key]), "н/д");
        });

        Object.keys(importFields).forEach(function (key) {
            setValue(importFields[key], imports[key], "0");
        });

        renderStatusList(lotStatusesElement, summary ? summary.lotStatuses : []);
        renderStatusList(procedureStatusesElement, summary ? summary.procedureStatuses : []);
        renderStatusList(contractStatusesElement, summary ? summary.contractStatuses : []);
        renderTasks(summary ? summary.myTasks : []);
    }

    async function loadDashboard() {
        refreshButton.disabled = true;

        try {
            const summary = await request(endpoint, { method: "GET" });
            applySummary(summary);
            setStatus("Дашборд загружен.", false);

            try {
                const analytics = await request(analyticsEndpoint, { method: "GET" });
                applyAnalytics(analytics);
                setAnalyticsStatus("Аналитический контур обновлён.", false);
            } catch (analyticsError) {
                setAnalyticsStatus("Не удалось загрузить аналитику показателей: " + analyticsError.message, true);
            }
        } catch (error) {
            setStatus("Не удалось загрузить дашборд: " + error.message, true);
        } finally {
            refreshButton.disabled = false;
        }
    }

    refreshButton.addEventListener("click", function () {
        loadDashboard();
    });

    loadDashboard();
})();
