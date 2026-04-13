"use strict";

(function () {
    function toFiniteInteger(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return null;
        }

        return Math.trunc(number);
    }

    function toPagedResult(payload, fallbackTake) {
        if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
            return null;
        }

        const totalCountValue = toFiniteInteger(payload.totalCount);
        const totalCount = totalCountValue !== null && totalCountValue >= 0
            ? totalCountValue
            : payload.items.length;

        const takeValue = toFiniteInteger(payload.take);
        const take = takeValue !== null && takeValue > 0
            ? takeValue
            : fallbackTake;

        return {
            items: payload.items,
            totalCount: totalCount,
            take: take
        };
    }

    function toListItem(details, fallback) {
        if (!details || typeof details !== "object") {
            return fallback;
        }

        return {
            id: details.id ?? fallback?.id,
            lotId: details.lotId ?? fallback?.lotId ?? null,
            status: details.status ?? fallback?.status ?? "Created",
            purchaseTypeCode: details.purchaseTypeCode ?? fallback?.purchaseTypeCode ?? "",
            objectName: details.objectName ?? fallback?.objectName ?? "",
            initiatorUserId: details.initiatorUserId ?? fallback?.initiatorUserId ?? null,
            responsibleCommercialUserId: details.responsibleCommercialUserId ?? fallback?.responsibleCommercialUserId ?? null,
            requiredSubcontractorDeadline: details.requiredSubcontractorDeadline ?? fallback?.requiredSubcontractorDeadline ?? null,
            approvalMode: details.approvalMode ?? fallback?.approvalMode ?? "InSystem",
            workScope: details.workScope ?? fallback?.workScope ?? "",
            plannedBudgetWithoutVat: details.plannedBudgetWithoutVat ?? fallback?.plannedBudgetWithoutVat ?? null,
            proposalDueDate: details.proposalDueDate ?? fallback?.proposalDueDate ?? null,
            notes: details.notes ?? fallback?.notes ?? null
        };
    }

    function buildProceduresLoadQuery(loadOptions, fallbackTake) {
        const options = loadOptions || {};
        const skip = toFiniteInteger(options.skip);
        const take = toFiniteInteger(options.take);
        const search = typeof options.searchValue === "string"
            ? options.searchValue.trim()
            : "";
        const hasPagingQuery = (skip !== null && skip >= 0) || (take !== null && take > 0);
        const query = {};

        if (hasPagingQuery) {
            query.skip = skip !== null && skip >= 0 ? skip : 0;
            query.take = take !== null && take > 0 ? take : fallbackTake;
            query.requireTotalCount = true;
        }

        if (search.length > 0) {
            query.search = search;
        }

        return Object.keys(query).length > 0 ? query : null;
    }

    const exportsObject = {
        toFiniteInteger: toFiniteInteger,
        toPagedResult: toPagedResult,
        toListItem: toListItem,
        buildProceduresLoadQuery: buildProceduresLoadQuery
    };

    if (typeof window !== "undefined") {
        window.ProceduresDataHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
