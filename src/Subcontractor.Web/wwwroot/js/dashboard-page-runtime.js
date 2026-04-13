"use strict";

(function () {
    const dependenciesRoot =
        typeof window !== "undefined" && window.DashboardPageRuntimeDependencies
            ? window.DashboardPageRuntimeDependencies
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./dashboard-page-runtime-dependencies.js")
                : null;

    if (!dependenciesRoot ||
        typeof dependenciesRoot.requireObject !== "function" ||
        typeof dependenciesRoot.requireFunction !== "function" ||
        typeof dependenciesRoot.resolveModule !== "function" ||
        typeof dependenciesRoot.setStatusError !== "function" ||
        typeof dependenciesRoot.createJsonRequester !== "function") {
        throw new Error("Dashboard runtime requires DashboardPageRuntimeDependencies.");
    }

    function initializeDashboardPage(options) {
        const settings = options || {};
        const hostWindow = settings.window || (typeof window !== "undefined" ? window : null);
        const doc = settings.document || (typeof document !== "undefined" ? document : null);
        const context = settings.context;
        const bootstrapRoot = settings.bootstrapRoot;

        dependenciesRoot.requireObject(hostWindow, "window");
        dependenciesRoot.requireObject(doc, "document");
        dependenciesRoot.requireObject(context, "context");
        dependenciesRoot.requireFunction(hostWindow.fetch, "window.fetch");

        const moduleRoot = context.moduleRoot;
        const endpoint = context.endpoint;
        const analyticsEndpoint = context.analyticsEndpoint;
        const controls = context.controls;
        const moduleRoots = context.moduleRoots;

        dependenciesRoot.requireObject(moduleRoot, "context.moduleRoot");
        dependenciesRoot.requireObject(controls, "context.controls");
        dependenciesRoot.requireObject(moduleRoots, "context.moduleRoots");

        const fieldCollectorsModule = dependenciesRoot.resolveModule(
            "DashboardPageRuntimeFieldCollectors",
            "./dashboard-page-runtime-field-collectors.js",
            ["collectDashboardRuntimeFields"]);
        const runtimeFields = fieldCollectorsModule.collectDashboardRuntimeFields({
            moduleRoot: moduleRoot,
            controls: controls
        });
        const statusElement = runtimeFields.statusElement;
        const refreshButton = runtimeFields.refreshButton;

        const rendererRoot = hostWindow.DashboardPageRenderers;
        if (!rendererRoot || typeof rendererRoot.createRenderers !== "function") {
            dependenciesRoot.setStatusError(
                statusElement,
                "Не удалось инициализировать модуль дашборда: renderer-скрипт не загружен.");
            return null;
        }

        dependenciesRoot.requireFunction(
            moduleRoots.dashboardHelpersRoot?.createHelpers,
            "moduleRoots.dashboardHelpersRoot.createHelpers");
        dependenciesRoot.requireFunction(
            moduleRoots.dashboardFormattersRoot?.createFormatters,
            "moduleRoots.dashboardFormattersRoot.createFormatters");
        dependenciesRoot.requireFunction(
            refreshButton?.addEventListener,
            "controls.refreshButton.addEventListener");

        const dashboardHelpers = moduleRoots.dashboardHelpersRoot.createHelpers({
            statusCaptions: runtimeFields.statusCaptions
        });

        const dashboardFormatters = moduleRoots.dashboardFormattersRoot.createFormatters();
        const renderer = rendererRoot.createRenderers({
            dashboardHelpers: dashboardHelpers,
            dashboardFormatters: dashboardFormatters,
            statusElement: statusElement,
            analyticsStatusElement: runtimeFields.analyticsStatusElement,
            tasksElement: runtimeFields.tasksElement,
            lotStatusesElement: runtimeFields.lotStatusesElement,
            procedureStatusesElement: runtimeFields.procedureStatusesElement,
            contractStatusesElement: runtimeFields.contractStatusesElement,
            topContractorsElement: runtimeFields.topContractorsElement,
            counterFields: runtimeFields.counterFields,
            overdueFields: runtimeFields.overdueFields,
            overdueRateFields: runtimeFields.overdueRateFields,
            overdueContextFields: runtimeFields.overdueContextFields,
            overdueBarFields: runtimeFields.overdueBarFields,
            kpiFields: runtimeFields.kpiFields,
            kpiRingFields: runtimeFields.kpiRingFields,
            importFields: runtimeFields.importFields,
            analyticsFields: runtimeFields.analyticsFields,
            analyticsHighlightFields: runtimeFields.analyticsHighlightFields,
            analyticsBarFields: runtimeFields.analyticsBarFields,
            createElement: function (tagName) {
                return doc.createElement(tagName);
            }
        });

        const request = dependenciesRoot.createJsonRequester(hostWindow.fetch, dashboardHelpers.parseErrorBody);

        async function loadDashboard() {
            refreshButton.disabled = true;

            try {
                const [summaryResult, analyticsResult] = await Promise.allSettled([
                    request(endpoint, { method: "GET" }),
                    request(analyticsEndpoint, { method: "GET" })
                ]);

                if (summaryResult.status === "fulfilled") {
                    renderer.applySummary(summaryResult.value);
                    renderer.setStatus("Дашборд загружен.", false);
                } else {
                    renderer.setStatus("Не удалось загрузить дашборд: " + summaryResult.reason.message, true);
                }

                if (analyticsResult.status === "fulfilled") {
                    renderer.applyAnalytics(analyticsResult.value);
                    renderer.setAnalyticsStatus("Аналитический контур обновлён.", false);
                } else {
                    renderer.setAnalyticsStatus("Не удалось загрузить аналитику показателей: " + analyticsResult.reason.message, true);
                }
            } catch (error) {
                renderer.setStatus("Не удалось загрузить дашборд: " + error.message, true);
            } finally {
                refreshButton.disabled = false;
            }
        }

        refreshButton.addEventListener("click", function () {
            loadDashboard();
        });

        if (bootstrapRoot && typeof bootstrapRoot.initializeDisclosureHints === "function") {
            bootstrapRoot.initializeDisclosureHints(moduleRoot);
        }
        loadDashboard();

        return {
            loadDashboard: loadDashboard,
            renderer: renderer
        };
    }

    const exportsObject = {
        initializeDashboardPage: initializeDashboardPage
    };

    if (typeof window !== "undefined") {
        window.DashboardPageRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
