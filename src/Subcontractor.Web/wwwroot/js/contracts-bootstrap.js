"use strict";

(function () {
    function setStatusError(statusElement, message) {
        statusElement.textContent = message;
        statusElement.classList.add("contracts-status--error");
    }

    function resolveSupportModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль contracts-bootstrap: ${globalName}.`);
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

    function createBootstrapContext() {
        const moduleRoot = document.querySelector("[data-contracts-module]");
        if (!moduleRoot) {
            return null;
        }

        const statusElement = moduleRoot.querySelector("[data-contracts-status]");
        let elementsModule;
        let modulesResolverModule;

        try {
            elementsModule = resolveSupportModule(
                "ContractsBootstrapElements",
                "./contracts-bootstrap-elements.js",
                ["collectElements", "hasRequiredElements"]);
            modulesResolverModule = resolveSupportModule(
                "ContractsBootstrapModules",
                "./contracts-bootstrap-modules.js",
                ["resolveModules"]);
        } catch (error) {
            if (statusElement) {
                setStatusError(statusElement, error.message || "Скрипты bootstrap contracts-grid не загружены.");
            }

            return null;
        }

        const elements = elementsModule.collectElements(moduleRoot);
        if (!elementsModule.hasRequiredElements(elements)) {
            return null;
        }

        if (!(window.jQuery && window.DevExpress && window.DevExpress.data)) {
            setStatusError(elements.statusElement, "Скрипты DevExpress не загружены. Проверьте доступ к UI-ассетам (CDN или локальный режим).");
            return null;
        }

        const modules = modulesResolverModule.resolveModules({
            source: window,
            statusElement: elements.statusElement,
            setStatusError: setStatusError
        });
        if (!modules) {
            return null;
        }

        return {
            moduleRoot: moduleRoot,
            elements: elements,
            modules: modules
        };
    }

    const exportsObject = {
        createBootstrapContext: createBootstrapContext
    };

    if (typeof window !== "undefined") {
        window.ContractsGridBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
