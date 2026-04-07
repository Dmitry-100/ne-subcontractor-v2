"use strict";

(function () {
    const moduleRoot = document.querySelector("[data-lots-module]");
    if (!moduleRoot) {
        return;
    }

    const lotsGridElement = moduleRoot.querySelector("[data-lots-grid]");
    const historyGridElement = moduleRoot.querySelector("[data-lots-history-grid]");
    const statusElement = moduleRoot.querySelector("[data-lots-status]");
    const selectedElement = moduleRoot.querySelector("[data-lots-selected]");
    const transitionStatusElement = moduleRoot.querySelector("[data-lots-transition-status]");
    const nextButton = moduleRoot.querySelector("[data-lots-next]");
    const rollbackButton = moduleRoot.querySelector("[data-lots-rollback]");
    const historyRefreshButton = moduleRoot.querySelector("[data-lots-history-refresh]");

    if (!lotsGridElement || !historyGridElement || !statusElement || !selectedElement || !transitionStatusElement ||
        !nextButton || !rollbackButton || !historyRefreshButton) {
        return;
    }

    if (!(window.jQuery && window.DevExpress && window.DevExpress.data)) {
        statusElement.textContent = "Скрипты DevExpress не загружены. Проверьте доступ к CDN.";
        statusElement.classList.add("lots-status--error");
        return;
    }

    const endpoint = moduleRoot.getAttribute("data-api-endpoint") || "/api/lots";
    const statusOrder = ["Draft", "InProcurement", "ContractorSelected", "Contracted", "InExecution", "Closed"];
    const statusCaptions = {
        Draft: "Черновик",
        InProcurement: "В закупке",
        ContractorSelected: "Подрядчик выбран",
        Contracted: "Законтрактован",
        InExecution: "В исполнении",
        Closed: "Закрыт"
    };
    const statusLookup = statusOrder.map(function (value) {
        return {
            value: value,
            text: statusCaptions[value] || value
        };
    });

    let lotsCache = [];
    const lotDetailsCache = new Map();
    let selectedLot = null;
    let lotsGridInstance = null;
    let historyGridInstance = null;

    function setStatus(message, isError) {
        statusElement.textContent = message;
        statusElement.classList.toggle("lots-status--error", Boolean(isError));
    }

    function setTransitionStatus(message, isError) {
        transitionStatusElement.textContent = message;
        transitionStatusElement.classList.toggle("lots-transition-status--error", Boolean(isError));
    }

    function localizeStatus(status) {
        return statusCaptions[String(status || "")] || String(status || "");
    }

    function normalizeGuid(value) {
        if (value === null || value === undefined) {
            return null;
        }

        const text = String(value).trim();
        return text.length === 0 ? null : text;
    }

    function calculateTotalManHours(items) {
        if (!Array.isArray(items)) {
            return 0;
        }

        return items.reduce(function (sum, item) {
            const value = Number(item?.manHours);
            return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
    }

    function toListItem(details, fallback) {
        if (!details || typeof details !== "object") {
            return fallback;
        }

        const items = Array.isArray(details.items) ? details.items : [];
        return {
            id: details.id ?? fallback?.id,
            code: details.code ?? fallback?.code ?? "",
            name: details.name ?? fallback?.name ?? "",
            status: details.status ?? fallback?.status ?? "Draft",
            responsibleCommercialUserId: details.responsibleCommercialUserId ?? null,
            itemsCount: items.length,
            totalManHours: calculateTotalManHours(items)
        };
    }

    function mapItemsForRequest(items) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items.map(function (item) {
            return {
                projectId: item.projectId,
                objectWbs: item.objectWbs,
                disciplineCode: item.disciplineCode,
                manHours: item.manHours,
                plannedStartDate: item.plannedStartDate,
                plannedFinishDate: item.plannedFinishDate
            };
        });
    }

    function nextStatus(currentStatus) {
        const index = statusOrder.indexOf(currentStatus);
        return index >= 0 && index < statusOrder.length - 1 ? statusOrder[index + 1] : null;
    }

    function previousStatus(currentStatus) {
        const index = statusOrder.indexOf(currentStatus);
        return index > 0 ? statusOrder[index - 1] : null;
    }

    function parseTransitionError(error) {
        return error?.message || "Ошибка выполнения перехода.";
    }

    async function parseError(response) {
        const fallback = `Ошибка запроса (${response.status}).`;
        const bodyText = await response.text();
        if (!bodyText) {
            return fallback;
        }

        try {
            const body = JSON.parse(bodyText);
            if (body && typeof body.detail === "string" && body.detail.trim().length > 0) {
                return body.detail;
            }

            if (body && typeof body.error === "string" && body.error.trim().length > 0) {
                return body.error;
            }

            if (body && typeof body.title === "string" && body.title.trim().length > 0) {
                return body.title;
            }
        } catch {
            return bodyText;
        }

        return bodyText;
    }

    async function request(url, options) {
        const hasBody = options && typeof options.body === "string";
        const headers = {
            Accept: "application/json"
        };

        if (hasBody) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            credentials: "include",
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(await parseError(response));
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    async function getLotDetails(lotId, forceReload) {
        if (!forceReload && lotDetailsCache.has(lotId)) {
            return lotDetailsCache.get(lotId);
        }

        const details = await request(`${endpoint}/${lotId}`, {
            method: "GET"
        });
        lotDetailsCache.set(lotId, details);
        return details;
    }

    async function refreshLotsAndReselect(lotId) {
        if (!lotsGridInstance) {
            return;
        }

        await lotsGridInstance.refresh();

        if (lotId) {
            await lotsGridInstance.selectRows([lotId], false);
            const refreshed = lotsCache.find(function (item) {
                return item.id === lotId;
            });
            applySelection(refreshed ?? null);
        }
    }

    async function loadHistory(lotId) {
        if (!historyGridInstance) {
            return;
        }

        if (!lotId) {
            historyGridInstance.option("dataSource", []);
            return;
        }

        const history = await request(`${endpoint}/${lotId}/history`, {
            method: "GET"
        });

        historyGridInstance.option("dataSource", Array.isArray(history) ? history : []);
    }

    function updateActionButtons() {
        if (!selectedLot) {
            nextButton.disabled = true;
            rollbackButton.disabled = true;
            historyRefreshButton.disabled = true;
            return;
        }

        nextButton.disabled = !nextStatus(selectedLot.status);
        rollbackButton.disabled = !previousStatus(selectedLot.status);
        historyRefreshButton.disabled = false;
    }

    function applySelection(lot) {
        selectedLot = lot;
        if (!lot) {
            selectedElement.textContent = "Выберите лот в таблице, чтобы управлять статусом.";
            updateActionButtons();
            loadHistory(null).catch(function () {
                historyGridInstance?.option("dataSource", []);
            });
            return;
        }

        selectedElement.textContent = `Выбрано: ${lot.code} · ${lot.name} · Статус: ${localizeStatus(lot.status)}`;
        updateActionButtons();
        loadHistory(lot.id).catch(function (error) {
            setTransitionStatus(`Не удалось загрузить историю лота: ${error.message}`, true);
        });
    }

    async function runTransition(targetStatus, reason) {
        if (!selectedLot || !targetStatus) {
            return;
        }

        try {
            await request(`${endpoint}/${selectedLot.id}/transition`, {
                method: "POST",
                body: JSON.stringify({
                    targetStatus: targetStatus,
                    reason: reason
                })
            });

            setTransitionStatus(`Переход выполнен: ${localizeStatus(selectedLot.status)} -> ${localizeStatus(targetStatus)}.`, false);
            await refreshLotsAndReselect(selectedLot.id);
            await loadHistory(selectedLot.id);
        } catch (error) {
            setTransitionStatus(parseTransitionError(error), true);
        }
    }

    const store = new window.DevExpress.data.CustomStore({
        key: "id",
        load: async function () {
            const payload = await request(endpoint, {
                method: "GET"
            });

            lotsCache = Array.isArray(payload) ? payload : [];
            setStatus(`Загружено лотов: ${lotsCache.length}.`, false);
            return lotsCache;
        },
        insert: async function (values) {
            const payload = {
                code: String(values.code ?? "").trim(),
                name: String(values.name ?? "").trim(),
                responsibleCommercialUserId: normalizeGuid(values.responsibleCommercialUserId),
                items: []
            };

            if (!payload.code) {
                throw new Error("Код лота обязателен.");
            }

            if (!payload.name) {
                throw new Error("Наименование лота обязательно.");
            }

            const createdDetails = await request(endpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const created = toListItem(createdDetails, null);
            lotsCache.push(created);
            lotDetailsCache.set(created.id, createdDetails);
            setStatus(`Лот '${created.code}' создан.`, false);
            return created;
        },
        update: async function (key, values) {
            const current = lotsCache.find(function (item) {
                return item.id === key;
            });

            const details = await getLotDetails(key, false);
            const payload = {
                name: String(values.name ?? current?.name ?? "").trim(),
                responsibleCommercialUserId: values.responsibleCommercialUserId !== undefined
                    ? normalizeGuid(values.responsibleCommercialUserId)
                    : normalizeGuid(current?.responsibleCommercialUserId),
                items: mapItemsForRequest(details?.items)
            };

            if (!payload.name) {
                throw new Error("Наименование лота обязательно.");
            }

            const updatedDetails = await request(`${endpoint}/${key}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            lotDetailsCache.set(key, updatedDetails);
            const updated = toListItem(updatedDetails, current);
            lotsCache = lotsCache.map(function (item) {
                return item.id === key ? updated : item;
            });

            setStatus(`Лот '${updated.code}' обновлён.`, false);
            return updated;
        },
        remove: async function (key) {
            await request(`${endpoint}/${key}`, {
                method: "DELETE"
            });

            lotDetailsCache.delete(key);
            lotsCache = lotsCache.filter(function (item) {
                return item.id !== key;
            });

            if (selectedLot && selectedLot.id === key) {
                applySelection(null);
            }

            setStatus("Лот удалён.", false);
        }
    });

    historyGridInstance = window.jQuery(historyGridElement).dxDataGrid({
        dataSource: [],
        height: 320,
        showBorders: true,
        rowAlternationEnabled: true,
        paging: {
            pageSize: 10
        },
        pager: {
            showInfo: true
        },
        columns: [
            {
                dataField: "fromStatus",
                caption: "Из",
                width: 180,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "toStatus",
                caption: "В",
                width: 180,
                customizeText: function (cellInfo) {
                    return localizeStatus(cellInfo.value);
                }
            },
            {
                dataField: "reason",
                caption: "Причина"
            },
            {
                dataField: "changedBy",
                caption: "Кем изменено",
                width: 190
            },
            {
                dataField: "changedAtUtc",
                caption: "Изменено (UTC)",
                dataType: "datetime",
                format: "yyyy-MM-dd HH:mm",
                sortOrder: "desc",
                width: 180
            }
        ]
    }).dxDataGrid("instance");

    lotsGridInstance = window.jQuery(lotsGridElement).dxDataGrid({
        dataSource: store,
        keyExpr: "id",
        height: 560,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        focusedRowEnabled: true,
        selection: {
            mode: "single"
        },
        columnAutoWidth: true,
        repaintChangesOnly: true,
        remoteOperations: false,
        sorting: {
            mode: "multiple"
        },
        searchPanel: {
            visible: true,
            width: 280,
            placeholder: "Поиск лотов..."
        },
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
                title: "Лот",
                showTitle: true,
                width: 640
            },
            form: {
                colCount: 1,
                items: ["code", "name", "responsibleCommercialUserId"]
            }
        },
        columns: [
            {
                dataField: "id",
                visible: false,
                allowEditing: false
            },
            {
                dataField: "code",
                caption: "Код",
                validationRules: [
                    { type: "required" },
                    { type: "stringLength", max: 64 }
                ]
            },
            {
                dataField: "name",
                caption: "Наименование",
                validationRules: [
                    { type: "required" },
                    { type: "stringLength", max: 512 }
                ]
            },
            {
                dataField: "status",
                caption: "Статус",
                lookup: {
                    dataSource: statusLookup,
                    valueExpr: "value",
                    displayExpr: "text"
                },
                allowEditing: false,
                width: 180
            },
            {
                dataField: "responsibleCommercialUserId",
                caption: "ID ответственного пользователя"
            },
            {
                dataField: "itemsCount",
                caption: "Позиций",
                allowEditing: false,
                width: 90
            },
            {
                dataField: "totalManHours",
                caption: "Сумма чел.-ч",
                dataType: "number",
                format: {
                    type: "fixedPoint",
                    precision: 2
                },
                allowEditing: false,
                width: 160
            }
        ],
        onEditorPreparing: function (e) {
            if (e.parentType === "dataRow" && e.dataField === "code" && e.row && !e.row.isNewRow) {
                e.editorOptions.readOnly = true;
            }
        },
        onSelectionChanged: function (e) {
            const selected = Array.isArray(e.selectedRowsData) && e.selectedRowsData.length > 0
                ? e.selectedRowsData[0]
                : null;
            applySelection(selected);
        },
        onToolbarPreparing: function (e) {
            e.toolbarOptions.items.push({
                location: "after",
                widget: "dxButton",
                options: {
                    icon: "refresh",
                    text: "Обновить",
                    onClick: function () {
                        if (lotsGridInstance) {
                            lotsGridInstance.refresh();
                        }
                    }
                }
            });
        },
        onDataErrorOccurred: function (e) {
            setStatus(e.error?.message ?? "Ошибка операции с данными.", true);
        }
    }).dxDataGrid("instance");

    nextButton.addEventListener("click", function () {
        if (!selectedLot) {
            return;
        }

        const targetStatus = nextStatus(selectedLot.status);
        if (!targetStatus) {
            setTransitionStatus("Для текущего статуса недоступен переход вперёд.", true);
            return;
        }

        runTransition(targetStatus, null);
    });

    rollbackButton.addEventListener("click", function () {
        if (!selectedLot) {
            return;
        }

        const targetStatus = previousStatus(selectedLot.status);
        if (!targetStatus) {
            setTransitionStatus("Для текущего статуса недоступен откат.", true);
            return;
        }

        const reason = window.prompt(
            `Откат ${localizeStatus(selectedLot.status)} -> ${localizeStatus(targetStatus)}. Укажите причину:`,
            "");
        if (reason === null) {
            return;
        }

        const normalizedReason = reason.trim();
        if (!normalizedReason) {
            setTransitionStatus("Для отката требуется причина.", true);
            return;
        }

        runTransition(targetStatus, normalizedReason);
    });

    historyRefreshButton.addEventListener("click", function () {
        if (!selectedLot) {
            return;
        }

        loadHistory(selectedLot.id).then(function () {
            setTransitionStatus("История обновлена.", false);
        }).catch(function (error) {
            setTransitionStatus(`Не удалось обновить историю: ${error.message}`, true);
        });
    });

    applySelection(null);
})();
