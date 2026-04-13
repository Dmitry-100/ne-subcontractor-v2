"use strict";

(function () {
    function requireControl(controls, key) {
        const control = controls ? controls[key] : null;
        if (!control) {
            throw new Error(`ContractorsModel requires control '${key}'.`);
        }

        return control;
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractorsModel requires ${name}.`);
        }
    }

    function createModelService(options) {
        const settings = options || {};
        const controls = settings.controls || {};
        const helpers = settings.helpers;
        const apiClient = settings.apiClient;
        const setRatingStatus = settings.setRatingStatus;

        if (!helpers) {
            throw new Error("ContractorsModel requires helpers.");
        }

        if (!apiClient) {
            throw new Error("ContractorsModel requires apiClient.");
        }

        requireFunction(helpers.fillModelForm, "helpers.fillModelForm");
        requireFunction(helpers.buildModelPayload, "helpers.buildModelPayload");
        requireFunction(apiClient.getRatingModel, "apiClient.getRatingModel");
        requireFunction(setRatingStatus, "setRatingStatus callback");

        const versionCodeInput = requireControl(controls, "versionCodeInput");
        const modelNameInput = requireControl(controls, "modelNameInput");
        const modelNotesInput = requireControl(controls, "modelNotesInput");
        const weightDeliveryInput = requireControl(controls, "weightDeliveryInput");
        const weightCommercialInput = requireControl(controls, "weightCommercialInput");
        const weightClaimInput = requireControl(controls, "weightClaimInput");
        const weightManualInput = requireControl(controls, "weightManualInput");
        const weightWorkloadInput = requireControl(controls, "weightWorkloadInput");

        function fillModelForm(model) {
            helpers.fillModelForm(model, {
                versionCodeInput: versionCodeInput,
                modelNameInput: modelNameInput,
                modelNotesInput: modelNotesInput,
                weightDeliveryInput: weightDeliveryInput,
                weightCommercialInput: weightCommercialInput,
                weightClaimInput: weightClaimInput,
                weightManualInput: weightManualInput,
                weightWorkloadInput: weightWorkloadInput
            });
        }

        function buildModelPayload() {
            return helpers.buildModelPayload({
                versionCode: versionCodeInput.value,
                modelName: modelNameInput.value,
                modelNotes: modelNotesInput.value,
                weightDelivery: weightDeliveryInput.value,
                weightCommercial: weightCommercialInput.value,
                weightClaim: weightClaimInput.value,
                weightManual: weightManualInput.value,
                weightWorkload: weightWorkloadInput.value
            });
        }

        async function loadModel() {
            const model = await apiClient.getRatingModel();
            fillModelForm(model);
            setRatingStatus(`Активная модель: ${model.versionCode}.`, false);
            return model;
        }

        return {
            fillModelForm: fillModelForm,
            buildModelPayload: buildModelPayload,
            loadModel: loadModel
        };
    }

    const exportsObject = {
        createModelService: createModelService
    };

    if (typeof window !== "undefined") {
        window.ContractorsModel = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
