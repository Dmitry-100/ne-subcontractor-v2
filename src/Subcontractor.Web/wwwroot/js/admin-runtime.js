"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`AdminRuntime requires ${name}.`);
        }
    }

    function requireModuleFunctions(moduleName, source, names) {
        const moduleObject = source || {};
        (names || []).forEach(function (name) {
            requireFunction(moduleObject[name], `${moduleName}.${name}`);
        });
        return moduleObject;
    }

    function createRuntime(options) {
        const settings = options || {};
        const customStoreCtor = settings.customStoreCtor;
        requireFunction(customStoreCtor, "customStoreCtor");
        const apiClient = requireModuleFunctions("apiClient", settings.apiClient, ["getRoles", "getUsers", "updateUserRoles", "getReferenceItems", "upsertReferenceItem", "deleteReferenceItem"]);
        const helpers = requireModuleFunctions("helpers", settings.helpers, ["hasOwn", "normalizeRoleNames", "buildReferencePayload"]);
        const messages = requireModuleFunctions("messages", settings.messages, ["rolesLoaded", "usersLoaded", "referenceLoaded", "userUpdated", "referenceSaved", "referenceUpdated", "referenceDeleted"]);
        const callbacks = requireModuleFunctions("callbacks", settings.callbacks, ["getUsersSearch", "getReferenceContext", "setUsersStatus", "setRolesStatus", "setReferenceStatus"]);
        const hasOwn = helpers.hasOwn;
        const normalizeRoleNames = helpers.normalizeRoleNames;
        const buildReferencePayload = helpers.buildReferencePayload;
        const rolesLoadedMessage = messages.rolesLoaded;
        const usersLoadedMessage = messages.usersLoaded;
        const referenceLoadedMessage = messages.referenceLoaded;
        const userUpdatedMessage = messages.userUpdated;
        const referenceSavedMessage = messages.referenceSaved;
        const referenceUpdatedMessage = messages.referenceUpdated;
        const referenceDeletedMessage = messages.referenceDeleted;
        const getUsersSearch = callbacks.getUsersSearch;
        const getReferenceContext = callbacks.getReferenceContext;
        const setUsersStatus = callbacks.setUsersStatus;
        const setRolesStatus = callbacks.setRolesStatus;
        const setReferenceStatus = callbacks.setReferenceStatus;

        let usersCache = [];
        let rolesCache = [];
        let referenceCache = [];

        function getReferenceState() {
            const context = getReferenceContext() || {};
            const typeCode = String(context.typeCode ?? "").trim();
            if (!typeCode) {
                throw new Error("Код типа справочника обязателен.");
            }
            return {
                typeCode: typeCode,
                activeOnly: Boolean(context.activeOnly)
            };
        }

        async function loadRoles() {
            const payload = await apiClient.getRoles();
            rolesCache = Array.isArray(payload) ? payload : [];
            setRolesStatus(rolesLoadedMessage(rolesCache.length), false);
            return rolesCache;
        }

        async function loadUsers() {
            const usersSearch = String(getUsersSearch() ?? "").trim();
            const payload = await apiClient.getUsers(usersSearch);
            usersCache = Array.isArray(payload) ? payload : [];
            setUsersStatus(usersLoadedMessage(usersCache.length, usersSearch), false);
            return usersCache;
        }

        async function loadReferenceItems() {
            const referenceState = getReferenceState();
            const payload = await apiClient.getReferenceItems(referenceState.typeCode, referenceState.activeOnly);
            referenceCache = Array.isArray(payload) ? payload : [];
            setReferenceStatus(
                referenceLoadedMessage(referenceCache.length, referenceState.typeCode, referenceState.activeOnly),
                false);
            return referenceCache;
        }

        const usersStore = new customStoreCtor({
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
                const updated = await apiClient.updateUserRoles(key, payload);
                usersCache = usersCache.map(function (item) {
                    return item.id === key ? updated : item;
                });
                setUsersStatus(userUpdatedMessage(updated.login, updated.roles.length), false);
                return updated;
            }
        });

        const referenceStore = new customStoreCtor({
            key: "itemCode",
            load: async function () {
                return loadReferenceItems();
            },
            insert: async function (values) {
                const referenceState = getReferenceState();
                const payload = buildReferencePayload(values, null, true);
                const saved = await apiClient.upsertReferenceItem(referenceState.typeCode, payload);
                referenceCache = referenceCache.filter(function (item) {
                    return item.itemCode !== saved.itemCode;
                });
                referenceCache.push(saved);
                setReferenceStatus(referenceSavedMessage(saved.itemCode, referenceState.typeCode), false);
                return saved;
            },
            update: async function (key, values) {
                const referenceState = getReferenceState();
                const current = referenceCache.find(function (item) {
                    return item.itemCode === key;
                });
                if (!current) {
                    throw new Error("Текущий элемент справочника не найден в кэше.");
                }
                const payload = buildReferencePayload(values, current, false);
                const saved = await apiClient.upsertReferenceItem(referenceState.typeCode, payload);
                referenceCache = referenceCache.map(function (item) {
                    return item.itemCode === key ? saved : item;
                });
                setReferenceStatus(referenceUpdatedMessage(saved.itemCode, referenceState.typeCode), false);
                return saved;
            },
            remove: async function (key) {
                const referenceState = getReferenceState();
                await apiClient.deleteReferenceItem(referenceState.typeCode, key);
                referenceCache = referenceCache.filter(function (item) {
                    return item.itemCode !== key;
                });
                setReferenceStatus(referenceDeletedMessage(key, referenceState.typeCode), false);
            }
        });

        return {
            usersStore: usersStore,
            referenceStore: referenceStore,
            loadRoles: loadRoles,
            getRoles: function () {
                return rolesCache;
            }
        };
    }

    const exportsObject = {
        createRuntime: createRuntime
    };

    if (typeof window !== "undefined") {
        window.AdminRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
