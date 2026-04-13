"use strict";

(function () {
    function assertFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`Procedures store requires '${name}' function.`);
        }
    }

    function createStore(options) {
        const settings = options || {};
        const devExpressData = settings.devExpressData;
        const proceduresData = settings.proceduresData;
        const createPayload = settings.createPayload;
        const updatePayload = settings.updatePayload;
        const appendFilterHint = settings.appendFilterHint;
        const setStatus = settings.setStatus;
        const getSelectedProcedure = settings.getSelectedProcedure;
        const applySelection = settings.applySelection;

        if (!(devExpressData && typeof devExpressData.CustomStore === "function")) {
            throw new Error("Procedures store requires DevExpress.data.CustomStore.");
        }

        if (!proceduresData) {
            throw new Error("Procedures store requires 'proceduresData'.");
        }

        assertFunction(createPayload, "createPayload");
        assertFunction(updatePayload, "updatePayload");
        assertFunction(appendFilterHint, "appendFilterHint");
        assertFunction(setStatus, "setStatus");
        assertFunction(getSelectedProcedure, "getSelectedProcedure");
        assertFunction(applySelection, "applySelection");

        return new devExpressData.CustomStore({
            key: "id",
            load: async function (loadOptions) {
                const payload = await proceduresData.loadProcedures(loadOptions);
                const items = Array.isArray(payload?.items) ? payload.items : [];
                const totalCountValue = Number(payload?.totalCount);
                const totalCount = Number.isFinite(totalCountValue) && totalCountValue >= 0
                    ? Math.trunc(totalCountValue)
                    : items.length;
                const statusMessage = totalCount === items.length
                    ? `Загружено процедур: ${items.length}.`
                    : `Загружено процедур: ${items.length} (всего: ${totalCount}).`;

                setStatus(appendFilterHint(statusMessage), false);

                const shouldReturnPagedPayload = Boolean(payload?.paged)
                    || Boolean(loadOptions && (typeof loadOptions.skip === "number" || typeof loadOptions.take === "number"));

                if (shouldReturnPagedPayload) {
                    return {
                        data: items,
                        totalCount: totalCount
                    };
                }

                return items;
            },
            insert: async function (values) {
                const payload = createPayload(values);
                const created = await proceduresData.createProcedure(payload);
                setStatus(`Процедура создана для лота ${created.lotId}.`, false);
                return created;
            },
            update: async function (key, values) {
                const details = await proceduresData.getDetails(key, false);
                const payload = updatePayload(details, values);
                const updated = await proceduresData.updateProcedure(key, payload);
                setStatus(`Процедура '${updated.objectName}' обновлена.`, false);
                return updated;
            },
            remove: async function (key) {
                await proceduresData.deleteProcedure(key);

                const selectedProcedure = getSelectedProcedure();
                if (selectedProcedure && selectedProcedure.id === key) {
                    await applySelection(null);
                }

                setStatus("Процедура удалена.", false);
            }
        });
    }

    const exportsObject = {
        createStore: createStore
    };

    if (typeof window !== "undefined") {
        window.ProceduresStore = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
