"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsRegistryEvents requires ${name}.`);
        }
    }

    function createEvents(options) {
        const settings = options || {};
        const gridState = settings.gridState;
        const onSelectionChanged = settings.onSelectionChanged;
        const urlFilterState = settings.urlFilterState || {};
        const clearUrlFilters = settings.clearUrlFilters;
        const setStatus = settings.setStatus;
        const getGridInstance = settings.getGridInstance;

        if (!(gridState && typeof gridState.setSelectedContractId === "function")) {
            throw new Error("ContractsRegistryEvents requires gridState.setSelectedContractId.");
        }

        requireFunction(onSelectionChanged, "onSelectionChanged");
        requireFunction(clearUrlFilters, "clearUrlFilters");
        requireFunction(setStatus, "setStatus");
        requireFunction(getGridInstance, "getGridInstance");

        return {
            onSelectionChanged: function (e) {
                gridState.setSelectedContractId(
                    e.selectedRowKeys.length > 0
                        ? e.selectedRowKeys[0]
                        : null);
                onSelectionChanged();
            },
            onEditorPreparing: function (e) {
                if (e.parentType !== "dataRow") {
                    return;
                }

                const readOnlyFields = ["status"];
                const readOnlyOnUpdate = ["lotId", "procedureId", "contractorId"];

                if (readOnlyFields.includes(e.dataField)) {
                    e.editorOptions.readOnly = true;
                }

                if (e.row && !e.row.isNewRow && readOnlyOnUpdate.includes(e.dataField)) {
                    e.editorOptions.readOnly = true;
                }
            },
            onToolbarPreparing: function (e) {
                e.toolbarOptions.items.push({
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "refresh",
                        text: "Обновить",
                        onClick: function () {
                            const gridInstance = getGridInstance();
                            if (gridInstance) {
                                gridInstance.refresh();
                            }
                        }
                    }
                });

                if (urlFilterState.hasAny) {
                    e.toolbarOptions.items.push({
                        location: "after",
                        widget: "dxButton",
                        options: {
                            icon: "clear",
                            text: "Сбросить URL-фильтры",
                            onClick: function () {
                                clearUrlFilters();
                            }
                        }
                    });
                }
            },
            onDataErrorOccurred: function (e) {
                setStatus(e.error?.message ?? "Ошибка операции с данными.", true);
            }
        };
    }

    const exportsObject = {
        createEvents: createEvents
    };

    if (typeof window !== "undefined") {
        window.ContractsRegistryEvents = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
