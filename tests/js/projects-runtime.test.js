"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const projectsRuntimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/projects-runtime.js"));

function createHelpers() {
    return {
        normalizeGuid: function (value) {
            if (value === null || value === undefined) {
                return null;
            }

            const text = String(value).trim();
            return text.length === 0 ? null : text;
        },
        toTrimmedString: function (value) {
            return String(value ?? "").trim();
        }
    };
}

test("projects runtime: validates required dependencies", () => {
    assert.throws(function () {
        projectsRuntimeModule.createRuntime({});
    }, /apiClient/i);

    assert.throws(function () {
        projectsRuntimeModule.createRuntime({
            apiClient: {
                getProjects: async function () {},
                createProject: async function () {},
                updateProject: async function () {},
                deleteProject: async function () {}
            },
            helpers: createHelpers(),
            customStoreCtor: function () {}
        });
    }, /setStatus/i);
});

test("projects runtime: load/insert/update/remove keeps cache and statuses", async () => {
    const statuses = [];
    const calls = {
        createPayload: null,
        updatePayload: null,
        deletedId: null
    };
    const sourceData = [
        { id: "p-1", code: "PRJ-1", name: "Проект 1", gipUserId: null }
    ];

    const apiClient = {
        getProjects: async function () {
            return sourceData.slice();
        },
        createProject: async function (payload) {
            calls.createPayload = payload;
            return {
                id: "p-2",
                code: payload.code,
                name: payload.name,
                gipUserId: payload.gipUserId
            };
        },
        updateProject: async function (projectId, payload) {
            calls.updatePayload = { projectId: projectId, payload: payload };
            return {
                id: projectId,
                code: "PRJ-1",
                name: payload.name,
                gipUserId: payload.gipUserId
            };
        },
        deleteProject: async function (projectId) {
            calls.deletedId = projectId;
        }
    };

    function CustomStoreStub(config) {
        return config;
    }

    const runtime = projectsRuntimeModule.createRuntime({
        apiClient: apiClient,
        helpers: createHelpers(),
        customStoreCtor: CustomStoreStub,
        setStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        }
    });

    const store = runtime.createStore();
    const loaded = await store.load();
    assert.deepEqual(loaded, sourceData);
    assert.deepEqual(runtime.getCache(), sourceData);

    const inserted = await store.insert({
        code: " PRJ-2 ",
        name: " Проект 2 ",
        gipUserId: " u-2 "
    });
    assert.equal(inserted.id, "p-2");
    assert.deepEqual(calls.createPayload, {
        code: "PRJ-2",
        name: "Проект 2",
        gipUserId: "u-2"
    });

    const updated = await store.update("p-1", {
        name: " Новое имя "
    });
    assert.equal(updated.name, "Новое имя");
    assert.deepEqual(calls.updatePayload, {
        projectId: "p-1",
        payload: {
            name: "Новое имя",
            gipUserId: null
        }
    });

    await store.remove("p-2");
    assert.equal(calls.deletedId, "p-2");

    assert.deepEqual(statuses.map(function (item) { return item.message; }), [
        "Загружено проектов: 1.",
        "Проект 'PRJ-2' создан.",
        "Проект 'PRJ-1' обновлён.",
        "Проект удалён."
    ]);
});

test("projects runtime: insert/update validates required fields", async () => {
    function CustomStoreStub(config) {
        return config;
    }

    const runtime = projectsRuntimeModule.createRuntime({
        apiClient: {
            getProjects: async function () {
                return [{ id: "p-1", code: "PRJ-1", name: "Проект 1", gipUserId: null }];
            },
            createProject: async function (payload) {
                return payload;
            },
            updateProject: async function (projectId, payload) {
                return { id: projectId, code: "PRJ-1", name: payload.name, gipUserId: payload.gipUserId };
            },
            deleteProject: async function () {}
        },
        helpers: createHelpers(),
        customStoreCtor: CustomStoreStub,
        setStatus: function () {}
    });

    const store = runtime.createStore();
    await store.load();

    await assert.rejects(
        async function () {
            await store.insert({ code: " ", name: "Проект" });
        },
        /Код проекта обязателен/i);

    await assert.rejects(
        async function () {
            await store.update("p-1", { name: " " });
        },
        /Наименование проекта обязательно/i);
});

test("projects runtime: load supports paged payload and returns data/totalCount", async () => {
    const calls = [];
    const statuses = [];

    function CustomStoreStub(config) {
        return config;
    }

    const runtime = projectsRuntimeModule.createRuntime({
        apiClient: {
            getProjects: async function (search, paging) {
                calls.push({ search: search, paging: paging });
                return {
                    items: [{ id: "p-31", code: "PRJ-31", name: "Проект 31", gipUserId: null }],
                    totalCount: 57,
                    skip: paging?.skip ?? 0,
                    take: paging?.take ?? 15
                };
            },
            createProject: async function () { return null; },
            updateProject: async function () { return null; },
            deleteProject: async function () {}
        },
        helpers: createHelpers(),
        customStoreCtor: CustomStoreStub,
        setStatus: function (message, isError) {
            statuses.push({ message: message, isError: isError });
        }
    });

    const store = runtime.createStore();
    const result = await store.load({ skip: 30, take: 15 });

    assert.deepEqual(calls, [{
        search: null,
        paging: {
            skip: 30,
            take: 15,
            requireTotalCount: true
        }
    }]);
    assert.deepEqual(result, {
        data: [{ id: "p-31", code: "PRJ-31", name: "Проект 31", gipUserId: null }],
        totalCount: 57
    });
    assert.deepEqual(runtime.getCache(), [{ id: "p-31", code: "PRJ-31", name: "Проект 31", gipUserId: null }]);
    assert.deepEqual(statuses.at(-1), {
        message: "Загружено проектов: 1 (всего: 57).",
        isError: false
    });
});
