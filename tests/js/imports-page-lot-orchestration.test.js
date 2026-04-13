"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const lotOrchestrationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-lot-orchestration.js"));

function createLotState(overrides) {
    const options = overrides || {};
    return {
        getRecommendationGroups: options.getRecommendationGroups || function (recommendations) {
            return Array.isArray(recommendations?.groups) ? recommendations.groups : [];
        },
        getSelectedRecommendationGroups: options.getSelectedRecommendationGroups || function (recommendations, selectionsByKey) {
            const groups = Array.isArray(recommendations?.groups) ? recommendations.groups : [];
            return groups
                .map(function (group) {
                    return {
                        group: group,
                        selection: selectionsByKey instanceof Map ? selectionsByKey.get(group.groupKey) : null
                    };
                })
                .filter(function (entry) {
                    return Boolean(entry.selection?.selected);
                });
        },
        resolveActionState: options.resolveActionState || function (args) {
            return {
                canBuild: Boolean(args.selectedBatchId),
                canApply: Boolean(args.selectedBatchId) &&
                    Boolean(args.recommendations?.canApply) &&
                    args.recommendationsBatchId === args.selectedBatchId &&
                    Number(args.selectedCount || 0) > 0
            };
        },
        buildSelectionMap: options.buildSelectionMap || function (groups) {
            const map = new Map();
            (Array.isArray(groups) ? groups : []).forEach(function (group) {
                map.set(group.groupKey, {
                    selected: true,
                    lotCode: String(group.suggestedLotCode || ""),
                    lotName: String(group.suggestedLotName || "")
                });
            });
            return map;
        },
        validateBuildRecommendationsRequest: options.validateBuildRecommendationsRequest || function (selectedBatchId) {
            if (!selectedBatchId) {
                throw new Error("batch required");
            }
        },
        buildRecommendationsStatus: options.buildRecommendationsStatus || function (args) {
            return `selected:${args.selectedCount}`;
        },
        validateApplyRecommendationsRequest: options.validateApplyRecommendationsRequest || function (args) {
            if (!args.selectedBatchId) {
                throw new Error("batch required");
            }

            if (!args.recommendations || !args.recommendations.canApply) {
                throw new Error("recommendations required");
            }
        },
        buildLotApplyPayload: options.buildLotApplyPayload || function (selectedEntries) {
            return {
                groups: selectedEntries.map(function (entry) {
                    return {
                        groupKey: entry.group.groupKey,
                        lotCode: entry.selection.lotCode,
                        lotName: entry.selection.lotName
                    };
                })
            };
        },
        buildApplySummary: options.buildApplySummary || function (result) {
            const created = Array.isArray(result?.createdLots) ? result.createdLots : [];
            const skipped = Array.isArray(result?.skippedGroups) ? result.skippedGroups : [];
            return {
                createdLotsCount: created.length,
                skippedGroupsCount: skipped.length,
                statusMessage: `created:${created.length};skipped:${skipped.length}`
            };
        },
        setGroupSelected: options.setGroupSelected || function (selectionsByKey, groupKey, selected) {
            const map = selectionsByKey instanceof Map ? selectionsByKey : new Map();
            const current = map.get(groupKey);
            if (!current) {
                return { updated: false, selectionsByKey: map };
            }

            map.set(groupKey, {
                ...current,
                selected: Boolean(selected)
            });
            return { updated: true, selectionsByKey: map };
        },
        setGroupLotCode: options.setGroupLotCode || function (selectionsByKey, groupKey, lotCode) {
            const map = selectionsByKey instanceof Map ? selectionsByKey : new Map();
            const current = map.get(groupKey);
            if (!current) {
                return { updated: false, selectionsByKey: map };
            }

            map.set(groupKey, {
                ...current,
                lotCode: String(lotCode || "")
            });
            return { updated: true, selectionsByKey: map };
        },
        setGroupLotName: options.setGroupLotName || function (selectionsByKey, groupKey, lotName) {
            const map = selectionsByKey instanceof Map ? selectionsByKey : new Map();
            const current = map.get(groupKey);
            if (!current) {
                return { updated: false, selectionsByKey: map };
            }

            map.set(groupKey, {
                ...current,
                lotName: String(lotName || "")
            });
            return { updated: true, selectionsByKey: map };
        },
        buildSelectedGroupsStatus: options.buildSelectedGroupsStatus || function (count) {
            return `selected-groups:${count}`;
        }
    };
}

function createServiceHarness(overrides) {
    const options = overrides || {};
    let recommendations = options.recommendations || null;
    let recommendationsBatchId = options.recommendationsBatchId || null;
    let selectionsByKey = options.selectionsByKey || new Map();
    let selectedBatchId = options.selectedBatchId || "batch-1";

    const calls = {
        renderGroups: 0,
        renderSelected: 0,
        statuses: [],
        actionStates: []
    };

    const service = lotOrchestrationModule.createLotOrchestrationService({
        lotState: options.lotState || createLotState(),
        apiClient: options.apiClient || {
            getLotRecommendations: async function () {
                return { groups: [], canApply: false };
            },
            applyLotRecommendations: async function () {
                return { createdLots: [], skippedGroups: [] };
            }
        },
        lotRecommendationsEndpoint: "/api/lots/recommendations/import-batches",
        getSelectedBatchId: function () {
            return selectedBatchId;
        },
        getRecommendations: function () {
            return recommendations;
        },
        setRecommendations: function (value) {
            recommendations = value;
        },
        getRecommendationsBatchId: function () {
            return recommendationsBatchId;
        },
        setRecommendationsBatchId: function (value) {
            recommendationsBatchId = value;
        },
        getSelectionsByKey: function () {
            return selectionsByKey;
        },
        setSelectionsByKey: function (value) {
            selectionsByKey = value;
        },
        renderLotGroupsTable: function () {
            calls.renderGroups += 1;
        },
        renderLotSelectedTable: function () {
            calls.renderSelected += 1;
        },
        setLotStatus: function (message, isError) {
            calls.statuses.push({ message: message, isError: Boolean(isError) });
        },
        setActionButtons: function (state) {
            calls.actionStates.push(state);
        }
    });

    return {
        service: service,
        calls: calls,
        getState: function () {
            return {
                recommendations: recommendations,
                recommendationsBatchId: recommendationsBatchId,
                selectionsByKey: selectionsByKey,
                selectedBatchId: selectedBatchId
            };
        },
        setSelectedBatchId: function (value) {
            selectedBatchId = value;
        }
    };
}

test("imports lot orchestration: createLotOrchestrationService validates dependencies", () => {
    assert.throws(
        function () {
            lotOrchestrationModule.createLotOrchestrationService({});
        },
        /lotState/);
});

test("imports lot orchestration: buildRecommendations loads recommendations and updates status", async () => {
    const apiCalls = [];
    const harness = createServiceHarness({
        apiClient: {
            getLotRecommendations: async function (endpoint, batchId) {
                apiCalls.push({ endpoint: endpoint, batchId: batchId });
                return {
                    canApply: true,
                    groups: [{
                        groupKey: "g1",
                        suggestedLotCode: "LOT-1",
                        suggestedLotName: "Lot One"
                    }]
                };
            },
            applyLotRecommendations: async function () {
                throw new Error("unexpected");
            }
        }
    });

    await harness.service.buildRecommendations();

    assert.equal(apiCalls.length, 1);
    assert.equal(apiCalls[0].batchId, "batch-1");
    assert.equal(harness.getState().recommendationsBatchId, "batch-1");
    assert.equal(harness.getState().recommendations.groups.length, 1);
    assert.equal(harness.calls.renderGroups, 1);
    assert.equal(harness.calls.renderSelected, 1);
    assert.equal(harness.calls.statuses[0].message, "Построение рекомендаций по лотам...");
    assert.equal(harness.calls.statuses[1].message, "selected:1");
});

test("imports lot orchestration: applyRecommendations applies payload and reports summary", async () => {
    const applyCalls = [];
    const harness = createServiceHarness({
        recommendations: {
            canApply: true,
            groups: [{ groupKey: "g1" }]
        },
        recommendationsBatchId: "batch-1",
        selectionsByKey: new Map([["g1", { selected: true, lotCode: "LOT-1", lotName: "Name-1" }]]),
        apiClient: {
            getLotRecommendations: async function () {
                return {
                    canApply: true,
                    groups: [{ groupKey: "g1", suggestedLotCode: "LOT-1", suggestedLotName: "Name-1" }]
                };
            },
            applyLotRecommendations: async function (endpoint, batchId, payload) {
                applyCalls.push({ endpoint: endpoint, batchId: batchId, payload: payload });
                return {
                    createdLots: [],
                    skippedGroups: [{ groupKey: "g1" }]
                };
            }
        }
    });

    await harness.service.applyRecommendations();

    assert.equal(applyCalls.length, 1);
    assert.equal(applyCalls[0].batchId, "batch-1");
    assert.deepEqual(applyCalls[0].payload, {
        groups: [{ groupKey: "g1", lotCode: "LOT-1", lotName: "Name-1" }]
    });
    const finalStatus = harness.calls.statuses[harness.calls.statuses.length - 1];
    assert.equal(finalStatus.message, "created:0;skipped:1");
    assert.equal(finalStatus.isError, true);
});

test("imports lot orchestration: setGroupSelected updates map and publishes selection status", () => {
    const harness = createServiceHarness({
        recommendations: {
            canApply: true,
            groups: [{ groupKey: "g1" }]
        },
        recommendationsBatchId: "batch-1",
        selectionsByKey: new Map([["g1", { selected: false, lotCode: "LOT-1", lotName: "Name-1" }]])
    });

    const updated = harness.service.setGroupSelected("g1", true);

    assert.equal(updated, true);
    assert.equal(harness.getState().selectionsByKey.get("g1").selected, true);
    assert.equal(harness.calls.renderSelected, 1);
    assert.equal(harness.calls.statuses[harness.calls.statuses.length - 1].message, "selected-groups:1");
});

test("imports lot orchestration: clearRecommendations resets state and keeps non-error status", () => {
    const harness = createServiceHarness({
        recommendations: { groups: [{ groupKey: "g1" }] },
        recommendationsBatchId: "batch-1",
        selectionsByKey: new Map([["g1", { selected: true, lotCode: "LOT-1", lotName: "Name-1" }]])
    });

    harness.service.clearRecommendations("reset-message");

    assert.equal(harness.getState().recommendations, null);
    assert.equal(harness.getState().recommendationsBatchId, null);
    assert.equal(harness.getState().selectionsByKey.size, 0);
    assert.equal(harness.calls.renderGroups, 1);
    assert.equal(harness.calls.renderSelected, 1);
    assert.deepEqual(harness.calls.statuses[harness.calls.statuses.length - 1], {
        message: "reset-message",
        isError: false
    });
});

test("imports lot orchestration: onDetailsLoaded reset branch clears recommendations", () => {
    const harness = createServiceHarness({
        recommendations: { groups: [{ groupKey: "g1" }] },
        recommendationsBatchId: "batch-1",
        selectionsByKey: new Map([["g1", { selected: true, lotCode: "LOT-1", lotName: "Name-1" }]])
    });

    harness.service.onDetailsLoaded({ shouldResetLotRecommendations: true });

    assert.equal(harness.getState().recommendations, null);
    assert.equal(harness.calls.statuses[harness.calls.statuses.length - 1].message, "Выбран пакет. Постройте рекомендации для подготовки черновых лотов.");
});
