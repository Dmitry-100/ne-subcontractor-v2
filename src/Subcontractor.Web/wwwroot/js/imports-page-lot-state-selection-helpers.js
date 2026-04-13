"use strict";

(function () {
    function getRecommendationGroups(recommendations) {
        return Array.isArray(recommendations?.groups) ? recommendations.groups : [];
    }

    function getSelectedRecommendationGroups(recommendations, selectionsByKey) {
        const groups = getRecommendationGroups(recommendations);
        const selections = selectionsByKey instanceof Map ? selectionsByKey : new Map();

        return groups
            .map(function (group) {
                return {
                    group: group,
                    selection: selections.get(group.groupKey) || null
                };
            })
            .filter(function (item) {
                return item.selection && item.selection.selected;
            });
    }

    function buildSelectionMap(groups, previousSelections) {
        const sourceGroups = Array.isArray(groups) ? groups : [];
        const previous = previousSelections instanceof Map ? previousSelections : new Map();
        const result = new Map();

        sourceGroups.forEach(function (group) {
            const existing = previous.get(group.groupKey);
            const lotCode = String(existing?.lotCode || group.suggestedLotCode || "").trim();
            const lotName = String(existing?.lotName || group.suggestedLotName || "").trim();

            result.set(group.groupKey, {
                selected: existing ? Boolean(existing.selected) : true,
                lotCode: lotCode || String(group.suggestedLotCode || "").trim(),
                lotName: lotName || String(group.suggestedLotName || "").trim()
            });
        });

        return result;
    }

    function buildLotApplyPayload(selectedEntries) {
        const selected = Array.isArray(selectedEntries) ? selectedEntries : [];
        if (selected.length === 0) {
            throw new Error("Выберите хотя бы одну рекомендационную группу.");
        }

        return {
            groups: selected.map(function (entry) {
                const group = entry.group || {};
                const selection = entry.selection || {};
                const lotCode = String(selection.lotCode || "").trim() || String(group.suggestedLotCode || "").trim();
                const lotName = String(selection.lotName || "").trim() || String(group.suggestedLotName || "").trim();

                return {
                    groupKey: group.groupKey,
                    lotCode: lotCode,
                    lotName: lotName
                };
            })
        };
    }

    function updateGroupSelection(selectionsByKey, groupKey, updateSelection) {
        const selections = selectionsByKey instanceof Map ? selectionsByKey : new Map();
        const key = String(groupKey || "").trim();
        if (!key) {
            return { updated: false, selectionsByKey: selections };
        }

        const existing = selections.get(key);
        if (!existing) {
            return { updated: false, selectionsByKey: selections };
        }

        selections.set(key, {
            ...existing,
            ...updateSelection(existing)
        });

        return { updated: true, selectionsByKey: selections };
    }

    function setGroupSelected(selectionsByKey, groupKey, selected) {
        return updateGroupSelection(selectionsByKey, groupKey, function () {
            return { selected: Boolean(selected) };
        });
    }

    function setGroupLotCode(selectionsByKey, groupKey, lotCode) {
        return updateGroupSelection(selectionsByKey, groupKey, function () {
            return { lotCode: String(lotCode || "") };
        });
    }

    function setGroupLotName(selectionsByKey, groupKey, lotName) {
        return updateGroupSelection(selectionsByKey, groupKey, function () {
            return { lotName: String(lotName || "") };
        });
    }

    const exportsObject = {
        getRecommendationGroups: getRecommendationGroups,
        getSelectedRecommendationGroups: getSelectedRecommendationGroups,
        buildSelectionMap: buildSelectionMap,
        buildLotApplyPayload: buildLotApplyPayload,
        setGroupSelected: setGroupSelected,
        setGroupLotCode: setGroupLotCode,
        setGroupLotName: setGroupLotName
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotStateSelectionHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
