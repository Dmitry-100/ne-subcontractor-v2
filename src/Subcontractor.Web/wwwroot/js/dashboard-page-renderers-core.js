"use strict";

(function () {
    function resolveListRenderers(options) {
        const settings = options || {};
        if (settings.listRenderers && typeof settings.listRenderers === "object") {
            return settings.listRenderers;
        }

        if (typeof window !== "undefined" && window.DashboardPageRenderersCoreLists) {
            return window.DashboardPageRenderersCoreLists;
        }

        if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            try {
                return require("./dashboard-page-renderers-core-lists.js");
            } catch {
                return null;
            }
        }

        return null;
    }

    function createCore(options) {
        const settings = options || {};
        const listRenderers = resolveListRenderers(settings);
        const dashboardHelpers = settings.dashboardHelpers;
        const createElement = settings.createElement;

        if (!dashboardHelpers || typeof dashboardHelpers.localizeStatus !== "function") {
            throw new Error("Dashboard renderers core require dashboard helpers.");
        }

        if (typeof createElement !== "function") {
            throw new Error("Dashboard renderers core require createElement function.");
        }

        if (!listRenderers ||
            typeof listRenderers.renderStatusList !== "function" ||
            typeof listRenderers.renderTasks !== "function" ||
            typeof listRenderers.renderTopContractors !== "function") {
            throw new Error("Dashboard renderers core require list renderers.");
        }

        const statusElement = settings.statusElement;
        const analyticsStatusElement = settings.analyticsStatusElement;
        const tasksElement = settings.tasksElement;
        const lotStatusesElement = settings.lotStatusesElement;
        const procedureStatusesElement = settings.procedureStatusesElement;
        const contractStatusesElement = settings.contractStatusesElement;
        const topContractorsElement = settings.topContractorsElement;

        function setStatus(message, isError) {
            if (!statusElement) {
                return;
            }

            statusElement.textContent = message;
            if (statusElement.classList && typeof statusElement.classList.toggle === "function") {
                statusElement.classList.toggle("dashboard-status--error", Boolean(isError));
            }
        }

        function setAnalyticsStatus(message, isError) {
            if (!analyticsStatusElement) {
                return;
            }

            analyticsStatusElement.textContent = message;
            if (analyticsStatusElement.classList && typeof analyticsStatusElement.classList.toggle === "function") {
                analyticsStatusElement.classList.toggle("dashboard-status--error", Boolean(isError));
            }
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

        function setBarValue(target, clampPercent, percentValue) {
            if (!target || !target.style || typeof target.style.setProperty !== "function") {
                return;
            }

            const normalized = clampPercent(percentValue);
            target.style.setProperty("--value", normalized.toFixed(2) + "%");
        }

        function renderStatusList(target, rows) {
            listRenderers.renderStatusList({
                target: target,
                rows: rows,
                dashboardHelpers: dashboardHelpers,
                createElement: createElement
            });
        }

        function renderTasks(rows) {
            listRenderers.renderTasks({
                target: tasksElement,
                rows: rows,
                dashboardHelpers: dashboardHelpers,
                createElement: createElement
            });
        }

        function renderTopContractors(rows, toFiniteNumber) {
            listRenderers.renderTopContractors({
                target: topContractorsElement,
                rows: rows,
                toFiniteNumber: toFiniteNumber,
                createElement: createElement
            });
        }

        return {
            statusElements: {
                statusElement: statusElement,
                analyticsStatusElement: analyticsStatusElement
            },
            statusLists: {
                lotStatusesElement: lotStatusesElement,
                procedureStatusesElement: procedureStatusesElement,
                contractStatusesElement: contractStatusesElement
            },
            setStatus: setStatus,
            setAnalyticsStatus: setAnalyticsStatus,
            setValue: setValue,
            setBarValue: setBarValue,
            renderStatusList: renderStatusList,
            renderTasks: renderTasks,
            renderTopContractors: renderTopContractors
        };
    }

    const exportsObject = {
        createCore: createCore
    };

    if (typeof window !== "undefined") {
        window.DashboardPageRenderersCore = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
