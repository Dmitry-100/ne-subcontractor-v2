"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractorsGrids requires ${name}.`);
        }
    }

    function requireElement(elements, key) {
        const element = elements ? elements[key] : null;
        if (!element) {
            throw new Error(`ContractorsGrids requires element '${key}'.`);
        }

        return element;
    }

    function isEmptyArrayDataSourceSet(key, value, hasValue) {
        return hasValue && key === "dataSource" && Array.isArray(value) && value.length === 0;
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
                    throw new Error("ContractorsGrids requires grid instance with option method.");
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
            if (!gridInstance && isEmptyArrayDataSourceSet(key, value, hasValue)) {
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
            throw new Error(`Не удалось загрузить модуль contractors grids: ${globalName}.`);
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

    const registryModule = resolveModule(
        "ContractorsGridsRegistry",
        "./contractors-grids-registry.js",
        ["createGrid"]);

    const historyModule = resolveModule(
        "ContractorsGridsHistory",
        "./contractors-grids-history.js",
        ["createGrid"]);

    const analyticsModule = resolveModule(
        "ContractorsGridsAnalytics",
        "./contractors-grids-analytics.js",
        ["createGrid"]);

    function createGrids(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        const helpers = settings.helpers;
        const onContractorSelectionChanged = settings.onContractorSelectionChanged;
        const elements = settings.elements || {};

        if (typeof jQueryImpl !== "function") {
            throw new Error("ContractorsGrids requires jQueryImpl.");
        }

        if (!helpers) {
            throw new Error("ContractorsGrids requires helpers.");
        }

        if (typeof onContractorSelectionChanged !== "function") {
            throw new Error("ContractorsGrids requires onContractorSelectionChanged callback.");
        }

        const contractorsGridElement = requireElement(elements, "contractorsGridElement");
        const historyGridElement = requireElement(elements, "historyGridElement");
        const analyticsGridElement = requireElement(elements, "analyticsGridElement");

        const historyGridInstance = createDeferredGrid(function () {
            return historyModule.createGrid({
                jQueryImpl: jQueryImpl,
                helpers: helpers,
                element: historyGridElement
            });
        });

        const analyticsGridInstance = createDeferredGrid(function () {
            return analyticsModule.createGrid({
                jQueryImpl: jQueryImpl,
                helpers: helpers,
                element: analyticsGridElement
            });
        });

        return {
            contractorsGridInstance: registryModule.createGrid({
                jQueryImpl: jQueryImpl,
                helpers: helpers,
                element: contractorsGridElement,
                onContractorSelectionChanged: onContractorSelectionChanged
            }),
            historyGridInstance: historyGridInstance,
            analyticsGridInstance: analyticsGridInstance
        };
    }

    const exportsObject = {
        createGrids: createGrids
    };

    if (typeof window !== "undefined") {
        window.ContractorsGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
