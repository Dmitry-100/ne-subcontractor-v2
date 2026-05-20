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

        items.forEach(function (contractor, index) {
            const item = createElement("li");
            const rating = toFiniteNumber(contractor.rating ?? contractor.currentRating) || 0;
            const loadPercent = toFiniteNumber(contractor.currentLoadPercent ?? contractor.loadPercent) || 0;
            const ratingPercent = Math.max(0, Math.min(100, (rating / 5) * 100));
            const loadPercentClamped = Math.max(0, Math.min(100, loadPercent));
            const rank = index + 1;

            item.className = "dashboard-top-contractor dashboard-top-contractor--rank-" + Math.min(rank, 3);

            const header = createElement("div");
            header.className = "dashboard-top-contractor__header";

            const rankBadge = createElement("span");
            rankBadge.className = "dashboard-top-contractor__rank";
            rankBadge.textContent = "#" + rank;

            const name = createElement("strong");
            name.className = "dashboard-top-contractor__name";
            name.textContent = contractor.name || "Подрядчик";

            const badge = createElement("span");
            badge.className = "dashboard-top-contractor__badge";
            badge.textContent = rank === 1
                ? "Лидер"
                : loadPercent > 80
                    ? "Контроль загрузки"
                    : rating >= 4
                        ? "Сильный профиль"
                        : "В пуле";

            header.appendChild(rankBadge);
            header.appendChild(name);
            header.appendChild(badge);

            const metrics = createElement("div");
            metrics.className = "dashboard-top-contractor__metrics";

            const ratingMetric = createElement("div");
            ratingMetric.className = "dashboard-top-contractor__metric dashboard-top-contractor__metric--rating";
            const ratingLabel = createElement("span");
            ratingLabel.textContent = "Рейтинг";
            const ratingValue = createElement("strong");
            ratingValue.textContent = rating.toFixed(3);
            const ratingBar = createElement("i");
            ratingBar.className = "dashboard-top-contractor__bar";
            ratingBar.style.setProperty("--value", ratingPercent.toFixed(2) + "%");
            ratingMetric.appendChild(ratingLabel);
            ratingMetric.appendChild(ratingValue);
            ratingMetric.appendChild(ratingBar);

            const loadMetric = createElement("div");
            loadMetric.className = "dashboard-top-contractor__metric dashboard-top-contractor__metric--load";
            const loadLabel = createElement("span");
            loadLabel.textContent = "Загрузка";
            const loadValue = createElement("strong");
            loadValue.textContent = loadPercent.toFixed(2) + "%";
            const loadBar = createElement("i");
            loadBar.className = "dashboard-top-contractor__bar";
            loadBar.style.setProperty("--value", loadPercentClamped.toFixed(2) + "%");
            loadMetric.appendChild(loadLabel);
            loadMetric.appendChild(loadValue);
            loadMetric.appendChild(loadBar);

            metrics.appendChild(ratingMetric);
            metrics.appendChild(loadMetric);

            item.appendChild(header);
            item.appendChild(metrics);
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
