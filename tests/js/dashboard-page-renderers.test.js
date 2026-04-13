"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const dashboardRenderersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-renderers.js"));

function createMockElement(tagName) {
    const classes = new Set();

    return {
        tagName: String(tagName || "div").toUpperCase(),
        className: "",
        textContent: "",
        innerHTML: "",
        href: "",
        dataset: {},
        children: [],
        style: {
            values: {},
            setProperty: function (name, value) {
                this.values[name] = value;
            }
        },
        classList: {
            add: function (value) {
                classes.add(value);
            },
            remove: function (value) {
                classes.delete(value);
            },
            toggle: function (value, force) {
                if (force === undefined) {
                    if (classes.has(value)) {
                        classes.delete(value);
                        return false;
                    }

                    classes.add(value);
                    return true;
                }

                if (force) {
                    classes.add(value);
                    return true;
                }

                classes.delete(value);
                return false;
            },
            contains: function (value) {
                return classes.has(value);
            }
        },
        appendChild: function (child) {
            this.children.push(child);
            return child;
        }
    };
}

function createHelpers() {
    return {
        parseErrorBody: function () {
            return "error";
        },
        localizeStatus: function (status) {
            return "status:" + status;
        },
        formatDate: function (value) {
            return value ? "date:" + value : "н/д";
        },
        localizePriority: function (priority) {
            if (!priority) {
                return "Обычный";
            }

            return "priority:" + priority;
        },
        getLotCountByStatus: function (rows, status) {
            if (!Array.isArray(rows)) {
                return 0;
            }

            for (let index = 0; index < rows.length; index += 1) {
                const row = rows[index];
                if (row && row.status === status) {
                    return Number(row.count || 0);
                }
            }

            return 0;
        }
    };
}

function createFormatters() {
    return {
        toFiniteNumber: function (value) {
            if (typeof value === "number" && Number.isFinite(value)) {
                return value;
            }

            if (typeof value === "string" && value.trim().length > 0) {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : null;
            }

            return null;
        },
        clampPercent: function (value) {
            if (!Number.isFinite(value)) {
                return 0;
            }

            if (value < 0) {
                return 0;
            }

            if (value > 100) {
                return 100;
            }

            return value;
        },
        formatCompactPercent: function (value) {
            const numeric = Number.isFinite(value) ? value : 0;
            return numeric.toFixed(1) + "%";
        },
        formatCompactMoney: function (value) {
            const numeric = Number.isFinite(value) ? value : (value ? Number(value) : 0);
            const safeNumeric = Number.isFinite(numeric) ? numeric : 0;
            return safeNumeric.toFixed(2);
        }
    };
}

function createRendererContext() {
    const statusElement = createMockElement("p");
    const analyticsStatusElement = createMockElement("p");
    const tasksElement = createMockElement("ul");
    const lotStatusesElement = createMockElement("ul");
    const procedureStatusesElement = createMockElement("ul");
    const contractStatusesElement = createMockElement("ul");
    const topContractorsElement = createMockElement("ul");

    const counterFields = {
        projectsTotal: createMockElement("strong"),
        lotsTotal: createMockElement("strong"),
        proceduresTotal: createMockElement("strong"),
        contractsTotal: createMockElement("strong")
    };

    const overdueFields = {
        proceduresCount: createMockElement("strong"),
        contractsCount: createMockElement("strong"),
        milestonesCount: createMockElement("strong")
    };

    const overdueRateFields = {
        procedures: createMockElement("span"),
        contracts: createMockElement("span"),
        milestones: createMockElement("span")
    };

    const overdueContextFields = {
        procedures: createMockElement("span"),
        contracts: createMockElement("span"),
        milestones: createMockElement("span")
    };

    const overdueBarFields = {
        procedures: createMockElement("span"),
        contracts: createMockElement("span"),
        milestones: createMockElement("span")
    };

    const kpiFields = {
        procedureCompletionRatePercent: createMockElement("strong"),
        contractClosureRatePercent: createMockElement("strong"),
        milestoneCompletionRatePercent: createMockElement("strong")
    };

    const kpiRingFields = {
        procedureCompletionRatePercent: createMockElement("div"),
        contractClosureRatePercent: createMockElement("div"),
        milestoneCompletionRatePercent: createMockElement("div")
    };

    const importFields = {
        sourceUploadedCount: createMockElement("strong"),
        sourceProcessingCount: createMockElement("strong"),
        sourceReadyForLottingCount: createMockElement("strong"),
        sourceValidatedWithErrorsCount: createMockElement("strong"),
        sourceFailedCount: createMockElement("strong"),
        sourceRejectedCount: createMockElement("strong"),
        sourceInvalidRowsCount: createMockElement("strong"),
        xmlReceivedCount: createMockElement("strong"),
        xmlProcessingCount: createMockElement("strong"),
        xmlCompletedCount: createMockElement("strong"),
        xmlFailedCount: createMockElement("strong"),
        xmlRetriedPendingCount: createMockElement("strong"),
        traceAppliedGroupsCount: createMockElement("strong"),
        traceCreatedGroupsCount: createMockElement("strong"),
        traceSkippedGroupsCount: createMockElement("strong"),
        traceCreatedLotsCount: createMockElement("strong")
    };

    const analyticsFields = {
        lotFunnel: createMockElement("p"),
        contractorLoad: createMockElement("p"),
        averageContractorLoad: createMockElement("p"),
        averageContractorRating: createMockElement("p"),
        slaOpen: createMockElement("p"),
        contractingTotals: createMockElement("p"),
        mdrFactCoverage: createMockElement("p"),
        subcontractingShare: createMockElement("p")
    };

    const analyticsHighlightFields = {
        lotDraft: createMockElement("strong"),
        lotInProcurement: createMockElement("strong"),
        lotContracted: createMockElement("strong"),
        overloadShare: createMockElement("strong"),
        contractorLoadMeta: createMockElement("span"),
        averageLoad: createMockElement("strong"),
        averageRating: createMockElement("strong"),
        mdrCoverage: createMockElement("strong"),
        subcontractingShare: createMockElement("strong"),
        slaWarnings: createMockElement("strong"),
        slaOverdue: createMockElement("strong"),
        contractingActiveAmount: createMockElement("strong"),
        contractingClosedAmount: createMockElement("strong")
    };

    const analyticsBarFields = {
        overloadShare: createMockElement("span"),
        averageLoad: createMockElement("span"),
        averageRating: createMockElement("span"),
        mdrCoverage: createMockElement("span"),
        subcontractingShare: createMockElement("span"),
        slaOverdueShare: createMockElement("span"),
        contractingClosedShare: createMockElement("span")
    };

    const renderer = dashboardRenderersModule.createRenderers({
        dashboardHelpers: createHelpers(),
        dashboardFormatters: createFormatters(),
        statusElement: statusElement,
        analyticsStatusElement: analyticsStatusElement,
        tasksElement: tasksElement,
        lotStatusesElement: lotStatusesElement,
        procedureStatusesElement: procedureStatusesElement,
        contractStatusesElement: contractStatusesElement,
        topContractorsElement: topContractorsElement,
        counterFields: counterFields,
        overdueFields: overdueFields,
        overdueRateFields: overdueRateFields,
        overdueContextFields: overdueContextFields,
        overdueBarFields: overdueBarFields,
        kpiFields: kpiFields,
        kpiRingFields: kpiRingFields,
        importFields: importFields,
        analyticsFields: analyticsFields,
        analyticsHighlightFields: analyticsHighlightFields,
        analyticsBarFields: analyticsBarFields,
        createElement: createMockElement
    });

    return {
        renderer: renderer,
        statusElement: statusElement,
        analyticsStatusElement: analyticsStatusElement,
        tasksElement: tasksElement,
        lotStatusesElement: lotStatusesElement,
        procedureStatusesElement: procedureStatusesElement,
        contractStatusesElement: contractStatusesElement,
        topContractorsElement: topContractorsElement,
        counterFields: counterFields,
        overdueFields: overdueFields,
        overdueRateFields: overdueRateFields,
        kpiFields: kpiFields,
        importFields: importFields,
        analyticsHighlightFields: analyticsHighlightFields
    };
}

test("dashboard renderers: validates required dependencies", () => {
    assert.throws(
        function () {
            dashboardRenderersModule.createRenderers({});
        },
        /dashboard helpers/);

    assert.throws(
        function () {
            dashboardRenderersModule.createRenderers({
                dashboardHelpers: createHelpers(),
                dashboardFormatters: createFormatters()
            });
        },
        /createElement function/);
});

test("dashboard renderers: setStatus and setAnalyticsStatus toggle error state", () => {
    const context = createRendererContext();

    context.renderer.setStatus("ok", false);
    assert.equal(context.statusElement.textContent, "ok");
    assert.equal(context.statusElement.classList.contains("dashboard-status--error"), false);

    context.renderer.setStatus("error", true);
    assert.equal(context.statusElement.textContent, "error");
    assert.equal(context.statusElement.classList.contains("dashboard-status--error"), true);

    context.renderer.setAnalyticsStatus("analytics-error", true);
    assert.equal(context.analyticsStatusElement.textContent, "analytics-error");
    assert.equal(context.analyticsStatusElement.classList.contains("dashboard-status--error"), true);
});

test("dashboard renderers: applySummary populates counters, statuses, tasks and import fields", () => {
    const context = createRendererContext();

    context.renderer.applySummary({
        counters: {
            projectsTotal: 5,
            lotsTotal: 14,
            proceduresTotal: 13,
            contractsTotal: 6
        },
        lotStatuses: [{ status: "Draft", count: 2 }],
        procedureStatuses: [],
        contractStatuses: [],
        tasks: [
            {
                module: "Contracts",
                title: "Task 1",
                description: "Update milestone",
                dueDate: "2026-04-11",
                priority: "High",
                actionUrl: "/Home/Contracts"
            },
            {
                module: "Procedures",
                title: "Task 2",
                description: "Review step",
                dueDate: "2026-04-12",
                priority: null,
                actionUrl: "   "
            }
        ],
        overdue: {
            proceduresCount: 3,
            contractsCount: 1,
            milestonesCount: 2
        },
        kpi: {
            procedureCompletionRatePercent: 33.3,
            contractClosureRatePercent: 16.7,
            milestoneCompletionRatePercent: 25.0
        },
        importPipeline: {
            sourceUploadedCount: 7
        }
    });

    assert.equal(context.counterFields.projectsTotal.textContent, "5");
    assert.equal(context.counterFields.lotsTotal.textContent, "14");
    assert.equal(context.lotStatusesElement.children.length, 1);
    assert.equal(context.lotStatusesElement.children[0].children[0].textContent, "status:Draft");
    assert.equal(context.procedureStatusesElement.children.length, 1);
    assert.equal(context.procedureStatusesElement.children[0].textContent, "Нет данных.");
    assert.equal(context.tasksElement.children.length, 2);
    assert.equal(context.tasksElement.children[0].children[3].children[1].textContent, "Открыть");
    assert.equal(context.tasksElement.children[0].children[3].children[1].href, "/Home/Contracts");
    assert.equal(context.tasksElement.children[1].children[3].children[1].textContent, "Открыть");
    assert.equal(context.tasksElement.children[1].children[3].children[1].href, "#");
    assert.equal(context.importFields.sourceUploadedCount.textContent, "7");
    assert.equal(context.overdueFields.proceduresCount.textContent, "3");
    assert.equal(context.overdueRateFields.contracts.textContent, "16.7%");
    assert.equal(context.kpiFields.milestoneCompletionRatePercent.textContent, "25.0%");
});

test("dashboard renderers: applyAnalytics populates highlights and top-contractors", () => {
    const context = createRendererContext();

    context.renderer.applyAnalytics({
        lotStatusCounters: [
            { status: "Draft", count: 1 },
            { status: "InProcurement", count: 8 },
            { status: "Contracted", count: 2 }
        ],
        contractorTotalCount: 4,
        overloadedContractorCount: 1,
        averageContractorLoadPercent: 9.85,
        averageContractorRating: 3.82,
        mdrFactCoveragePercent: 100,
        subcontractingSharePercent: 25.71,
        slaOpenWarningsCount: 4,
        slaOpenOverduesCount: 7,
        totalActiveContractAmount: 2412000,
        totalClosedContractAmount: 1044000,
        topContractorsByRating: [
            { name: "Demo Contractor", rating: 4.2, currentLoadPercent: 12.34 }
        ]
    });

    assert.equal(context.analyticsHighlightFields.lotDraft.textContent, "1");
    assert.equal(context.analyticsHighlightFields.lotInProcurement.textContent, "8");
    assert.equal(context.analyticsHighlightFields.overloadShare.textContent, "25.0%");
    assert.equal(context.analyticsHighlightFields.contractorLoadMeta.textContent, "1 из 4");
    assert.equal(context.analyticsHighlightFields.averageRating.textContent, "3.820");
    assert.equal(context.analyticsHighlightFields.contractingActiveAmount.textContent, "2412000.00");
    assert.equal(context.topContractorsElement.children.length, 1);
    assert.match(context.topContractorsElement.children[0].textContent, /Demo Contractor/);
});
