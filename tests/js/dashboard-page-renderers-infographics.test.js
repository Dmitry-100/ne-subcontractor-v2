"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const infographicsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-renderers-infographics.js"));

function createFormatters() {
    return {
        toFiniteNumber: function (value) {
            if (typeof value === "number" && Number.isFinite(value)) {
                return value;
            }

            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
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
            return (Number.isFinite(value) ? value : 0).toFixed(1) + "%";
        },
        formatCompactMoney: function (value) {
            return (Number.isFinite(value) ? value : 0).toFixed(2);
        }
    };
}

function createHelpers() {
    return {
        getLotCountByStatus: function (rows, status) {
            if (!Array.isArray(rows)) {
                return 0;
            }

            const match = rows.find(function (row) {
                return row && row.status === status;
            });
            return match ? Number(match.count || 0) : 0;
        }
    };
}

function createTargetBag() {
    return {
        overdueFields: {
            proceduresCount: { textContent: "" },
            contractsCount: { textContent: "" },
            milestonesCount: { textContent: "" }
        },
        overdueRateFields: {
            procedures: { textContent: "" },
            contracts: { textContent: "" },
            milestones: { textContent: "" }
        },
        overdueContextFields: {
            procedures: { textContent: "" },
            contracts: { textContent: "" },
            milestones: { textContent: "" }
        },
        overdueBarFields: {
            procedures: { styleValue: "" },
            contracts: { styleValue: "" },
            milestones: { styleValue: "" }
        },
        analyticsHighlightFields: {
            lotDraft: { textContent: "" },
            lotInProcurement: { textContent: "" },
            lotContracted: { textContent: "" },
            overloadShare: { textContent: "" },
            contractorLoadMeta: { textContent: "" },
            averageLoad: { textContent: "" },
            averageRating: { textContent: "" },
            mdrCoverage: { textContent: "" },
            subcontractingShare: { textContent: "" },
            slaWarnings: { textContent: "" },
            slaOverdue: { textContent: "" },
            contractingActiveAmount: { textContent: "" },
            contractingClosedAmount: { textContent: "" }
        },
        analyticsBarFields: {
            overloadShare: { styleValue: "" },
            averageLoad: { styleValue: "" },
            averageRating: { styleValue: "" },
            mdrCoverage: { styleValue: "" },
            subcontractingShare: { styleValue: "" },
            slaOverdueShare: { styleValue: "" },
            contractingClosedShare: { styleValue: "" }
        }
    };
}

test("dashboard renderers infographics: validates required dependencies", () => {
    assert.throws(
        function () {
            infographicsModule.createInfographics({});
        },
        /dashboard helpers/i);
});

test("dashboard renderers infographics: applies overdue and analytics values", () => {
    const targets = createTargetBag();
    const renderedTopContractors = [];
    const created = infographicsModule.createInfographics({
        dashboardHelpers: createHelpers(),
        dashboardFormatters: createFormatters(),
        overdueFields: targets.overdueFields,
        overdueRateFields: targets.overdueRateFields,
        overdueContextFields: targets.overdueContextFields,
        overdueBarFields: targets.overdueBarFields,
        analyticsHighlightFields: targets.analyticsHighlightFields,
        analyticsBarFields: targets.analyticsBarFields,
        setValue: function (target, value, fallback) {
            if (!target) {
                return;
            }

            target.textContent = value === null || value === undefined ? fallback : String(value);
        },
        setBarValue: function (target, clampPercent, value) {
            if (!target) {
                return;
            }

            target.styleValue = clampPercent(value).toFixed(2) + "%";
        },
        renderTopContractors: function (rows) {
            renderedTopContractors.length = 0;
            const list = Array.isArray(rows) ? rows : [];
            list.forEach(function (item) {
                renderedTopContractors.push(item.name);
            });
        }
    });

    created.applyOverdueInfographics(
        { proceduresTotal: 10, contractsTotal: 4 },
        { proceduresCount: 3, contractsCount: 1, milestonesCount: 2 });

    assert.equal(targets.overdueFields.proceduresCount.textContent, "3");
    assert.equal(targets.overdueRateFields.contracts.textContent, "25.0%");
    assert.equal(targets.overdueContextFields.procedures.textContent, "из 10 процедур");
    assert.equal(targets.overdueBarFields.procedures.styleValue, "30.00%");

    created.applyAnalytics({
        lotStatusCounters: [
            { status: "Draft", count: 1 },
            { status: "InProcurement", count: 2 },
            { status: "Contracted", count: 3 }
        ],
        contractorTotalCount: 4,
        overloadedContractorCount: 1,
        averageContractorLoadPercent: 9.85,
        averageContractorRating: 3.82,
        mdrFactCoveragePercent: 100,
        subcontractingSharePercent: 25.71,
        slaOpenWarningsCount: 4,
        slaOpenOverduesCount: 7,
        totalActiveContractAmount: 1000,
        totalClosedContractAmount: 500,
        topContractorsByRating: [{ name: "Demo Contractor", rating: 4.2, currentLoadPercent: 10 }]
    });

    assert.equal(targets.analyticsHighlightFields.lotDraft.textContent, "1");
    assert.equal(targets.analyticsHighlightFields.overloadShare.textContent, "25.0%");
    assert.equal(targets.analyticsHighlightFields.contractingClosedAmount.textContent, "500.00");
    assert.equal(targets.analyticsBarFields.averageRating.styleValue, "76.40%");
    assert.deepEqual(renderedTopContractors, ["Demo Contractor"]);
});

test("dashboard renderers infographics: supports nested analytics dto payload", () => {
    const targets = createTargetBag();
    const renderedTopContractors = [];
    const created = infographicsModule.createInfographics({
        dashboardHelpers: createHelpers(),
        dashboardFormatters: createFormatters(),
        overdueFields: targets.overdueFields,
        overdueRateFields: targets.overdueRateFields,
        overdueContextFields: targets.overdueContextFields,
        overdueBarFields: targets.overdueBarFields,
        analyticsHighlightFields: targets.analyticsHighlightFields,
        analyticsBarFields: targets.analyticsBarFields,
        setValue: function (target, value, fallback) {
            if (!target) {
                return;
            }

            target.textContent = value === null || value === undefined ? fallback : String(value);
        },
        setBarValue: function (target, clampPercent, value) {
            if (!target) {
                return;
            }

            target.styleValue = clampPercent(value).toFixed(2) + "%";
        },
        renderTopContractors: function (rows) {
            renderedTopContractors.length = 0;
            const list = Array.isArray(rows) ? rows : [];
            list.forEach(function (item) {
                renderedTopContractors.push(item.name + ":" + String(item.rating ?? item.currentRating));
            });
        }
    });

    created.applyAnalytics({
        lotFunnel: [
            { status: "Draft", count: 2 },
            { status: "InProcurement", count: 8 },
            { status: "Contracted", count: 1 }
        ],
        contractorLoad: {
            activeContractors: 4,
            overloadedContractors: 1,
            averageLoadPercent: 9.85,
            averageRating: 3.82
        },
        sla: {
            openWarnings: 4,
            openOverdue: 7
        },
        contractingAmounts: {
            signedAndActiveTotalAmount: 2412000,
            closedTotalAmount: 1044000
        },
        mdrProgress: {
            factCoveragePercent: 100
        },
        subcontractingShare: {
            sharePercent: 25.71
        },
        topContractors: [
            { name: "Demo Contractor", currentRating: 4.2, currentLoadPercent: 10 }
        ]
    });

    assert.equal(targets.analyticsHighlightFields.lotDraft.textContent, "2");
    assert.equal(targets.analyticsHighlightFields.lotInProcurement.textContent, "8");
    assert.equal(targets.analyticsHighlightFields.overloadShare.textContent, "25.0%");
    assert.equal(targets.analyticsHighlightFields.averageRating.textContent, "3.820");
    assert.equal(targets.analyticsHighlightFields.contractingActiveAmount.textContent, "2412000.00");
    assert.equal(targets.analyticsHighlightFields.contractingClosedAmount.textContent, "1044000.00");
    assert.deepEqual(renderedTopContractors, ["Demo Contractor:4.2"]);
});
