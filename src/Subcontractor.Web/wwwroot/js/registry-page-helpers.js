"use strict";

(function () {
    function isObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function normalizeArray(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }

        if (isObject(payload)) {
            return [payload];
        }

        return [];
    }

    function buildColumns(items) {
        if (!Array.isArray(items) || !items.length) {
            return [];
        }

        const firstObject = items.find(isObject);
        if (!firstObject) {
            return [];
        }

        return Object.keys(firstObject).slice(0, 8);
    }

    function formatValue(value) {
        if (value === null || value === undefined) {
            return "—";
        }

        if (typeof value === "object") {
            try {
                return JSON.stringify(value);
            } catch (error) {
                return "[Объект]";
            }
        }

        const text = String(value);
        return text.length > 120 ? `${text.slice(0, 117)}...` : text;
    }

    function filterItems(items, columns, query) {
        const source = Array.isArray(items) ? items : [];
        const projectionColumns = Array.isArray(columns) ? columns : [];
        const normalizedQuery = String(query ?? "").trim().toLowerCase();
        if (!normalizedQuery) {
            return source.slice();
        }

        if (!projectionColumns.length) {
            return [];
        }

        return source.filter(function (item) {
            return projectionColumns.some(function (column) {
                const value = isObject(item) ? item[column] : undefined;
                return formatValue(value).toLowerCase().includes(normalizedQuery);
            });
        });
    }

    const exportsObject = {
        isObject: isObject,
        normalizeArray: normalizeArray,
        buildColumns: buildColumns,
        formatValue: formatValue,
        filterItems: filterItems
    };

    if (typeof window !== "undefined") {
        window.RegistryPageHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
