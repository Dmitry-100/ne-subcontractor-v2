"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const reportsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-reports.js"));

test("imports reports: createReportsHelpers validates required options", () => {
    assert.throws(
        function () {
            reportsModule.createReportsHelpers({});
        },
        /apiClient/);

    assert.throws(
        function () {
            reportsModule.createReportsHelpers({
                apiClient: {
                    buildValidationReportUrl: function () {},
                    buildLotReconciliationReportUrl: function () {}
                }
            });
        },
        /endpoint/);
});

test("imports reports: builds urls and opens report links", () => {
    const openCalls = [];
    const helper = reportsModule.createReportsHelpers({
        apiClient: {
            buildValidationReportUrl: function (endpoint, batchId, includeValidRows) {
                return `${endpoint}/${batchId}/validation?includeValidRows=${includeValidRows ? "1" : "0"}`;
            },
            buildLotReconciliationReportUrl: function (endpoint, batchId) {
                return `${endpoint}/${batchId}/lot-reconciliation`;
            }
        },
        endpoint: "/api/imports/source-data/batches",
        openWindow: function (url, target, features) {
            openCalls.push({ url: url, target: target, features: features });
        }
    });

    assert.equal(
        helper.buildValidationReportUrl("batch-1", false),
        "/api/imports/source-data/batches/batch-1/validation?includeValidRows=0");
    assert.equal(
        helper.buildLotReconciliationReportUrl("batch-1"),
        "/api/imports/source-data/batches/batch-1/lot-reconciliation");

    helper.downloadValidationReport("batch-2", true);
    helper.downloadLotReconciliationReport("batch-2");

    assert.equal(openCalls.length, 2);
    assert.equal(
        openCalls[0].url,
        "/api/imports/source-data/batches/batch-2/validation?includeValidRows=1");
    assert.equal(openCalls[0].target, "_blank");
    assert.equal(openCalls[0].features, "noopener");

    assert.equal(
        openCalls[1].url,
        "/api/imports/source-data/batches/batch-2/lot-reconciliation");
    assert.equal(openCalls[1].target, "_blank");
    assert.equal(openCalls[1].features, "noopener");
});
