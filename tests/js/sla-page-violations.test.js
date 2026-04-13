"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const violationsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/sla-page-violations.js"));

test("sla-page violations: renderViolationsMarkup returns empty-state row", () => {
    const markup = violationsModule.renderViolationsMarkup([], {
        escapeHtml: function (value) { return value; },
        localizeSeverity: function (value) { return value; },
        formatDate: function (value) { return value; }
    });

    assert.match(markup, /Открытых нарушений SLA не найдено/i);
});

test("sla-page violations: renderViolationsMarkup renders severity badge and status", () => {
    const markup = violationsModule.renderViolationsMarkup([{
        id: "v-1",
        severity: "Overdue",
        dueDate: "2026-04-12",
        title: "Нарушение",
        recipientEmail: "demo@example.com",
        reasonCode: "DOC_DELAY",
        reasonComment: "Комментарий",
        isResolved: false
    }], {
        escapeHtml: function (value) { return String(value); },
        localizeSeverity: function (value) { return value === "Overdue" ? "Просрочка" : value; },
        formatDate: function (value) { return value; }
    });

    assert.match(markup, /dashboard-task__priority--high/);
    assert.match(markup, /Просрочка/);
    assert.match(markup, /Открыто/);
    assert.match(markup, /data-save-reason-id="v-1"/);
});

test("sla-page violations: buildViolationReasonPayload trims values and keeps nullable comment", () => {
    const row = {
        querySelector: function (selector) {
            const map = {
                "[data-violation-field=\"reasonCode\"]": { value: "  DOC_DELAY  " },
                "[data-violation-field=\"reasonComment\"]": { value: "  " }
            };
            return map[selector] || null;
        }
    };

    const payload = violationsModule.buildViolationReasonPayload(row);

    assert.deepEqual(payload, {
        reasonCode: "DOC_DELAY",
        reasonComment: null
    });
});

test("sla-page violations: buildViolationReasonPayload falls back to empty payload for invalid row", () => {
    const payload = violationsModule.buildViolationReasonPayload(null);

    assert.deepEqual(payload, {
        reasonCode: "",
        reasonComment: null
    });
});
