"use strict";

(function () {
    function hasOwn(source, key) {
        return Object.prototype.hasOwnProperty.call(source, key);
    }

    function createBuilder(options) {
        const settings = options || {};
        const toNullableDate = settings.toNullableDate;
        const toNumber = settings.toNumber;
        const isGuid = settings.isGuid;

        function validateCreatePayload(payload) {
            if (!isGuid(payload.lotId)) {
                throw new Error("Поле «Идентификатор лота» должно содержать корректный GUID.");
            }

            if (!isGuid(payload.procedureId)) {
                throw new Error("Поле «Идентификатор процедуры» должно содержать корректный GUID.");
            }

            if (!isGuid(payload.contractorId)) {
                throw new Error("Поле «Идентификатор подрядчика» должно содержать корректный GUID.");
            }

            if (!payload.contractNumber) {
                throw new Error("Номер договора обязателен.");
            }

            if (payload.amountWithoutVat < 0 || payload.vatAmount < 0 || payload.totalAmount < 0) {
                throw new Error("Суммы не могут быть отрицательными.");
            }

            const expectedTotal = payload.amountWithoutVat + payload.vatAmount;
            if (Math.abs(expectedTotal - payload.totalAmount) > 0.01) {
                throw new Error("Общая сумма должна быть равна amountWithoutVat + vatAmount.");
            }
        }

        function createRequestPayload(values) {
            const payload = {
                lotId: String(values.lotId ?? "").trim(),
                procedureId: String(values.procedureId ?? "").trim(),
                contractorId: String(values.contractorId ?? "").trim(),
                contractNumber: String(values.contractNumber ?? "").trim(),
                signingDate: toNullableDate(values.signingDate),
                amountWithoutVat: toNumber(values.amountWithoutVat, 0),
                vatAmount: toNumber(values.vatAmount, 0),
                totalAmount: toNumber(values.totalAmount, 0),
                startDate: toNullableDate(values.startDate),
                endDate: toNullableDate(values.endDate),
                status: "Draft"
            };

            validateCreatePayload(payload);
            return payload;
        }

        function updateRequestPayload(current, values) {
            const payload = {
                contractNumber: String(values.contractNumber ?? current.contractNumber ?? "").trim(),
                signingDate: hasOwn(values, "signingDate")
                    ? toNullableDate(values.signingDate)
                    : toNullableDate(current.signingDate),
                amountWithoutVat: toNumber(values.amountWithoutVat, current.amountWithoutVat ?? 0),
                vatAmount: toNumber(values.vatAmount, current.vatAmount ?? 0),
                totalAmount: toNumber(values.totalAmount, current.totalAmount ?? 0),
                startDate: hasOwn(values, "startDate")
                    ? toNullableDate(values.startDate)
                    : toNullableDate(current.startDate),
                endDate: hasOwn(values, "endDate")
                    ? toNullableDate(values.endDate)
                    : toNullableDate(current.endDate),
                status: String(current.status || "Draft")
            };

            if (!payload.contractNumber) {
                throw new Error("Номер договора обязателен.");
            }

            if (payload.amountWithoutVat < 0 || payload.vatAmount < 0 || payload.totalAmount < 0) {
                throw new Error("Суммы не могут быть отрицательными.");
            }

            const expectedTotal = payload.amountWithoutVat + payload.vatAmount;
            if (Math.abs(expectedTotal - payload.totalAmount) > 0.01) {
                throw new Error("Общая сумма должна быть равна amountWithoutVat + vatAmount.");
            }

            return payload;
        }

        return {
            createRequestPayload: createRequestPayload,
            updateRequestPayload: updateRequestPayload
        };
    }

    const exportsObject = {
        createBuilder: createBuilder
    };

    if (typeof window !== "undefined") {
        window.ContractsRegistryPayload = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
