"use strict";

(function () {
    function createReportsHelpers(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const endpoint = settings.endpoint;
        const openWindow = settings.openWindow || function (url, target, features) {
            return window.open(url, target, features);
        };

        if (!apiClient ||
            typeof apiClient.buildValidationReportUrl !== "function" ||
            typeof apiClient.buildLotReconciliationReportUrl !== "function") {
            throw new Error("createReportsHelpers: apiClient with report URL builders is required.");
        }

        if (!endpoint || typeof endpoint !== "string") {
            throw new Error("createReportsHelpers: endpoint is required.");
        }

        function buildValidationReportUrl(batchId, includeValidRows) {
            return apiClient.buildValidationReportUrl(endpoint, batchId, includeValidRows);
        }

        function buildLotReconciliationReportUrl(batchId) {
            return apiClient.buildLotReconciliationReportUrl(endpoint, batchId);
        }

        function downloadValidationReport(batchId, includeValidRows) {
            const url = buildValidationReportUrl(batchId, includeValidRows);
            openWindow(url, "_blank", "noopener");
        }

        function downloadLotReconciliationReport(batchId) {
            const url = buildLotReconciliationReportUrl(batchId);
            openWindow(url, "_blank", "noopener");
        }

        return {
            buildValidationReportUrl: buildValidationReportUrl,
            buildLotReconciliationReportUrl: buildLotReconciliationReportUrl,
            downloadValidationReport: downloadValidationReport,
            downloadLotReconciliationReport: downloadLotReconciliationReport
        };
    }

    const exportsObject = {
        createReportsHelpers: createReportsHelpers
    };

    if (typeof window !== "undefined") {
        window.ImportsPageReports = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
