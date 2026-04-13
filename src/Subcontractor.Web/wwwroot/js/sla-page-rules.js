"use strict";

(function () {
    function createDraftRule() {
        return {
            purchaseTypeCode: "",
            warningDaysBeforeDue: 2,
            isActive: true,
            description: ""
        };
    }

    function renderRulesMarkup(rules, helpers) {
        if (!Array.isArray(rules) || rules.length === 0) {
            return "<tr><td colspan=\"5\">Правила SLA не заданы. Добавьте хотя бы одно правило.</td></tr>";
        }

        return rules
            .map(function (rule, index) {
                return (
                    "<tr>" +
                    "<td><input type=\"text\" data-rule-field=\"purchaseTypeCode\" data-rule-index=\"" + index + "\" value=\"" + helpers.escapeHtml(rule.purchaseTypeCode || "") + "\" /></td>" +
                    "<td><input type=\"number\" min=\"0\" max=\"30\" data-rule-field=\"warningDaysBeforeDue\" data-rule-index=\"" + index + "\" value=\"" + Number(rule.warningDaysBeforeDue || 0) + "\" /></td>" +
                    "<td style=\"text-align:center\"><input type=\"checkbox\" data-rule-field=\"isActive\" data-rule-index=\"" + index + "\" " + (rule.isActive ? "checked" : "") + " /></td>" +
                    "<td><input type=\"text\" data-rule-field=\"description\" data-rule-index=\"" + index + "\" value=\"" + helpers.escapeHtml(rule.description || "") + "\" /></td>" +
                    "<td><button type=\"button\" class=\"dashboard-refresh\" data-remove-rule-index=\"" + index + "\">Удалить</button></td>" +
                    "</tr>"
                );
            })
            .join("");
    }

    function collectRulesFromRows(rows) {
        const sourceRows = Array.isArray(rows) ? rows : [];

        return sourceRows
            .map(function (row) {
                const purchaseTypeCodeInput = row.querySelector("[data-rule-field=\"purchaseTypeCode\"]");
                const warningDaysInput = row.querySelector("[data-rule-field=\"warningDaysBeforeDue\"]");
                const isActiveInput = row.querySelector("[data-rule-field=\"isActive\"]");
                const descriptionInput = row.querySelector("[data-rule-field=\"description\"]");

                if (!purchaseTypeCodeInput || !warningDaysInput || !isActiveInput || !descriptionInput) {
                    return null;
                }

                const warningDaysBeforeDue = Number(warningDaysInput.value || "0");
                return {
                    purchaseTypeCode: String(purchaseTypeCodeInput.value || "").trim(),
                    warningDaysBeforeDue: Number.isFinite(warningDaysBeforeDue) ? warningDaysBeforeDue : 0,
                    isActive: !!isActiveInput.checked,
                    description: String(descriptionInput.value || "").trim() || null
                };
            })
            .filter(function (item) {
                return item && item.purchaseTypeCode.length > 0;
            });
    }

    const exportsObject = {
        createDraftRule: createDraftRule,
        renderRulesMarkup: renderRulesMarkup,
        collectRulesFromRows: collectRulesFromRows
    };

    if (typeof window !== "undefined") {
        window.SlaPageRules = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
