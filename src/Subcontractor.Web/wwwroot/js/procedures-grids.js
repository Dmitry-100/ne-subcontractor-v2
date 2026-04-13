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
            throw new Error(`Не удалось загрузить модуль procedures grids: ${globalName}.`);
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

    const gridsConfigModule = resolveModule(
        "ProceduresGridsConfig",
        "./procedures-grids-config.js",
        [
            "buildHistoryGridConfig",
            "buildShortlistGridConfig",
            "buildShortlistAdjustmentsGridConfig",
            "buildProceduresGridConfig"
        ]);

    function resolveJQuery(settings) {
        const jQueryFactory = settings.jQuery;
        if (typeof jQueryFactory !== "function") {
            throw new Error("Procedures grids module requires jQuery factory.");
        }

        return jQueryFactory;
    }

    function resolveColumns(settings, key) {
        const columns = settings[key];
        if (!Array.isArray(columns)) {
            throw new Error(`Procedures grids module requires '${key}' array.`);
        }

        return columns;
    }

    function resolveElement(settings, key) {
        const element = settings[key];
        if (!element) {
            throw new Error(`Procedures grids module requires '${key}'.`);
        }

        return element;
    }

    function createHistoryGrid(options) {
        const settings = options || {};
        const jQueryFactory = resolveJQuery(settings);
        const element = resolveElement(settings, "element");
        const historyColumns = resolveColumns(settings, "columns");

        return jQueryFactory(element).dxDataGrid(
            gridsConfigModule.buildHistoryGridConfig({
                columns: historyColumns
            })).dxDataGrid("instance");
    }

    function createShortlistGrid(options) {
        const settings = options || {};
        const jQueryFactory = resolveJQuery(settings);
        const element = resolveElement(settings, "element");
        const shortlistColumns = resolveColumns(settings, "columns");

        return jQueryFactory(element).dxDataGrid(
            gridsConfigModule.buildShortlistGridConfig({
                columns: shortlistColumns,
                jQueryFactory: jQueryFactory
            })).dxDataGrid("instance");
    }

    function createShortlistAdjustmentsGrid(options) {
        const settings = options || {};
        const jQueryFactory = resolveJQuery(settings);
        const element = resolveElement(settings, "element");
        const shortlistAdjustmentsColumns = resolveColumns(settings, "columns");

        return jQueryFactory(element).dxDataGrid(
            gridsConfigModule.buildShortlistAdjustmentsGridConfig({
                columns: shortlistAdjustmentsColumns
            })).dxDataGrid("instance");
    }

    function createProceduresGrid(options) {
        const settings = options || {};
        const jQueryFactory = resolveJQuery(settings);
        const element = resolveElement(settings, "element");
        const store = settings.store;
        if (!store) {
            throw new Error("Procedures grids module requires 'store'.");
        }

        const proceduresColumns = resolveColumns(settings, "columns");
        const urlFilterState = settings.urlFilterState || {};
        const onEditorPreparing = settings.onEditorPreparing;
        const onSelectionChanged = settings.onSelectionChanged;
        const onToolbarPreparing = settings.onToolbarPreparing;
        const onDataErrorOccurred = settings.onDataErrorOccurred;

        if (typeof onEditorPreparing !== "function") {
            throw new Error("Procedures grids module requires 'onEditorPreparing' callback.");
        }

        if (typeof onSelectionChanged !== "function") {
            throw new Error("Procedures grids module requires 'onSelectionChanged' callback.");
        }

        if (typeof onToolbarPreparing !== "function") {
            throw new Error("Procedures grids module requires 'onToolbarPreparing' callback.");
        }

        if (typeof onDataErrorOccurred !== "function") {
            throw new Error("Procedures grids module requires 'onDataErrorOccurred' callback.");
        }

        return jQueryFactory(element).dxDataGrid(
            gridsConfigModule.buildProceduresGridConfig({
                store: store,
                columns: proceduresColumns,
                urlFilterState: urlFilterState,
                onEditorPreparing: onEditorPreparing,
                onSelectionChanged: onSelectionChanged,
                onToolbarPreparing: onToolbarPreparing,
                onDataErrorOccurred: onDataErrorOccurred
            })).dxDataGrid("instance");
    }

    const exportsObject = {
        createHistoryGrid: createHistoryGrid,
        createShortlistGrid: createShortlistGrid,
        createShortlistAdjustmentsGrid: createShortlistAdjustmentsGrid,
        createProceduresGrid: createProceduresGrid
    };

    if (typeof window !== "undefined") {
        window.ProceduresGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
