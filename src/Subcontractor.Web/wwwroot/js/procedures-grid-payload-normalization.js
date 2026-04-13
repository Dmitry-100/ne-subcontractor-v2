"use strict";

(function () {
    const scalarHelpersRoot =
        typeof window !== "undefined" && window.ProceduresGridPayloadScalarHelpers
            ? window.ProceduresGridPayloadScalarHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./procedures-grid-payload-scalar-helpers.js")
                : null;

    if (!scalarHelpersRoot || typeof scalarHelpersRoot.createScalarHelpers !== "function") {
        throw new Error("ProceduresGridPayloadNormalization requires ProceduresGridPayloadScalarHelpers.createScalarHelpers.");
    }

    function createHelpers(options) {
        const settings = options || {};
        const approvalModes = Array.isArray(settings.approvalModes) && settings.approvalModes.length > 0
            ? settings.approvalModes
            : ["InSystem", "External"];
        const scalar = scalarHelpersRoot.createScalarHelpers({
            approvalModes: approvalModes
        });

        const isGuid = scalar.isGuid;
        const normalizeApprovalMode = scalar.normalizeApprovalMode;
        const normalizeGuid = scalar.normalizeGuid;
        const normalizeNullableString = scalar.normalizeNullableString;
        const normalizeRequiredString = scalar.normalizeRequiredString;
        const pickValue = scalar.pickValue;
        const toIsoDate = scalar.toIsoDate;
        const toNullableNumber = scalar.toNullableNumber;

        function createPayload(values) {
            const source = values || {};
            const lotId = String(source.lotId ?? "").trim();
            if (!isGuid(lotId)) {
                throw new Error("Поле «Идентификатор лота» должно содержать корректный GUID.");
            }

            function readRequiredValue(key, errorMessage) {
                const value = normalizeRequiredString(source[key], "");
                if (!value) {
                    throw new Error(errorMessage);
                }

                return value;
            }

            return {
                lotId: lotId,
                requestDate: toIsoDate(source.requestDate),
                purchaseTypeCode: readRequiredValue("purchaseTypeCode", "Код типа закупки обязателен."),
                initiatorUserId: normalizeGuid(source.initiatorUserId),
                responsibleCommercialUserId: normalizeGuid(source.responsibleCommercialUserId),
                objectName: readRequiredValue("objectName", "Наименование объекта обязательно."),
                workScope: readRequiredValue("workScope", "Состав работ обязателен."),
                customerName: normalizeRequiredString(source.customerName, "Заказчик"),
                leadOfficeCode: normalizeRequiredString(source.leadOfficeCode, "MAIN"),
                analyticsLevel1Code: normalizeRequiredString(source.analyticsLevel1Code, "GEN"),
                analyticsLevel2Code: normalizeRequiredString(source.analyticsLevel2Code, "GEN"),
                analyticsLevel3Code: normalizeRequiredString(source.analyticsLevel3Code, "GEN"),
                analyticsLevel4Code: normalizeRequiredString(source.analyticsLevel4Code, "GEN"),
                analyticsLevel5Code: normalizeRequiredString(source.analyticsLevel5Code, "GEN"),
                customerContractNumber: normalizeNullableString(source.customerContractNumber),
                customerContractDate: toIsoDate(source.customerContractDate),
                requiredSubcontractorDeadline: toIsoDate(source.requiredSubcontractorDeadline),
                proposalDueDate: toIsoDate(source.proposalDueDate),
                plannedBudgetWithoutVat: toNullableNumber(source.plannedBudgetWithoutVat),
                notes: normalizeNullableString(source.notes),
                approvalMode: normalizeApprovalMode(source.approvalMode),
                approvalRouteCode: normalizeNullableString(source.approvalRouteCode),
                containsConfidentialInfo: Boolean(source.containsConfidentialInfo),
                requiresTechnicalNegotiations: Boolean(source.requiresTechnicalNegotiations),
                attachmentFileIds: []
            };
        }

        function updatePayload(details, values) {
            const sourceDetails = details || {};
            const sourceValues = values || {};
            const pick = function (key) {
                return pickValue(sourceValues, key, sourceDetails[key]);
            };

            return {
                requestDate: toIsoDate(pick("requestDate")),
                purchaseTypeCode: normalizeRequiredString(pick("purchaseTypeCode"), "PT"),
                initiatorUserId: normalizeGuid(pick("initiatorUserId")),
                responsibleCommercialUserId: normalizeGuid(pick("responsibleCommercialUserId")),
                objectName: normalizeRequiredString(pick("objectName"), "Процедура"),
                workScope: normalizeRequiredString(pick("workScope"), "Scope"),
                customerName: normalizeRequiredString(pick("customerName"), "Customer"),
                leadOfficeCode: normalizeRequiredString(pick("leadOfficeCode"), "MAIN"),
                analyticsLevel1Code: normalizeRequiredString(pick("analyticsLevel1Code"), "GEN"),
                analyticsLevel2Code: normalizeRequiredString(pick("analyticsLevel2Code"), "GEN"),
                analyticsLevel3Code: normalizeRequiredString(pick("analyticsLevel3Code"), "GEN"),
                analyticsLevel4Code: normalizeRequiredString(pick("analyticsLevel4Code"), "GEN"),
                analyticsLevel5Code: normalizeRequiredString(pick("analyticsLevel5Code"), "GEN"),
                customerContractNumber: normalizeNullableString(pick("customerContractNumber")),
                customerContractDate: toIsoDate(pick("customerContractDate")),
                requiredSubcontractorDeadline: toIsoDate(pick("requiredSubcontractorDeadline")),
                proposalDueDate: toIsoDate(pick("proposalDueDate")),
                plannedBudgetWithoutVat: toNullableNumber(pick("plannedBudgetWithoutVat")),
                notes: normalizeNullableString(pick("notes")),
                approvalMode: normalizeApprovalMode(pick("approvalMode")),
                approvalRouteCode: normalizeNullableString(pick("approvalRouteCode")),
                containsConfidentialInfo: Boolean(pick("containsConfidentialInfo")),
                requiresTechnicalNegotiations: Boolean(pick("requiresTechnicalNegotiations")),
                attachmentFileIds: Array.isArray(sourceDetails.attachments)
                    ? sourceDetails.attachments.map(function (item) { return item.id; })
                    : []
            };
        }

        return {
            createPayload: createPayload,
            isGuid: isGuid,
            normalizeApprovalMode: normalizeApprovalMode,
            normalizeGuid: normalizeGuid,
            normalizeNullableString: normalizeNullableString,
            normalizeRequiredString: normalizeRequiredString,
            pickValue: pickValue,
            toIsoDate: toIsoDate,
            toNullableNumber: toNullableNumber,
            updatePayload: updatePayload
        };
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridPayloadNormalization = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
