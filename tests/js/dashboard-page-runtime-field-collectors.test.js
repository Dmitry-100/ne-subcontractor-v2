"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleUnderTest = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-runtime-field-collectors.js"));

function createModuleRoot() {
    const elements = new Map();
    return {
        querySelector: function (selector) {
            if (!elements.has(selector)) {
                elements.set(selector, { selector: selector, textContent: "" });
            }

            return elements.get(selector);
        }
    };
}

test("dashboard runtime field collectors: validates required options", () => {
    assert.throws(function () {
        moduleUnderTest.collectDashboardRuntimeFields({
            moduleRoot: null,
            controls: {}
        });
    }, /require/i);
});

test("dashboard runtime field collectors: maps controls, selectors and status captions", () => {
    const controls = {
        statusElement: { id: "status" },
        refreshButton: { id: "refresh" },
        tasksElement: { id: "tasks" },
        lotStatusesElement: { id: "lots" },
        procedureStatusesElement: { id: "procedures" },
        contractStatusesElement: { id: "contracts" }
    };

    const fields = moduleUnderTest.collectDashboardRuntimeFields({
        moduleRoot: createModuleRoot(),
        controls: controls
    });

    assert.equal(fields.statusElement.id, "status");
    assert.equal(fields.refreshButton.id, "refresh");
    assert.equal(fields.analyticsStatusElement.selector, "[data-dashboard-analytics-status]");
    assert.equal(fields.topContractorsElement.selector, "[data-dashboard-top-contractors]");
    assert.equal(fields.counterFields.projectsTotal.selector, '[data-dashboard-counter="projectsTotal"]');
    assert.equal(fields.overdueFields.milestonesCount.selector, '[data-dashboard-overdue="milestonesCount"]');
    assert.equal(fields.importFields.xmlCompletedCount.selector, '[data-dashboard-import="xmlCompletedCount"]');
    assert.equal(fields.analyticsFields.contractorLoad.selector, '[data-dashboard-analytics="contractorLoad"]');
    assert.equal(fields.analyticsHighlightFields.averageRating.selector, '[data-dashboard-analytics-highlight="averageRating"]');
    assert.equal(fields.analyticsBarFields.averageLoad.selector, '[data-dashboard-analytics-bar="averageLoad"]');
    assert.equal(fields.statusCaptions.Draft, "Черновик");
    assert.equal(fields.statusCaptions.DocumentsPreparation, "Подготовка документов");
    assert.equal(fields.statusCaptions.Signed, "Подписан");
});
