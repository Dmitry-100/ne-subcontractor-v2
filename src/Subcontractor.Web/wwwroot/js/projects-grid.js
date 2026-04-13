"use strict";

(function () {
    const bootstrapRoot = window.ProjectsBootstrap;
    if (!bootstrapRoot || typeof bootstrapRoot.createBootstrapContext !== "function") {
        return;
    }

    const context = bootstrapRoot.createBootstrapContext({
        document: document,
        window: window,
        logError: function (message) {
            if (window.console && typeof window.console.error === "function") {
                window.console.error(message);
            }
        }
    });

    if (!context) {
        return;
    }

    const endpoint = context.endpoint;
    const controls = context.controls;
    const moduleRoots = context.moduleRoots;
    const statusElement = controls.statusElement;

    function setStatus(message, isError) {
        statusElement.textContent = message;
        statusElement.classList.toggle("projects-status--error", Boolean(isError));
    }

    const projectsHelpersRoot = moduleRoots.projectsHelpersRoot;
    const projectsApiRoot = moduleRoots.projectsApiRoot;
    const projectsRuntimeRoot = moduleRoots.projectsRuntimeRoot;
    const projectsGridsRoot = moduleRoots.projectsGridsRoot;

    try {
        const helpers = projectsHelpersRoot.createHelpers();
        const apiClient = projectsApiRoot.createApiClient({
            endpoint: endpoint,
            parseErrorBody: helpers.parseErrorBody
        });
        const runtime = projectsRuntimeRoot.createRuntime({
            apiClient: apiClient,
            helpers: helpers,
            customStoreCtor: window.DevExpress.data.CustomStore,
            setStatus: setStatus
        });

        const store = runtime.createStore();
        projectsGridsRoot.createGrid({
            jQueryImpl: window.jQuery,
            gridElement: controls.gridElement,
            store: store,
            setStatus: setStatus
        });
    } catch (error) {
        const message = error && error.message ? error.message : "Не удалось инициализировать модуль проектов.";
        setStatus(message, true);
    }
})();
