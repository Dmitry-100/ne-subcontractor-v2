"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const rulesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/sla-page-rules.js"));

test("sla-page rules: createDraftRule returns default draft values", () => {
    const draft = rulesModule.createDraftRule();
    assert.deepEqual(draft, {
        purchaseTypeCode: "",
        warningDaysBeforeDue: 2,
        isActive: true,
        description: ""
    });
});

test("sla-page rules: renderRulesMarkup returns empty-state row for missing rules", () => {
    const markup = rulesModule.renderRulesMarkup([], {
        escapeHtml: function (value) { return value; }
    });

    assert.match(markup, /Правила SLA не заданы/i);
});

test("sla-page rules: renderRulesMarkup renders editable inputs with escaped values", () => {
    const markup = rulesModule.renderRulesMarkup([{
        purchaseTypeCode: "<LOT>",
        warningDaysBeforeDue: 7,
        isActive: true,
        description: "\"описание\""
    }], {
        escapeHtml: function (value) {
            return String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    });

    assert.match(markup, /data-rule-index="0"/);
    assert.match(markup, /&lt;LOT&gt;/);
    assert.match(markup, /checked/);
});

test("sla-page rules: collectRulesFromRows filters empty purchaseTypeCode and normalizes values", () => {
    function createRow(values) {
        return {
            querySelector: function (selector) {
                const map = {
                    "[data-rule-field=\"purchaseTypeCode\"]": { value: values.purchaseTypeCode },
                    "[data-rule-field=\"warningDaysBeforeDue\"]": { value: values.warningDaysBeforeDue },
                    "[data-rule-field=\"isActive\"]": { checked: values.isActive },
                    "[data-rule-field=\"description\"]": { value: values.description }
                };
                return map[selector] || null;
            }
        };
    }

    const rows = [
        createRow({
            purchaseTypeCode: "  PT-01  ",
            warningDaysBeforeDue: "5",
            isActive: true,
            description: "  Комментарий  "
        }),
        createRow({
            purchaseTypeCode: "   ",
            warningDaysBeforeDue: "3",
            isActive: false,
            description: ""
        })
    ];

    const result = rulesModule.collectRulesFromRows(rows);

    assert.deepEqual(result, [{
        purchaseTypeCode: "PT-01",
        warningDaysBeforeDue: 5,
        isActive: true,
        description: "Комментарий"
    }]);
});
