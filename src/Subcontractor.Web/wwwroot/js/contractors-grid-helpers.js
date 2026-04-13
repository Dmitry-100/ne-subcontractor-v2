"use strict";

(function () {
    const DASH_PLACEHOLDER = "—";
    const DEFAULT_MODEL_WEIGHTS = {
        delivery: 0.30,
        commercial: 0.20,
        claim: 0.15,
        manual: 0.25,
        workload: 0.10
    };

    function localizeByMap(captions, value) {
        const key = String(value || "");
        return captions[key] || key;
    }

    function normalizeOptionalText(value) {
        const text = String(value ?? "").trim();
        return text.length > 0 ? text : null;
    }

    function parseNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function formatDateTime(value) {
        if (!value) {
            return DASH_PLACEHOLDER;
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return DASH_PLACEHOLDER;
        }

        return parsed.toLocaleString("ru-RU");
    }

    function parseRatingDelta(value) {
        if (value === null || value === undefined || !Number.isFinite(Number(value))) {
            return DASH_PLACEHOLDER;
        }

        const numeric = Number(value);
        const sign = numeric > 0 ? "+" : "";
        return `${sign}${numeric.toFixed(3)}`;
    }

    function resolveWeightValue(weights, factorCode, fallback) {
        if (!Array.isArray(weights)) {
            return fallback;
        }

        const item = weights.find(function (entry) {
            return String(entry.factorCode || "") === factorCode;
        });

        return item && Number.isFinite(Number(item.weight)) ? Number(item.weight) : fallback;
    }

    function getControl(controls, key) {
        const control = controls ? controls[key] : null;
        if (!control) {
            throw new Error(`Contractors helpers require control '${key}'.`);
        }

        return control;
    }

    function createHelpers(options) {
        const settings = options || {};
        const contractorStatusCaptions = settings.contractorStatusCaptions || {};
        const reliabilityCaptions = settings.reliabilityCaptions || {};
        const ratingSourceCaptions = settings.ratingSourceCaptions || {};
        const factorCodes = settings.factorCodes || {};

        return {
            localizeContractorStatus: function (value) {
                return localizeByMap(contractorStatusCaptions, value);
            },
            localizeReliability: function (value) {
                return localizeByMap(reliabilityCaptions, value);
            },
            localizeSource: function (value) {
                return localizeByMap(ratingSourceCaptions, value);
            },
            normalizeOptionalText: normalizeOptionalText,
            parseNumber: parseNumber,
            formatDateTime: formatDateTime,
            parseRatingDelta: parseRatingDelta,
            resolveWeightValue: resolveWeightValue,
            fillModelForm: function (model, controls) {
                const versionCodeInput = getControl(controls, "versionCodeInput");
                const modelNameInput = getControl(controls, "modelNameInput");
                const modelNotesInput = getControl(controls, "modelNotesInput");
                const weightDeliveryInput = getControl(controls, "weightDeliveryInput");
                const weightCommercialInput = getControl(controls, "weightCommercialInput");
                const weightClaimInput = getControl(controls, "weightClaimInput");
                const weightManualInput = getControl(controls, "weightManualInput");
                const weightWorkloadInput = getControl(controls, "weightWorkloadInput");

                versionCodeInput.value = model?.versionCode || "";
                modelNameInput.value = model?.name || "";
                modelNotesInput.value = model?.notes || "";
                const weights = Array.isArray(model?.weights) ? model.weights : [];
                weightDeliveryInput.value = String(resolveWeightValue(weights, factorCodes.delivery, DEFAULT_MODEL_WEIGHTS.delivery));
                weightCommercialInput.value = String(resolveWeightValue(weights, factorCodes.commercial, DEFAULT_MODEL_WEIGHTS.commercial));
                weightClaimInput.value = String(resolveWeightValue(weights, factorCodes.claim, DEFAULT_MODEL_WEIGHTS.claim));
                weightManualInput.value = String(resolveWeightValue(weights, factorCodes.manual, DEFAULT_MODEL_WEIGHTS.manual));
                weightWorkloadInput.value = String(resolveWeightValue(weights, factorCodes.workload, DEFAULT_MODEL_WEIGHTS.workload));
            },
            buildModelPayload: function (formValues) {
                const values = formValues || {};
                return {
                    versionCode: normalizeOptionalText(values.versionCode),
                    name: normalizeOptionalText(values.modelName),
                    notes: normalizeOptionalText(values.modelNotes),
                    weights: [
                        {
                            factorCode: factorCodes.delivery,
                            weight: parseNumber(values.weightDelivery, DEFAULT_MODEL_WEIGHTS.delivery)
                        },
                        {
                            factorCode: factorCodes.commercial,
                            weight: parseNumber(values.weightCommercial, DEFAULT_MODEL_WEIGHTS.commercial)
                        },
                        {
                            factorCode: factorCodes.claim,
                            weight: parseNumber(values.weightClaim, DEFAULT_MODEL_WEIGHTS.claim)
                        },
                        {
                            factorCode: factorCodes.manual,
                            weight: parseNumber(values.weightManual, DEFAULT_MODEL_WEIGHTS.manual)
                        },
                        {
                            factorCode: factorCodes.workload,
                            weight: parseNumber(values.weightWorkload, DEFAULT_MODEL_WEIGHTS.workload)
                        }
                    ]
                };
            }
        };
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.ContractorsGridHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
