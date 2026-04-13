"use strict";

(function () {
    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль dashboard renderers: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    const renderersCoreRoot = resolveModule(
        "DashboardPageRenderersCore",
        "./dashboard-page-renderers-core.js",
        ["createCore"]);
    const renderersInfographicsRoot = resolveModule(
        "DashboardPageRenderersInfographics",
        "./dashboard-page-renderers-infographics.js",
        ["createInfographics"]);

    function createRenderers(options) {
        const settings = options || {};
        const dashboardHelpers = settings.dashboardHelpers;
        const dashboardFormatters = settings.dashboardFormatters;
        const createElement = settings.createElement;

        if (!dashboardHelpers || typeof dashboardHelpers.parseErrorBody !== "function") {
            throw new Error("Dashboard renderers require dashboard helpers.");
        }

        if (!dashboardFormatters || typeof dashboardFormatters.toFiniteNumber !== "function") {
            throw new Error("Dashboard renderers require dashboard formatters.");
        }

        if (typeof createElement !== "function") {
            throw new Error("Dashboard renderers require createElement function.");
        }

        const counterFields = settings.counterFields || {};
        const importFields = settings.importFields || {};

        const core = renderersCoreRoot.createCore({
            dashboardHelpers: dashboardHelpers,
            createElement: createElement,
            statusElement: settings.statusElement,
            analyticsStatusElement: settings.analyticsStatusElement,
            tasksElement: settings.tasksElement,
            lotStatusesElement: settings.lotStatusesElement,
            procedureStatusesElement: settings.procedureStatusesElement,
            contractStatusesElement: settings.contractStatusesElement,
            topContractorsElement: settings.topContractorsElement
        });

        const infographics = renderersInfographicsRoot.createInfographics({
            dashboardHelpers: dashboardHelpers,
            dashboardFormatters: dashboardFormatters,
            setValue: core.setValue,
            setBarValue: core.setBarValue,
            renderTopContractors: core.renderTopContractors,
            overdueFields: settings.overdueFields,
            overdueRateFields: settings.overdueRateFields,
            overdueContextFields: settings.overdueContextFields,
            overdueBarFields: settings.overdueBarFields,
            kpiFields: settings.kpiFields,
            kpiRingFields: settings.kpiRingFields,
            analyticsFields: settings.analyticsFields,
            analyticsHighlightFields: settings.analyticsHighlightFields,
            analyticsBarFields: settings.analyticsBarFields
        });

        function applySummary(summary) {
            const safeSummary = summary || {};
            const counters = safeSummary.counters || {};

            core.setValue(counterFields.projectsTotal, counters.projectsTotal, "0");
            core.setValue(counterFields.lotsTotal, counters.lotsTotal, "0");
            core.setValue(counterFields.proceduresTotal, counters.proceduresTotal, "0");
            core.setValue(counterFields.contractsTotal, counters.contractsTotal, "0");

            core.renderStatusList(core.statusLists.lotStatusesElement, safeSummary.lotStatuses);
            core.renderStatusList(core.statusLists.procedureStatusesElement, safeSummary.procedureStatuses);
            core.renderStatusList(core.statusLists.contractStatusesElement, safeSummary.contractStatuses);

            const tasks = Array.isArray(safeSummary.tasks)
                ? safeSummary.tasks
                : safeSummary.myTasks;
            core.renderTasks(tasks);

            infographics.applyOverdueInfographics(counters, safeSummary.overdue);
            infographics.applyKpiInfographics(safeSummary.kpi);

            const safeImportPipeline = safeSummary.importPipeline || {};
            Object.keys(importFields).forEach(function (key) {
                core.setValue(importFields[key], safeImportPipeline[key], "0");
            });
        }

        return {
            setStatus: core.setStatus,
            setAnalyticsStatus: core.setAnalyticsStatus,
            applySummary: applySummary,
            applyAnalytics: infographics.applyAnalytics
        };
    }

    const exportsObject = {
        createRenderers: createRenderers
    };

    if (typeof window !== "undefined") {
        window.DashboardPageRenderers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
