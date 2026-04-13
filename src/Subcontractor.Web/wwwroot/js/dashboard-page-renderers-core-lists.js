"use strict";

(function () {
    function renderStatusList(options) {
        const settings = options || {};
        const target = settings.target;
        const rows = settings.rows;
        const dashboardHelpers = settings.dashboardHelpers;
        const createElement = settings.createElement;
        if (!target) {
            return;
        }

        target.innerHTML = "";
        const items = Array.isArray(rows) ? rows : [];
        if (items.length === 0) {
            const empty = createElement("li");
            empty.className = "dashboard-status-list__empty";
            empty.textContent = "Нет данных.";
            target.appendChild(empty);
            return;
        }

        items.forEach(function (row) {
            const item = createElement("li");
            item.className = "dashboard-status-list__item";

            const label = createElement("span");
            label.textContent = dashboardHelpers.localizeStatus(row.status);

            const value = createElement("strong");
            value.textContent = String(row.count || 0);

            item.appendChild(label);
            item.appendChild(value);
            target.appendChild(item);
        });
    }

    function renderTasks(options) {
        const settings = options || {};
        const rows = settings.rows;
        const target = settings.target;
        const dashboardHelpers = settings.dashboardHelpers;
        const createElement = settings.createElement;
        if (!target) {
            return;
        }

        target.innerHTML = "";
        const items = Array.isArray(rows) ? rows : [];
        if (items.length === 0) {
            const empty = createElement("li");
            empty.className = "dashboard-task dashboard-task--empty";
            empty.textContent = "Активных задач не найдено.";
            target.appendChild(empty);
            return;
        }

        items.forEach(function (task) {
            const item = createElement("li");
            item.className = "dashboard-task";
            const top = createElement("div");
            top.className = "dashboard-task__top";

            const module = createElement("span");
            module.className = "dashboard-task__module";
            module.textContent = task.module || task.entityType || "Задача";

            const priority = createElement("span");
            const priorityCode = String(task.priority || "Normal");
            priority.className = "dashboard-task__priority dashboard-task__priority--" + priorityCode.toLowerCase();
            priority.textContent = dashboardHelpers.localizePriority(priorityCode);

            top.appendChild(module);
            top.appendChild(priority);

            const title = createElement("strong");
            title.className = "dashboard-task__title";
            title.textContent = task.title || "Задача";

            const description = createElement("p");
            description.className = "dashboard-task__description";
            description.textContent = task.description || task.details || "";

            const footer = createElement("div");
            footer.className = "dashboard-task__footer";

            const dueDate = createElement("span");
            dueDate.textContent = "Срок: " + dashboardHelpers.formatDate(task.dueDate);

            const actionUrl = typeof task.actionUrl === "string" ? task.actionUrl.trim() : "";
            const action = createElement("a");
            action.className = "dashboard-task__link";
            action.href = actionUrl.length > 0 ? actionUrl : "#";
            action.textContent = "Открыть";

            footer.appendChild(dueDate);
            footer.appendChild(action);

            item.appendChild(top);
            item.appendChild(title);
            item.appendChild(description);
            item.appendChild(footer);
            target.appendChild(item);
        });
    }

    function renderTopContractors(options) {
        const settings = options || {};
        const rows = settings.rows;
        const target = settings.target;
        const toFiniteNumber = settings.toFiniteNumber;
        const createElement = settings.createElement;
        if (!target) {
            return;
        }

        target.innerHTML = "";
        const items = Array.isArray(rows) ? rows : [];
        if (items.length === 0) {
            const empty = createElement("li");
            empty.className = "dashboard-top-contractors__empty";
            empty.textContent = "Нет данных.";
            target.appendChild(empty);
            return;
        }

        items.forEach(function (contractor) {
            const item = createElement("li");
            const rating = toFiniteNumber(contractor.rating ?? contractor.currentRating) || 0;
            const loadPercent = toFiniteNumber(contractor.currentLoadPercent ?? contractor.loadPercent) || 0;
            item.textContent = contractor.name + " · рейтинг " + rating.toFixed(3) + " · загрузка " + loadPercent.toFixed(2) + "%";
            target.appendChild(item);
        });
    }

    const exportsObject = {
        renderStatusList: renderStatusList,
        renderTasks: renderTasks,
        renderTopContractors: renderTopContractors
    };

    if (typeof window !== "undefined") {
        window.DashboardPageRenderersCoreLists = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
