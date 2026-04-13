"use strict";

(function () {
    function normalizeTopContractors(rows) {
        const list = Array.isArray(rows) ? rows : [];
        return list.map(function (item) {
            const contractor = item || {};
            return {
                ...contractor,
                rating: contractor.rating ?? contractor.currentRating ?? null,
                currentLoadPercent: contractor.currentLoadPercent ?? contractor.loadPercent ?? null
            };
        });
    }

    function normalizeAnalyticsPayload(payload) {
        const safePayload = payload || {};
        const contractorLoad = safePayload.contractorLoad || {};
        const sla = safePayload.sla || {};
        const contractingAmounts = safePayload.contractingAmounts || {};
        const mdrProgress = safePayload.mdrProgress || {};
        const subcontractingShare = safePayload.subcontractingShare || {};

        const lotStatusCounters = Array.isArray(safePayload.lotStatusCounters)
            ? safePayload.lotStatusCounters
            : (Array.isArray(safePayload.lotFunnel) ? safePayload.lotFunnel : []);

        const topContractorsByRating = Array.isArray(safePayload.topContractorsByRating)
            ? safePayload.topContractorsByRating
            : normalizeTopContractors(safePayload.topContractors);

        return {
            ...safePayload,
            lotStatusCounters: lotStatusCounters,
            contractorTotalCount: safePayload.contractorTotalCount ?? contractorLoad.activeContractors ?? 0,
            overloadedContractorCount: safePayload.overloadedContractorCount ?? contractorLoad.overloadedContractors ?? 0,
            averageContractorLoadPercent: safePayload.averageContractorLoadPercent ?? contractorLoad.averageLoadPercent ?? null,
            averageContractorRating: safePayload.averageContractorRating ?? contractorLoad.averageRating ?? null,
            slaOpenWarningsCount: safePayload.slaOpenWarningsCount ?? sla.openWarnings ?? 0,
            slaOpenOverduesCount: safePayload.slaOpenOverduesCount ?? sla.openOverdue ?? 0,
            totalActiveContractAmount: safePayload.totalActiveContractAmount ?? contractingAmounts.signedAndActiveTotalAmount ?? 0,
            totalClosedContractAmount: safePayload.totalClosedContractAmount ?? contractingAmounts.closedTotalAmount ?? 0,
            mdrFactCoveragePercent: safePayload.mdrFactCoveragePercent ?? mdrProgress.factCoveragePercent ?? null,
            subcontractingSharePercent: safePayload.subcontractingSharePercent ?? subcontractingShare.sharePercent ?? null,
            topContractorsByRating: topContractorsByRating
        };
    }

    const exportsObject = {
        normalizeTopContractors: normalizeTopContractors,
        normalizeAnalyticsPayload: normalizeAnalyticsPayload
    };

    if (typeof window !== "undefined") {
        window.DashboardPageRenderersInfographicsAdapter = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
