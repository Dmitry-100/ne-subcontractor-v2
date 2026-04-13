"use strict";

(function () {
    const adapterRoot =
        typeof window !== "undefined" && window.DashboardPageRenderersInfographicsAdapter
            ? window.DashboardPageRenderersInfographicsAdapter
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./dashboard-page-renderers-infographics-adapter.js")
                : null;

    if (!adapterRoot || typeof adapterRoot.normalizeAnalyticsPayload !== "function") {
        throw new Error("Dashboard renderers infographics require DashboardPageRenderersInfographicsAdapter.");
    }

    function createInfographics(options) {
        const settings = options || {};
        const dashboardHelpers = settings.dashboardHelpers;
        const dashboardFormatters = settings.dashboardFormatters;
        const setValue = settings.setValue;
        const setBarValue = settings.setBarValue;
        const renderTopContractors = settings.renderTopContractors;

        if (!dashboardHelpers || typeof dashboardHelpers.getLotCountByStatus !== "function") {
            throw new Error("Dashboard renderers infographics require dashboard helpers.");
        }

        if (!dashboardFormatters || typeof dashboardFormatters.toFiniteNumber !== "function") {
            throw new Error("Dashboard renderers infographics require dashboard formatters.");
        }

        if (typeof setValue !== "function" || typeof setBarValue !== "function") {
            throw new Error("Dashboard renderers infographics require setValue/setBarValue delegates.");
        }

        if (typeof renderTopContractors !== "function") {
            throw new Error("Dashboard renderers infographics require renderTopContractors delegate.");
        }

        const overdueFields = settings.overdueFields || {};
        const overdueRateFields = settings.overdueRateFields || {};
        const overdueContextFields = settings.overdueContextFields || {};
        const overdueBarFields = settings.overdueBarFields || {};
        const kpiFields = settings.kpiFields || {};
        const kpiRingFields = settings.kpiRingFields || {};
        const analyticsFields = settings.analyticsFields || {};
        const analyticsHighlightFields = settings.analyticsHighlightFields || {};
        const analyticsBarFields = settings.analyticsBarFields || {};

        const toFiniteNumber = dashboardFormatters.toFiniteNumber;
        const clampPercent = dashboardFormatters.clampPercent;
        const formatCompactPercent = dashboardFormatters.formatCompactPercent;
        const formatCompactMoney = dashboardFormatters.formatCompactMoney;

        function applyOverdueInfographics(counters, overdue) {
            const safeCounters = counters || {};
            const safeOverdue = overdue || {};

            const proceduresTotal = Math.max(0, Number(safeCounters.proceduresTotal || 0));
            const contractsTotal = Math.max(0, Number(safeCounters.contractsTotal || 0));
            const proceduresOverdue = Math.max(0, Number(safeOverdue.proceduresCount || 0));
            const contractsOverdue = Math.max(0, Number(safeOverdue.contractsCount || 0));
            const milestonesOverdue = Math.max(0, Number(safeOverdue.milestonesCount || 0));
            const totalOverdue = proceduresOverdue + contractsOverdue + milestonesOverdue;

            const proceduresRate = proceduresTotal > 0 ? (proceduresOverdue / proceduresTotal) * 100 : 0;
            const contractsRate = contractsTotal > 0 ? (contractsOverdue / contractsTotal) * 100 : 0;
            const milestonesRate = totalOverdue > 0 ? (milestonesOverdue / totalOverdue) * 100 : 0;

            setValue(overdueFields.proceduresCount, proceduresOverdue, "0");
            setValue(overdueFields.contractsCount, contractsOverdue, "0");
            setValue(overdueFields.milestonesCount, milestonesOverdue, "0");

            setValue(overdueRateFields.procedures, formatCompactPercent(proceduresRate), "0%");
            setValue(overdueRateFields.contracts, formatCompactPercent(contractsRate), "0%");
            setValue(overdueRateFields.milestones, formatCompactPercent(milestonesRate), "0%");

            setValue(overdueContextFields.procedures, "из " + proceduresTotal + " процедур", "из 0 процедур");
            setValue(overdueContextFields.contracts, "из " + contractsTotal + " договоров", "из 0 договоров");
            setValue(overdueContextFields.milestones, "доля среди всех просрочек", "доля среди всех просрочек");

            setBarValue(overdueBarFields.procedures, clampPercent, proceduresRate);
            setBarValue(overdueBarFields.contracts, clampPercent, contractsRate);
            setBarValue(overdueBarFields.milestones, clampPercent, milestonesRate);
        }

        function applyKpiInfographics(kpi) {
            const safeKpi = kpi || {};
            const kpiKeys = Object.keys(kpiFields);
            kpiKeys.forEach(function (key) {
                const target = kpiFields[key];
                const ring = kpiRingFields[key];
                const rawValue = toFiniteNumber(safeKpi[key]);
                if (rawValue === null) {
                    setValue(target, "н/д", "н/д");
                    if (ring && ring.classList && typeof ring.classList.add === "function") {
                        ring.classList.add("dashboard-kpi-ring--empty");
                    }
                    if (ring && ring.style && typeof ring.style.setProperty === "function") {
                        ring.style.setProperty("--value", "0%");
                    }
                    return;
                }

                setValue(target, formatCompactPercent(rawValue), "0%");
                if (ring && ring.classList && typeof ring.classList.remove === "function") {
                    ring.classList.remove("dashboard-kpi-ring--empty");
                }
                if (ring && ring.style && typeof ring.style.setProperty === "function") {
                    ring.style.setProperty("--value", clampPercent(rawValue).toFixed(2) + "%");
                }
            });
        }

        function applyAnalytics(payload) {
            const safePayload = adapterRoot.normalizeAnalyticsPayload(payload);

            setValue(analyticsFields.lotFunnel, safePayload.lotFunnelDescription || "Лоты: нет данных.", "Лоты: нет данных.");
            setValue(analyticsFields.contractorLoad, safePayload.contractorLoadDescription || "Подрядчики: нет данных.", "Подрядчики: нет данных.");
            setValue(analyticsFields.averageContractorLoad, safePayload.averageContractorLoadDescription || "Средняя загрузка: н/д", "Средняя загрузка: н/д");
            setValue(analyticsFields.averageContractorRating, safePayload.averageContractorRatingDescription || "Средний рейтинг: н/д", "Средний рейтинг: н/д");
            setValue(analyticsFields.slaOpen, safePayload.slaOpenDescription || "SLA: нет данных.", "SLA: нет данных.");
            setValue(analyticsFields.contractingTotals, safePayload.contractingTotalsDescription || "Контрактование: нет данных.", "Контрактование: нет данных.");
            setValue(analyticsFields.mdrFactCoverage, safePayload.mdrFactCoverageDescription || "MDR: нет данных.", "MDR: нет данных.");
            setValue(analyticsFields.subcontractingShare, safePayload.subcontractingShareDescription || "Субподряд: нет данных.", "Субподряд: нет данных.");

            setValue(analyticsHighlightFields.lotDraft, dashboardHelpers.getLotCountByStatus(safePayload.lotStatusCounters, "Draft"), "0");
            setValue(analyticsHighlightFields.lotInProcurement, dashboardHelpers.getLotCountByStatus(safePayload.lotStatusCounters, "InProcurement"), "0");
            setValue(analyticsHighlightFields.lotContracted, dashboardHelpers.getLotCountByStatus(safePayload.lotStatusCounters, "Contracted"), "0");

            const contractorTotalCount = Math.max(0, Number(safePayload.contractorTotalCount || 0));
            const overloadedContractorCount = Math.max(0, Number(safePayload.overloadedContractorCount || 0));
            const overloadShare = contractorTotalCount > 0
                ? (overloadedContractorCount / contractorTotalCount) * 100
                : 0;
            setValue(analyticsHighlightFields.overloadShare, formatCompactPercent(overloadShare), "0%");
            setValue(analyticsHighlightFields.contractorLoadMeta, overloadedContractorCount + " из " + contractorTotalCount, "0 из 0");
            setBarValue(analyticsBarFields.overloadShare, clampPercent, overloadShare);

            const averageLoad = toFiniteNumber(safePayload.averageContractorLoadPercent);
            setValue(analyticsHighlightFields.averageLoad, averageLoad === null ? "н/д" : formatCompactPercent(averageLoad), "н/д");
            setBarValue(analyticsBarFields.averageLoad, clampPercent, averageLoad === null ? 0 : averageLoad);

            const averageRating = toFiniteNumber(safePayload.averageContractorRating);
            const averageRatingPercent = averageRating === null ? 0 : (averageRating / 5) * 100;
            setValue(analyticsHighlightFields.averageRating, averageRating === null ? "н/д" : averageRating.toFixed(3), "н/д");
            setBarValue(analyticsBarFields.averageRating, clampPercent, averageRatingPercent);

            const mdrCoverage = toFiniteNumber(safePayload.mdrFactCoveragePercent);
            setValue(analyticsHighlightFields.mdrCoverage, mdrCoverage === null ? "н/д" : formatCompactPercent(mdrCoverage), "н/д");
            setBarValue(analyticsBarFields.mdrCoverage, clampPercent, mdrCoverage === null ? 0 : mdrCoverage);

            const subcontractingShare = toFiniteNumber(safePayload.subcontractingSharePercent);
            setValue(analyticsHighlightFields.subcontractingShare, subcontractingShare === null ? "н/д" : formatCompactPercent(subcontractingShare), "н/д");
            setBarValue(analyticsBarFields.subcontractingShare, clampPercent, subcontractingShare === null ? 0 : subcontractingShare);

            const slaOpenWarnings = Math.max(0, Number(safePayload.slaOpenWarningsCount || 0));
            const slaOpenOverdues = Math.max(0, Number(safePayload.slaOpenOverduesCount || 0));
            const slaTotal = slaOpenWarnings + slaOpenOverdues;
            const slaOverdueShare = slaTotal > 0 ? (slaOpenOverdues / slaTotal) * 100 : 0;
            setValue(analyticsHighlightFields.slaWarnings, slaOpenWarnings, "0");
            setValue(analyticsHighlightFields.slaOverdue, slaOpenOverdues, "0");
            setBarValue(analyticsBarFields.slaOverdueShare, clampPercent, slaOverdueShare);

            const activeAmount = toFiniteNumber(safePayload.totalActiveContractAmount);
            const closedAmount = toFiniteNumber(safePayload.totalClosedContractAmount);
            const contractingTotal = Math.max(0, (activeAmount || 0) + (closedAmount || 0));
            const closedShare = contractingTotal > 0 ? ((closedAmount || 0) / contractingTotal) * 100 : 0;
            setValue(analyticsHighlightFields.contractingActiveAmount, formatCompactMoney(activeAmount), "0");
            setValue(analyticsHighlightFields.contractingClosedAmount, formatCompactMoney(closedAmount), "0");
            setBarValue(analyticsBarFields.contractingClosedShare, clampPercent, closedShare);

            renderTopContractors(safePayload.topContractorsByRating, toFiniteNumber);
        }

        return {
            applyOverdueInfographics: applyOverdueInfographics,
            applyKpiInfographics: applyKpiInfographics,
            applyAnalytics: applyAnalytics
        };
    }

    const exportsObject = {
        createInfographics: createInfographics
    };

    if (typeof window !== "undefined") {
        window.DashboardPageRenderersInfographics = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
