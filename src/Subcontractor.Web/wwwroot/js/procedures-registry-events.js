"use strict";

(function () {
    function assertFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`Procedures registry events require '${name}' function.`);
        }
    }

    function createGridCallbacks(options) {
        const settings = options || {};
        const getGridInstance = settings.getGridInstance;
        const hasAnyUrlFilter = settings.hasAnyUrlFilter;
        const clearUrlFilters = settings.clearUrlFilters;
        const applySelection = settings.applySelection;
        const setTransitionStatus = settings.setTransitionStatus;
        const setStatus = settings.setStatus;

        assertFunction(getGridInstance, "getGridInstance");
        assertFunction(clearUrlFilters, "clearUrlFilters");
        assertFunction(applySelection, "applySelection");
        assertFunction(setTransitionStatus, "setTransitionStatus");
        assertFunction(setStatus, "setStatus");

        return {
            onEditorPreparing: function (e) {
                if (e.parentType === "dataRow" && e.dataField === "lotId" && e.row && !e.row.isNewRow) {
                    e.editorOptions.readOnly = true;
                }
            },
            onSelectionChanged: function (e) {
                const selected = Array.isArray(e.selectedRowsData) && e.selectedRowsData.length > 0
                    ? e.selectedRowsData[0]
                    : null;

                applySelection(selected).catch(function (error) {
                    setTransitionStatus(`Не удалось применить выбор процедуры: ${error.message}`, true);
                });
            },
            onToolbarPreparing: function (e) {
                e.toolbarOptions.items.push({
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "refresh",
                        text: "Обновить",
                        onClick: function () {
                            const grid = getGridInstance();
                            if (grid) {
                                grid.refresh();
                            }
                        }
                    }
                });

                if (Boolean(hasAnyUrlFilter)) {
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
        createGridCallbacks: createGridCallbacks
    };

    if (typeof window !== "undefined") {
        window.ProceduresRegistryEvents = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
