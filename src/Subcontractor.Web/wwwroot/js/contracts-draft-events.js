"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsDraftEvents requires ${name}.`);
        }
    }

    function createEvents(options) {
        const settings = options || {};
        const readProcedureId = settings.readProcedureId;
        const readPayload = settings.readPayload;
        const isGuid = settings.isGuid;
        const createDraftFromProcedure = settings.createDraftFromProcedure;
        const setDraftStatus = settings.setDraftStatus;
        const clearDraftInputs = settings.clearDraftInputs;
        const onDraftCreated = settings.onDraftCreated;

        requireFunction(readProcedureId, "readProcedureId");
        requireFunction(readPayload, "readPayload");
        requireFunction(isGuid, "isGuid");
        requireFunction(createDraftFromProcedure, "createDraftFromProcedure");
        requireFunction(setDraftStatus, "setDraftStatus");
        requireFunction(clearDraftInputs, "clearDraftInputs");
        requireFunction(onDraftCreated, "onDraftCreated");

        return {
            onCreateDraftClick: function () {
                const procedureId = String(readProcedureId() || "").trim();
                if (!isGuid(procedureId)) {
                    setDraftStatus("Поле «Идентификатор процедуры» должно содержать корректный GUID.", true);
                    return;
                }

                const payload = readPayload();

                createDraftFromProcedure(procedureId, payload).then(function (created) {
                    setDraftStatus(`Черновик договора '${created.contractNumber}' создан из процедуры.`, false);
                    clearDraftInputs();
                    return onDraftCreated(created);
                }).catch(function (error) {
                    setDraftStatus(error.message || "Не удалось создать черновик договора.", true);
                });
            }
        };
    }

    const exportsObject = {
        createEvents: createEvents
    };

    if (typeof window !== "undefined") {
        window.ContractsDraftEvents = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
