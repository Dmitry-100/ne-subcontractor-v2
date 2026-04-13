"use strict";

(function () {
    function resolveRecommendationGroupCount(recommendations) {
        return Array.isArray(recommendations?.groups) ? recommendations.groups.length : 0;
    }

    function buildRecommendationsStatus(args) {
        const options = args || {};
        const recommendations = options.recommendations || null;
        const groupsCount = resolveRecommendationGroupCount(recommendations);
        if (groupsCount === 0) {
            const candidateRows = Number(recommendations?.candidateRows || 0);
            return `Рекомендательные группы не сформированы. Валидных строк-кандидатов: ${candidateRows}.`;
        }

        if (!recommendations?.canApply) {
            const note = String(recommendations?.note || "Операция применения сейчас недоступна.");
            return `Сформировано рекомендационных групп: ${groupsCount}. ${note}`;
        }

        const selectedCount = Number(options.selectedCount || 0);
        return `Сформировано рекомендационных групп: ${groupsCount}. Выбрано к применению: ${selectedCount}.`;
    }

    function buildApplySummary(result) {
        const createdLots = Array.isArray(result?.createdLots) ? result.createdLots : [];
        const skippedGroups = Array.isArray(result?.skippedGroups) ? result.skippedGroups : [];
        const createdCodes = createdLots
            .map(function (lot) { return lot.lotCode; })
            .filter(function (code) { return Boolean(code); });
        const codesPreview = createdCodes.slice(0, 3).join(", ");
        const suffix = createdCodes.length > 3 ? ", ..." : "";
        const summary = createdCodes.length > 0
            ? ` Созданные лоты: ${codesPreview}${suffix}.`
            : "";
        const firstSkipReason = skippedGroups.length > 0 && skippedGroups[0].reason
            ? ` Первая причина пропуска: ${skippedGroups[0].reason}`
            : "";

        return {
            createdLotsCount: createdLots.length,
            skippedGroupsCount: skippedGroups.length,
            statusMessage: `Применение завершено. Создано: ${createdLots.length}. Пропущено: ${skippedGroups.length}.${summary}${firstSkipReason}`
        };
    }

    function buildSelectedGroupsStatus(selectedCount) {
        const count = Number.isFinite(Number(selectedCount)) ? Number(selectedCount) : 0;
        return `Выбрано к применению: ${count} групп(ы).`;
    }

    const exportsObject = {
        buildRecommendationsStatus: buildRecommendationsStatus,
        buildApplySummary: buildApplySummary,
        buildSelectedGroupsStatus: buildSelectedGroupsStatus
    };

    if (typeof window !== "undefined") {
        window.ImportsPageLotStateStatuses = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
