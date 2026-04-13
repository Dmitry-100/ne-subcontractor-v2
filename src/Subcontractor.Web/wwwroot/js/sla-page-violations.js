"use strict";

(function () {
    function renderViolationsMarkup(violations, helpers) {
        if (!Array.isArray(violations) || violations.length === 0) {
            return "<tr><td colspan=\"8\">Открытых нарушений SLA не найдено.</td></tr>";
        }

        return violations
            .map(function (violation) {
                const severityBadgeClass = violation.severity === "Overdue"
                    ? "dashboard-task__priority--high"
                    : "dashboard-task__priority--medium";
                const statusLabel = violation.isResolved ? "Закрыто" : "Открыто";
                return (
                    "<tr data-violation-id=\"" + violation.id + "\">" +
                    "<td><span class=\"dashboard-task__priority " + severityBadgeClass + "\">" + helpers.escapeHtml(helpers.localizeSeverity(violation.severity)) + "</span></td>" +
                    "<td>" + helpers.formatDate(violation.dueDate) + "</td>" +
                    "<td>" + helpers.escapeHtml(violation.title || "") + "</td>" +
                    "<td>" + helpers.escapeHtml(violation.recipientEmail || "") + "</td>" +
                    "<td><input type=\"text\" data-violation-field=\"reasonCode\" value=\"" + helpers.escapeHtml(violation.reasonCode || "") + "\" placeholder=\"например: DOC_DELAY\" /></td>" +
                    "<td><input type=\"text\" data-violation-field=\"reasonComment\" value=\"" + helpers.escapeHtml(violation.reasonComment || "") + "\" placeholder=\"Комментарий\" /></td>" +
                    "<td>" + statusLabel + "</td>" +
                    "<td><button type=\"button\" class=\"dashboard-refresh\" data-save-reason-id=\"" + violation.id + "\">Сохранить</button></td>" +
                    "</tr>"
                );
            })
            .join("");
    }

    function buildViolationReasonPayload(row) {
        if (!row || typeof row.querySelector !== "function") {
            return {
                reasonCode: "",
                reasonComment: null
            };
        }

        const reasonCodeInput = row.querySelector("[data-violation-field=\"reasonCode\"]");
        const reasonCommentInput = row.querySelector("[data-violation-field=\"reasonComment\"]");

        return {
            reasonCode: String(reasonCodeInput && reasonCodeInput.value ? reasonCodeInput.value : "").trim(),
            reasonComment: String(reasonCommentInput && reasonCommentInput.value ? reasonCommentInput.value : "").trim() || null
        };
    }

    const exportsObject = {
        renderViolationsMarkup: renderViolationsMarkup,
        buildViolationReasonPayload: buildViolationReasonPayload
    };

    if (typeof window !== "undefined") {
        window.SlaPageViolations = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
