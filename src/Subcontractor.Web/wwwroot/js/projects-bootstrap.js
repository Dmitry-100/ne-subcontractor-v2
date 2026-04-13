"use strict";

(function () {
    const REQUIRED_CONTROLS = {
        gridElement: "[data-projects-grid]",
        statusElement: "[data-projects-status]"
    };

    const REQUIRED_MODULES = [
        {
            key: "projectsHelpersRoot",
            moduleName: "ProjectsHelpers",
            factoryName: "createHelpers"
        },
        {
            key: "projectsApiRoot",
            moduleName: "ProjectsApi",
            factoryName: "createApiClient"
        },
        {
            key: "projectsRuntimeRoot",
            moduleName: "ProjectsRuntime",
            factoryName: "createRuntime"
        },
        {
            key: "projectsGridsRoot",
            moduleName: "ProjectsGrids",
            factoryName: "createGrid"
        }
    ];

    function reportError(statusElement, message, logError) {
        if (statusElement && typeof statusElement === "object") {
            statusElement.textContent = message;
            if (statusElement.classList && typeof statusElement.classList.add === "function") {
                statusElement.classList.add("projects-status--error");
            }
        }

        if (typeof logError === "function") {
            logError(message);
        }
    }

    function resolveControls(moduleRoot) {
        const controls = {};
        const entries = Object.entries(REQUIRED_CONTROLS);
        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index];
            const controlKey = entry[0];
            const selector = entry[1];
            const control = moduleRoot.querySelector(selector);
            if (!control) {
                return null;
            }

            controls[controlKey] = control;
        }

        return controls;
    }

    function resolveModuleRoots(win, statusElement, logError) {
        const moduleRoots = {};
        for (let index = 0; index < REQUIRED_MODULES.length; index += 1) {
            const module = REQUIRED_MODULES[index];
            const moduleRoot = win[module.moduleName];
            if (!moduleRoot || typeof moduleRoot[module.factoryName] !== "function") {
                reportError(
                    statusElement,
                    `Скрипт ${module.moduleName} не загружен. Проверьте порядок подключения скриптов.`,
                    logError);
                return null;
            }

            moduleRoots[module.key] = moduleRoot;
        }

        return moduleRoots;
    }

    function createBootstrapContext(options) {
        const settings = options || {};
        const doc = settings.document || (typeof document !== "undefined" ? document : null);
        const win = settings.window || (typeof window !== "undefined" ? window : {});
        const logError = settings.logError;

        if (!doc || typeof doc.querySelector !== "function") {
            throw new Error("Projects bootstrap requires a document with querySelector.");
        }

        const moduleRoot = doc.querySelector("[data-projects-module]");
        if (!moduleRoot) {
            return null;
        }

        const controls = resolveControls(moduleRoot);
        if (!controls) {
            return null;
        }

        const statusElement = controls.statusElement;
        if (!(win.jQuery && win.DevExpress && win.DevExpress.data)) {
            reportError(statusElement, "Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).", logError);
            return null;
        }

        const moduleRoots = resolveModuleRoots(win, statusElement, logError);
        if (!moduleRoots) {
            return null;
        }

        return {
            endpoint: moduleRoot.getAttribute("data-api-endpoint") || "/api/projects",
            controls: controls,
            moduleRoots: moduleRoots
        };
    }

    const exportsObject = {
        createBootstrapContext: createBootstrapContext
    };

    if (typeof window !== "undefined") {
        window.ProjectsBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
