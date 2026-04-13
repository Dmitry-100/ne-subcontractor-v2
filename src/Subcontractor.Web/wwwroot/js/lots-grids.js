"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`LotsGrids requires ${name}.`);
        }
    }

    function requireElement(elements, key) {
        const element = elements ? elements[key] : null;
        if (!element) {
            throw new Error(`LotsGrids requires element '${key}'.`);
        }

        return element;
    }

    function requireArray(value, name) {
        if (!Array.isArray(value)) {
            throw new Error(`LotsGrids requires ${name} array.`);
        }

        return value;
    }

    function createDeferredGrid(factory) {
        requireFunction(factory, "grid factory");

        let gridInstance = null;
        let pendingDataSource = null;
        let hasPendingDataSource = false;

        function ensureInitialized() {
            if (!gridInstance) {
                gridInstance = factory();
                if (!gridInstance || typeof gridInstance.option !== "function") {
                    throw new Error("LotsGrids requires history grid instance with option method.");
                }

                if (hasPendingDataSource) {
                    gridInstance.option("dataSource", pendingDataSource);
                    hasPendingDataSource = false;
                    pendingDataSource = null;
                }
            }

            return gridInstance;
        }

        function option(key, value) {
            const hasValue = arguments.length > 1;
            if (!gridInstance && hasValue && key === "dataSource" && Array.isArray(value) && value.length === 0) {
                hasPendingDataSource = true;
                pendingDataSource = value;
                return value;
            }

            const instance = ensureInitialized();
            if (hasValue) {
                return instance.option(key, value);
            }

            return instance.option(key);
        }

        return {
            option: option,
            ensureInitialized: ensureInitialized,
            isInitialized: function () {
                return Boolean(gridInstance);
            },
            getInstance: function () {
                return gridInstance;
            }
        };
    }

    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль LotsGrids: ${globalName}.`);
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

    const historyModule = resolveModule(
        "LotsGridsHistory",
        "./lots-grids-history.js",
        ["createGrid"]);

    const registryModule = resolveModule(
        "LotsGridsRegistry",
        "./lots-grids-registry.js",
        ["createGrid"]);

    function createGrids(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const elements = settings.elements || {};
        const store = settings.store;
        requireFunction(jQueryImpl, "jQueryImpl");

        const statusLookup = requireArray(settings.statusLookup, "statusLookup");
        const localizeStatus = settings.localizeStatus;
        const callbacks = settings.callbacks || {};
        const onSelectionChanged = callbacks.onSelectionChanged;
        const onDataErrorOccurred = callbacks.onDataErrorOccurred;

        if (!store) {
            throw new Error("LotsGrids requires store.");
        }

        requireFunction(localizeStatus, "localizeStatus");
        requireFunction(onSelectionChanged, "callbacks.onSelectionChanged");
        requireFunction(onDataErrorOccurred, "callbacks.onDataErrorOccurred");

        const lotsGridElement = requireElement(elements, "lotsGridElement");
        const historyGridElement = requireElement(elements, "historyGridElement");

        const historyGridInstance = createDeferredGrid(function () {
            return historyModule.createGrid({
                jQueryImpl: jQueryImpl,
                element: historyGridElement,
                localizeStatus: localizeStatus
            });
        });

        const lotsGridInstance = registryModule.createGrid({
            jQueryImpl: jQueryImpl,
            element: lotsGridElement,
            store: store,
            statusLookup: statusLookup,
            onSelectionChanged: onSelectionChanged,
            onDataErrorOccurred: onDataErrorOccurred
        });

        return {
            lotsGridInstance: lotsGridInstance,
            historyGridInstance: historyGridInstance
        };
    }

    const exportsObject = {
        createGrids: createGrids
    };

    if (typeof window !== "undefined") {
        window.LotsGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
