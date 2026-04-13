"use strict";

(function () {
    const PROCEDURE_FORM_ITEMS = [
        "lotId",
        "purchaseTypeCode",
        "objectName",
        "workScope",
        "approvalMode",
        "responsibleCommercialUserId",
        "requiredSubcontractorDeadline",
        "proposalDueDate",
        "plannedBudgetWithoutVat",
        "customerName",
        "leadOfficeCode",
        "analyticsLevel1Code",
        "analyticsLevel2Code",
        "analyticsLevel3Code",
        "analyticsLevel4Code",
        "analyticsLevel5Code",
        "notes",
        "containsConfidentialInfo",
        "requiresTechnicalNegotiations"
    ];

    function requireArray(value, name) {
        if (!Array.isArray(value)) {
            throw new Error(`ProceduresGridsConfig requires '${name}' array.`);
        }

        return value;
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ProceduresGridsConfig requires '${name}' callback.`);
        }
    }

    const exportsObject = {
        PROCEDURE_FORM_ITEMS: PROCEDURE_FORM_ITEMS,
        requireArray: requireArray,
        requireFunction: requireFunction
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridsConfigHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
