"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsMonitoringWiring requires ${name}.`);
        }
    }

    function bindCoreEvents(options) {
        const settings = options || {};
        const refreshButton = settings.refreshButton;
        const saveButton = settings.saveButton;
        const loadData = settings.loadData;
        const saveData = settings.saveData;
        const setMonitoringStatus = settings.setMonitoringStatus;

        if (!(refreshButton && typeof refreshButton.addEventListener === "function")) {
            throw new Error("ContractsMonitoringWiring requires refreshButton.addEventListener.");
        }

        if (!(saveButton && typeof saveButton.addEventListener === "function")) {
            throw new Error("ContractsMonitoringWiring requires saveButton.addEventListener.");
        }

        requireFunction(loadData, "loadData");
        requireFunction(saveData, "saveData");
        requireFunction(setMonitoringStatus, "setMonitoringStatus");

        refreshButton.addEventListener("click", function () {
            loadData(true);
        });

        saveButton.addEventListener("click", function () {
            saveData().catch(function (error) {
                setMonitoringStatus(error.message || "Не удалось сохранить мониторинг.", true);
            });
        });
    }

    function createGridDataBinders(options) {
        const settings = options || {};
        const getControlPointsGrid = settings.getControlPointsGrid;
        const getStagesGrid = settings.getStagesGrid;
        const getMdrCardsGrid = settings.getMdrCardsGrid;
        const getMdrRowsGrid = settings.getMdrRowsGrid;

        requireFunction(getControlPointsGrid, "getControlPointsGrid");
        requireFunction(getStagesGrid, "getStagesGrid");
        requireFunction(getMdrCardsGrid, "getMdrCardsGrid");
        requireFunction(getMdrRowsGrid, "getMdrRowsGrid");

        return {
            getMonitoringGrids: function () {
                return [
                    getControlPointsGrid(),
                    getStagesGrid(),
                    getMdrCardsGrid(),
                    getMdrRowsGrid()
                ];
            },
            setControlPointsData: function (items) {
                const grid = getControlPointsGrid();
                if (grid) {
                    grid.option("dataSource", items);
                }
            },
            setMdrCardsData: function (items) {
                const grid = getMdrCardsGrid();
                if (grid) {
                    grid.option("dataSource", items);
                }
            }
        };
    }

    const exportsObject = {
        bindCoreEvents: bindCoreEvents,
        createGridDataBinders: createGridDataBinders
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringWiring = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
