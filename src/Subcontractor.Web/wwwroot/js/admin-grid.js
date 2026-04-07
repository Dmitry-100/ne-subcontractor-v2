"use strict";

(function () {
    const moduleRoot = document.querySelector("[data-admin-module]");
    if (!moduleRoot) {
        return;
    }

    const usersGridElement = moduleRoot.querySelector("[data-admin-users-grid]");
    const usersStatusElement = moduleRoot.querySelector("[data-admin-users-status]");
    const usersSearchInput = moduleRoot.querySelector("[data-admin-users-search]");
    const usersSearchApplyButton = moduleRoot.querySelector("[data-admin-users-search-apply]");
    const usersSearchResetButton = moduleRoot.querySelector("[data-admin-users-search-reset]");
    const rolesGridElement = moduleRoot.querySelector("[data-admin-roles-grid]");
    const rolesStatusElement = moduleRoot.querySelector("[data-admin-roles-status]");
    const referenceGridElement = moduleRoot.querySelector("[data-admin-reference-grid]");
    const referenceStatusElement = moduleRoot.querySelector("[data-admin-reference-status]");
    const referenceTypeCodeInput = moduleRoot.querySelector("[data-admin-reference-type-code]");
    const referenceActiveOnlyCheckbox = moduleRoot.querySelector("[data-admin-reference-active-only]");
    const referenceLoadButton = moduleRoot.querySelector("[data-admin-reference-load]");
    const referenceOpenApiLink = moduleRoot.querySelector("[data-admin-reference-open-api]");

    if (!usersGridElement || !usersStatusElement || !usersSearchInput || !usersSearchApplyButton ||
        !usersSearchResetButton || !rolesGridElement || !rolesStatusElement || !referenceGridElement ||
        !referenceStatusElement || !referenceTypeCodeInput || !referenceActiveOnlyCheckbox ||
        !referenceLoadButton || !referenceOpenApiLink) {
        return;
    }

    if (!(window.jQuery && window.DevExpress && window.DevExpress.data)) {
        const message = "Скрипты DevExpress не загружены. Проверьте доступ к CDN.";
        setSectionStatus(usersStatusElement, message, true);
        setSectionStatus(rolesStatusElement, message, true);
        setSectionStatus(referenceStatusElement, message, true);
        return;
    }

    const usersEndpoint = moduleRoot.getAttribute("data-users-api-endpoint") || "/api/admin/users";
    const rolesEndpoint = moduleRoot.getAttribute("data-roles-api-endpoint") || "/api/admin/roles";
    const referenceApiRoot = moduleRoot.getAttribute("data-reference-api-root") || "/api/reference-data";

    let usersCache = [];
    let rolesCache = [];
    let referenceCache = [];

    let currentUsersSearch = "";
    let currentReferenceTypeCode = normalizeTypeCode(referenceTypeCodeInput.value || "PURCHASE_TYPE");
    let currentReferenceActiveOnly = Boolean(referenceActiveOnlyCheckbox.checked);

    let usersGridInstance = null;
    let rolesGridInstance = null;
    let referenceGridInstance = null;

    function setSectionStatus(element, message, isError) {
        element.textContent = message;
        element.classList.toggle("admin-status--error", Boolean(isError));
    }

    function hasOwn(source, key) {
        return Object.prototype.hasOwnProperty.call(source, key);
    }

    function parseErrorBody(rawText, statusCode) {
        if (!rawText) {
            return `Ошибка запроса (${statusCode}).`;
        }

        try {
            const body = JSON.parse(rawText);
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
            return rawText;
        }

        return rawText;
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
            const bodyText = await response.text();
            throw new Error(parseErrorBody(bodyText, response.status));
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    function normalizeTypeCode(value) {
        const normalized = String(value ?? "").trim().toUpperCase();
        if (!normalized) {
            throw new Error("Код типа обязателен.");
        }

        return normalized;
    }

    function normalizeRoleNames(rawRoles) {
        if (!rawRoles) {
            return [];
        }

        const values = Array.isArray(rawRoles)
            ? rawRoles
            : String(rawRoles).split(",");

        const roleNames = [];
        const seen = new Set();

        values.forEach(function (value) {
            const roleName = String(value ?? "").trim();
            if (!roleName) {
                return;
            }

            const key = roleName.toUpperCase();
            if (seen.has(key)) {
                return;
            }

            seen.add(key);
            roleNames.push(roleName);
        });

        return roleNames;
    }

    function toStringList(value) {
        if (!value) {
            return [];
        }

        if (Array.isArray(value)) {
            return value.map(function (item) { return String(item); });
        }

        const text = String(value).trim();
        return text ? [text] : [];
    }

    function updateReferenceApiLink() {
        const typeCode = encodeURIComponent(currentReferenceTypeCode);
        const activeOnly = currentReferenceActiveOnly ? "true" : "false";
        referenceOpenApiLink.href = `${referenceApiRoot}/${typeCode}/items?activeOnly=${activeOnly}`;
    }

    function buildUsersUrl() {
        if (!currentUsersSearch) {
            return usersEndpoint;
        }

        const query = encodeURIComponent(currentUsersSearch);
        return `${usersEndpoint}?search=${query}`;
    }

    function buildReferenceItemsUrl() {
        const typeCode = encodeURIComponent(currentReferenceTypeCode);
        const activeOnly = currentReferenceActiveOnly ? "true" : "false";
        return `${referenceApiRoot}/${typeCode}/items?activeOnly=${activeOnly}`;
    }

    function parseSortOrder(value, fallbackValue) {
        if (value === null || value === undefined || value === "") {
            return fallbackValue;
        }

        const number = Number(value);
        return Number.isFinite(number) ? Math.trunc(number) : fallbackValue;
    }

    function buildReferencePayload(values, fallback, isInsert) {
        const fallbackValue = fallback || {};
        const itemCodeRaw = hasOwn(values, "itemCode")
            ? values.itemCode
            : fallbackValue.itemCode;
        const displayNameRaw = hasOwn(values, "displayName")
            ? values.displayName
            : fallbackValue.displayName;
        const sortOrder = parseSortOrder(
            hasOwn(values, "sortOrder") ? values.sortOrder : fallbackValue.sortOrder,
            0);
        const isActive = hasOwn(values, "isActive")
            ? Boolean(values.isActive)
            : (fallbackValue.isActive === undefined ? true : Boolean(fallbackValue.isActive));

        const itemCode = String(itemCodeRaw ?? "").trim().toUpperCase();
        if (!itemCode) {
            throw new Error("Поле ItemCode обязательно.");
        }

        const displayName = String(displayNameRaw ?? "").trim();
        if (!displayName) {
            throw new Error("Поле DisplayName обязательно.");
        }

        if (!isInsert && fallbackValue.itemCode && itemCode !== String(fallbackValue.itemCode).toUpperCase()) {
            throw new Error("Поле ItemCode нельзя изменить для существующей записи.");
        }

        return {
            itemCode: itemCode,
            displayName: displayName,
            sortOrder: sortOrder,
            isActive: isActive
        };
    }

    async function loadRoles() {
        const payload = await request(rolesEndpoint, { method: "GET" });
        rolesCache = Array.isArray(payload) ? payload : [];
        setSectionStatus(rolesStatusElement, `Загружено ролей: ${rolesCache.length}.`, false);
        return rolesCache;
    }

    async function loadUsers() {
        const payload = await request(buildUsersUrl(), { method: "GET" });
        usersCache = Array.isArray(payload) ? payload : [];
        const suffix = currentUsersSearch ? ` по запросу '${currentUsersSearch}'` : "";
        setSectionStatus(usersStatusElement, `Загружено пользователей: ${usersCache.length}${suffix}.`, false);
        return usersCache;
    }

    async function loadReferenceItems() {
        const payload = await request(buildReferenceItemsUrl(), { method: "GET" });
        referenceCache = Array.isArray(payload) ? payload : [];
        const activeOnlyText = currentReferenceActiveOnly ? " (только активные)" : "";
        setSectionStatus(referenceStatusElement, `Загружено элементов: ${referenceCache.length} для ${currentReferenceTypeCode}${activeOnlyText}.`, false);
        updateReferenceApiLink();
        return referenceCache;
    }

    const usersStore = new window.DevExpress.data.CustomStore({
        key: "id",
        load: async function () {
            return loadUsers();
        },
        update: async function (key, values) {
            const current = usersCache.find(function (item) {
                return item.id === key;
            });

            if (!current) {
                throw new Error("Текущая запись пользователя не найдена в кэше.");
            }

            const roleNames = hasOwn(values, "roles")
                ? normalizeRoleNames(values.roles)
                : normalizeRoleNames(current.roles);
            const isActive = hasOwn(values, "isActive")
                ? Boolean(values.isActive)
                : Boolean(current.isActive);

            const payload = {
                roleNames: roleNames,
                isActive: isActive
            };

            const updated = await request(`${usersEndpoint}/${key}/roles`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            usersCache = usersCache.map(function (item) {
                return item.id === key ? updated : item;
            });

            setSectionStatus(
                usersStatusElement,
                `Пользователь '${updated.login}' обновлён (ролей: ${updated.roles.length}).`,
                false);

            return updated;
        }
    });

    const referenceStore = new window.DevExpress.data.CustomStore({
        key: "itemCode",
        load: async function () {
            return loadReferenceItems();
        },
        insert: async function (values) {
            const payload = buildReferencePayload(values, null, true);
            const saved = await request(`${referenceApiRoot}/${encodeURIComponent(currentReferenceTypeCode)}/items`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            referenceCache = referenceCache.filter(function (item) {
                return item.itemCode !== saved.itemCode;
            });
            referenceCache.push(saved);

            setSectionStatus(referenceStatusElement, `Элемент '${saved.itemCode}' сохранён для ${currentReferenceTypeCode}.`, false);
            return saved;
        },
        update: async function (key, values) {
            const current = referenceCache.find(function (item) {
                return item.itemCode === key;
            });

            if (!current) {
                throw new Error("Текущий элемент справочника не найден в кэше.");
            }

            const payload = buildReferencePayload(values, current, false);
            const saved = await request(`${referenceApiRoot}/${encodeURIComponent(currentReferenceTypeCode)}/items`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            referenceCache = referenceCache.map(function (item) {
                return item.itemCode === key ? saved : item;
            });

            setSectionStatus(referenceStatusElement, `Элемент '${saved.itemCode}' обновлён для ${currentReferenceTypeCode}.`, false);
            return saved;
        },
        remove: async function (key) {
            await request(
                `${referenceApiRoot}/${encodeURIComponent(currentReferenceTypeCode)}/items/${encodeURIComponent(key)}`,
                { method: "DELETE" });

            referenceCache = referenceCache.filter(function (item) {
                return item.itemCode !== key;
            });

            setSectionStatus(referenceStatusElement, `Элемент '${key}' удалён из ${currentReferenceTypeCode}.`, false);
        }
    });

    function initializeRolesGrid() {
        rolesGridInstance = window.jQuery(rolesGridElement).dxDataGrid({
            dataSource: rolesCache,
            keyExpr: "id",
            height: 260,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            sorting: { mode: "multiple" },
            filterRow: { visible: true },
            paging: { pageSize: 10 },
            pager: {
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [10, 20, 40]
            },
            columns: [
                {
                    dataField: "id",
                    caption: "Идентификатор",
                    visible: false
                },
                {
                    dataField: "name",
                    caption: "Наименование роли",
                    width: 220
                },
                {
                    dataField: "description",
                    caption: "Описание",
                    minWidth: 380
                }
            ]
        }).dxDataGrid("instance");
    }

    function initializeUsersGrid() {
        usersGridInstance = window.jQuery(usersGridElement).dxDataGrid({
            dataSource: usersStore,
            keyExpr: "id",
            height: 480,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            repaintChangesOnly: true,
            remoteOperations: false,
            sorting: { mode: "multiple" },
            searchPanel: {
                visible: true,
                width: 280,
                placeholder: "Поиск среди загруженных пользователей..."
            },
            filterRow: { visible: true },
            headerFilter: { visible: true },
            paging: { pageSize: 15 },
            pager: {
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [15, 30, 50]
            },
            editing: {
                mode: "popup",
                allowAdding: false,
                allowUpdating: true,
                allowDeleting: false,
                useIcons: true,
                popup: {
                    title: "Роли пользователя",
                    showTitle: true,
                    width: 760
                },
                form: {
                    colCount: 2,
                    items: [
                        {
                            dataField: "login",
                            editorOptions: { readOnly: true }
                        },
                        {
                            dataField: "displayName",
                            editorOptions: { readOnly: true }
                        },
                        {
                            dataField: "email",
                            editorOptions: { readOnly: true }
                        },
                        {
                            dataField: "isActive",
                            editorType: "dxCheckBox"
                        },
                        {
                            dataField: "roles",
                            colSpan: 2,
                            editorType: "dxTagBox",
                            editorOptions: {
                                dataSource: rolesCache,
                                valueExpr: "name",
                                displayExpr: "name",
                                searchEnabled: true,
                                showSelectionControls: true,
                                showDropDownButton: true,
                                hideSelectedItems: false,
                                multiline: true,
                                applyValueMode: "useButtons",
                                placeholder: "Выберите роли..."
                            }
                        }
                    ]
                }
            },
            columns: [
                {
                    dataField: "id",
                    visible: false,
                    allowEditing: false
                },
                {
                    dataField: "login",
                    caption: "Логин",
                    width: 200
                },
                {
                    dataField: "displayName",
                    caption: "ФИО",
                    width: 220
                },
                {
                    dataField: "email",
                    caption: "Эл. почта",
                    width: 240
                },
                {
                    dataField: "isActive",
                    caption: "Активен",
                    dataType: "boolean",
                    width: 110
                },
                {
                    dataField: "roles",
                    caption: "Роли",
                    minWidth: 260,
                    customizeText: function (cellInfo) {
                        return toStringList(cellInfo.value).join(", ");
                    }
                }
            ],
            onEditorPreparing: function (e) {
                if (e.parentType !== "dataRow") {
                    return;
                }

                if (e.dataField === "login" || e.dataField === "displayName" || e.dataField === "email") {
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
                            usersGridInstance.refresh();
                        }
                    }
                });
            },
            onDataErrorOccurred: function (e) {
                setSectionStatus(usersStatusElement, e.error?.message ?? "Ошибка операции с пользователями.", true);
            }
        }).dxDataGrid("instance");
    }

    function initializeReferenceGrid() {
        referenceGridInstance = window.jQuery(referenceGridElement).dxDataGrid({
            dataSource: referenceStore,
            keyExpr: "itemCode",
            height: 480,
            showBorders: true,
            rowAlternationEnabled: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            repaintChangesOnly: true,
            remoteOperations: false,
            sorting: { mode: "multiple" },
            searchPanel: {
                visible: true,
                width: 280,
                placeholder: "Поиск по коду или названию..."
            },
            filterRow: { visible: true },
            headerFilter: { visible: true },
            paging: { pageSize: 15 },
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
                    title: "Элемент справочника",
                    showTitle: true,
                    width: 680
                },
                form: {
                    colCount: 2,
                    items: [
                        "itemCode",
                        "displayName",
                        "sortOrder",
                        "isActive"
                    ]
                }
            },
            columns: [
                {
                    dataField: "typeCode",
                    caption: "Код типа",
                    allowEditing: false,
                    width: 160
                },
                {
                    dataField: "itemCode",
                    caption: "Код элемента",
                    width: 170,
                    validationRules: [
                        { type: "required" }
                    ]
                },
                {
                    dataField: "displayName",
                    caption: "Наименование",
                    minWidth: 280,
                    validationRules: [
                        { type: "required" }
                    ]
                },
                {
                    dataField: "sortOrder",
                    caption: "Порядок сортировки",
                    dataType: "number",
                    width: 140
                },
                {
                    dataField: "isActive",
                    caption: "Активен",
                    dataType: "boolean",
                    width: 110
                }
            ],
            onEditorPreparing: function (e) {
                if (e.parentType !== "dataRow") {
                    return;
                }

                if (e.dataField === "itemCode" && e.row && !e.row.isNewRow) {
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
                            referenceGridInstance.refresh();
                        }
                    }
                });
            },
            onDataErrorOccurred: function (e) {
                setSectionStatus(referenceStatusElement, e.error?.message ?? "Ошибка операции со справочником.", true);
            }
        }).dxDataGrid("instance");
    }

    function applyUsersSearch() {
        currentUsersSearch = usersSearchInput.value.trim();
        if (usersGridInstance) {
            usersGridInstance.refresh();
        }
    }

    function resetUsersSearch() {
        usersSearchInput.value = "";
        currentUsersSearch = "";
        if (usersGridInstance) {
            usersGridInstance.refresh();
        }
    }

    function applyReferenceType() {
        try {
            currentReferenceTypeCode = normalizeTypeCode(referenceTypeCodeInput.value);
            currentReferenceActiveOnly = Boolean(referenceActiveOnlyCheckbox.checked);
            referenceTypeCodeInput.value = currentReferenceTypeCode;
            updateReferenceApiLink();
            if (referenceGridInstance) {
                referenceGridInstance.refresh();
            }
        } catch (error) {
            setSectionStatus(referenceStatusElement, error.message || "Некорректный код типа.", true);
        }
    }

    usersSearchApplyButton.addEventListener("click", applyUsersSearch);
    usersSearchResetButton.addEventListener("click", resetUsersSearch);
    usersSearchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            applyUsersSearch();
        }
    });

    referenceLoadButton.addEventListener("click", applyReferenceType);
    referenceTypeCodeInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            applyReferenceType();
        }
    });
    referenceActiveOnlyCheckbox.addEventListener("change", applyReferenceType);

    (async function bootstrap() {
        try {
            setSectionStatus(usersStatusElement, "Загрузка пользователей...", false);
            setSectionStatus(rolesStatusElement, "Загрузка ролей...", false);
            setSectionStatus(referenceStatusElement, "Загрузка справочника...", false);

            currentReferenceTypeCode = normalizeTypeCode(referenceTypeCodeInput.value || "PURCHASE_TYPE");
            referenceTypeCodeInput.value = currentReferenceTypeCode;
            updateReferenceApiLink();

            await loadRoles();
            initializeRolesGrid();
            initializeUsersGrid();
            initializeReferenceGrid();

            await usersGridInstance.refresh();
            await referenceGridInstance.refresh();
        } catch (error) {
            const message = error.message || "Не удалось инициализировать модуль администрирования.";
            setSectionStatus(usersStatusElement, message, true);
            setSectionStatus(rolesStatusElement, message, true);
            setSectionStatus(referenceStatusElement, message, true);
        }
    })();
})();
