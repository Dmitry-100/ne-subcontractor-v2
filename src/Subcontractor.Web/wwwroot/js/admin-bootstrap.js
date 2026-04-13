"use strict";

(function () {
    const REQUIRED_CONTROLS = {
        usersGridElement: "[data-admin-users-grid]",
        usersStatusElement: "[data-admin-users-status]",
        usersSearchInput: "[data-admin-users-search]",
        usersSearchApplyButton: "[data-admin-users-search-apply]",
        usersSearchResetButton: "[data-admin-users-search-reset]",
        rolesGridElement: "[data-admin-roles-grid]",
        rolesStatusElement: "[data-admin-roles-status]",
        referenceGridElement: "[data-admin-reference-grid]",
        referenceStatusElement: "[data-admin-reference-status]",
        referenceTypeCodeInput: "[data-admin-reference-type-code]",
        referenceActiveOnlyCheckbox: "[data-admin-reference-active-only]",
        referenceLoadButton: "[data-admin-reference-load]",
        referenceOpenApiLink: "[data-admin-reference-open-api]"
    };

    const REQUIRED_MODULES = [
        {
            key: "adminMessagesRoot",
            moduleName: "AdminMessages",
            factoryName: "createMessages"
        },
        {
            key: "adminHelpersRoot",
            moduleName: "AdminHelpers",
            factoryName: "createHelpers"
        },
        {
            key: "adminApiRoot",
            moduleName: "AdminApi",
            factoryName: "createApiClient"
        },
        {
            key: "adminRuntimeRoot",
            moduleName: "AdminRuntime",
            factoryName: "createRuntime"
        },
        {
            key: "adminGridsRoot",
            moduleName: "AdminGrids",
            factoryName: "createGrids"
        },
        {
            key: "adminWiringRoot",
            moduleName: "AdminWiring",
            factoryName: "createWiring"
        }
    ];

    function setSectionStatus(element, message, isError) {
        if (!element) {
            return;
        }

        element.textContent = message;
        if (element.classList && typeof element.classList.toggle === "function") {
            element.classList.toggle("admin-status--error", Boolean(isError));
            return;
        }

        if (Boolean(isError) && element.classList && typeof element.classList.add === "function") {
            element.classList.add("admin-status--error");
        }
    }

    function reportStatusErrors(statusElements, message, logError) {
        setSectionStatus(statusElements.usersStatusElement, message, true);
        setSectionStatus(statusElements.rolesStatusElement, message, true);
        setSectionStatus(statusElements.referenceStatusElement, message, true);

        if (typeof logError === "function") {
            logError(message);
        }
    }

    function resolveControls(moduleRoot) {
        const controls = {};
        const entries = Object.entries(REQUIRED_CONTROLS);
        for (let index = 0; index < entries.length; index += 1) {
            const key = entries[index][0];
            const selector = entries[index][1];
            const value = moduleRoot.querySelector(selector);
            if (!value) {
                return null;
            }

            controls[key] = value;
        }

        return controls;
    }

    function resolveModuleRoots(win, statusElements, logError) {
        const roots = {};
        for (let index = 0; index < REQUIRED_MODULES.length; index += 1) {
            const module = REQUIRED_MODULES[index];
            const moduleRoot = win[module.moduleName];
            if (!moduleRoot || typeof moduleRoot[module.factoryName] !== "function") {
                reportStatusErrors(
                    statusElements,
                    `Скрипт ${module.moduleName} не загружен. Проверьте порядок подключения скриптов.`,
                    logError);
                return null;
            }

            roots[module.key] = moduleRoot;
        }

        return roots;
    }

    function createBootstrapContext(options) {
        const settings = options || {};
        const doc = settings.document || (typeof document !== "undefined" ? document : null);
        const win = settings.window || (typeof window !== "undefined" ? window : {});
        const logError = settings.logError;

        if (!doc || typeof doc.querySelector !== "function") {
            throw new Error("Admin bootstrap requires a document with querySelector.");
        }

        const moduleRoot = doc.querySelector("[data-admin-module]");
        if (!moduleRoot) {
            return null;
        }

        const controls = resolveControls(moduleRoot);
        if (!controls) {
            return null;
        }

        const statusElements = {
            usersStatusElement: controls.usersStatusElement,
            rolesStatusElement: controls.rolesStatusElement,
            referenceStatusElement: controls.referenceStatusElement
        };

        if (!(win.jQuery && win.DevExpress && win.DevExpress.data)) {
            reportStatusErrors(statusElements, "Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).", logError);
            return null;
        }

        const moduleRoots = resolveModuleRoots(win, statusElements, logError);
        if (!moduleRoots) {
            return null;
        }

        const endpoints = {
            usersEndpoint: moduleRoot.getAttribute("data-users-api-endpoint") || "/api/admin/users",
            rolesEndpoint: moduleRoot.getAttribute("data-roles-api-endpoint") || "/api/admin/roles",
            referenceApiRoot: moduleRoot.getAttribute("data-reference-api-root") || "/api/reference-data"
        };

        return {
            moduleRoot: moduleRoot,
            endpoints: endpoints,
            controls: controls,
            moduleRoots: moduleRoots
        };
    }

    const exportsObject = {
        createBootstrapContext: createBootstrapContext
    };

    if (typeof window !== "undefined") {
        window.AdminBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
