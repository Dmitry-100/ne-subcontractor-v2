"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsExecutionPanelEvents requires ${name}.`);
        }
    }

    function createEvents(options) {
        const settings = options || {};
        const persistMilestones = settings.persistMilestones;
        const setExecutionStatus = settings.setExecutionStatus;

        requireFunction(persistMilestones, "persistMilestones");
        requireFunction(setExecutionStatus, "setExecutionStatus");

        return {
            onInitNewRow: function (e) {
                const items = e.component.option("dataSource");
                const source = Array.isArray(items) ? items : [];
                e.data.sortOrder = source.length;
                e.data.progressPercent = 0;
            },
            onRowInserted: function () {
                persistMilestones("Этап добавлен.").catch(function (error) {
                    setExecutionStatus(error.message || "Не удалось сохранить этапы.", true);
                });
            },
            onRowUpdated: function () {
                persistMilestones("Этап обновлён.").catch(function (error) {
                    setExecutionStatus(error.message || "Не удалось сохранить этапы.", true);
                });
            },
            onRowRemoved: function () {
                persistMilestones("Этап удалён.").catch(function (error) {
                    setExecutionStatus(error.message || "Не удалось сохранить этапы.", true);
                });
            },
            onDataErrorOccurred: function (e) {
                setExecutionStatus(e.error?.message ?? "Ошибка операции с этапами.", true);
            }
        };
    }

    const exportsObject = {
        createEvents: createEvents
    };

    if (typeof window !== "undefined") {
        window.ContractsExecutionPanelEvents = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
