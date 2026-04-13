"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`Dashboard runtime field collectors require ${name}.`);
        }
    }

    function queryFields(moduleRoot, selectorsByKey) {
        const result = {};
        const keys = Object.keys(selectorsByKey || {});
        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            result[key] = moduleRoot.querySelector(selectorsByKey[key]);
        }

        return result;
    }

    function createStatusCaptions() {
        return {
            Draft: "Черновик",
            InProcurement: "В закупке",
            ContractorSelected: "Подрядчик выбран",
            Contracted: "Законтрактован",
            InExecution: "В исполнении",
            Closed: "Закрыт",
            Created: "Создана",
            DocumentsPreparation: "Подготовка документов",
            OnApproval: "На согласовании",
            Sent: "Отправлена",
            OffersReceived: "Предложения получены",
            Retender: "Переторжка",
            DecisionMade: "Решение принято",
            Completed: "Завершена",
            Canceled: "Отменена",
            Signed: "Подписан",
            Active: "Действует"
        };
    }

    function collectDashboardRuntimeFields(options) {
        const settings = options || {};
        const moduleRoot = settings.moduleRoot;
        const controls = settings.controls;

        requireObject(moduleRoot, "moduleRoot");
        requireObject(controls, "controls");

        return {
            statusElement: controls.statusElement,
            refreshButton: controls.refreshButton,
            tasksElement: controls.tasksElement,
            lotStatusesElement: controls.lotStatusesElement,
            procedureStatusesElement: controls.procedureStatusesElement,
            contractStatusesElement: controls.contractStatusesElement,
            analyticsStatusElement: moduleRoot.querySelector("[data-dashboard-analytics-status]"),
            topContractorsElement: moduleRoot.querySelector("[data-dashboard-top-contractors]"),
            counterFields: queryFields(moduleRoot, {
                projectsTotal: '[data-dashboard-counter="projectsTotal"]',
                lotsTotal: '[data-dashboard-counter="lotsTotal"]',
                proceduresTotal: '[data-dashboard-counter="proceduresTotal"]',
                contractsTotal: '[data-dashboard-counter="contractsTotal"]'
            }),
            overdueFields: queryFields(moduleRoot, {
                proceduresCount: '[data-dashboard-overdue="proceduresCount"]',
                contractsCount: '[data-dashboard-overdue="contractsCount"]',
                milestonesCount: '[data-dashboard-overdue="milestonesCount"]'
            }),
            overdueRateFields: queryFields(moduleRoot, {
                procedures: '[data-dashboard-overdue-rate="procedures"]',
                contracts: '[data-dashboard-overdue-rate="contracts"]',
                milestones: '[data-dashboard-overdue-rate="milestones"]'
            }),
            overdueContextFields: queryFields(moduleRoot, {
                procedures: '[data-dashboard-overdue-context="procedures"]',
                contracts: '[data-dashboard-overdue-context="contracts"]',
                milestones: '[data-dashboard-overdue-context="milestones"]'
            }),
            overdueBarFields: queryFields(moduleRoot, {
                procedures: '[data-dashboard-overdue-bar="procedures"]',
                contracts: '[data-dashboard-overdue-bar="contracts"]',
                milestones: '[data-dashboard-overdue-bar="milestones"]'
            }),
            kpiFields: queryFields(moduleRoot, {
                procedureCompletionRatePercent: '[data-dashboard-kpi="procedureCompletionRatePercent"]',
                contractClosureRatePercent: '[data-dashboard-kpi="contractClosureRatePercent"]',
                milestoneCompletionRatePercent: '[data-dashboard-kpi="milestoneCompletionRatePercent"]'
            }),
            kpiRingFields: queryFields(moduleRoot, {
                procedureCompletionRatePercent: '[data-dashboard-kpi-ring="procedureCompletionRatePercent"]',
                contractClosureRatePercent: '[data-dashboard-kpi-ring="contractClosureRatePercent"]',
                milestoneCompletionRatePercent: '[data-dashboard-kpi-ring="milestoneCompletionRatePercent"]'
            }),
            importFields: queryFields(moduleRoot, {
                sourceUploadedCount: '[data-dashboard-import="sourceUploadedCount"]',
                sourceProcessingCount: '[data-dashboard-import="sourceProcessingCount"]',
                sourceReadyForLottingCount: '[data-dashboard-import="sourceReadyForLottingCount"]',
                sourceValidatedWithErrorsCount: '[data-dashboard-import="sourceValidatedWithErrorsCount"]',
                sourceFailedCount: '[data-dashboard-import="sourceFailedCount"]',
                sourceRejectedCount: '[data-dashboard-import="sourceRejectedCount"]',
                sourceInvalidRowsCount: '[data-dashboard-import="sourceInvalidRowsCount"]',
                xmlReceivedCount: '[data-dashboard-import="xmlReceivedCount"]',
                xmlProcessingCount: '[data-dashboard-import="xmlProcessingCount"]',
                xmlCompletedCount: '[data-dashboard-import="xmlCompletedCount"]',
                xmlFailedCount: '[data-dashboard-import="xmlFailedCount"]',
                xmlRetriedPendingCount: '[data-dashboard-import="xmlRetriedPendingCount"]',
                traceAppliedGroupsCount: '[data-dashboard-import="traceAppliedGroupsCount"]',
                traceCreatedGroupsCount: '[data-dashboard-import="traceCreatedGroupsCount"]',
                traceSkippedGroupsCount: '[data-dashboard-import="traceSkippedGroupsCount"]',
                traceCreatedLotsCount: '[data-dashboard-import="traceCreatedLotsCount"]'
            }),
            analyticsFields: queryFields(moduleRoot, {
                lotFunnel: '[data-dashboard-analytics="lotFunnel"]',
                contractorLoad: '[data-dashboard-analytics="contractorLoad"]',
                averageContractorLoad: '[data-dashboard-analytics="averageContractorLoad"]',
                averageContractorRating: '[data-dashboard-analytics="averageContractorRating"]',
                slaOpen: '[data-dashboard-analytics="slaOpen"]',
                contractingTotals: '[data-dashboard-analytics="contractingTotals"]',
                mdrFactCoverage: '[data-dashboard-analytics="mdrFactCoverage"]',
                subcontractingShare: '[data-dashboard-analytics="subcontractingShare"]'
            }),
            analyticsHighlightFields: queryFields(moduleRoot, {
                lotDraft: '[data-dashboard-analytics-highlight="lotDraft"]',
                lotInProcurement: '[data-dashboard-analytics-highlight="lotInProcurement"]',
                lotContracted: '[data-dashboard-analytics-highlight="lotContracted"]',
                overloadShare: '[data-dashboard-analytics-highlight="overloadShare"]',
                contractorLoadMeta: '[data-dashboard-analytics-highlight="contractorLoadMeta"]',
                averageLoad: '[data-dashboard-analytics-highlight="averageLoad"]',
                averageRating: '[data-dashboard-analytics-highlight="averageRating"]',
                mdrCoverage: '[data-dashboard-analytics-highlight="mdrCoverage"]',
                subcontractingShare: '[data-dashboard-analytics-highlight="subcontractingShare"]',
                slaWarnings: '[data-dashboard-analytics-highlight="slaWarnings"]',
                slaOverdue: '[data-dashboard-analytics-highlight="slaOverdue"]',
                contractingActiveAmount: '[data-dashboard-analytics-highlight="contractingActiveAmount"]',
                contractingClosedAmount: '[data-dashboard-analytics-highlight="contractingClosedAmount"]'
            }),
            analyticsBarFields: queryFields(moduleRoot, {
                overloadShare: '[data-dashboard-analytics-bar="overloadShare"]',
                averageLoad: '[data-dashboard-analytics-bar="averageLoad"]',
                averageRating: '[data-dashboard-analytics-bar="averageRating"]',
                mdrCoverage: '[data-dashboard-analytics-bar="mdrCoverage"]',
                subcontractingShare: '[data-dashboard-analytics-bar="subcontractingShare"]',
                slaOverdueShare: '[data-dashboard-analytics-bar="slaOverdueShare"]',
                contractingClosedShare: '[data-dashboard-analytics-bar="contractingClosedShare"]'
            }),
            statusCaptions: createStatusCaptions()
        };
    }

    const exportsObject = {
        collectDashboardRuntimeFields: collectDashboardRuntimeFields
    };

    if (typeof window !== "undefined") {
        window.DashboardPageRuntimeFieldCollectors = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
