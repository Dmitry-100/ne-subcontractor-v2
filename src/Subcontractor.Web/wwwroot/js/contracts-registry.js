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
            throw new Error(`Не удалось загрузить модуль contracts-registry: ${globalName}.`);
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

        const gridElement = elements.gridElement;
        const apiClient = settings.apiClient;
        const gridState = settings.gridState;
        const urlFilterState = settings.urlFilterState || {};
        const statusLookup = Array.isArray(settings.statusLookup) ? settings.statusLookup : [];
        const setStatus = settings.setStatus;
        const appendFilterHint = settings.appendFilterHint;
        const clearUrlFilters = typeof settings.clearUrlFilters === "function"
            ? settings.clearUrlFilters
            : function () { };
        const toNullableDate = settings.toNullableDate;
        const toNumber = settings.toNumber;
        const isGuid = settings.isGuid;

        const payloadBuilderModule = settings.payloadBuilderModule
            || resolveModule("ContractsRegistryPayload", "./contracts-registry-payload.js", ["createBuilder"]);
        const columnsModule = settings.columnsModule
            || resolveModule("ContractsRegistryColumns", "./contracts-registry-columns.js", ["createFormItems", "createColumns"]);
        const eventsModule = settings.eventsModule
            || resolveModule("ContractsRegistryEvents", "./contracts-registry-events.js", ["createEvents"]);
        const storeModule = settings.storeModule
            || resolveModule("ContractsRegistryStore", "./contracts-registry-store.js", ["createContractsStore"]);

        const onSelectionChanged = typeof settings.onSelectionChanged === "function"
            ? settings.onSelectionChanged
            : function () { };
        const onDataMutated = typeof settings.onDataMutated === "function"
            ? settings.onDataMutated
            : function () { };

        let gridInstance = null;

        const payloadBuilder = payloadBuilderModule.createBuilder({
            toNullableDate: toNullableDate,
            toNumber: toNumber,
            isGuid: isGuid
        });

        function createStore() {
            return storeModule.createContractsStore({
                apiClient: apiClient,
                gridState: gridState,
                payloadBuilder: payloadBuilder,
                setStatus: setStatus,
                appendFilterHint: appendFilterHint,
                onDataMutated: onDataMutated
            });
        }

        function init() {
            const store = createStore();

            const gridConfig = {
                dataSource: store,
                keyExpr: "id",
                height: 560,
                showBorders: true,
                rowAlternationEnabled: true,
                hoverStateEnabled: true,
                selection: {
                    mode: "single"
                },
                columnAutoWidth: true,
                repaintChangesOnly: true,
                remoteOperations: {
                    paging: true
                },
                sorting: {
                    mode: "multiple"
                },
                searchPanel: {
                    visible: true,
                    width: 300,
                    placeholder: "Поиск договоров...",
                    text: String(urlFilterState.searchText || "")
                },
                filterValue: urlFilterState.statusFilter || null,
                filterRow: {
                    visible: true
                },
                headerFilter: {
                    visible: true
                },
                paging: {
                    pageSize: 15
                },
                pager: {
                    showInfo: true,
                    showPageSizeSelector: true,
                    allowedPageSizes: [15, 30, 50]
                },
                editing: {
                    mode: "popup",
                    allowAdding: true,
                    allowUpdating: true,
                    allowDeleting: true,
                    useIcons: true,
                    popup: {
                        title: "Договор",
                        showTitle: true,
                        width: 820
                    },
                    form: {
                        colCount: 2,
                        items: columnsModule.createFormItems()
                    }
                },
                columns: columnsModule.createColumns(statusLookup)
            };

            Object.assign(gridConfig, eventsModule.createEvents({
                gridState: gridState,
                onSelectionChanged: onSelectionChanged,
                urlFilterState: urlFilterState,
                clearUrlFilters: clearUrlFilters,
                setStatus: setStatus,
                getGridInstance: function () {
                    return gridInstance;
                }
            }));

            gridInstance = window.jQuery(gridElement).dxDataGrid(gridConfig).dxDataGrid("instance");
        }

        async function refreshAndSelect(contractId) {
            if (!gridInstance) {
                return;
            }

            await gridInstance.refresh();

            const targetId = contractId || gridState.getSelectedContractId();
            if (targetId) {
                gridState.setSelectedContractId(targetId);
                await gridInstance.selectRows([targetId], false);
            }
        }

        return {
            init: init,
            refreshAndSelect: refreshAndSelect
        };
    }

    const exportsObject = {
        createController: createController
    };

    if (typeof window !== "undefined") {
        window.ContractsRegistry = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
