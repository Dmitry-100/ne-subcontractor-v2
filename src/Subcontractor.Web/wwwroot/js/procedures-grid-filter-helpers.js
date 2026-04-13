"use strict";

(function () {
    function createHelpers(options) {
        const settings = options || {};
        const localizeStatus = typeof settings.localizeStatus === "function"
            ? settings.localizeStatus
            : function (value) { return String(value || ""); };

        function buildStatusFilter(statuses) {
            if (!Array.isArray(statuses) || statuses.length === 0) {
                return null;
            }

            if (statuses.length === 1) {
                return ["status", "=", statuses[0]];
            }

            let filter = ["status", "=", statuses[0]];
            for (let index = 1; index < statuses.length; index += 1) {
                filter = [filter, "or", ["status", "=", statuses[index]]];
            }

            return filter;
        }

        function readUrlFilterState(allowedStatuses, locationSearch) {
            const params = new URLSearchParams(locationSearch || "");
            const allowedMap = (Array.isArray(allowedStatuses) ? allowedStatuses : []).reduce(function (map, status) {
                map[String(status || "").toLowerCase()] = status;
                return map;
            }, {});

            const rawStatus = String(params.get("status") || "");
            const statuses = rawStatus
                .split(",")
                .map(function (value) {
                    return String(value || "").trim();
                })
                .filter(function (value) {
                    return value.length > 0;
                })
                .map(function (value) {
                    return allowedMap[value.toLowerCase()] || null;
                })
                .filter(function (value, index, values) {
                    return Boolean(value) && values.indexOf(value) === index;
                });

            const searchText = String(params.get("search") || "").trim();
            const statusFilter = buildStatusFilter(statuses);

            return {
                statuses: statuses,
                searchText: searchText,
                statusFilter: statusFilter,
                hasAny: statuses.length > 0 || searchText.length > 0
            };
        }

        function describeUrlFilters(filterState) {
            if (!filterState || !filterState.hasAny) {
                return "";
            }

            const tokens = [];
            if (Array.isArray(filterState.statuses) && filterState.statuses.length > 0) {
                tokens.push("статусы: " + filterState.statuses.map(localizeStatus).join(", "));
            }

            if (String(filterState.searchText || "").length > 0) {
                tokens.push(`поиск: "${filterState.searchText}"`);
            }

            return tokens.join("; ");
        }

        function appendFilterHint(message, filterState) {
            if (!filterState || !filterState.hasAny) {
                return message;
            }

            const filterText = describeUrlFilters(filterState);
            return filterText
                ? `${message} URL-фильтры: ${filterText}.`
                : message;
        }

        function buildUrlWithoutFilters(href) {
            const url = new URL(String(href || ""), "http://localhost");
            url.searchParams.delete("status");
            url.searchParams.delete("search");
            return `${url.pathname}${url.search}${url.hash}`;
        }

        return {
            appendFilterHint: appendFilterHint,
            buildStatusFilter: buildStatusFilter,
            buildUrlWithoutFilters: buildUrlWithoutFilters,
            describeUrlFilters: describeUrlFilters,
            readUrlFilterState: readUrlFilterState
        };
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridFilterHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
