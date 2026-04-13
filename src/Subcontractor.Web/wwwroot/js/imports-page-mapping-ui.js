"use strict";

(function () {
    const viewDefaultsRoot =
        typeof window !== "undefined" && window.ImportsPageMappingUiViewDefaults
            ? window.ImportsPageMappingUiViewDefaults
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-mapping-ui-view-defaults.js")
                : null;

    if (!viewDefaultsRoot ||
        typeof viewDefaultsRoot.isHtmlElement !== "function" ||
        typeof viewDefaultsRoot.renderMappingGridDefault !== "function" ||
        typeof viewDefaultsRoot.readMappingFromUiDefault !== "function" ||
        typeof viewDefaultsRoot.renderPreviewDefault !== "function") {
        throw new Error("ImportsPageMappingUi requires ImportsPageMappingUiViewDefaults helpers.");
    }

    function createMappingUiService(options) {
        const settings = options || {};
        const fieldDefinitions = Array.isArray(settings.fieldDefinitions) ? settings.fieldDefinitions : null;
        const mappingGrid = settings.mappingGrid || null;
        const previewTable = settings.previewTable || null;
        const previewWrap = settings.previewWrap || null;
        const buildPreviewModel = settings.buildPreviewModel;
        const previewRowLimit = settings.previewRowLimit;
        const renderMappingGridView = settings.renderMappingGridView || null;
        const readMappingFromUiValues = settings.readMappingFromUiValues || null;
        const renderPreviewView = settings.renderPreviewView || null;
        const isHtmlElement = viewDefaultsRoot.isHtmlElement;

        if (!fieldDefinitions || fieldDefinitions.length === 0) {
            throw new Error("createMappingUiService: fieldDefinitions are required.");
        }

        if (typeof buildPreviewModel !== "function") {
            throw new Error("createMappingUiService: buildPreviewModel is required.");
        }

        if (!renderMappingGridView && !isHtmlElement(mappingGrid)) {
            throw new Error("createMappingUiService: mappingGrid is required when custom renderMappingGridView is not provided.");
        }

        if (!renderPreviewView && !(isHtmlElement(previewTable) && isHtmlElement(previewWrap))) {
            throw new Error("createMappingUiService: previewTable and previewWrap are required when custom renderPreviewView is not provided.");
        }

        function buildMappingGridModel(columns, mapping) {
            const sourceColumns = Array.isArray(columns) ? columns : [];
            const sourceMapping = mapping || {};

            return {
                fields: fieldDefinitions.map(function (field) {
                    return {
                        key: field.key,
                        label: field.label,
                        required: Boolean(field.required),
                        emptyOptionLabel: field.required ? "Выберите колонку источника..." : "Не сопоставлено",
                        options: sourceColumns.map(function (columnName, index) {
                            return {
                                value: String(index),
                                label: columnName
                            };
                        }),
                        selected: Number.isInteger(sourceMapping[field.key]) &&
                            sourceMapping[field.key] >= 0 &&
                            sourceMapping[field.key] < sourceColumns.length
                            ? String(sourceMapping[field.key])
                            : ""
                    };
                })
            };
        }

        function renderMappingGrid(columns, mapping) {
            const model = buildMappingGridModel(columns, mapping);

            if (typeof renderMappingGridView === "function") {
                renderMappingGridView(model);
            } else {
                viewDefaultsRoot.renderMappingGridDefault(mappingGrid, model);
            }

            return model;
        }

        function readMappingFromUi() {
            if (typeof readMappingFromUiValues === "function") {
                return readMappingFromUiValues(fieldDefinitions);
            }

            return viewDefaultsRoot.readMappingFromUiDefault(mappingGrid, fieldDefinitions);
        }

        function renderPreviewTable(rows) {
            const model = buildPreviewModel(rows, previewRowLimit);

            if (typeof renderPreviewView === "function") {
                renderPreviewView(model);
            } else {
                viewDefaultsRoot.renderPreviewDefault(previewTable, previewWrap, model);
            }

            return model;
        }

        return {
            buildMappingGridModel: buildMappingGridModel,
            renderMappingGrid: renderMappingGrid,
            readMappingFromUi: readMappingFromUi,
            renderPreviewTable: renderPreviewTable
        };
    }

    const exportsObject = {
        createMappingUiService: createMappingUiService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageMappingUi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
