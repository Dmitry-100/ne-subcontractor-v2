"use strict";

(function () {
    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль contracts-draft: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    function createController(options) {
        const settings = options || {};
        const elements = settings.elements || {};
        const apiClient = settings.apiClient;
        const isGuid = settings.isGuid;
        const toNullableDate = settings.toNullableDate;
        const onDraftCreated = typeof settings.onDraftCreated === "function"
            ? settings.onDraftCreated
            : function () { return Promise.resolve(); };
        const eventsModule = settings.eventsModule
            || resolveModule("ContractsDraftEvents", "./contracts-draft-events.js", ["createEvents"]);

        const draftStatusElement = elements.draftStatusElement;
        const draftProcedureIdInput = elements.draftProcedureIdInput;
        const draftNumberInput = elements.draftNumberInput;
        const draftSigningDateInput = elements.draftSigningDateInput;
        const draftStartDateInput = elements.draftStartDateInput;
        const draftEndDateInput = elements.draftEndDateInput;
        const draftCreateButton = elements.draftCreateButton;

        function setDraftStatus(message, isError) {
            draftStatusElement.textContent = message;
            draftStatusElement.classList.toggle("contracts-draft-status--error", Boolean(isError));
        }

        function clearDraftInputs() {
            draftProcedureIdInput.value = "";
            draftNumberInput.value = "";
            draftSigningDateInput.value = "";
            draftStartDateInput.value = "";
            draftEndDateInput.value = "";
        }

        function bindEventHandlers() {
            const events = eventsModule.createEvents({
                readProcedureId: function () {
                    return draftProcedureIdInput.value.trim();
                },
                readPayload: function () {
                    return {
                        contractNumber: draftNumberInput.value.trim() || null,
                        signingDate: toNullableDate(draftSigningDateInput.value),
                        startDate: toNullableDate(draftStartDateInput.value),
                        endDate: toNullableDate(draftEndDateInput.value)
                    };
                },
                isGuid: isGuid,
                createDraftFromProcedure: apiClient.createDraftFromProcedure.bind(apiClient),
                setDraftStatus: setDraftStatus,
                clearDraftInputs: clearDraftInputs,
                onDraftCreated: onDraftCreated
            });

            draftCreateButton.addEventListener("click", events.onCreateDraftClick);
        }

        return {
            init: bindEventHandlers
        };
    }

    const exportsObject = {
        createController: createController
    };

    if (typeof window !== "undefined") {
        window.ContractsDraft = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
