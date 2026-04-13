"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`ContractsGridRuntime requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsGridRuntime requires ${name}.`);
        }
    }

    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль contracts grid runtime: ${globalName}.`);
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

    function initializeContractsGrid(options) {
        const settings = options || {};
        const hostWindow = settings.window || (typeof window !== "undefined" ? window : null);
        const context = settings.context;

        requireObject(hostWindow, "window");
        requireObject(context, "context");

        const moduleRoot = context.moduleRoot;
        const elements = context.elements;
        const modules = context.modules;

        requireObject(moduleRoot, "context.moduleRoot");
        requireObject(elements, "context.elements");
        requireObject(modules, "context.modules");
        const foundationModule = resolveModule(
            "ContractsGridRuntimeFoundation",
            "./contracts-grid-runtime-foundation.js",
            ["createRuntimeFoundation"]);
        const controllersModule = resolveModule(
            "ContractsGridRuntimeControllers",
            "./contracts-grid-runtime-controllers.js",
            ["createControllersComposition"]);
        const foundation = foundationModule.createRuntimeFoundation({
            hostWindow: hostWindow,
            moduleRoot: moduleRoot,
            elements: elements,
            modules: modules
        });
        const controllers = controllersModule.createControllersComposition({
            foundation: foundation,
            elements: elements,
            modules: modules
        });

        requireObject(controllers, "controllers");
        requireFunction(controllers.initAll, "controllers.initAll");

        controllers.initAll();
        return controllers;
    }

    const exportsObject = {
        initializeContractsGrid: initializeContractsGrid
    };

    if (typeof window !== "undefined") {
        window.ContractsGridRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
