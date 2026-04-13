"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const adapterModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-renderers-infographics-adapter.js"));

test("dashboard infographics adapter: keeps legacy payload contract", () => {
    const normalized = adapterModule.normalizeAnalyticsPayload({
        lotStatusCounters: [{ status: "Draft", count: 1 }],
        contractorTotalCount: 4,
        overloadedContractorCount: 1,
        averageContractorLoadPercent: 9.85,
        averageContractorRating: 3.82,
        slaOpenWarningsCount: 4,
        slaOpenOverduesCount: 7,
        totalActiveContractAmount: 1000,
        totalClosedContractAmount: 500,
        mdrFactCoveragePercent: 95,
        subcontractingSharePercent: 25.7,
        topContractorsByRating: [{ name: "A", rating: 4.2, currentLoadPercent: 12.3 }]
    });

    assert.equal(normalized.lotStatusCounters.length, 1);
    assert.equal(normalized.contractorTotalCount, 4);
    assert.equal(normalized.averageContractorRating, 3.82);
    assert.equal(normalized.topContractorsByRating.length, 1);
    assert.equal(normalized.topContractorsByRating[0].rating, 4.2);
});

test("dashboard infographics adapter: maps nested dto payload to renderer contract", () => {
    const normalized = adapterModule.normalizeAnalyticsPayload({
        lotFunnel: [{ status: "Draft", count: 2 }],
        contractorLoad: {
            activeContractors: 6,
            overloadedContractors: 2,
            averageLoadPercent: 17.25,
            averageRating: 4.01
        },
        sla: {
            openWarnings: 3,
            openOverdue: 1
        },
        contractingAmounts: {
            signedAndActiveTotalAmount: 2412000,
            closedTotalAmount: 1044000
        },
        mdrProgress: {
            factCoveragePercent: 88.5
        },
        subcontractingShare: {
            sharePercent: 21.4
        },
        topContractors: [{
            name: "Demo Contractor",
            currentRating: 4.5,
            currentLoadPercent: 15.0
        }]
    });

    assert.equal(normalized.lotStatusCounters.length, 1);
    assert.equal(normalized.lotStatusCounters[0].status, "Draft");
    assert.equal(normalized.contractorTotalCount, 6);
    assert.equal(normalized.overloadedContractorCount, 2);
    assert.equal(normalized.averageContractorLoadPercent, 17.25);
    assert.equal(normalized.averageContractorRating, 4.01);
    assert.equal(normalized.slaOpenWarningsCount, 3);
    assert.equal(normalized.slaOpenOverduesCount, 1);
    assert.equal(normalized.totalActiveContractAmount, 2412000);
    assert.equal(normalized.totalClosedContractAmount, 1044000);
    assert.equal(normalized.mdrFactCoveragePercent, 88.5);
    assert.equal(normalized.subcontractingSharePercent, 21.4);
    assert.equal(normalized.topContractorsByRating.length, 1);
    assert.equal(normalized.topContractorsByRating[0].rating, 4.5);
    assert.equal(normalized.topContractorsByRating[0].currentLoadPercent, 15.0);
});
