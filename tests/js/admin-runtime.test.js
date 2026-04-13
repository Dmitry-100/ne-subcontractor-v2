"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const adminRuntimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-runtime.js"));

function createCustomStoreCtor() {
    return function CustomStoreStub(config) {
        return config;
    };
}

function createHelpers() {
    return {
        hasOwn: function (source, key) {
            return Object.prototype.hasOwnProperty.call(source, key);
        },
        normalizeRoleNames: function (rawRoles) {
            if (!rawRoles) {
                return [];
            }

            const values = Array.isArray(rawRoles) ? rawRoles : [rawRoles];
            const seen = new Set();
            const result = [];
            values.forEach(function (value) {
                const roleName = String(value ?? "").trim();
                if (!roleName) {
                    return;
                }

                const lookup = roleName.toUpperCase();
                if (seen.has(lookup)) {
                    return;
                }

                seen.add(lookup);
                result.push(roleName);
            });

            return result;
        },
        buildReferencePayload: function (values, fallback) {
            const source = values || {};
            const fallbackValue = fallback || {};
            const itemCode = String(source.itemCode ?? fallbackValue.itemCode ?? "").trim().toUpperCase();
            const displayName = String(source.displayName ?? fallbackValue.displayName ?? "").trim();
            if (!itemCode) {
                throw new Error("itemCode required");
            }

            if (!displayName) {
                throw new Error("displayName required");
            }

            return {
                itemCode: itemCode,
                displayName: displayName,
                sortOrder: Number(source.sortOrder ?? fallbackValue.sortOrder ?? 0),
                isActive: source.isActive === undefined
                    ? (fallbackValue.isActive === undefined ? true : Boolean(fallbackValue.isActive))
                    : Boolean(source.isActive)
            };
        }
    };
}

function createMessages() {
    return {
        usersLoaded: function (count, search) {
            const normalizedSearch = String(search ?? "").trim();
            const suffix = normalizedSearch ? ` по запросу '${normalizedSearch}'` : "";
            return `Загружено пользователей: ${count}${suffix}.`;
        },
        rolesLoaded: function (count) {
            return `Загружено ролей: ${count}.`;
        },
        referenceLoaded: function (count, typeCode, activeOnly) {
            const activeOnlyText = activeOnly ? " (только активные)" : "";
            return `Загружено элементов: ${count} для ${typeCode}${activeOnlyText}.`;
        },
        userUpdated: function (login, rolesCount) {
            return `Пользователь '${login}' обновлён (ролей: ${rolesCount}).`;
        },
        referenceSaved: function (itemCode, typeCode) {
            return `Элемент '${itemCode}' сохранён для ${typeCode}.`;
        },
        referenceUpdated: function (itemCode, typeCode) {
            return `Элемент '${itemCode}' обновлён для ${typeCode}.`;
        },
        referenceDeleted: function (itemCode, typeCode) {
            return `Элемент '${itemCode}' удалён из ${typeCode}.`;
        }
    };
}

test("admin runtime: validates required dependencies", () => {
    assert.throws(function () {
        adminRuntimeModule.createRuntime({});
    }, /customStoreCtor/i);

    assert.throws(function () {
        adminRuntimeModule.createRuntime({
            customStoreCtor: createCustomStoreCtor(),
            apiClient: {},
            helpers: {},
            callbacks: {}
        });
    }, /apiClient\.getRoles/i);
});

test("admin runtime: load methods and stores keep status and persistence side effects", async () => {
    const usersStatusMessages = [];
    const rolesStatusMessages = [];
    const referenceStatusMessages = [];
    const apiCalls = {
        usersSearches: [],
        referenceLoads: [],
        updateUserRoles: [],
        upserts: [],
        deletes: []
    };

    const state = {
        usersSearch: "",
        referenceTypeCode: "PURCHASE_TYPE",
        referenceActiveOnly: false
    };

    const runtime = adminRuntimeModule.createRuntime({
        customStoreCtor: createCustomStoreCtor(),
        apiClient: {
            getRoles: async function () {
                return [
                    { id: "role-admin", name: "Admin", description: "Администратор" }
                ];
            },
            getUsers: async function (search) {
                apiCalls.usersSearches.push(search);
                return [
                    {
                        id: "user-1",
                        login: "ivanov",
                        displayName: "Иванов И.И.",
                        email: "ivanov@example.com",
                        roles: ["Reader"],
                        isActive: true
                    }
                ];
            },
            updateUserRoles: async function (userId, payload) {
                apiCalls.updateUserRoles.push({ userId: userId, payload: payload });
                return {
                    id: userId,
                    login: "ivanov",
                    displayName: "Иванов И.И.",
                    email: "ivanov@example.com",
                    roles: payload.roleNames,
                    isActive: payload.isActive
                };
            },
            getReferenceItems: async function (typeCode, activeOnly) {
                apiCalls.referenceLoads.push({ typeCode: typeCode, activeOnly: activeOnly });
                return [
                    {
                        typeCode: typeCode,
                        itemCode: "CODE1",
                        displayName: "Элемент 1",
                        sortOrder: 1,
                        isActive: true
                    }
                ];
            },
            upsertReferenceItem: async function (typeCode, payload) {
                apiCalls.upserts.push({ typeCode: typeCode, payload: payload });
                return {
                    typeCode: typeCode,
                    itemCode: payload.itemCode,
                    displayName: payload.displayName,
                    sortOrder: payload.sortOrder,
                    isActive: payload.isActive
                };
            },
            deleteReferenceItem: async function (typeCode, itemCode) {
                apiCalls.deletes.push({ typeCode: typeCode, itemCode: itemCode });
            }
        },
        messages: createMessages(),
        helpers: createHelpers(),
        callbacks: {
            getUsersSearch: function () {
                return state.usersSearch;
            },
            getReferenceContext: function () {
                return {
                    typeCode: state.referenceTypeCode,
                    activeOnly: state.referenceActiveOnly
                };
            },
            setUsersStatus: function (message, isError) {
                usersStatusMessages.push({ message: message, isError: isError });
            },
            setRolesStatus: function (message, isError) {
                rolesStatusMessages.push({ message: message, isError: isError });
            },
            setReferenceStatus: function (message, isError) {
                referenceStatusMessages.push({ message: message, isError: isError });
            }
        }
    });

    const roles = await runtime.loadRoles();
    assert.equal(roles.length, 1);
    assert.equal(runtime.getRoles().length, 1);
    assert.equal(rolesStatusMessages.at(-1).message, "Загружено ролей: 1.");

    state.usersSearch = "ivanov";
    const users = await runtime.usersStore.load();
    assert.equal(users.length, 1);
    assert.deepEqual(apiCalls.usersSearches, ["ivanov"]);
    assert.equal(usersStatusMessages.at(-1).message, "Загружено пользователей: 1 по запросу 'ivanov'.");

    const updated = await runtime.usersStore.update("user-1", { roles: ["Admin", "Admin"], isActive: false });
    assert.equal(updated.id, "user-1");
    assert.deepEqual(apiCalls.updateUserRoles, [
        {
            userId: "user-1",
            payload: {
                roleNames: ["Admin"],
                isActive: false
            }
        }
    ]);
    assert.equal(usersStatusMessages.at(-1).message, "Пользователь 'ivanov' обновлён (ролей: 1).");

    state.referenceActiveOnly = true;
    const referenceRows = await runtime.referenceStore.load();
    assert.equal(referenceRows.length, 1);
    assert.deepEqual(apiCalls.referenceLoads, [
        { typeCode: "PURCHASE_TYPE", activeOnly: true }
    ]);
    assert.equal(referenceStatusMessages.at(-1).message, "Загружено элементов: 1 для PURCHASE_TYPE (только активные).");

    await runtime.referenceStore.insert({
        itemCode: "new",
        displayName: "Новый элемент"
    });
    await runtime.referenceStore.update("CODE1", {
        displayName: "Элемент 1 (обновлён)"
    });
    await runtime.referenceStore.remove("CODE1");

    assert.equal(apiCalls.upserts.length, 2);
    assert.deepEqual(apiCalls.deletes, [
        { typeCode: "PURCHASE_TYPE", itemCode: "CODE1" }
    ]);
    assert.equal(referenceStatusMessages.at(-1).message, "Элемент 'CODE1' удалён из PURCHASE_TYPE.");
});

test("admin runtime: throws when reference type code is empty", async () => {
    const runtime = adminRuntimeModule.createRuntime({
        customStoreCtor: createCustomStoreCtor(),
        apiClient: {
            getRoles: async function () { return []; },
            getUsers: async function () { return []; },
            updateUserRoles: async function () { return {}; },
            getReferenceItems: async function () { return []; },
            upsertReferenceItem: async function () { return {}; },
            deleteReferenceItem: async function () {}
        },
        messages: createMessages(),
        helpers: createHelpers(),
        callbacks: {
            getUsersSearch: function () { return ""; },
            getReferenceContext: function () {
                return {
                    typeCode: "   ",
                    activeOnly: false
                };
            },
            setUsersStatus: function () {},
            setRolesStatus: function () {},
            setReferenceStatus: function () {}
        }
    });

    await assert.rejects(async function () {
        await runtime.referenceStore.load();
    }, /Код типа справочника обязателен/i);
});
