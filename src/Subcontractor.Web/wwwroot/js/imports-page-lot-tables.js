"use strict";

(function () {
    function resolveLotTableRenderers(settings) {
        if (settings && typeof settings.tableRenderers === "object") {
            return settings.tableRenderers;
        }

        if (typeof window !== "undefined" && window.ImportsPageLotTableRenderers) {
            return window.ImportsPageLotTableRenderers;
        }

        if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            try {
                return require("./imports-page-lot-table-renderers.js");
            } catch {
                return null;
            }
        }

        return null;
    }

    function createLotTablesService(options) {
        const settings = options || {};
        const lotTableRenderers = resolveLotTableRenderers(settings);
        const lotState = settings.lotState;
        const getRecommendations = settings.getRecommendations;
        const getSelectionsByKey = settings.getSelectionsByKey;
        const formatNumber = settings.formatNumber;
        const formatDateRange = settings.formatDateRange;
        const lotGroupsTable = settings.lotGroupsTable || null;
        const lotSelectedTable = settings.lotSelectedTable || null;
        const renderTable = settings.renderTable || null;

        if (!lotState ||
            typeof lotState.buildLotGroupsTableModel !== "function" ||
            typeof lotState.buildLotSelectedTableModel !== "function") {
            throw new Error("createLotTablesService: lotState is required.");
        }

        if (typeof getRecommendations !== "function" || typeof getSelectionsByKey !== "function") {
            throw new Error("createLotTablesService: state accessors are required.");
        }

        if (typeof formatNumber !== "function" || typeof formatDateRange !== "function") {
            throw new Error("createLotTablesService: formatters are required.");
        }

        if (!lotTableRenderers ||
            typeof lotTableRenderers.isHtmlElement !== "function" ||
            typeof lotTableRenderers.renderGroupsTableDefault !== "function" ||
            typeof lotTableRenderers.renderSelectedTableDefault !== "function") {
            throw new Error("createLotTablesService: table renderers are required.");
        }

        if (!renderTable && !(lotTableRenderers.isHtmlElement(lotGroupsTable) && lotTableRenderers.isHtmlElement(lotSelectedTable))) {
            throw new Error("createLotTablesService: lot tables are required when custom renderTable is not provided.");
        }

        const tableRenderer = typeof renderTable === "function"
            ? renderTable
            : function (context) {
                const source = context || {};
                if (source.variant === "groups") {
                    lotTableRenderers.renderGroupsTableDefault(lotGroupsTable, source.model);
                    return;
                }

                if (source.variant === "selected") {
                    lotTableRenderers.renderSelectedTableDefault(lotSelectedTable, source.model);
                }
            };

        function buildGroupsModel() {
            return lotState.buildLotGroupsTableModel({
                recommendations: getRecommendations(),
                selectionsByKey: getSelectionsByKey(),
                formatNumber: formatNumber,
                formatDateRange: formatDateRange
            });
        }

        function buildSelectedModel() {
            return lotState.buildLotSelectedTableModel({
                recommendations: getRecommendations(),
                selectionsByKey: getSelectionsByKey(),
                formatNumber: formatNumber
            });
        }

        function renderLotGroupsTable() {
            const model = buildGroupsModel();
            tableRenderer({
                variant: "groups",
                model: model,
                tableElement: lotGroupsTable
            });
            return model;
        }

        function renderLotSelectedTable() {
            const model = buildSelectedModel();
            tableRenderer({
                variant: "selected",
                model: model,
                tableElement: lotSelectedTable
            });
            return model;
        }

        return {
            buildGroupsModel: buildGroupsModel,
            buildSelectedModel: buildSelectedModel,
            renderLotGroupsTable: renderLotGroupsTable,
            renderLotSelectedTable: renderLotSelectedTable
        };
    }

    const exportsObject = {
        createLotTablesService: createLotTablesService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotTables = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
