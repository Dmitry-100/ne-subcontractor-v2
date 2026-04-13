"use strict";

(function () {
    const helpersRoot =
        typeof window !== "undefined" && window.ProceduresGridsConfigHelpers
            ? window.ProceduresGridsConfigHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./procedures-grids-config-helpers.js")
                : null;

    if (!helpersRoot ||
        !Array.isArray(helpersRoot.PROCEDURE_FORM_ITEMS) ||
        typeof helpersRoot.requireArray !== "function" ||
        typeof helpersRoot.requireFunction !== "function") {
        throw new Error("ProceduresGridsConfig requires ProceduresGridsConfigHelpers.");
    }

    const PROCEDURE_FORM_ITEMS = helpersRoot.PROCEDURE_FORM_ITEMS;
    const requireArray = helpersRoot.requireArray;
    const requireFunction = helpersRoot.requireFunction;

    function buildHistoryGridConfig(options) {
        const settings = options || {};
        const columns = requireArray(settings.columns, "columns");

        return {
            dataSource: [],
            height: 320,
            showBorders: true,
            rowAlternationEnabled: true,
            paging: {
                pageSize: 10
            },
            pager: {
                showInfo: true
            },
            columns: columns
        };
    }

    function buildShortlistGridConfig(options) {
        const settings = options || {};
        const columns = requireArray(settings.columns, "columns");
        const jQueryFactory = settings.jQueryFactory;
        requireFunction(jQueryFactory, "jQueryFactory");

        return {
            dataSource: [],
            height: 330,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            paging: {
                pageSize: 8
            },
            pager: {
                showInfo: true
            },
            sorting: {
                mode: "multiple"
            },
            searchPanel: {
                visible: true,
                width: 260,
                placeholder: "Поиск по подрядчикам..."
            },
            columns: columns,
            onRowPrepared: function (e) {
                if (e.rowType === "data" && e.data && e.data.isRecommended === true) {
                    jQueryFactory(e.rowElement).addClass("procedures-shortlist-row--recommended");
                }
            }
        };
    }

    function buildShortlistAdjustmentsGridConfig(options) {
        const settings = options || {};
        const columns = requireArray(settings.columns, "columns");

        return {
            dataSource: [],
            height: 300,
            showBorders: true,
            rowAlternationEnabled: true,
            columnAutoWidth: true,
            paging: {
                pageSize: 8
            },
            pager: {
                showInfo: true
            },
            columns: columns
        };
    }

    function buildProceduresGridConfig(options) {
        const settings = options || {};
        const store = settings.store;
        const columns = requireArray(settings.columns, "columns");
        const urlFilterState = settings.urlFilterState || {};
        const onEditorPreparing = settings.onEditorPreparing;
        const onSelectionChanged = settings.onSelectionChanged;
        const onToolbarPreparing = settings.onToolbarPreparing;
        const onDataErrorOccurred = settings.onDataErrorOccurred;

        if (!store) {
            throw new Error("ProceduresGridsConfig requires 'store'.");
        }

        requireFunction(onEditorPreparing, "onEditorPreparing");
        requireFunction(onSelectionChanged, "onSelectionChanged");
        requireFunction(onToolbarPreparing, "onToolbarPreparing");
        requireFunction(onDataErrorOccurred, "onDataErrorOccurred");

        return {
            dataSource: store,
            keyExpr: "id",
            height: 560,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            renderAsync: true,
            focusedRowEnabled: true,
            selection: {
                mode: "single"
            },
            columnAutoWidth: true,
            repaintChangesOnly: true,
            remoteOperations: {
                paging: true
            },
            sorting: {
                mode: "multiple"
            },
            searchPanel: {
                visible: true,
                width: 300,
                placeholder: "Поиск процедур...",
                text: typeof urlFilterState.searchText === "string"
                    ? urlFilterState.searchText
                    : ""
            },
            filterValue: urlFilterState.statusFilter ?? null,
            filterRow: {
                visible: true
            },
            headerFilter: {
                visible: true
            },
            paging: {
                pageSize: 15
            },
            pager: {
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [15, 30, 50]
            },
            editing: {
                mode: "popup",
                allowAdding: true,
                allowUpdating: true,
                allowDeleting: true,
                useIcons: true,
                popup: {
                    title: "Закупочная процедура",
                    showTitle: true,
                    width: 900
                },
                form: {
                    colCount: 2,
                    items: PROCEDURE_FORM_ITEMS
                }
            },
            columns: columns,
            onEditorPreparing: onEditorPreparing,
            onSelectionChanged: onSelectionChanged,
            onToolbarPreparing: onToolbarPreparing,
            onDataErrorOccurred: onDataErrorOccurred
        };
    }

    const exportsObject = {
        buildHistoryGridConfig: buildHistoryGridConfig,
        buildShortlistGridConfig: buildShortlistGridConfig,
        buildShortlistAdjustmentsGridConfig: buildShortlistAdjustmentsGridConfig,
        buildProceduresGridConfig: buildProceduresGridConfig
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridsConfig = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
