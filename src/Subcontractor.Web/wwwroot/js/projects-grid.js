"use strict";

(function () {
    const moduleRoot = document.querySelector("[data-projects-module]");
    if (!moduleRoot) {
        return;
    }

    const gridElement = moduleRoot.querySelector("[data-projects-grid]");
    const statusElement = moduleRoot.querySelector("[data-projects-status]");
    if (!gridElement || !statusElement) {
        return;
    }

    if (!(window.jQuery && window.DevExpress && window.DevExpress.data)) {
        statusElement.textContent = "Скрипты DevExpress не загружены. Проверьте доступ к CDN.";
        statusElement.classList.add("projects-status--error");
        return;
    }

    const endpoint = moduleRoot.getAttribute("data-api-endpoint") || "/api/projects";
    let cache = [];
    let gridInstance = null;

    function setStatus(message, isError) {
        statusElement.textContent = message;
        statusElement.classList.toggle("projects-status--error", Boolean(isError));
    }

    function normalizeGuid(value) {
        if (value === null || value === undefined) {
            return null;
        }

        const text = String(value).trim();
        return text.length === 0 ? null : text;
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

    const store = new window.DevExpress.data.CustomStore({
        key: "id",
        load: async function () {
            const payload = await request(endpoint, {
                method: "GET"
            });

            cache = Array.isArray(payload) ? payload : [];
            setStatus(`Загружено проектов: ${cache.length}.`, false);
            return cache;
        },
        insert: async function (values) {
            const payload = {
                code: String(values.code ?? "").trim(),
                name: String(values.name ?? "").trim(),
                gipUserId: normalizeGuid(values.gipUserId)
            };

            if (!payload.code) {
                throw new Error("Код проекта обязателен.");
            }

            if (!payload.name) {
                throw new Error("Наименование проекта обязательно.");
            }

            const created = await request(endpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            cache.push(created);
            setStatus(`Проект '${created.code}' создан.`, false);
            return created;
        },
        update: async function (key, values) {
            const current = cache.find(function (item) {
                return item.id === key;
            });

            const payload = {
                name: String(values.name ?? current?.name ?? "").trim(),
                gipUserId: values.gipUserId !== undefined
                    ? normalizeGuid(values.gipUserId)
                    : normalizeGuid(current?.gipUserId)
            };

            if (!payload.name) {
                throw new Error("Наименование проекта обязательно.");
            }

            const updated = await request(`${endpoint}/${key}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            cache = cache.map(function (item) {
                return item.id === key ? updated : item;
            });

            setStatus(`Проект '${updated.code}' обновлён.`, false);
            return updated;
        },
        remove: async function (key) {
            await request(`${endpoint}/${key}`, {
                method: "DELETE"
            });

            cache = cache.filter(function (item) {
                return item.id !== key;
            });

            setStatus("Проект удалён.", false);
        }
    });

    gridInstance = window.jQuery(gridElement).dxDataGrid({
        dataSource: store,
        keyExpr: "id",
        height: 560,
        showBorders: true,
        rowAlternationEnabled: true,
        hoverStateEnabled: true,
        columnAutoWidth: true,
        repaintChangesOnly: true,
        remoteOperations: false,
        sorting: {
            mode: "multiple"
        },
        searchPanel: {
            visible: true,
            width: 280,
            placeholder: "Поиск проектов..."
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
                title: "Проект",
                showTitle: true,
                width: 640
            },
            form: {
                colCount: 1,
                items: ["code", "name", "gipUserId"]
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
                    { type: "stringLength", max: 256 }
                ]
            },
            {
                dataField: "gipUserId",
                caption: "ID ГИПа",
                validationRules: [
                    { type: "stringLength", max: 64 }
                ]
            }
        ],
        onEditorPreparing: function (e) {
            if (e.parentType === "dataRow" && e.dataField === "code" && e.row && !e.row.isNewRow) {
                e.editorOptions.readOnly = true;
            }
        },
        onInitNewRow: function () {
            setStatus("Создание нового проекта...", false);
        },
        onToolbarPreparing: function (e) {
            e.toolbarOptions.items.push({
                location: "after",
                widget: "dxButton",
                options: {
                    icon: "refresh",
                    text: "Обновить",
                    onClick: function () {
                        if (gridInstance) {
                            gridInstance.refresh();
                        }
                    }
                }
            });
        },
        onDataErrorOccurred: function (e) {
            setStatus(e.error?.message ?? "Ошибка операции с данными.", true);
        }
    }).dxDataGrid("instance");
})();
